import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors';
import { Role, ApplicationStatus } from '@/generated/prisma';
import { successResponse } from '@/lib/api/response';

/**
 * GET /api/applications/[id]
 * 
 * Fetches a specific application by id.
 * - Application owner (Candidate) can view their own application
 * - Recruiter/Company_Admin can view applications for jobs in their domain
 * - Super_Admin can view any application
 * 
 * @param request - Request object
 * @param params - Route parameters with application id
 * @returns Application with id, jobId, userId, candidateSkills, matchingScore, status, createdAt, job details, user details
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user doesn't have permission to view the application
 * @throws {NotFoundError} If application is not found
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      const { id: applicationId } = await params;
      
      // Fetch application with job and user details
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
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
              createdAt: true,
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
      });
      
      if (!application) {
        throw new NotFoundError('Application');
      }
      
      // Validate user has permission to view this application
      const isApplicationOwner = application.userId === user.id;
      const isRecruiterOrAdmin = 
        user.role === Role.RECRUITER || 
        user.role === Role.COMPANY_ADMIN;
      const isSuperAdmin = user.role === Role.SUPER_ADMIN;
      const isInSameDomain = application.job?.domainId === domainId;
      
      // Authorization logic:
      // - Application owner can view their own application
      // - Recruiter/Company_Admin can view if job is in their domain
      // - Super_Admin can view any application
      if (!isApplicationOwner && !isSuperAdmin) {
        if (!isRecruiterOrAdmin || !isInSameDomain) {
          throw new AuthorizationError('You do not have permission to view this application');
        }
      }
      
      return successResponse(application);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH /api/applications/[id]
 * 
 * Updates an application's status.
 * - Only Recruiter, Company_Admin, or Super_Admin can update applications
 * - Applies domain isolation (checks job's domainId)
 * - Updates application status
 * 
 * @param request - Request object with body { status: ApplicationStatus }
 * @param params - Route parameters with application id
 * @returns Updated application
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user doesn't have permission to update the application
 * @throws {ValidationError} If status is invalid
 * @throws {NotFoundError} If application is not found
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Validate user has permission to update applications
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
      
      // Fetch application to check existence and domain
      const existingApplication = await prisma.application.findUnique({
        where: { id: applicationId },
        select: {
          id: true,
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
      if (user.role !== Role.SUPER_ADMIN) {
        if (existingApplication.job.domainId !== domainId) {
          throw new AuthorizationError('You do not have permission to update this application');
        }
      }
      
      // Update application status
      const updatedApplication = await prisma.application.update({
        where: { id: applicationId },
        data: { status: status as ApplicationStatus },
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

/**
 * DELETE /api/applications/[id]
 * 
 * Deletes an application.
 * - Candidates can only delete their own applications
 * - Recruiters/Company_Admin/Super_Admin can delete any application in their domain
 * - Super_Admin can delete any application
 * 
 * @param request - Request object
 * @param params - Route parameters with application id
 * @returns Success response
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user doesn't have permission to delete the application
 * @throws {NotFoundError} If application is not found
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      const { id: applicationId } = await params;
      
      // Fetch application to check existence and domain
      const existingApplication = await prisma.application.findUnique({
        where: { id: applicationId },
        select: {
          id: true,
          userId: true,
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
      
      // Apply authorization logic
      const isApplicationOwner = existingApplication.userId === user.id;
      const isRecruiterOrAdmin = 
        user.role === Role.RECRUITER || 
        user.role === Role.COMPANY_ADMIN;
      const isSuperAdmin = user.role === Role.SUPER_ADMIN;
      const isInSameDomain = existingApplication.job.domainId === domainId;
      
      // Authorization: Can delete if:
      // - Application owner (candidate), OR
      // - Recruiter/Admin in same domain, OR
      // - Super_Admin
      if (!isApplicationOwner && !isSuperAdmin) {
        if (!isRecruiterOrAdmin || !isInSameDomain) {
          throw new AuthorizationError('You do not have permission to delete this application');
        }
      }
      
      // Delete application
      await prisma.application.delete({
        where: { id: applicationId },
      });
      
      return Response.json({ 
        success: true,
        message: 'Application deleted successfully' 
      });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
