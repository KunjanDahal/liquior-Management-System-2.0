import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../../shared/types';

export interface CreateSupplierPayload {
  name: string;
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

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<{ id: number }>, Error, CreateSupplierPayload>({
    mutationFn: async (payload) => {
      const response = await window.electronAPI.createSupplier(payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create supplier');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate suppliers query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

