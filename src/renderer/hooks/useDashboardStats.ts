/**
 * React Query hook for fetching dashboard statistics
 */

import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../../shared/types';

export interface DashboardStats {
  todaysSales: number;
  yesterdaysSales: number;
  totalInventoryValue: number;
  transactionsToday: number;
  transactionsYesterday: number;
  activeCustomers: number;
  lowStockItemsCount: number;
  monthlyRevenue: number;
  lastMonthRevenue: number;
}

export function useDashboardStats() {
  return useQuery<ApiResponse<DashboardStats>, Error>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      const response = await window.electronAPI.getDashboardStats();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard stats');
      }
      return response;
    },
    staleTime: 1 * 60 * 1000, // 1 minute (dashboard stats update less frequently)
  });
}

