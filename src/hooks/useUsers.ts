import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { typedApiClient } from '@/lib/api/client';
import type { User, Role, Domain, CandidateExperience, CandidateEducation, CandidateCertification } from '@/generated/prisma';

interface UpdateUserRequest {
  role?: Role;
  domainId?: string | null;
}

export interface CurrentUser extends User {
  domain: Domain | null;
  experiences: CandidateExperience[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
}

export function useUsers() {
  const { userId, isLoaded } = useAuth();

  return useQuery({
    queryKey: ['users', userId],
    queryFn: async () => {
      const res = await typedApiClient.get<User[]>('/users');
      return res.data;
    },
    enabled: isLoaded && !!userId,
  });
}

export function useCurrentUser() {
  const { userId, isLoaded } = useAuth();

  const query = useQuery({
    queryKey: ['users', 'me', userId],
    queryFn: async () => {
      const res = await typedApiClient.get<CurrentUser>('/users/me');
      return res.data;
    },
    enabled: isLoaded && !!userId,
  });

  return {
    ...query,
    isLoading: !isLoaded || (!!userId && query.isLoading),
    isPending: !isLoaded || query.isPending,
  };
}

export function useUser(id: string) {
  const { userId, isLoaded } = useAuth();

  return useQuery({
    queryKey: ['users', userId, id],
    queryFn: async () => {
      const res = await typedApiClient.get<User>(`/users/${id}`);
      return res.data;
    },
    enabled: isLoaded && !!userId && !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...userData }: UpdateUserRequest & { id: string }) => {
      const res = await typedApiClient.patch<User>(`/users/${id}`, userData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
