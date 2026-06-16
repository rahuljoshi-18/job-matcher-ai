import { z } from 'zod';
import { ApplicationStatus } from '@/generated/prisma';

export const createApplicationSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
});

export const updateApplicationStatusSchema = z.object({
  status: z.nativeEnum(ApplicationStatus),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
