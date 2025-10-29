import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { canAccessEntity, isManager, isAdmin } from './PermissionsConfig';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

/**
 * Permission Guard Component
 * Wraps content that requires specific permissions
 */
export default function PermissionGuard({ 
  entity, 
  action, 
  record = null, 
  children, 
  fallback = null,
  showMessage = false 
}) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Loading state
  if (!user) {
    return fallback || null;
  }

  // Check permission
  const hasPermission = canAccessEntity(entity, action, user, record);

  if (!hasPermission) {
    if (showMessage) {
      return (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 text-amber-600 mx-auto mb-3" />
            <h3 className="font-semibold text-amber-900 mb-2">Permission Required</h3>
            <p className="text-sm text-amber-700">
              You don't have permission to {action} {entity} records.
            </p>
            <p className="text-xs text-amber-600 mt-2">
              Contact your manager if you need access.
            </p>
          </CardContent>
        </Card>
      );
    }
    return fallback;
  }

  return children;
}

/**
 * Role Guard - Simple role checking
 */
export function RoleGuard({ requireManager = false, requireAdmin = false, children, fallback = null }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (!user) return fallback || null;

  if (requireAdmin && !isAdmin(user)) {
    return fallback;
  }

  if (requireManager && !isManager(user)) {
    return fallback;
  }

  return children;
}

/**
 * Security Badge - Shows user's permission level
 */
export function SecurityBadge({ user, className = "" }) {
  if (!user) return null;

  const role = user.role === 'admin' ? 'Admin' : 
               user.position === 'owner' ? 'Owner' :
               user.position === 'manager' ? 'Manager' : 'Staff';

  const colorClass = 
    role === 'Admin' || role === 'Owner' ? 'bg-red-100 text-red-800 border-red-200' :
    role === 'Manager' ? 'bg-blue-100 text-blue-800 border-blue-200' :
    'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${colorClass} ${className}`}>
      <Shield className="w-3.5 h-3.5" />
      <span className="text-xs font-semibold">{role}</span>
    </div>
  );
}