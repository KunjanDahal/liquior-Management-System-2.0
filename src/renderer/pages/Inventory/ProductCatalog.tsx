import {
  Download,
  Filter,
  Grid3X3,
  Package,
  Plus,
  Search,
  Table,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Product } from '../../../shared/types';
import { ProductTable } from './components/ProductTable';
import { useProducts } from '../../hooks/useProducts';
import { TableSkeleton } from '../../components/TableSkeleton';

export const ProductCatalog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [sortBy, setSortBy] = useState('Name');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const { data: productsResponse, isLoading, error } = useProducts();
  const products = productsResponse?.data || [];

  // Extract unique categories from products
  const categories = useMemo(() => {
    const cats = new Set<string>(['All Categories']);
    products.forEach(product => {
      if (product.category) {
        cats.add(product.category);
      }
    });
    return Array.from(cats);
  }, [products]);

  const statuses = ['All Status', 'In Stock', 'Low Stock', 'Out of Stock'];
  const sortOptions = ['Name', 'SKU', 'Category', 'Price', 'Stock'];

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All Categories' ||
        product.category === selectedCategory;

      let matchesStatus = true;
      if (selectedStatus !== 'All Status') {
        if (selectedStatus === 'In Stock') {
          matchesStatus = product.stock > product.minStock;
        } else if (selectedStatus === 'Low Stock') {
          matchesStatus =
            product.stock > 0 && product.stock <= product.minStock;
        } else if (selectedStatus === 'Out of Stock') {
          matchesStatus = product.stock === 0;
        }
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort products based on selected sort option
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'Name':
          return a.name.localeCompare(b.name);
        case 'SKU':
          return a.sku.localeCompare(b.sku);
        case 'Category':
          return a.category.localeCompare(b.category);
        case 'Price':
          return b.price - a.price; // Descending order
        case 'Stock':
          return b.stock - a.stock; // Descending order
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchTerm, selectedCategory, selectedStatus, sortBy]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
            <p className="text-gray-600 mt-1">
              Manage your inventory, track stock levels, and organize products.
            </p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="card-flat">
          <div className="flex flex-col gap-4">
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse flex-1"></div>
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse flex-1"></div>
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-32"></div>
            </div>
          </div>
        </div>

        {/* Product List Section */}
        <div className="card-flat">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
          </div>
          <TableSkeleton rows={8} columns={7} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error loading products
          </h3>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-gray-600 mt-1">
            Manage your inventory, track stock levels, and organize products.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn btn-secondary flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Import Products
          </button>
          <button className="btn btn-secondary flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <button className="btn btn-primary flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="card-flat">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or barcode..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {sortOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <button className="btn btn-secondary flex items-center justify-center gap-2">
              <Filter className="w-4 h-4" />
              Advanced
            </button>
          </div>
        </div>
      </div>

      {/* Product List Section */}
      <div className="card-flat">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Products ({filteredAndSortedProducts.length})
          </h2>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Table className="w-4 h-4" />
              Table View
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Grid View
            </button>
          </div>
        </div>

        {filteredAndSortedProducts.length > 0 ? (
          <ProductTable products={filteredAndSortedProducts} />
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or filters to find what you're
              looking for.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All Categories');
                setSelectedStatus('All Status');
              }}
              className="btn btn-primary"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
