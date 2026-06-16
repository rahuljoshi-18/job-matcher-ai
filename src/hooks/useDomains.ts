import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { typedApiClient } from '@/lib/api/client';

interface Domain {
  id: string;
  name: string;
  domainName: string;
  publicKey: string | null;
  signature: string | null;
  verified: boolean;
  disabled: boolean;
  createdAt: string;
}

interface CreateDomainRequest {
  name: string;
  domainName: string;
  publicKey?: string;
  signature?: string;
}

interface UpdateDomainRequest {
  name?: string;
  publicKey?: string;
  signature?: string;
  verified?: boolean;
  disabled?: boolean;
}

export function useDomains() {
  return useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const res = await typedApiClient.get<Domain[]>('/domains');
      return res.data;
    },
  });
}

export function useDomain(id: string) {
  return useQuery({
    queryKey: ['domains', id],
    queryFn: async () => {
      const res = await typedApiClient.get<Domain>(`/domains/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateDomain() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (domainData: CreateDomainRequest) => {
      const res = await typedApiClient.post<Domain>('/domains', domainData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}

export function useUpdateDomain() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateDomainRequest & { id: string }) => {
      const res = await typedApiClient.patch<Domain>(`/domains/${id}`, updateData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await typedApiClient.delete<{ success: boolean; message: string }>(`/domains/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}
