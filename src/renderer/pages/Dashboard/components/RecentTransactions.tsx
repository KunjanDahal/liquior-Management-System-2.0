import { Eye, Receipt } from 'lucide-react';
import React from 'react';
import { Transaction } from '../../../../shared/types';
import { useReceipts } from '../../../hooks/useReceipts';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

export const RecentTransactions: React.FC = () => {
  const { data: receiptsResponse, isLoading, error } = useReceipts(5);
  const transactions = receiptsResponse?.data || [];
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <LoadingSpinner message="Loading transactions..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Error loading transactions</p>
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
          Recent Transactions
        </h3>
        <button className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent transactions</p>
          </div>
        ) : (
          transactions.map(transaction => {
            const time = new Date(transaction.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all duration-200"
              >
                {/* Transaction Icon & Info */}
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-gray-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">
                      {transaction.customerName}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {transaction.id} • {time}
                    </p>
                  </div>
                </div>

                {/* Amount & Items */}
                <div className="text-right mr-4">
                  <p className="font-bold text-gray-900">
                    ${transaction.total.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">{transaction.items.length} items</p>
                </div>

                {/* Status & Action */}
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      transaction.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {transaction.status}
                  </span>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
