import {
  AlertTriangle,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { DashboardCard } from './components/DashboardCard';
import { LowStockAlerts } from './components/LowStockAlerts';
import { QuickActions } from './components/QuickActions';
import { RecentTransactions } from './components/RecentTransactions';
import { TopSellingProducts } from './components/TopSellingProducts';
import { WeeklySalesChart } from './components/WeeklySalesChart';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const Dashboard: React.FC = () => {
  const { data: statsResponse, isLoading, error } = useDashboardStats();
  const stats = statsResponse?.data;

  // Calculate trend percentages
  const trends = useMemo(() => {
    if (!stats) return null;

    const todayVsYesterdaySales = stats.yesterdaysSales > 0
      ? ((stats.todaysSales - stats.yesterdaysSales) / stats.yesterdaysSales) * 100
      : 0;

    const todayVsYesterdayTransactions = stats.transactionsYesterday > 0
      ? ((stats.transactionsToday - stats.transactionsYesterday) / stats.transactionsYesterday) * 100
      : 0;

    const monthVsLastMonth = stats.lastMonthRevenue > 0
      ? ((stats.monthlyRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100
      : 0;

    return {
      sales: {
        value: `${todayVsYesterdaySales >= 0 ? '+' : ''}${todayVsYesterdaySales.toFixed(1)}%`,
        isPositive: todayVsYesterdaySales >= 0,
      },
      transactions: {
        value: `${todayVsYesterdayTransactions >= 0 ? '+' : ''}${todayVsYesterdayTransactions.toFixed(1)}%`,
        isPositive: todayVsYesterdayTransactions >= 0,
      },
      monthly: {
        value: `${monthVsLastMonth >= 0 ? '+' : ''}${monthVsLastMonth.toFixed(1)}%`,
        isPositive: monthVsLastMonth >= 0,
      },
    };
  }, [stats]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format number with commas
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner message="Loading dashboard..." fullScreen={false} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Error loading dashboard</p>
          <p className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here's what's happening at your store today.
        </p>
      </div>

      {/* KPI Cards Grid - 3x2 Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          title="Today's Sales"
          value={formatCurrency(stats.todaysSales)}
          icon={<DollarSign className="w-8 h-8" />}
          trend={trends ? trends.sales : undefined}
          subtitle="Compared to yesterday"
        />
        <DashboardCard
          title="Total Inventory Value"
          value={formatCurrency(stats.totalInventoryValue)}
          icon={<Package className="w-8 h-8" />}
          subtitle="Current stock value"
        />
        <DashboardCard
          title="Transactions Today"
          value={formatNumber(stats.transactionsToday)}
          icon={<ShoppingCart className="w-8 h-8" />}
          trend={trends ? trends.transactions : undefined}
          subtitle="Sales transactions"
        />
        <DashboardCard
          title="Active Customers"
          value={formatNumber(stats.activeCustomers)}
          icon={<Users className="w-8 h-8" />}
          subtitle="Registered customers"
        />
        <DashboardCard
          title="Low Stock Items"
          value={formatNumber(stats.lowStockItemsCount)}
          icon={<AlertTriangle className="w-8 h-8" />}
          subtitle="Items below threshold"
        />
        <DashboardCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={<TrendingUp className="w-8 h-8" />}
          trend={trends ? trends.monthly : undefined}
          subtitle="This month's total"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Charts and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklySalesChart />
        <TopSellingProducts />
      </div>

      {/* Recent Transactions and Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions />
        <LowStockAlerts />
      </div>
    </div>
  );
};
