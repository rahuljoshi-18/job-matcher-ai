import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, ValidationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';

/**
 * GET /api/users
 * 
 * Fetches users with domain isolation and pagination.
 * - Super_Admin sees all users across all domains
 * - Other roles see only users from their domain
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Number of users per page (default: 10)
 * 
 * @param request - Request object with query parameters
 * @returns Paginated users array with id (Clerk ID), email, role, domainId, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {ValidationError} If query parameters are invalid
 */
import { successResponse } from '@/lib/api/response';

export async function GET(request: Request) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');
      
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
      // Super_Admin sees all users, others see only their domain users
      const whereClause = user.role === Role.SUPER_ADMIN
        ? {} // No filter for Super_Admin
        : { domainId }; // Filter by domainId for other roles
      
      // Fetch users with pagination
      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          role: true,
          domainId: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      // Get total count for pagination metadata
      const total = await prisma.user.count({
        where: whereClause,
      });
      
      return successResponse(
        users,
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      );
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
