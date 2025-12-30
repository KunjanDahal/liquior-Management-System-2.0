import React from 'react';

interface ChartSkeletonProps {
  height?: number;
  showLegend?: boolean;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ 
  height = 300,
  showLegend = true,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-48 animate-pulse mb-2"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-32 animate-pulse"></div>
      </div>

      {/* Chart Area */}
      <div 
        className="relative bg-gray-50 rounded-lg border border-gray-200"
        style={{ height: `${height}px` }}
      >
        {/* Y-axis labels */}
        <div className="absolute left-4 top-4 bottom-4 flex flex-col justify-between">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div 
              key={idx}
              className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-8 animate-pulse"
              style={{ animationDelay: `${idx * 50}ms` }}
            ></div>
          ))}
        </div>

        {/* Chart bars/lines */}
        <div className="absolute left-16 right-4 top-4 bottom-4 flex items-end justify-between space-x-2">
          {Array.from({ length: 7 }).map((_, idx) => {
            const barHeight = Math.random() * 60 + 20; // Random height between 20-80%
            return (
              <div
                key={idx}
                className="flex-1 bg-gradient-to-t from-blue-200 via-blue-100 to-blue-200 rounded-t animate-pulse"
                style={{ 
                  height: `${barHeight}%`,
                  animationDelay: `${idx * 50}ms`
                }}
              ></div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-4 bottom-0 flex justify-between px-2">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div 
              key={idx}
              className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-12 animate-pulse"
              style={{ animationDelay: `${idx * 50}ms` }}
            ></div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-4 flex justify-center space-x-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full animate-pulse"
                   style={{ animationDelay: `${idx * 50}ms` }}></div>
              <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-16 animate-pulse"
                   style={{ animationDelay: `${idx * 50}ms` }}></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

