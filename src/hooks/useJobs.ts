import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { typedApiClient } from '@/lib/api/client';
import type { Job, Application, User } from '@/generated/prisma';

// API response types that extend Prisma types with relations
type ApplicationWithUser = Application & {
  user?: Pick<User, 'id' | 'email' | 'role' | 'skills' | 'resumeUrl' | 'yearsOfExperience'> & {
    experiences?: unknown[];
    education?: unknown[];
    certifications?: unknown[];
  };
};


export interface JobWithScore extends Job {
  aiScore?: number;
}

export function useJobs(domainId?: string, recommended?: boolean) {
  const { userId, isLoaded } = useAuth();

  return useQuery({
    queryKey: ['jobs', userId, domainId, recommended],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (domainId) params.domainId = domainId;
      if (recommended) params.recommended = 'true';
      const res = await typedApiClient.get<JobWithScore[]>('/jobs', params);
      return res.data;
    },
    enabled: isLoaded && !!userId,
  });
}

export function useJob(id: string) {
  const { userId, isLoaded } = useAuth();

  return useQuery({
    queryKey: ['jobs', userId, id],
    queryFn: async () => {
      const res = await typedApiClient.get<Job>(`/jobs/${id}`);
      return res.data;
    },
    enabled: isLoaded && !!userId && !!id,
  });
}


export function useJobApplications(jobId: string) {
  const { userId, isLoaded } = useAuth();

  return useQuery({
    queryKey: ['jobs', userId, jobId, 'applications'],
    queryFn: async () => {
      const res = await typedApiClient.get<ApplicationWithUser[]>(`/jobs/${jobId}/applications`);
      return res.data;
    },
    enabled: isLoaded && !!userId && !!jobId,
  });
}
