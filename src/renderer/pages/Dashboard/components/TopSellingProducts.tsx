import { Package, TrendingUp } from 'lucide-react';
import React from 'react';
import { useTopSellingProducts } from '../../../hooks/useTopSellingProducts';
import { ListSkeleton } from '../../../components/ListSkeleton';

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'down':
      return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
    default:
      return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
  }
};

export const TopSellingProducts: React.FC = () => {
  const { data: productsResponse, isLoading, error } = useTopSellingProducts(5);
  const topProducts = productsResponse?.data || [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Top Selling Products
          </h3>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
            View All
          </button>
        </div>
        <ListSkeleton items={5} showIcon={true} showBadge={false} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Error loading products</p>
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
        <h3 className="text-lg font-semibold text-gray-900">
          Top Selling Products
        </h3>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {topProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No sales data available</p>
          </div>
        ) : (
          topProducts.map((product, index) => (
          <div
            key={product.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">
                  #{index + 1}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-gray-600" />
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    {product.name}
                  </h4>
                  <p className="text-sm text-gray-500">{product.category}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {product.sales} sold
                </p>
                <p className="text-sm text-gray-500">
                  ${product.revenue.toFixed(2)}
                </p>
              </div>

              <div className="flex items-center">
                {getTrendIcon(product.trend)}
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};
