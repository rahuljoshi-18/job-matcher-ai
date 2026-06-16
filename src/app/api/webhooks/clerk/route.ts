import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { handleRouteError } from '@/lib/errors';
import { Role } from '@/generated/prisma';
import { getRoleForEmail } from '@/lib/admin-emails';

// Clerk webhook event types
type WebhookEvent = {
  type: 'user.created' | 'user.updated';
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    public_metadata?: {
      role?: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'RECRUITER' | 'CANDIDATE';
      domainId?: string;
    };
  };
};

export async function POST(req: Request) {
  try {
    // Get the webhook secret from environment
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET is not configured');
      return Response.json(
        { error: { code: 'CONFIGURATION_ERROR', message: 'Webhook secret not configured' } },
        { status: 500 }
      );
    }

    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return Response.json(
        { error: { code: 'INVALID_HEADERS', message: 'Missing svix headers' } },
        { status: 400 }
      );
    }

    // Get the body
    const payload = await req.text();

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(webhookSecret);

    let evt: WebhookEvent;

    // Verify the webhook signature
    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return Response.json(
        { error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } },
        { status: 401 }
      );
    }

    // Handle the webhook event
    const { type, data } = evt;
    const clerkId = data.id; // This is the Clerk ID, used as primary key

    const email = data.email_addresses[0]?.email_address;

    if (!email) {
      return Response.json(
        { error: { code: 'INVALID_PAYLOAD', message: 'Email address is required' } },
        { status: 400 }
      );
    }

    switch (type) {
      case 'user.created': {
        // ADMIN_EMAILS is the source of truth for platform admins.
        // Otherwise, use Clerk invitation metadata and fall back to candidate.
        const role = getRoleForEmail(email, data.public_metadata?.role as Role | undefined);
        const domainId = role === Role.SUPER_ADMIN ? null : data.public_metadata?.domainId || null;

        // Check if user already exists by email (e.g. pre-provisioned super admin)
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          await prisma.user.update({
            where: { email },
            data: {
              id: clerkId, // Update dummy ID to real Clerk ID
              role,
              domainId,
            }
          });
        } else {
          // Create user in database
          await prisma.user.create({
            data: {
              id: clerkId, // Use Clerk ID as primary key
              email,
              role,
              domainId,
            },
          });
        }

        console.log(`User created: ${email} with role ${role}, domainId: ${domainId}`);
        break;
      }

      case 'user.updated': {
        // ADMIN_EMAILS is the source of truth for platform admins.
        // Otherwise, keep using Clerk public metadata when present.
        const metadataRole = data.public_metadata?.role as Role | undefined;
        const role = getRoleForEmail(email, metadataRole);
        const domainId = role === Role.SUPER_ADMIN ? null : data.public_metadata?.domainId;

        // Update user in database
        await prisma.user.update({
          where: { id: clerkId }, // Use Clerk ID directly
          data: {
            email,
            role,
            ...(domainId !== undefined && { domainId: domainId || null }),
          },
        });

        console.log(`User updated: ${email}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${type}`);
    }

    // Return success response
    return Response.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    return handleRouteError(error);
  }
}
