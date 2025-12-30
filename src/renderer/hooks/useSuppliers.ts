import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../../shared/types';
import { Supplier } from '../../shared/types';

export function useSuppliers() {
  return useQuery<ApiResponse<Supplier[]>, Error>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await window.electronAPI.getSuppliers();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch suppliers');
      }
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

