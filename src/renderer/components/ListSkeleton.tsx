import React from 'react';

interface ListSkeletonProps {
  items?: number;
  showIcon?: boolean;
  showBadge?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ 
  items = 5,
  showIcon = true,
  showBadge = false,
}) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100"
        >
          {/* Left side - Icon & Info */}
          <div className="flex items-center space-x-4 flex-1">
            {showIcon && (
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg animate-pulse"></div>
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-32 animate-pulse" 
                   style={{ animationDelay: `${idx * 50}ms` }}></div>
              <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-24 animate-pulse" 
                   style={{ animationDelay: `${idx * 50 + 25}ms` }}></div>
            </div>
          </div>

          {/* Right side - Amount & Badge */}
          <div className="flex items-center space-x-3">
            <div className="text-right space-y-2">
              <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-16 animate-pulse" 
                   style={{ animationDelay: `${idx * 50}ms` }}></div>
              <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-12 animate-pulse" 
                   style={{ animationDelay: `${idx * 50 + 25}ms` }}></div>
            </div>
            {showBadge && (
              <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-16 animate-pulse" 
                   style={{ animationDelay: `${idx * 50}ms` }}></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

