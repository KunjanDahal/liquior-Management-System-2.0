import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../../shared/types';

export interface SoldItem {
  itemId: number;
  description: string;
  currentQuantity: number;
  soldQuantity: number;
  reorderPoint?: number;
  cost?: number;
  price?: number;
}

export function useSoldItems(supplierId: number | null, startDate: string, endDate: string, enabled: boolean = true) {
  return useQuery<ApiResponse<SoldItem[]>, Error>({
    queryKey: ['sold-items', supplierId, startDate, endDate],
    queryFn: async () => {
      const response = await window.electronAPI.getSoldItems(supplierId, startDate, endDate);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sold items');
      }
      return response;
    },
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

