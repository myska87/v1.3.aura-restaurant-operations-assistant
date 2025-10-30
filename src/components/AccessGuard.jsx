import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * AccessGuard - Universal component for role-based access control
 * 
 * Usage:
 * <AccessGuard allowedRoles={['admin', 'manager', 'owner']}>
 *   <YourProtectedComponent />
 * </AccessGuard>
 */
export default function AccessGuard({ 
  children, 
  allowedRoles = [], 
  allowedPositions = [],
  fallbackMessage = "You don't have permission to access this page.",
  showHomeButton = true 
}) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  const hasAccess = 
    (allowedRoles.length === 0 && allowedPositions.length === 0) || // No restrictions
    allowedRoles.includes(user?.role) || 
    allowedPositions.includes(user?.position);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-6">{fallbackMessage}</p>
            {showHomeButton && (
              <Link to={createPageUrl('Dashboard')}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * useAccessControl hook - Check if user has access to a feature
 */
export function useAccessControl(allowedRoles = [], allowedPositions = []) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const hasAccess = 
    (allowedRoles.length === 0 && allowedPositions.length === 0) ||
    allowedRoles.includes(user?.role) || 
    allowedPositions.includes(user?.position);

  return { hasAccess, isLoading, user };
}