import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

/**
 * Audit Logger Component
 * Logs all sensitive data access for GDPR compliance
 * Import and use this in pages that handle sensitive data
 */

export async function logDataAccess({ entityName, actionType, recordId, isSensitive = false, changesMade = null, reason = null }) {
  try {
    const user = await base44.auth.me();
    
    // Get device/browser info
    const deviceInfo = navigator.userAgent;
    
    // Create audit log
    await base44.entities.DataAudit.create({
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      entity_accessed: entityName,
      action_type: actionType,
      record_id: recordId || null,
      timestamp: new Date().toISOString(),
      ip_address: null, // Would need backend support to get real IP
      device_info: deviceInfo,
      changes_made: changesMade,
      access_reason: reason,
      is_sensitive: isSensitive,
      session_id: sessionStorage.getItem('session_id') || null,
    });
  } catch (error) {
    console.error('Failed to log data access:', error);
  }
}

// Sensitive entities that require audit logging
export const SENSITIVE_ENTITIES = [
  'User',
  'TeamMember',
  'StaffProfile',
  'HRDocument',
  'PayrollRecord',
  'StaffDocument',
  'PerformanceMetric',
  'CoachingSession',
  'WageRate',
  'AttendanceRecord',
];

export function isSensitiveEntity(entityName) {
  return SENSITIVE_ENTITIES.includes(entityName);
}

// Hook for automatic audit logging
export function useAuditLog(entityName, actionType, recordId = null) {
  useEffect(() => {
    if (isSensitiveEntity(entityName)) {
      logDataAccess({
        entityName,
        actionType,
        recordId,
        isSensitive: true,
      });
    }
  }, [entityName, actionType, recordId]);
}

export default function AuditLogger() {
  // Background component - no render
  return null;
}