/**
 * React Query hook for fetching products
 */

import { useQuery } from '@tanstack/react-query';
import { Product, ApiResponse } from '../../shared/types';

export function useProducts() {
  return useQuery<ApiResponse<Product[]>, Error>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      const response = await window.electronAPI.getProducts();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch products');
      }
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}


