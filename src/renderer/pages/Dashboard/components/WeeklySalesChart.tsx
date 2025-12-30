import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWeeklySales } from '../../../hooks/useWeeklySales';
import { ChartSkeleton } from '../../../components/ChartSkeleton';

export const WeeklySalesChart: React.FC = () => {
  const { data: weeklyDataResponse, isLoading, error } = useWeeklySales();
  const weeklyData = weeklyDataResponse?.data || [];

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return { totalSales: 0, totalTransactions: 0, avgTransaction: 0 };
    }

    const totalSales = weeklyData.reduce((sum, day) => sum + day.sales, 0);
    const totalTransactions = weeklyData.reduce((sum, day) => sum + day.transactions, 0);
    const avgTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    return { totalSales, totalTransactions, avgTransaction };
  }, [weeklyData]);

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
    return <ChartSkeleton height={320} showLegend={true} />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Error loading sales data</p>
          <p className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Weekly Sales</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Sales ($)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Transactions</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        {weeklyData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No sales data available for the last 7 days</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'Sales ($)') {
                    return formatCurrency(value);
                  }
                  return value;
                }}
              />
              <Bar
                dataKey="sales"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                name="Sales ($)"
              />
              <Bar
                dataKey="transactions"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                name="Transactions"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalSales)}</p>
          <p className="text-sm text-gray-500">Total Sales</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalTransactions)}</p>
          <p className="text-sm text-gray-500">Total Transactions</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.avgTransaction)}</p>
          <p className="text-sm text-gray-500">Avg. Transaction</p>
        </div>
      </div>
    </div>
  );
};
