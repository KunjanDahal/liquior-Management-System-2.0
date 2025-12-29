/**
 * React Query mutation hook for creating a sale/receipt
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../../shared/types';
import { SalePayload } from '../../preload/preload';

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<{ id: string }>, Error, SalePayload>({
    mutationFn: async (payload: SalePayload) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      const response = await window.electronAPI.createSale(payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create sale');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Stock levels changed
      queryClient.invalidateQueries({ queryKey: ['lowStock'] }); // Stock alerts may have changed
    },
  });
}


