import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors';
import { Role, ApplicationStatus } from '@/generated/prisma';
import { successResponse } from '@/lib/api/response';

/**
 * PATCH /api/applications/[id]/status
 * 
 * Updates an application's status with validated transitions.
 * - Only Recruiter, Company_Admin, or Super_Admin can update application status
 * - Validates status transitions:
 *   - PENDING → REVIEWED, ACCEPTED, or REJECTED
 *   - REVIEWED → ACCEPTED or REJECTED
 *   - ACCEPTED and REJECTED are terminal states (no transitions allowed)
 * - Applies domain isolation (user must be recruiter in job's domain)
 * 
 * Requirements: 7.4, 7.5, 7.6
 * 
 * @param request - Request object with body { status: ApplicationStatus }
 * @param params - Route parameters with application id
 * @returns Updated application with new status
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not a recruiter/admin in the job's domain
 * @throws {ValidationError} If status transition is invalid
 * @throws {NotFoundError} If application is not found
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Validate user has permission to update applications
      // Only Recruiter, Company_Admin, or Super_Admin can update status
      if (user.role === Role.CANDIDATE) {
        throw new AuthorizationError('Candidates cannot update application status');
      }
      
      const { id: applicationId } = await params;
      
      // Parse and validate request body
      const body = await request.json();
      const { status } = body;
      
      if (!status || typeof status !== 'string') {
        throw new ValidationError('status is required and must be a string');
      }
      
      // Validate status is a valid ApplicationStatus
      const validStatuses: ApplicationStatus[] = ['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED'];
      if (!validStatuses.includes(status as ApplicationStatus)) {
        throw new ValidationError(`status must be one of: ${validStatuses.join(', ')}`);
      }
      
      // Fetch application to check existence, current status, and domain
      const existingApplication = await prisma.application.findUnique({
        where: { id: applicationId },
        select: {
          id: true,
          status: true,
          job: {
            select: {
              domainId: true,
            },
          },
        },
      });
      
      if (!existingApplication) {
        throw new NotFoundError('Application');
      }
      
      // Apply domain isolation for non-Super_Admin users
      // Requirement 7.4: Verify user is recruiter in job's domain
      if (user.role !== Role.SUPER_ADMIN) {
        if (existingApplication.job.domainId !== domainId) {
          throw new AuthorizationError('You do not have permission to update this application');
        }
      }
      
      // Validate status transitions
      // Requirement 7.5: PENDING → REVIEWED, ACCEPTED, or REJECTED
      // Requirement 7.6: REVIEWED → ACCEPTED or REJECTED
      const currentStatus = existingApplication.status;
      const newStatus = status as ApplicationStatus;
      
      // Define valid transitions
      const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
        PENDING: ['REVIEWED', 'ACCEPTED', 'REJECTED'],
        REVIEWED: ['ACCEPTED', 'REJECTED'],
        ACCEPTED: [], // Terminal state
        REJECTED: [], // Terminal state
      };
      
      const allowedNextStatuses = validTransitions[currentStatus];
      
      if (!allowedNextStatuses.includes(newStatus)) {
        throw new ValidationError(
          `Invalid status transition: Cannot change from ${currentStatus} to ${newStatus}. ` +
          `Allowed transitions: ${allowedNextStatuses.length > 0 ? allowedNextStatuses.join(', ') : 'none (terminal state)'}`
        );
      }
      
      // Update application status
      const updatedApplication = await prisma.application.update({
        where: { id: applicationId },
        data: { status: newStatus },
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
      
      return successResponse(updatedApplication);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
