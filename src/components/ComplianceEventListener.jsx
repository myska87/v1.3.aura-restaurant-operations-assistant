
import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * ComplianceCore Event Listener
 * Passive monitoring system - does not modify existing logic
 * Listens to app events and logs them for GDPR compliance
 */
export default function ComplianceEventListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Get user info for logging
    const getCurrentUser = async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    };

    // 1️⃣ LOGIN EVENT LISTENER
    const logLoginEvent = async (user) => {
      if (!user) return;

      try {
        await base44.entities.ComplianceAudit.create({
          module_name: 'staff',
          action: 'login',
          action_description: `User ${user.full_name} logged in`,
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          ip_address: await getIPAddress(),
          device_id: getDeviceId(),
          user_agent: navigator.userAgent,
          severity: 'info',
          is_sensitive: false,
        });
      } catch (error) {
        console.error('ComplianceCore: Failed to log login event', error);
      }
    };

    // 2️⃣ DOCUMENT VIEW LISTENER
    const setupDocumentViewListener = () => {
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function(...args) {
        originalPushState.apply(this, args);
        handlePageView();
      };

      history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        handlePageView();
      };

      window.addEventListener('popstate', handlePageView);

      return () => {
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
        window.removeEventListener('popstate', handlePageView);
      };
    };

    const handlePageView = async () => {
      const path = window.location.pathname;
      const sensitivePages = [
        'DocumentManagement',
        'StaffProfile',
        'AttendanceReports',
        'StaffWagesReport',
        'WeeklyPayrollReport',
        'PrivacyCenter',
      ];

      const isSensitive = sensitivePages.some(page => path.includes(page));

      if (isSensitive) {
        const user = await getCurrentUser();
        if (!user) return;

        try {
          await base44.entities.ComplianceAudit.create({
            module_name: 'documents',
            action: 'view',
            action_description: `Viewed sensitive page: ${path}`,
            user_id: user.id,
            user_email: user.email,
            user_name: user.full_name,
            ip_address: await getIPAddress(),
            user_agent: navigator.userAgent,
            severity: 'info',
            is_sensitive: true,
          });
        } catch (error) {
          console.error('ComplianceCore: Failed to log document view', error);
        }
      }
    };

    // 3️⃣ ORDER SENT LISTENER (via QueryClient cache)
    const setupOrderListener = () => {
      // Listen for purchase order mutations
      const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
        if (event?.type === 'updated') {
          const queryKey = event.query?.queryKey;
          if (queryKey && queryKey[0] === 'purchaseOrders') {
            handleOrderEvent();
          }
        }
      });

      return unsubscribe;
    };

    const handleOrderEvent = async () => {
      const user = await getCurrentUser();
      if (!user) return;

      try {
        await base44.entities.ComplianceAudit.create({
          module_name: 'orders',
          action: 'create',
          action_description: 'Purchase order activity detected',
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          ip_address: await getIPAddress(),
          user_agent: navigator.userAgent,
          severity: 'info',
          is_sensitive: false,
        });
      } catch (error) {
        console.error('ComplianceCore: Failed to log order event', error);
      }
    };

    // 4️⃣ ERROR EVENT LISTENER (500+ errors)
    const setupErrorListener = () => {
      const handleError = async (event) => {
        const error = event.error || event.reason;
        if (!error) return;

        const user = await getCurrentUser();
        const errorMessage = error.message || error.toString();
        
        // Check if it's a server error (500+)
        const isServerError = errorMessage.includes('500') || 
                              errorMessage.includes('Internal Server Error') ||
                              error.statusCode >= 500;

        if (isServerError) {
          try {
            await base44.entities.ComplianceSecurityIncident.create({
              incident_type: 'system_vulnerability',
              title: 'Server Error Detected',
              description: errorMessage,
              severity: 'high',
              triggered_by_user_id: user?.id || 'system',
              triggered_by_email: user?.email || 'system',
              ip_address: await getIPAddress(),
              status: 'open',
              detection_method: 'automated',
            });
          } catch (logError) {
            console.error('ComplianceCore: Failed to log security incident', logError);
          }
        }
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleError);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleError);
      };
    };

    // 5️⃣ FAILED LOGIN LISTENER (track suspicious activity)
    const setupFailedLoginListener = () => {
      let failedAttempts = 0;
      const maxAttempts = 5;

      const checkFailedLogins = async () => {
        failedAttempts++;

        if (failedAttempts >= maxAttempts) {
          try {
            await base44.entities.ComplianceSecurityIncident.create({
              incident_type: 'failed_login_attempts',
              title: 'Multiple Failed Login Attempts',
              description: `${failedAttempts} failed login attempts detected`,
              severity: 'medium',
              ip_address: await getIPAddress(),
              status: 'open',
              detection_method: 'automated',
            });
            failedAttempts = 0; // Reset counter
          } catch (error) {
            console.error('ComplianceCore: Failed to log security incident', error);
          }
        }
      };

      // This would integrate with auth system in production
      return checkFailedLogins;
    };

    // Initialize all listeners
    const cleanupPageView = setupDocumentViewListener();
    const cleanupOrder = setupOrderListener();
    const cleanupError = setupErrorListener();

    // Log initial session
    getCurrentUser().then(logLoginEvent);

    // Cleanup on unmount
    return () => {
      if (cleanupPageView) cleanupPageView();
      if (cleanupOrder) cleanupOrder();
      if (cleanupError) cleanupError();
    };
  }, [queryClient]);

  // Invisible component - no UI
  return null;
}

// Helper functions
const getIPAddress = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
};

const getDeviceId = () => {
  let deviceId = localStorage.getItem('aura_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('aura_device_id', deviceId);
  }
  return deviceId;
};
