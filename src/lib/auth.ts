import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { AuthenticationError } from '@/lib/errors';
import { User } from '@/generated/prisma';
import { isAdminEmail } from '@/lib/admin-emails';

/**
 * Server-side authentication utility that validates Clerk session and fetches user from database.
 * 
 * This function should be used in:
 * - Server components
 * - Server-side rendering (SSR)
 * - Route handlers that need authenticated user context
 * 
 * @throws {AuthenticationError} If session is invalid or user not found
 * @returns User object with role and domainId for authorization checks
 * 
 * @example
 * ```typescript
 * // In a server component
 * export default async function DashboardPage() {
 *   const user = await getAuthenticatedUser();
 *   return <div>Welcome {user.email}</div>;
 * }
 * 
 * // In a route handler
 * export async function GET() {
 *   const user = await getAuthenticatedUser();
 *   // Use user.role and user.domainId for authorization
 * }
 * ```
 */
export async function getAuthenticatedUser(): Promise<User> {
  // Validate Clerk session
  const { userId } = await auth();
  
  if (!userId) {
    throw new AuthenticationError('No valid session found');
  }
  
  // Fetch user from database with domain relation (use Clerk ID directly)
  let user = await prisma.user.findUnique({
    where: { id: userId }, // Use Clerk ID directly as primary key
    include: { domain: true },
  });
  
  if (!user) {
    throw new AuthenticationError('User not found in database');
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
  
  return user;
}
