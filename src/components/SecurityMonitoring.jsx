import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function SecurityMonitoring() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!user) return;

    // Log user session
    const logSession = async () => {
      try {
        await base44.entities.DataAuditLog.create({
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          entity_accessed: 'User',
          entity_id: user.id,
          action: 'view',
          timestamp: new Date().toISOString(),
          device_type: getDeviceType(),
          browser: getBrowserInfo(),
          purpose: 'User session activity',
        });
      } catch (error) {
        console.error('Failed to log session:', error);
      }
    };

    logSession();

    // Monitor for suspicious activity
    const monitorActivity = async () => {
      try {
        // Get recent audit logs for this user
        const recentLogs = await base44.entities.DataAuditLog.filter({
          user_id: user.id
        });

        // Check for unusual patterns
        const last15Minutes = recentLogs.filter(log => {
          const logTime = new Date(log.timestamp);
          const now = new Date();
          return (now.getTime() - logTime.getTime()) < 15 * 60 * 1000;
        });

        // Alert if unusual activity detected (more than 100 actions in 15 minutes)
        if (last15Minutes.length > 100) {
          await base44.entities.SecurityIncident.create({
            incident_type: 'suspicious_activity',
            severity: 'medium',
            status: 'detected',
            affected_user_id: user.id,
            affected_user_email: user.email,
            description: `Unusual activity detected: ${last15Minutes.length} actions in 15 minutes`,
            detection_method: 'Automated client-side monitoring',
            detection_timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Security monitoring error:', error);
      }
    };

    // Run monitoring every 15 minutes
    const interval = setInterval(monitorActivity, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  return null;
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  
  if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
  } else if (ua.indexOf('SamsungBrowser') > -1) {
    browserName = 'Samsung Internet';
  } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
    browserName = 'Opera';
  } else if (ua.indexOf('Trident') > -1) {
    browserName = 'Internet Explorer';
  } else if (ua.indexOf('Edge') > -1) {
    browserName = 'Edge';
  } else if (ua.indexOf('Chrome') > -1) {
    browserName = 'Chrome';
  } else if (ua.indexOf('Safari') > -1) {
    browserName = 'Safari';
  }
  
  return browserName;
}