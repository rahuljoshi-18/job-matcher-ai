import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, ValidationError, AuthorizationError, NotFoundError } from '@/lib/errors';
import { Role } from '@/generated/prisma';
import { successResponse } from '@/lib/api/response';

/**
 * GET /api/jobs/[id]
 * 
 * Fetches a single job by ID.
 * - Candidates can view any job
 * - Recruiters/Company_Admins can only view jobs from their domain
 * - Super_Admin can view any job
 * 
 * @param request - Request object
 * @param params - Route parameters with job id
 * @returns Job with id, title, description, requiredSkills, domainId, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {NotFoundError} If job is not found
 * @throws {AuthorizationError} If user doesn't have permission to view the job
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      const { id } = await params;
      
      // Fetch job by id
      const job = await prisma.job.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
          domainId: true,
          createdAt: true,
        },
      });
      
      if (!job) {
        throw new NotFoundError('Job');
      }
      
      // Apply domain isolation for non-Candidate users
      if (user.role !== Role.CANDIDATE && user.role !== Role.SUPER_ADMIN) {
        // Recruiters and Company_Admins can only view jobs from their domain
        if (job.domainId !== domainId) {
          throw new AuthorizationError('You do not have permission to view this job');
        }
      }
      
      return successResponse(job);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH /api/jobs/[id]
 * 
 * Updates a job by ID.
 * - Only Recruiter, Company_Admin, or Super_Admin can update jobs
 * - Recruiters/Company_Admins can only update jobs from their domain
 * - Super_Admin can update any job
 * 
 * Request Body:
 * - title: Job title (optional)
 * - description: Job description (optional)
 * - requiredSkills: Array of required skills (optional)
 * 
 * @param request - Request object with update data
 * @param params - Route parameters with job id
 * @returns Updated job with id, title, description, requiredSkills, domainId, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user doesn't have permission to update jobs
 * @throws {NotFoundError} If job is not found
 * @throws {ValidationError} If request body is invalid
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Validate user has permission to update jobs
      if (user.role === Role.CANDIDATE) {
        throw new AuthorizationError('Candidates cannot update jobs');
      }
      
      const { id } = await params;
      
      // Fetch job to check existence and domain
      const existingJob = await prisma.job.findUnique({
        where: { id },
        select: {
          id: true,
          domainId: true,
        },
      });
      
      if (!existingJob) {
        throw new NotFoundError('Job');
      }
      
      // Apply domain isolation for non-Super_Admin users
      if (user.role !== Role.SUPER_ADMIN) {
        if (existingJob.domainId !== domainId) {
          throw new AuthorizationError('You do not have permission to update this job');
        }
      }
      
      // Parse request body
      const body = await request.json();
      const { title, description, requiredSkills } = body;
      
      // Build update data object
      const updateData: {
        title?: string;
        description?: string;
        requiredSkills?: string[];
      } = {};
      
      // Validate and add title if provided
      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          throw new ValidationError('title must be a non-empty string');
        }
        const trimmedTitle = title.trim();
        if (trimmedTitle.length < 5) {
          throw new ValidationError('Job title must be at least 5 characters');
        }
        if (trimmedTitle.length > 200) {
          throw new ValidationError('Job title must not exceed 200 characters');
        }
        updateData.title = trimmedTitle;
      }
      
      // Validate and add description if provided
      if (description !== undefined) {
        if (typeof description !== 'string' || description.trim().length === 0) {
          throw new ValidationError('description must be a non-empty string');
        }
        const trimmedDescription = description.trim();
        if (trimmedDescription.length < 20) {
          throw new ValidationError('Job description must be at least 20 characters');
        }
        if (trimmedDescription.length > 5000) {
          throw new ValidationError('Job description must not exceed 5000 characters');
        }
        updateData.description = trimmedDescription;
      }
      
      // Validate and add requiredSkills if provided
      if (requiredSkills !== undefined) {
        if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
          throw new ValidationError('requiredSkills must be a non-empty array');
        }
        
        if (!requiredSkills.every(skill => typeof skill === 'string' && skill.trim().length > 0)) {
          throw new ValidationError('All requiredSkills must be non-empty strings');
        }
        
        updateData.requiredSkills = requiredSkills.map(skill => skill.trim());
      }
      
      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        throw new ValidationError('At least one field (title, description, or requiredSkills) must be provided');
      }
      
      // Update job
      const job = await prisma.job.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
          domainId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      return successResponse(job);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/jobs/[id]
 * 
 * Deletes a job by ID.
 * - Only Recruiter, Company_Admin, or Super_Admin can delete jobs
 * - Recruiters/Company_Admins can only delete jobs from their domain
 * - Super_Admin can delete any job
 * - Job must have zero applications to be deleted
 * 
 * @param request - Request object
 * @param params - Route parameters with job id
 * @returns Success response
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user doesn't have permission to delete jobs
 * @throws {NotFoundError} If job is not found
 * @throws {ValidationError} If job has existing applications
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Validate user has permission to delete jobs
      if (user.role === Role.CANDIDATE) {
        throw new AuthorizationError('Candidates cannot delete jobs');
      }
      
      const { id } = await params;
      
      // Fetch job to check existence, domain, and application count
      const existingJob = await prisma.job.findUnique({
        where: { id },
        select: {
          id: true,
          domainId: true,
          _count: {
            select: {
              applications: true,
            },
          },
        },
      });
      
      if (!existingJob) {
        throw new NotFoundError('Job');
      }
      
      // Apply domain isolation for non-Super_Admin users
      if (user.role !== Role.SUPER_ADMIN) {
        if (existingJob.domainId !== domainId) {
          throw new AuthorizationError('You do not have permission to delete this job');
        }
      }
      
      // Verify job has zero applications
      if (existingJob._count.applications > 0) {
        throw new ValidationError(
          'Cannot delete job with existing applications',
          { applicationCount: existingJob._count.applications }
        );
      }
      
      // Delete job
      await prisma.job.delete({
        where: { id },
      });
      
      return Response.json({ 
        success: true,
        message: 'Job deleted successfully' 
      });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
