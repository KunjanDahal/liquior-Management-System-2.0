import React from 'react';

interface GridSkeletonProps {
  items?: number;
  columns?: number;
}

export const GridSkeleton: React.FC<GridSkeletonProps> = ({ 
  items = 6,
  columns = 2,
}) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || 'grid-cols-2'} gap-6`}>
      {Array.from({ length: items }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className="flex items-start space-x-4">
            {/* Image placeholder */}
            <div className="w-16 h-16 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg animate-pulse flex-shrink-0"
                 style={{ animationDelay: `${idx * 50}ms` }}></div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-3/4 animate-pulse" 
                   style={{ animationDelay: `${idx * 50}ms` }}></div>
              <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-1/2 animate-pulse" 
                   style={{ animationDelay: `${idx * 50 + 25}ms` }}></div>
              <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-1/3 animate-pulse" 
                   style={{ animationDelay: `${idx * 50 + 50}ms` }}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

