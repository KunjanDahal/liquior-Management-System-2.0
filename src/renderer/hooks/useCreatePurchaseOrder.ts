import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../../shared/types';

export interface PurchaseOrderItem {
  itemId: number;
  quantity: number;
  cost: number;
  price?: number;
}

export interface CreatePurchaseOrderPayload {
  supplierId: number;
  items: PurchaseOrderItem[];
  orderDate?: Date;
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<{ id: number }>, Error, CreatePurchaseOrderPayload>({
    mutationFn: async (payload) => {
      const response = await window.electronAPI.createPurchaseOrder(payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create purchase order');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['sold-items'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

