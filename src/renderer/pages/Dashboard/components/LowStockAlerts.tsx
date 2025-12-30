import { AlertTriangle, Package, Plus } from 'lucide-react';
import React from 'react';
import { StockAlert } from '../../../../shared/types';
import { useLowStock } from '../../../hooks/useLowStock';
import { ListSkeleton } from '../../../components/ListSkeleton';

const priorityColors = {
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  critical: 'bg-red-500 text-white',
  low: 'bg-gray-500 text-white',
};

export const LowStockAlerts: React.FC = () => {
  const { data: alertsResponse, isLoading, error } = useLowStock();
  const alerts = (alertsResponse?.data || []).slice(0, 5); // Show top 5
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Low Stock Alerts
            </h3>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            View All
          </button>
        </div>
        <ListSkeleton items={5} showIcon={true} showBadge={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Error loading alerts</p>
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
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Low Stock Alerts
          </h3>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No low stock alerts</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all duration-200"
            >
              {/* Product Icon & Info */}
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {alert.productName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {alert.category} • {alert.sku}
                  </p>
                </div>
              </div>

              {/* Stock Info */}
              <div className="text-right mr-4">
                <p className="font-semibold text-gray-900">
                  {alert.currentStock} / {alert.minStock} units
                </p>
                <p className="text-xs text-gray-500">Current / Min Stock</p>
              </div>

              {/* Priority Badge */}
              <div className="flex items-center space-x-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    priorityColors[alert.priority] || priorityColors.low
                  }`}
                >
                  {alert.priority}
                </span>
                <button className="p-2 hover:bg-orange-100 rounded-lg transition-colors">
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6">
        <button className="w-full flex items-center justify-center space-x-2 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <AlertTriangle className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">
            Manage All Stock Alerts
          </span>
        </button>
      </div>
    </div>
  );
};
