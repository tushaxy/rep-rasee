/**
 * Custom React Query hooks for business-profile management.
 * These endpoints are not in the generated OpenAPI client.
 */
import { useQuery, useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';

export type BusinessProfileSummary = {
  id: number;
  shopName: string;
  ownerName: string;
  phone: string;
  email?: string | null;
  gstNumber?: string | null;
  userId: string;
};

export const PROFILES_QUERY_KEY = ['business-profiles'] as const;

export function useGetBusinessProfiles() {
  return useQuery({
    queryKey: PROFILES_QUERY_KEY,
    queryFn: () =>
      customFetch<BusinessProfileSummary[]>('/api/business-profiles'),
    staleTime: 30_000,
  });
}

export function useDeleteBusinessProfile(options?: UseMutationOptions<void, unknown, { id: number }>) {
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      customFetch<void>(`/api/business-profiles/${id}`, { method: 'DELETE', responseType: 'text' }) as Promise<void>,
    ...options,
  });
}
