import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, NotFoundError } from '@/lib/errors';
import { Role } from '@/generated/prisma';
import { successResponse } from '@/lib/api/response';

/**
 * PATCH /api/domains/[id]/disable
 * 
 * Disables a domain by setting disabled=true.
 * - Only SUPER_ADMIN can disable domains
 * - Sets disabled=true on the domain
 * - Prevents users in that domain from accessing the platform
 * 
 * Requirements: 12.6, 12.7
 * 
 * @param request - Request object
 * @param params - Route parameters with domain id
 * @returns Updated domain with disabled=true
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not a SUPER_ADMIN
 * @throws {NotFoundError} If domain is not found
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user) => {
      // Requirement 12.6: Only SUPER_ADMIN can disable domains
      if (user.role !== Role.SUPER_ADMIN) {
        throw new AuthorizationError('Only SUPER_ADMIN can disable domains');
      }
      
      const { id: domainId } = await params;
      
      // Verify domain exists
      const existingDomain = await prisma.domain.findUnique({
        where: { id: domainId },
        select: {
          id: true,
          disabled: true,
        },
      });
      
      if (!existingDomain) {
        throw new NotFoundError('Domain');
      }
      
      // Requirement 12.7: Set disabled=true on domain
      const updatedDomain = await prisma.domain.update({
        where: { id: domainId },
        data: { disabled: true },
        select: {
          id: true,
          name: true,
          domainName: true,
          verified: true,
          disabled: true,
          createdAt: true,
        },
      });
      
      return successResponse(updatedDomain);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
