import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError } from '@/lib/errors';

/**
 * GET /api/users/me
 * 
 * Fetches the authenticated user's profile with domain information.
 * 
 * @returns User object with id (Clerk ID), email, role, domainId, createdAt, and domain details
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {NotFoundError} If user is not found in database
 */
import { successResponse } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    return await withDomainIsolation(async (user) => {
      // Fetch extra profile relations for the user
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          experiences: true,
          education: true,
          certifications: true,
        },
      });

      return successResponse({
        id: user.id,
        email: user.email,
        role: user.role,
        domainId: user.domainId,
        skills: user.skills,
        resumeUrl: fullUser?.resumeUrl,
        embeddingStatus: fullUser?.embeddingStatus,
        yearsOfExperience: fullUser?.yearsOfExperience,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        domain: user.domain,
        experiences: fullUser?.experiences || [],
        education: fullUser?.education || [],
        certifications: fullUser?.certifications || [],
      });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
