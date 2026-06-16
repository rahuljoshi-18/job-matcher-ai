import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { AuthenticationError, NotFoundError } from '@/lib/errors';
import type { User, Domain } from '@/generated/prisma';
import { isAdminEmail } from '@/lib/admin-emails';

/**
 * User type with included domain relation
 */
export type UserWithDomain = User & {
  domain: Domain | null;
};

/**
 * Higher-order function that enforces domain isolation for API handlers.
 * 
 * This middleware:
 * 1. Extracts the userId (Clerk ID) from Clerk authentication
 * 2. Fetches the user with their domain from the database
 * 3. Passes the user and domainId to the handler function
 * 
 * @param handler - The handler function that receives the authenticated user and domainId
 * @returns The result of the handler function
 * @throws {AuthenticationError} If no userId is found (user not authenticated)
 * @throws {NotFoundError} If the user is not found in the database
 * 
 * @example
 * ```typescript
 * export async function GET() {
 *   return withDomainIsolation(async (user, domainId) => {
 *     // Handler logic with authenticated user and domainId
 *     const jobs = await prisma.job.findMany({
 *       where: { domainId: domainId || undefined }
 *     });
 *     return Response.json({ jobs });
 *   });
 * }
 * ```
 */
export async function withDomainIsolation<T>(
  handler: (user: UserWithDomain, domainId: string | null) => Promise<T>
): Promise<T> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new AuthenticationError('Unauthorized');
  }
  
  let user = await prisma.user.findUnique({
    where: { id: userId }, // Use Clerk ID directly
    include: { domain: true },
  });
  
  if (!user) {
    throw new NotFoundError('User');
  }

  if (isAdminEmail(user.email) && (user.role !== 'SUPER_ADMIN' || user.domainId !== null)) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'SUPER_ADMIN',
        domainId: null,
      },
      include: { domain: true },
    });
  }
  
  return handler(user, user.domainId);
}
