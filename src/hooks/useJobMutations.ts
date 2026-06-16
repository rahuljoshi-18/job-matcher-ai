import { useMutation, useQueryClient } from '@tanstack/react-query';
import { typedApiClient } from '@/lib/api/client';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import type { Job } from '@/generated/prisma';

interface CreateJobRequest {
  title: string;
  description: string;
  requiredSkills: string[];
}

interface UpdateJobRequest {
  title?: string;
  description?: string;
  requiredSkills?: string[];
}

/**
 * Hook for creating a new job posting
 * - Calls POST /api/jobs
 * - Invalidates jobs query cache on success
 * - Shows success toast on completion
 * - Returns error state for form display
 */
export function useCreateJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (jobData: CreateJobRequest) => {
      const res = await typedApiClient.post<Job>('/jobs', jobData);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate jobs query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      // Show success toast
      showSuccessToast('Job posting created successfully');
    },
    onError: (error: unknown) => {
      // Show error toast with appropriate message
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create job posting';
      showErrorToast(errorMessage);
    },
  });
}

/**
 * Hook for updating an existing job posting
 * - Calls PATCH /api/jobs/[id]
 * - Invalidates jobs query cache on success
 * - Shows success toast on completion
 * - Returns error state for form display
 */
export function useUpdateJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateJobRequest & { id: string }) => {
      const res = await typedApiClient.patch<Job>(`/jobs/${id}`, updateData);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate jobs query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      // Show success toast
      showSuccessToast('Job posting updated successfully');
    },
    onError: (error: unknown) => {
      // Show error toast with appropriate message
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update job posting';
      showErrorToast(errorMessage);
    },
  });
}

/**
 * Hook for deleting a job posting
 * - Calls DELETE /api/jobs/[id]
 * - Invalidates jobs query cache on success
 * - Shows success toast on completion
 * - Returns error state for form display
 */
export function useDeleteJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await typedApiClient.delete<{ success: boolean }>(`/jobs/${id}`);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate jobs query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      // Show success toast
      showSuccessToast('Job posting deleted successfully');
    },
    onError: (error: unknown) => {
      // Show error toast with appropriate message
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete job posting';
      showErrorToast(errorMessage);
    },
  });
}
