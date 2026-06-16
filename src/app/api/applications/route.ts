import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, ValidationError, NotFoundError } from '@/lib/errors';
import { calculateMatchingScore } from '@/lib/matching';
import { Role } from '@/generated/prisma';
import { successResponse } from '@/lib/api/response';
import { createApplicationSchema } from '@/lib/validations/application';

/**
 * GET /api/applications
 * 
 * Fetches applications with role-based filtering.
 * - Candidates see only their own applications
 * - Recruiters/Company_Admins see applications for jobs in their domain
 * - Super_Admin sees all applications
 * 
 * @param request - Request object
 * @returns Array of applications with pagination
 * @throws {AuthenticationError} If user is not authenticated
 */
export async function GET(request: Request) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');
      
      // Validate and parse pagination parameters
      const page = pageParam ? parseInt(pageParam, 10) : 1;
      const limit = limitParam ? parseInt(limitParam, 10) : 10;
      
      if (isNaN(page) || page < 1) {
        throw new ValidationError('page must be a positive integer');
      }
      
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new ValidationError('limit must be a positive integer between 1 and 100');
      }
      
      // Calculate skip for pagination
      const skip = (page - 1) * limit;
      
      // Build where clause based on role
      const whereClause: { userId?: string; job?: { domainId?: string } } = {};
      const targetUserId = searchParams.get('userId');
      
      if (user.role === Role.CANDIDATE) {
        // Candidates see only their own applications
        whereClause.userId = user.id;
      } else {
        if (targetUserId) {
          whereClause.userId = targetUserId;
        }
        if (user.role !== Role.SUPER_ADMIN && domainId) {
          // Recruiters and Company_Admins see applications for jobs in their domain
          whereClause.job = { domainId };
        }
      }
      
      // Fetch applications with pagination
      const applications = await prisma.application.findMany({
        where: whereClause,
        select: {
          id: true,
          jobId: true,
          userId: true,
          matchingScore: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          job: {
            select: {
              id: true,
              title: true,
              description: true,
              requiredSkills: true,
              domainId: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              skills: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      // Get total count for pagination metadata
      const total = await prisma.application.count({
        where: whereClause,
      });
      
      return successResponse(applications, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/applications
 * 
 * Creates a new job application for a candidate.
 * - Only Candidates can create applications
 * - Validates request body has jobId
 * - Uses candidate's skills from User model
 * - Checks for duplicate application (unique constraint on jobId + userId)
 * - Fetches job to get requiredSkills
 * - Calculates matching score using calculateMatchingScore
 * - Creates application with matchingScore, status=PENDING
 * 
 * @param request - Request object with body { jobId: string }
 * @returns Created application with id, jobId, userId, matchingScore, status, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not a Candidate
 * @throws {ValidationError} If request body is invalid or duplicate application exists or user has no skills
 * @throws {NotFoundError} If job is not found
 */
export async function POST(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      // Validate user is Candidate
      if (user.role !== Role.CANDIDATE) {
        throw new AuthorizationError('Only candidates can create applications');
      }

      // Parse and validate request body
      const body = await request.json();
      const parsed = createApplicationSchema.safeParse(body);
      
      if (!parsed.success) {
        throw new ValidationError('Invalid application data');
      }
      
      const { jobId } = parsed.data;

      // Get user's skills from User model
      const userWithSkills = await prisma.user.findUnique({
        where: { id: user.id },
        select: { skills: true },
      });

      if (!userWithSkills?.skills?.length) {
        throw new ValidationError('Please add skills to your profile before applying to jobs');
      }

      const candidateSkills = userWithSkills.skills;

      // Fetch job to get requiredSkills (existence check)
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, requiredSkills: true },
      });

      if (!job) {
        throw new NotFoundError('Job');
      }

      // Calculate matching score before transaction
      const matchingResult = calculateMatchingScore({
        candidateSkills,
        requiredSkills: job.requiredSkills,
      });

      // ── Atomic: duplicate check + create inside a transaction ──────────────
      // Eliminates the TOCTOU race condition. The unique constraint on
      // (jobId, userId) is the last line of defence; the transaction removes
      // the race window entirely.
      const application = await prisma.$transaction(async (tx) => {
        const duplicate = await tx.application.findUnique({
          where: { jobId_userId: { jobId, userId: user.id } },
          select: { id: true },
        });

        if (duplicate) {
          throw new ValidationError('You have already applied to this job');
        }

        return tx.application.create({
          data: {
            jobId,
            userId: user.id,
            matchingScore: matchingResult.score,
            status: 'PENDING',
          },
          select: {
            id: true,
            jobId: true,
            userId: true,
            matchingScore: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      });

      return successResponse(application, undefined, 201);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
