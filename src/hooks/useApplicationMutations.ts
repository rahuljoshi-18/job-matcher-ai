import { useMutation, useQueryClient } from '@tanstack/react-query';
import { typedApiClient } from '@/lib/api/client';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import type { Application, ApplicationStatus } from '@/generated/prisma';

interface CreateApplicationRequest {
  jobId: string;
}

/**
 * Hook for creating a new job application
 * - Calls POST /api/applications
 * - Uses candidate's skills from their profile
 * - Invalidates applications query cache on success
 * - Shows success toast on completion
 * - Returns error state for form display
 * 
 * Requirements: 3.2, 3.4, 15.1, 15.2
 */
export function useCreateApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (applicationData: CreateApplicationRequest) => {
      const res = await typedApiClient.post<Application>('/applications', applicationData);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate applications query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      
      // Show success toast
      showSuccessToast('Application submitted successfully');
    },
    onError: (error: unknown) => {
      // Show error toast with appropriate message
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit application';
      showErrorToast(errorMessage);
    },
  });
}

/**
 * Hook for updating application status
 * - Calls PATCH /api/applications/[id]/status
 * - Invalidates applications query cache on success
 * - Shows success toast on completion
 * - Returns error state for form display
 * 
 * Requirements: 7.4, 7.7, 15.1, 15.2
 */
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) => {
      const res = await typedApiClient.patch<Application>(
        `/applications/${applicationId}/status`,
        { status }
      );
      return res.data;
    },
    onSuccess: () => {
      // Invalidate applications query cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      
      // Show success toast
      showSuccessToast('Application status updated successfully');
    },
    onError: (error: unknown) => {
      // Show error toast with appropriate message
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update application status';
      showErrorToast(errorMessage);
    },
  });
}
