/**
 * React Query hook for fetching top selling products
 */

import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../../shared/types';

export interface TopSellingProduct {
  id: string;
  name: string;
  category: string;
  sales: number;
  revenue: number;
  trend: 'up' | 'down' | 'stable';
}

export function useTopSellingProducts(limit: number = 5) {
  return useQuery<ApiResponse<TopSellingProduct[]>, Error>({
    queryKey: ['topSellingProducts', limit],
    queryFn: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      const response = await window.electronAPI.getTopSellingProducts(limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch top selling products');
      }
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (top products update less frequently)
  });
}

