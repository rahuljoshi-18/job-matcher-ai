import { z } from 'zod';
import { Role } from '@/generated/prisma';

export const invitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.nativeEnum(Role).default(Role.RECRUITER),
  domainId: z.string().min(1, 'Domain ID is required'),
});

export type InvitationInput = z.infer<typeof invitationSchema>;
