import { apiClient } from '@/lib/axios';
import { ApiResponse } from '@/lib/api/response';

/**
 * A typed wrapper around apiClient that expects the standard ApiResponse envelope
 */
export const typedApiClient = {
  get: async <T>(url: string, params?: unknown): Promise<ApiResponse<T>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<T>>(url, { params: params as any });
    return res.data;
  },
  
  post: async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    const res = await apiClient.post<ApiResponse<T>>(url, data);
    return res.data;
  },
  
  patch: async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    const res = await apiClient.patch<ApiResponse<T>>(url, data);
    return res.data;
  },
  
  delete: async <T>(url: string, params?: unknown): Promise<ApiResponse<T>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.delete<ApiResponse<T>>(url, { params: params as any });
    return res.data;
  },
};
