import { z } from 'zod';
import { Role } from '@/generated/prisma';

export const userRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export type UserRoleInput = z.infer<typeof userRoleSchema>;
