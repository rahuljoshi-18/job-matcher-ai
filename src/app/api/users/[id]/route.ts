import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, NotFoundError, AuthorizationError, ValidationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';

/**
 * GET /api/users/[id]
 * 
 * Fetches a specific user by id with domain isolation.
 * - Super_Admin can access any user
 * - Other roles can only access users from their domain
 * 
 * @param request - Request object
 * @param params - Route parameters containing user id
 * @returns User with id (Clerk ID), email, role, domainId, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user attempts cross-domain access
 * @throws {NotFoundError} If user is not found
 */
import { successResponse } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    return await withDomainIsolation(async (user, domainId) => {
      // Fetch user by id
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          role: true,
          domainId: true,
          createdAt: true,
          skills: true,
          resumeUrl: true,
          yearsOfExperience: true,
          experiences: true,
          education: true,
          certifications: true,
        },
      });
      
      if (!targetUser) {
        throw new NotFoundError('User');
      }
      
      // Apply domain isolation: Super_Admin can access any user,
      // others can only access users from their domain
      if (user.role !== Role.SUPER_ADMIN && targetUser.domainId !== domainId) {
        throw new AuthorizationError('Insufficient permissions to access this user');
      }
      
      return successResponse(targetUser);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH /api/users/[id]
 * 
 * Updates a specific user by id with role promotion logic.
 * - Only Super_Admin or Company_Admin can update users
 * - Company_Admin can only update users in their domain
 * - Super_Admin can promote any user to any role
 * - Domain_Admin (Company_Admin) can only promote Candidates to Recruiters within their domain
 * - Domain_Admin cannot promote to Domain_Admin or Super_Admin roles
 * - Validates role-domain constraints:
 *   - RECRUITER/COMPANY_ADMIN must have non-null domainId
 *   - CANDIDATE/SUPER_ADMIN must have null domainId
 * - When promoting to RECRUITER/COMPANY_ADMIN, ensures domainId is set
 * - When demoting to CANDIDATE, sets domainId to null
 * 
 * @param request - Request body may contain role and domainId
 * @param params - Route parameters containing user id
 * @returns Updated user with id (Clerk ID), email, role, domainId, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not Super_Admin or Company_Admin, or if promotion rules are violated
 * @throws {NotFoundError} If user is not found
 * @throws {ValidationError} If role-domain constraints are violated
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    return await withDomainIsolation(async (user, domainId) => {
      // Validate user is Super_Admin or Company_Admin
      if (user.role !== Role.SUPER_ADMIN && user.role !== Role.COMPANY_ADMIN) {
        throw new AuthorizationError('Only Super_Admin or Company_Admin can update users');
      }
      
      // Fetch target user to verify it exists
      const targetUser = await prisma.user.findUnique({
        where: { id },
      });
      
      if (!targetUser) {
        throw new NotFoundError('User');
      }
      
      // Apply domain isolation: Company_Admin can only update users in their domain
      if (user.role === Role.COMPANY_ADMIN && targetUser.domainId !== domainId) {
        throw new AuthorizationError('Insufficient permissions to update this user');
      }
      
      // Parse request body
      const body = await request.json();
      const { role: newRole, domainId: newDomainId } = body;
      
      // Build update data object with only provided fields
      const updateData: {
        role?: Role;
        domainId?: string | null;
      } = {};
      
      if (newRole !== undefined) {
        // Validate role is a valid enum value
        if (!Object.values(Role).includes(newRole)) {
          throw new ValidationError('Invalid role value');
        }
        
        // Apply role promotion restrictions for Domain_Admin (Company_Admin)
        if (user.role === Role.COMPANY_ADMIN) {
          // Domain_Admin can only promote Candidates to Recruiters
          if (targetUser.role !== Role.CANDIDATE) {
            throw new AuthorizationError('Domain_Admin can only promote Candidates');
          }
          
          // Domain_Admin cannot promote to Domain_Admin or Super_Admin
          if (newRole === Role.COMPANY_ADMIN || newRole === Role.SUPER_ADMIN) {
            throw new AuthorizationError('Domain_Admin cannot promote users to Domain_Admin or Super_Admin roles');
          }
          
          // Domain_Admin can only promote to Recruiter
          if (newRole !== Role.RECRUITER && newRole !== Role.CANDIDATE) {
            throw new AuthorizationError('Domain_Admin can only promote Candidates to Recruiters');
          }
        }
        
        updateData.role = newRole;
      }
      
      if (newDomainId !== undefined) {
        updateData.domainId = newDomainId;
      }
      
      // Determine final role and domainId for validation
      const finalRole = newRole !== undefined ? newRole : targetUser.role;
      let finalDomainId = newDomainId !== undefined ? newDomainId : targetUser.domainId;
      
      // Auto-adjust domainId based on role promotion/demotion
      if (newRole !== undefined && newDomainId === undefined) {
        // When promoting to RECRUITER or COMPANY_ADMIN, ensure domainId is set
        if ((newRole === Role.RECRUITER || newRole === Role.COMPANY_ADMIN) && targetUser.domainId === null) {
          // For Domain_Admin, use their domain
          if (user.role === Role.COMPANY_ADMIN) {
            updateData.domainId = domainId;
            finalDomainId = domainId;
          }
          // For Super_Admin, domainId must be explicitly provided
          else if (user.role === Role.SUPER_ADMIN) {
            throw new ValidationError('domainId must be provided when promoting to RECRUITER or COMPANY_ADMIN');
          }
        }
        
        // When demoting to CANDIDATE, set domainId to null
        if (newRole === Role.CANDIDATE && targetUser.domainId !== null) {
          updateData.domainId = null;
          finalDomainId = null;
        }
        
        // When promoting to SUPER_ADMIN, set domainId to null
        if (newRole === Role.SUPER_ADMIN && targetUser.domainId !== null) {
          updateData.domainId = null;
          finalDomainId = null;
        }
      }
      
      // Validate role-domain constraints
      // RECRUITER and COMPANY_ADMIN must have non-null domainId
      if ((finalRole === Role.RECRUITER || finalRole === Role.COMPANY_ADMIN) && finalDomainId === null) {
        throw new ValidationError('RECRUITER and COMPANY_ADMIN roles require a non-null domainId');
      }
      
      // CANDIDATE and SUPER_ADMIN must have null domainId
      if ((finalRole === Role.CANDIDATE || finalRole === Role.SUPER_ADMIN) && finalDomainId !== null) {
        throw new ValidationError('CANDIDATE and SUPER_ADMIN roles require domainId to be null');
      }
      
      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          role: true,
          domainId: true,
          createdAt: true,
        },
      });
      
      return successResponse(updatedUser);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
