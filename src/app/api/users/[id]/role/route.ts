import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';

/**
 * PATCH /api/users/[id]/role
 * 
 * Updates a user's role with SUPER_ADMIN authorization.
 * - Only SUPER_ADMIN can change user roles
 * - Validates at least one SUPER_ADMIN remains in the platform
 * - Updates user role immediately
 * 
 * Requirements: 13.6, 13.7
 * 
 * @param request - Request object with body { role: Role }
 * @param params - Route parameters with user id
 * @returns Updated user with new role
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not a SUPER_ADMIN
 * @throws {ValidationError} If role validation fails or SUPER_ADMIN preservation is violated
 * @throws {NotFoundError} If user is not found
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user) => {
      // Requirement 13.6: Only SUPER_ADMIN can change user roles
      if (user.role !== Role.SUPER_ADMIN) {
        throw new AuthorizationError('Only SUPER_ADMIN can change user roles');
      }
      
      const { id: targetUserId } = await params;
      
      // Parse and validate request body
      const body = await request.json();
      const { role } = body;
      
      if (!role || typeof role !== 'string') {
        throw new ValidationError('role is required and must be a string');
      }
      
      // Validate role is a valid Role enum value
      const validRoles: Role[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'RECRUITER', 'CANDIDATE'];
      if (!validRoles.includes(role as Role)) {
        throw new ValidationError(`role must be one of: ${validRoles.join(', ')}`);
      }
      
      const newRole = role as Role;
      
      // Fetch target user to check existence and current role
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          role: true,
          domainId: true,
        },
      });
      
      if (!targetUser) {
        throw new NotFoundError('User');
      }
      
      // Requirement 13.7: Validate at least one SUPER_ADMIN remains in platform
      // Only check if we're changing a SUPER_ADMIN to another role
      if (targetUser.role === Role.SUPER_ADMIN && newRole !== Role.SUPER_ADMIN) {
        // Count total SUPER_ADMINs in the platform
        const superAdminCount = await prisma.user.count({
          where: { role: Role.SUPER_ADMIN },
        });
        
        // If this is the last SUPER_ADMIN, prevent the change
        if (superAdminCount <= 1) {
          throw new ValidationError(
            'Cannot change role: At least one SUPER_ADMIN must remain in the platform'
          );
        }
      }
      
      // Update user role
      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { role: newRole },
        select: {
          id: true,
          email: true,
          role: true,
          domainId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      return Response.json({ user: updatedUser });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
