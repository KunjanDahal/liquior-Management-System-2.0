import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-4',
  };

  const containerClasses = fullScreen
    ? 'min-h-screen bg-gray-50 flex items-center justify-center'
    : 'flex items-center justify-center py-8';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div className={`inline-block animate-spin rounded-full ${sizeClasses[size]} border-gray-200 border-t-blue-600`}></div>
        {message && (
          <p className={`mt-4 text-gray-600 font-medium ${size === 'sm' ? 'text-sm' : ''}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};
