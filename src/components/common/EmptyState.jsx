import React from 'react';
import { Button } from '@/components/ui/button';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  message, 
  action,
  actionLabel,
  onAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {message && (
        <p className="text-gray-600 mb-6 max-w-md">{message}</p>
      )}
      {action || (onAction && actionLabel) && (
        action || (
          <Button onClick={onAction} className="bg-[#014D40] hover:bg-[#013830]">
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}