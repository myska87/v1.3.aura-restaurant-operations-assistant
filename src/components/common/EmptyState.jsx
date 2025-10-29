import React from 'react';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = Package, 
  title = 'No data found', 
  description = 'Get started by creating your first item',
  action = null,
  actionLabel = 'Create',
  onAction = null 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon className="w-16 h-16 text-gray-400 mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 text-center max-w-md">{description}</p>
      {action || onAction ? (
        action ? action : (
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        )
      ) : null}
    </div>
  );
}