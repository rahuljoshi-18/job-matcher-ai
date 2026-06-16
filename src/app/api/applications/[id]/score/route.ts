import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, NotFoundError, AuthorizationError } from '@/lib/errors';
import { calculateMatchingScore } from '@/lib/matching';
import { Role } from '@/generated/prisma';

/**
 * GET /api/applications/[id]/score
 * 
 * Recalculates and returns the matching score for an application.
 * - Application owner (Candidate) can view their own score
 * - Recruiter/Company_Admin can view scores for jobs in their domain
 * - Super_Admin can view any score
 * - Fetches application with job details
 * - Recalculates matching score using current candidateSkills and requiredSkills
 * - Returns applicationId, matchingScore, commonSkills, totalRequiredSkills
 * 
 * @param request - Request object
 * @param params - Route parameters with application id
 * @returns Object with applicationId, matchingScore, commonSkills, totalRequiredSkills
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user doesn't have permission to view the score
 * @throws {NotFoundError} If application is not found
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      const { id: applicationId } = await params;
      
      // Fetch application with job and user details for authorization
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        select: {
          id: true,
          userId: true,
          job: {
            select: {
              requiredSkills: true,
              domainId: true,
            },
          },
          user: {
            select: {
              skills: true,
            },
          },
        },
      });
      
      if (!application) {
        throw new NotFoundError('Application');
      }
      
      // Validate user has permission to view this score
      const isApplicationOwner = application.userId === user.id;
      const isRecruiterOrAdmin = 
        user.role === Role.RECRUITER || 
        user.role === Role.COMPANY_ADMIN;
      const isSuperAdmin = user.role === Role.SUPER_ADMIN;
      const isInSameDomain = application.job?.domainId === domainId;
      
      // Authorization logic:
      // - Application owner can view their own score
      // - Recruiter/Company_Admin can view if job is in their domain
      // - Super_Admin can view any score
      if (!isApplicationOwner && !isSuperAdmin) {
        if (!isRecruiterOrAdmin || !isInSameDomain) {
          throw new AuthorizationError('You do not have permission to view this application score');
        }
      }
      
      // Recalculate matching score using user's skills
      const matchingResult = calculateMatchingScore({
        candidateSkills: application.user?.skills || [],
        requiredSkills: application.job?.requiredSkills || [],
      });
      
      return Response.json({
        applicationId: application.id,
        matchingScore: matchingResult.score,
        commonSkills: matchingResult.commonSkills,
        totalRequiredSkills: application.job?.requiredSkills.length || 0,
      });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
