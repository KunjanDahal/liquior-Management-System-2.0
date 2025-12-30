import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../../shared/types';

export interface UpdateSupplierPayload {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  paymentTerms?: string;
  isActive?: boolean;
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<{ id: number }>, Error, { supplierId: number; payload: UpdateSupplierPayload }>({
    mutationFn: async ({ supplierId, payload }) => {
      const response = await window.electronAPI.updateSupplier(supplierId, payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update supplier');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate suppliers query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

