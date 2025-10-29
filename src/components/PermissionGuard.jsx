import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

export default function PermissionGuard({ 
  featureKey, 
  children, 
  fallbackMessage = "You don't have permission to access this feature.",
  showFallback = true 
}) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => base44.entities.RolePermission.list(),
  });

  // Owner/Admin bypass
  if (user?.role === 'admin' || user?.position === 'owner') {
    return <>{children}</>;
  }

  const userPosition = user?.position?.toLowerCase();
  const permission = permissions.find(
    p => p.role_name === userPosition && p.feature_key === featureKey
  );

  const hasAccess = permission?.is_enabled === true;

  if (!hasAccess && !showFallback) {
    return null;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-6">{fallbackMessage}</p>
            <Link to={createPageUrl('Dashboard')}>
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}