import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, ValidationError, AuthorizationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';
import { generateAndStoreJobEmbedding } from '@/lib/ai/embeddings';
import { successResponse } from '@/lib/api/response';
import { jobSchema } from '@/lib/validations/job';

/**
 * GET /api/jobs
 * 
 * Fetches jobs with role-based filtering and pagination.
 * - Candidates see jobs from all domains
 * - Recruiters/Company_Admins see only their domain jobs
 * - Super_Admin sees all jobs
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Number of jobs per page (default: 10)
 * - domainId: Optional domain filter
 * 
 * @param request - Request object with query parameters
 * @returns Paginated jobs array with id, title, description, requiredSkills, domainId, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {ValidationError} If query parameters are invalid
 */
export async function GET(request: Request) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');
      const domainIdFilter = searchParams.get('domainId');
      
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
      const statusFilter = searchParams.get('status');
      const whereClause: { domainId?: string; status?: 'DRAFT' | 'ACTIVE' | 'CLOSED' } = {};

      // Default: candidates only see ACTIVE jobs
      if (!statusFilter && user.role === Role.CANDIDATE) {
        whereClause.status = 'ACTIVE';
      } else if (statusFilter === 'DRAFT' || statusFilter === 'ACTIVE' || statusFilter === 'CLOSED') {
        whereClause.status = statusFilter;
      }
      
      const isRecommended = searchParams.get('recommended') === 'true';

      if (user.role === Role.CANDIDATE) {
        if (isRecommended) {
          const hasEmbedding = await prisma.candidateEmbedding.findUnique({
            where: { candidateId: user.id },
            select: { id: true },
          });

          if (hasEmbedding) {
            interface RawJobRow {
              id: string;
              title: string;
              description: string;
              requiredSkills: string[];
              domainId: string;
              status: string;
              createdAt: Date;
              updatedAt: Date;
              aiScore: number;
            }

            const rawJobs = await prisma.$queryRaw<RawJobRow[]>`
              SELECT 
                j.id, j.title, j.description, j."requiredSkills", j."domainId", j.status, j."createdAt", j."updatedAt",
                (1 - (je.embedding <=> ce.embedding)) * 100 as "aiScore"
              FROM jobs j
              JOIN job_embeddings je ON j.id = je."jobId"
              JOIN candidate_embeddings ce ON ce."candidateId" = ${user.id}
              WHERE j.status = 'ACTIVE'
              ORDER BY je.embedding <=> ce.embedding ASC
              LIMIT ${limit} OFFSET ${skip};
            `;
            
            const countRes = await prisma.$queryRaw<{count: bigint}[]>`
              SELECT COUNT(j.id) as count 
              FROM jobs j
              JOIN job_embeddings je ON j.id = je."jobId"
              WHERE j.status = 'ACTIVE'
            `;
            const total = Number(countRes[0]?.count || 0);

            const jobs = rawJobs.map(job => ({
              ...job,
              aiScore: Number(job.aiScore),
            }));

            return successResponse(jobs, {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            });
          }
        }
        
        // Candidates see jobs from all domains if not doing semantic search or semantic fails
        if (domainIdFilter) {
          whereClause.domainId = domainIdFilter;
        }
      } else if (user.role === Role.SUPER_ADMIN) {
        // Super_Admin sees all jobs
        if (domainIdFilter) {
          whereClause.domainId = domainIdFilter;
        }
      } else {
        // Recruiters and Company_Admins see only their domain jobs
        if (domainId) {
          whereClause.domainId = domainId;
        }
      }
      
      // Fetch jobs with pagination
      const jobs = await prisma.job.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
          domainId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      
      // Get total count for pagination metadata
      const total = await prisma.job.count({
        where: whereClause,
      });
      
      return successResponse(jobs, {
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
 * POST /api/jobs
 * 
 * Creates a new job posting.
 * - Only Recruiter, Company_Admin, or Super_Admin can create jobs
 * - Job is created with the user's domainId
 * 
 * Request Body:
 * - title: Job title (required)
 * - description: Job description (required)
 * - requiredSkills: Array of required skills (required)
 * 
 * @param request - Request object with job data
 * @returns Created job with id, title, description, requiredSkills, domainId, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user doesn't have permission to create jobs
 * @throws {ValidationError} If request body is invalid
 */
export async function POST(request: Request) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Validate user has permission to create jobs
      if (user.role === Role.CANDIDATE) {
        throw new AuthorizationError('Candidates cannot create jobs');
      }
      
      // Validate user has a domainId (required for job creation)
      if (!domainId) {
        throw new ValidationError('User must belong to a domain to create jobs');
      }
      
      // Parse and validate request body
      const body = await request.json();
      const parsed = jobSchema.safeParse(body);
      
      if (!parsed.success) {
        throw new ValidationError('Invalid job data');
      }
      
      const { title, description, requiredSkills, status } = parsed.data;
      
      // Create job with user's domainId
      const job = await prisma.job.create({
        data: {
          title,
          description,
          requiredSkills,
          domainId,
          status,
        },
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
          domainId: true,
          status: true,
          createdAt: true,
        },
      });

      // Trigger job embedding in background (non-blocking)
      generateAndStoreJobEmbedding(job.id).catch(() => {});

      return successResponse(job, undefined, 201);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
