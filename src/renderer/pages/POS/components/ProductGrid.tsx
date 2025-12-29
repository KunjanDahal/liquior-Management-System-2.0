import { AlertTriangle, Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Product } from '../../../shared/types';
import { useProducts } from '../../../hooks/useProducts';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

interface ProductGridProps {
  searchQuery: string;
  onAddToCart?: (product: Product) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ searchQuery, onAddToCart }) => {
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const { data: productsResponse, isLoading, error } = useProducts();

  const products = productsResponse?.data || [];

  // Extract unique categories from products
  const categories = useMemo(() => {
    const cats = new Set<string>(['All Products']);
    products.forEach(product => {
      if (product.category) {
        cats.add(product.category);
      }
    });
    return Array.from(cats);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All Products' ||
        product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner message="Loading products..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading products</p>
          <p className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Category Filters */}
      <div className="flex items-center space-x-3 mb-6">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-6">
        {filteredProducts.map(product => (
          <div
            key={product.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start space-x-4">
              {/* Product Image */}
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {product.category === 'Whiskey' && (
                  <div className="text-2xl">🥃</div>
                )}
                {product.category === 'Vodka' && (
                  <div className="w-12 h-12 bg-gray-600 rounded"></div>
                )}
                {product.category === 'Beer' && (
                  <div className="text-2xl">🍺</div>
                )}
                {product.category === 'Tequila' && (
                  <div className="text-2xl">🍸</div>
                )}
                {product.category === 'Energy Drinks' && (
                  <div className="text-2xl font-bold text-red-500">R</div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm mb-1 leading-tight">
                  {product.name}
                </h4>
                <p className="text-xs text-gray-500 mb-1">{product.sku}</p>
                <p className="text-xs text-gray-400 mb-2">{product.category}</p>

                {/* 21+ Label for alcoholic beverages */}
                {product.requiresAgeVerification && (
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium mb-2">
                    21+
                  </span>
                )}
              </div>

              {/* Price and Stock */}
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-gray-900 mb-1">
                  ${product.price.toFixed(2)}
                </p>

                {/* Stock Status */}
                <div className="flex items-center justify-end space-x-1 mb-3">
                  <AlertTriangle
                    className={`w-3 h-3 ${
                      product.stock === 0
                        ? 'text-red-500'
                        : product.stock <= product.minStock
                          ? 'text-orange-500'
                          : 'text-green-500'
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      product.stock === 0
                        ? 'text-red-500'
                        : product.stock <= product.minStock
                          ? 'text-orange-500'
                          : 'text-green-500'
                    }`}
                  >
                    {product.stock} in stock
                  </span>
                </div>

                {/* Status Labels */}
                {product.stock === 0 && (
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                      Out of Stock
                    </span>
                  </div>
                )}
                {product.stock > 0 && product.stock <= product.minStock && (
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                      Low Stock
                    </span>
                  </div>
                )}

                {/* Add Button */}
                {product.stock > 0 && (
                  <button
                    onClick={() => onAddToCart?.(product)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-gray-800 text-white rounded text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
