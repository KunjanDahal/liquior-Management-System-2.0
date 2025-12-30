import {
  AlertTriangle,
  CheckCircle,
  Filter,
  Package,
  Truck,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AlertFilters, AlertSummary, StockAlert } from '../../../shared/types';
import { AlertSummaryCard, AlertTable, SearchAndFilters } from './components';
import { useLowStock } from '../../hooks/useLowStock';
import { TableSkeleton } from '../../components/TableSkeleton';

export const LowStockAlerts: React.FC = () => {
  const [filters, setFilters] = useState<AlertFilters>({
    search: '',
    priority: 'all',
    category: 'all',
  });

  const { data: alertsResponse, isLoading, error } = useLowStock();
  const alerts = alertsResponse?.data || [];

  // Calculate alert summary from real data
  const alertSummary: AlertSummary = useMemo(() => {
    const critical = alerts.filter(a => a.priority === 'critical' && !a.isOutOfStock).length;
    const highPriority = alerts.filter(a => a.priority === 'high').length;
    const outOfStock = alerts.filter(a => a.isOutOfStock).length;
    const resolvedToday = 0; // This would need to be tracked separately

    return {
      critical,
      highPriority,
      outOfStock,
      resolvedToday,
    };
  }, [alerts]);

  // Filter alerts based on search and filters
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch =
        alert.productName.toLowerCase().includes(filters.search.toLowerCase()) ||
        alert.sku.toLowerCase().includes(filters.search.toLowerCase());
      const matchesPriority =
        filters.priority === 'all' || alert.priority === filters.priority;
      const matchesCategory =
        filters.category === 'all' || alert.category === filters.category;
      return matchesSearch && matchesPriority && matchesCategory;
    });
  }, [alerts, filters]);

  const handleConfigureAlerts = () => {
    // TODO: Implement configure alerts functionality
    console.log('Configure alerts clicked');
  };

  const handleBulkRestock = () => {
    // TODO: Implement bulk restock functionality
    console.log('Bulk restock clicked');
  };

  const handleQuickAdd = (alertId: string) => {
    // TODO: Implement quick add functionality
    console.log('Quick add for alert:', alertId);
  };

  const handleOrder = (alertId: string) => {
    // TODO: Implement order functionality
    console.log('Order for alert:', alertId);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                Low Stock Alerts
              </h1>
            </div>
            <p className="text-gray-600">
              Monitor and manage products that are running low on inventory.
            </p>
          </div>
        </div>

        {/* Alert Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Search and Filters Skeleton */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse mb-4"></div>
          <div className="flex gap-3">
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse flex-1"></div>
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse flex-1"></div>
          </div>
        </div>

        {/* Active Alerts Table Skeleton */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse mb-4"></div>
          <TableSkeleton rows={6} columns={7} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error loading alerts
          </h3>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Low Stock Alerts
            </h1>
          </div>
          <p className="text-gray-600">
            Monitor and manage products that are running low on inventory.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleConfigureAlerts}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Configure Alerts</span>
          </button>
          <button
            onClick={handleBulkRestock}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Truck className="w-4 h-4" />
            <span>Bulk Restock</span>
          </button>
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AlertSummaryCard
          title="Critical Alerts"
          count={alertSummary.critical}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
        />
        <AlertSummaryCard
          title="High Priority"
          count={alertSummary.highPriority}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="orange"
        />
        <AlertSummaryCard
          title="Out of Stock"
          count={alertSummary.outOfStock}
          icon={<Package className="w-6 h-6" />}
          color="blue"
        />
        <AlertSummaryCard
          title="Resolved Today"
          count={alertSummary.resolvedToday}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
      </div>

      {/* Search and Filters */}
      <SearchAndFilters filters={filters} onFiltersChange={setFilters} />

      {/* Active Alerts Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Active Alerts ({filteredAlerts.length})
        </h2>
        <AlertTable
          alerts={filteredAlerts}
          onQuickAdd={handleQuickAdd}
          onOrder={handleOrder}
        />
      </div>
    </div>
  );
};
