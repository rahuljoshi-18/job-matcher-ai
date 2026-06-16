import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, NotFoundError, AuthorizationError, ValidationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';
import { successResponse } from '@/lib/api/response';

/**
 * GET /api/domains/[id]
 * 
 * Fetches a specific domain by id.
 * Accessible by Super_Admin or users who belong to the requested domain.
 * 
 * @param request - Request object
 * @param params - Route parameters containing domain id
 * @returns Domain with id, name, domainName, verified, disabled, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not Super_Admin and doesn't belong to the domain
 * @throws {NotFoundError} If domain is not found
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    return await withDomainIsolation(async (user, domainId) => {
      // Fetch domain by id
      const domain = await prisma.domain.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          domainName: true,
          verified: true,
          disabled: true,
          createdAt: true,
        },
      });
      
      if (!domain) {
        throw new NotFoundError('Domain');
      }
      
      // Validate user is Super_Admin OR belongs to requested domain
      if (user.role !== Role.SUPER_ADMIN && domainId !== id) {
        throw new AuthorizationError('Insufficient permissions to access this domain');
      }
      
      return successResponse(domain);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH /api/domains/[id]
 * 
 * Updates a specific domain by id.
 * Accessible by Super_Admin or Company_Admin who belongs to the domain.
 * 
 * @param request - Request body may contain name, verified, disabled
 * @param params - Route parameters containing domain id
 * @returns Updated domain with id, name, domainName, verified, disabled, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not Super_Admin and doesn't belong to the domain
 * @throws {NotFoundError} If domain is not found
 * @throws {ValidationError} If request body contains invalid fields
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    return await withDomainIsolation(async (user, domainId) => {
      // Fetch domain by id to verify it exists
      const existingDomain = await prisma.domain.findUnique({
        where: { id },
      });
      
      if (!existingDomain) {
        throw new NotFoundError('Domain');
      }
      
      // Validate user is Super_Admin OR (Company_Admin AND belongs to domain)
      if (user.role !== Role.SUPER_ADMIN) {
        if (user.role !== Role.COMPANY_ADMIN || domainId !== id) {
          throw new AuthorizationError('Insufficient permissions to update this domain');
        }
      }
      
      // Parse request body
      const body = await request.json();
      const { name, verified, disabled } = body;
      
      // Build update data object with only provided fields
      const updateData: {
        name?: string;
        verified?: boolean;
        disabled?: boolean;
      } = {};
      
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
          throw new ValidationError('name must be a non-empty string');
        }
        updateData.name = name;
      }
      
      if (verified !== undefined) {
        if (typeof verified !== 'boolean') {
          throw new ValidationError('verified must be a boolean');
        }
        updateData.verified = verified;
      }
      
      if (disabled !== undefined) {
        if (typeof disabled !== 'boolean') {
          throw new ValidationError('disabled must be a boolean');
        }
        updateData.disabled = disabled;
      }
      
      // Update domain
      const domain = await prisma.domain.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          domainName: true,
          verified: true,
          disabled: true,
          createdAt: true,
        },
      });
      
      return successResponse(domain);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
