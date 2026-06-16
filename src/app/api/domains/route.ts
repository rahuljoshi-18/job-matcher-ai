import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { requirePermission } from '@/lib/middleware/rbac';
import { handleRouteError, ValidationError } from '@/lib/errors';
import { successResponse } from '@/lib/api/response';

/**
 * GET /api/domains
 * 
 * Fetches all domains from the database.
 * Only accessible by Super_Admin users.
 * 
 * @returns Array of domains with id, name, domainName, verified, disabled, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not Super_Admin
 */
export async function GET() {
  try {
    return await withDomainIsolation(async (user) => {
      // Validate user is Super_Admin
      requirePermission(user.role, 'manage:domain');
      
      // Fetch all domains from database
      const domains = await prisma.domain.findMany({
        select: {
          id: true,
          name: true,
          domainName: true,
          verified: true,
          disabled: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return successResponse(domains);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/domains
 * 
 * Creates a new domain with default values.
 * Only accessible by Super_Admin users.
 * 
 * @param request - Request body must contain name and domainName
 * @returns Created domain with id, name, domainName, verified, disabled, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not Super_Admin
 * @throws {ValidationError} If name or domainName is missing
 */
export async function POST(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      // Validate user is Super_Admin
      requirePermission(user.role, 'manage:domain');
      
      // Parse and validate request body
      const body = await request.json();
      const { name, domainName } = body;
      
      if (!name || typeof name !== 'string') {
        throw new ValidationError('name is required and must be a string');
      }
      
      if (!domainName || typeof domainName !== 'string') {
        throw new ValidationError('domainName is required and must be a string');
      }
      
      // Create domain with verified=false and disabled=false (default values)
      const domain = await prisma.domain.create({
        data: {
          name,
          domainName,
          verified: false,
          disabled: false,
        },
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
