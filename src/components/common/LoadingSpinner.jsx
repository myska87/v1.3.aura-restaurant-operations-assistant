import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...', size = 'default' }) {
  const sizeClass = size === 'small' ? 'w-6 h-6' : size === 'large' ? 'w-16 h-16' : 'w-12 h-12';

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className={`${sizeClass} animate-spin text-emerald-600 mb-4`} />
      <p className="text-gray-600">{message}</p>
    </div>
  );
}