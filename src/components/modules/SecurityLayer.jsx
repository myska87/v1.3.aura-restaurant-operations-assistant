/**
 * AURA Security Layer
 * Role-Based Access Control (RBAC) and Audit Logging
 */

import { base44 } from '@/api/base44Client';

export const ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  CHEF: 'chef',
  STAFF: 'staff',
};

export const PERMISSIONS = {
  // User Management
  USER_VIEW: ['admin', 'owner', 'manager'],
  USER_CREATE: ['admin', 'owner'],
  USER_EDIT: ['admin', 'owner', 'manager'],
  USER_DELETE: ['admin', 'owner'],
  
  // Inventory
  INVENTORY_VIEW: ['admin', 'owner', 'manager', 'chef'],
  INVENTORY_EDIT: ['admin', 'owner', 'manager'],
  INVENTORY_ORDER: ['admin', 'owner', 'manager'],
  
  // Quality
  QUALITY_VIEW: ['admin', 'owner', 'manager'],
  QUALITY_SUBMIT: ['admin', 'owner', 'manager', 'chef', 'staff'],
  QUALITY_EDIT: ['admin', 'owner', 'manager'],
  
  // SOP
  SOP_VIEW: ['admin', 'owner', 'manager', 'chef', 'staff'],
  SOP_CREATE: ['admin', 'owner', 'manager'],
  SOP_EDIT: ['admin', 'owner', 'manager'],
  SOP_DELETE: ['admin', 'owner'],
  
  // Audit
  AUDIT_VIEW: ['admin', 'owner'],
  AUDIT_EXPORT: ['admin', 'owner'],
  
  // AI Agents
  AGENT_VIEW: ['admin', 'owner', 'manager'],
  AGENT_CONTROL: ['admin', 'owner'],
};

export function hasPermission(user, permission) {
  if (!user) return false;
  
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  
  // Check if user's role is in allowed roles
  if (user.role === 'admin') return true; // Admin has all permissions
  
  return allowedRoles.includes(user.role) || allowedRoles.includes(user.position);
}

export function requiresPermission(user, permission) {
  if (!hasPermission(user, permission)) {
    throw new Error(`Access Denied: ${permission} permission required`);
  }
  return true;
}

export async function auditLog(action, entityName, recordId, changes = null, user = null) {
  try {
    if (!user) {
      user = await base44.auth.me();
    }

    await base44.entities.AuditTrail.create({
      entity_name: entityName,
      record_id: recordId,
      action: action,
      user_email: user.email,
      user_name: user.full_name,
      user_role: user.role || user.position,
      changes: changes,
      timestamp: new Date().toISOString(),
      is_sensitive: ['User', 'PayrollRecord', 'HRDocument'].includes(entityName),
    });
  } catch (error) {
    console.error('❌ Audit log failed:', error);
  }
}

export function withAuditLog(action, entityName) {
  return async (recordId, data, user) => {
    try {
      const result = await action(recordId, data);
      await auditLog('update', entityName, recordId, data, user);
      return result;
    } catch (error) {
      console.error('❌ Action with audit log failed:', error);
      throw error;
    }
  };
}