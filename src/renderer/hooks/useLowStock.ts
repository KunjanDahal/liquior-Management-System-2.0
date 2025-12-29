/**
 * React Query hook for fetching low stock alerts
 */

import { useQuery } from '@tanstack/react-query';
import { StockAlert, ApiResponse } from '../../shared/types';

export function useLowStock() {
  return useQuery<ApiResponse<StockAlert[]>, Error>({
    queryKey: ['lowStock'],
    queryFn: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      const response = await window.electronAPI.getLowStockProducts();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch low stock items');
      }
      return response;
    },
    staleTime: 1 * 60 * 1000, // 1 minute (more frequent updates for alerts)
  });
}


