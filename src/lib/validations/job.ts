import { z } from 'zod';
import { JobStatus } from '@/generated/prisma';

export const jobSchema = z.object({
  title: z
    .string()
    .min(5, 'Job title must be at least 5 characters')
    .max(200, 'Job title must not exceed 200 characters'),
  description: z
    .string()
    .min(20, 'Job description must be at least 20 characters')
    .max(5000, 'Job description must not exceed 5000 characters'),
  requiredSkills: z
    .array(z.string().min(1, 'Skill cannot be empty'))
    .min(1, 'At least one required skill must be specified'),
  status: z.nativeEnum(JobStatus),
});

export type JobInput = z.infer<typeof jobSchema>;
