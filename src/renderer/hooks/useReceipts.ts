/**
 * React Query hook for fetching recent receipts
 */

import { useQuery } from '@tanstack/react-query';
import { Transaction, ApiResponse } from '../../shared/types';

export function useReceipts(limit: number = 10) {
  return useQuery<ApiResponse<Transaction[]>, Error>({
    queryKey: ['receipts', limit],
    queryFn: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      const response = await window.electronAPI.getRecentReceipts(limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch receipts');
      }
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds (recent transactions update frequently)
  });
}


