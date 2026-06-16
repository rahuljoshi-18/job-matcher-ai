import { z } from 'zod';

export const domainSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  domainName: z.string().min(1, 'Domain name is required').trim().toLowerCase(),
});

export type DomainInput = z.infer<typeof domainSchema>;
