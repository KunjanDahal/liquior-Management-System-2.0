import { Minus, Plus, ShoppingBag, ShoppingCart, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { Product } from '../../../shared/types';
import { useCreateSale } from '../../../hooks/useCreateSale';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

export const Cart: React.FC<CartProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'check'>('cash');
  const [tenderAmount, setTenderAmount] = useState<string>('');
  const createSale = useCreateSale();

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const tax = subtotal * 0.08; // 8% tax (can be made configurable)
  const total = subtotal + tax;
  const change = paymentMethod === 'cash' && tenderAmount
    ? parseFloat(tenderAmount) - total
    : 0;

  const handleProcessPayment = async () => {
    if (items.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (paymentMethod === 'cash' && (!tenderAmount || parseFloat(tenderAmount) < total)) {
      alert('Insufficient payment amount');
      return;
    }

    try {
      const salePayload = {
        items: items.map(item => ({
          itemId: parseInt(item.product.id),
          quantity: item.quantity,
          price: item.product.price,
        })),
        subtotal,
        tax,
        total,
        paymentMethod,
        tenderAmount: paymentMethod === 'cash' ? parseFloat(tenderAmount) : total,
        change: change > 0 ? change : undefined,
      };

      await createSale.mutateAsync(salePayload);
      alert('Sale completed successfully!');
      onClearCart();
      setTenderAmount('');
    } catch (error) {
      alert(`Error processing payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Cart Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="w-5 h-5 text-gray-900" />
          <h2 className="text-xl font-semibold text-gray-900">Cart</h2>
        </div>
      </div>

      {/* Cart Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cart is empty
              </h3>
              <p className="text-sm text-gray-500">
                Add products to start a transaction
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cart Items */}
            <div className="space-y-3">
              {items.map(item => (
                <div
                  key={item.product.id}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-gray-500">IMG</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      ${item.product.price.toFixed(2)} × {item.quantity} = ${(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="p-1 hover:bg-red-100 rounded ml-2"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span className="text-gray-900">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-xl font-bold text-gray-900">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={e => {
                  setPaymentMethod(e.target.value as 'cash' | 'card' | 'check');
                  setTenderAmount('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="check">Check</option>
              </select>
            </div>

            {/* Tender Amount (for cash) */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Amount Tendered
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={total}
                  value={tenderAmount}
                  onChange={e => setTenderAmount(e.target.value)}
                  placeholder={`$${total.toFixed(2)}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                {change > 0 && (
                  <p className="text-sm text-green-600 font-medium">
                    Change: ${change.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleProcessPayment}
                disabled={createSale.isPending || (paymentMethod === 'cash' && (!tenderAmount || parseFloat(tenderAmount) < total))}
                className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {createSale.isPending ? 'Processing...' : 'Process Payment'}
              </button>

              <button
                onClick={onClearCart}
                className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
