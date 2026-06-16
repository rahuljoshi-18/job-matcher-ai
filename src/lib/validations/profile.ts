import { z } from 'zod';

export const experienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, 'Company name is required'),
  role: z.string().min(1, 'Role is required'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().nullable().optional(),
  field: z.string().nullable().optional(),
  graduationYear: z.number().nullable().optional(),
});

export const certificationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  issuer: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
});

export const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  level: z.string().nullable().optional(),
});

export type ExperienceInput = z.infer<typeof experienceSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type CertificationInput = z.infer<typeof certificationSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
