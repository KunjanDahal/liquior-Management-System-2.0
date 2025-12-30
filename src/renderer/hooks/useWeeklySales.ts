/**
 * React Query hook for fetching weekly sales data
 */

import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../../shared/types';

export interface WeeklySalesData {
  day: string;
  sales: number;
  transactions: number;
}

export function useWeeklySales() {
  return useQuery<ApiResponse<WeeklySalesData[]>, Error>({
    queryKey: ['weeklySales'],
    queryFn: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      const response = await window.electronAPI.getWeeklySales();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch weekly sales data');
      }
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (weekly data updates less frequently)
  });
}

