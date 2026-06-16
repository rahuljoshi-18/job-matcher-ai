import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, ValidationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * POST /api/invitations
 * 
 * Creates an invitation for a domain by:
 * 1. Creating a Clerk user with role and domainId metadata
 * 2. Storing invitation record in database for tracking
 * 3. Clerk sends email to the user automatically
 * 4. When user completes signup, webhook syncs metadata to database
 * 
 * - COMPANY_ADMIN can send invitations to their own domain
 * - SUPER_ADMIN can send invitations to any domain (must specify domainId in body)
 * 
 * Requirements: 9.4, 9.5, 9.6
 * 
 * @param request - Request object with body { email: string, role?: Role, domainId?: string (required for SUPER_ADMIN) }
 * @returns Created invitation record
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not a COMPANY_ADMIN or SUPER_ADMIN
 * @throws {ValidationError} If email is invalid or domainId is not provided for SUPER_ADMIN
 */
export async function POST(request: Request) {
  try {
    return await withDomainIsolation(async (user, userDomainId) => {
      // Only COMPANY_ADMIN and SUPER_ADMIN can send invitations
      if (user.role !== Role.COMPANY_ADMIN && user.role !== Role.SUPER_ADMIN) {
        throw new AuthorizationError('Only COMPANY_ADMIN and SUPER_ADMIN can send invitations');
      }

      // Parse and validate request body
      const body = await request.json();
      const { email, role = Role.RECRUITER, domainId: bodyDomainId } = body;

      // Determine the target domain
      let targetDomainId: string | undefined;

      if (user.role === Role.COMPANY_ADMIN) {
        // Company admin must have a domain and can only invite to their domain
        if (!userDomainId) {
          throw new AuthorizationError('Company admin must be associated with a domain');
        }
        targetDomainId = userDomainId;
      } else if (user.role === Role.SUPER_ADMIN) {
        // Super admin must specify target domain in body
        if (!bodyDomainId) {
          throw new ValidationError('SUPER_ADMIN must specify domainId in request body');
        }
        targetDomainId = bodyDomainId;
      }

      // Validate email is provided
      if (!email || typeof email !== 'string') {
        throw new ValidationError('email is required and must be a string');
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format');
      }

      // Validate role if provided
      if (role && typeof role !== 'string') {
        throw new ValidationError('role must be a string');
      }

      const validRoles: Role[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'RECRUITER', 'CANDIDATE'];
      if (role && !validRoles.includes(role as Role)) {
        throw new ValidationError(`role must be one of: ${validRoles.join(', ')}`);
      }

      // Create Clerk user with public_metadata for role and domainId
      // The webhook will handle syncing this to the database
      try {
        const client = await clerkClient();

        await client.invitations.createInvitation({
          emailAddress: email.toLowerCase().trim(),

          publicMetadata: {
            role: role as Role,
            domainId: targetDomainId,
          },

          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`,
        });
      } catch (clerkError) {
        // Type-safe error handling
        const error = clerkError as {
          errors?: Array<{ code: string; message: string }>;
          message?: string;
        };

        // Check if it's a duplicate user error
        if (error?.errors?.[0]?.code === 'duplicate_identifier') {
          // User already exists in Clerk, just store invitation record
          console.log(`User ${email} already exists in Clerk, storing invitation record only`);
        } else {
          const errorMsg = error?.errors?.[0]?.message || error?.message || 'Unknown error';
          throw new ValidationError(`Failed to create Clerk user: ${errorMsg}`);
        }
      }

      // Ensure domainId is not undefined for the database
      if (!targetDomainId) {
        throw new ValidationError('Failed to determine target domain for invitation');
      }

      // Store invitation record in database for tracking
      const invitation = await prisma.invitation.create({
        data: {
          email: email.toLowerCase().trim(),
          role: role as Role,
          domainId: targetDomainId,
        },
        select: {
          id: true,
          email: true,
          role: true,
          domainId: true,
          createdAt: true,
        },
      });

      return Response.json({ invitation });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
