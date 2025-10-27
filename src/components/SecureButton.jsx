import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import PermissionGuard from './PermissionGuard';

/**
 * Secure Button - Only shows if user has permission
 */
export default function SecureButton({ 
  entity, 
  action = 'create', 
  record = null,
  children, 
  showLock = true,
  ...buttonProps 
}) {
  return (
    <PermissionGuard 
      entity={entity} 
      action={action} 
      record={record}
      fallback={
        showLock ? (
          <Button {...buttonProps} disabled className="opacity-50">
            <Lock className="w-4 h-4 mr-2" />
            {children}
          </Button>
        ) : null
      }
    >
      <Button {...buttonProps}>
        {children}
      </Button>
    </PermissionGuard>
  );
}