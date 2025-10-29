import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { differenceInDays, parseISO, format } from 'date-fns';

/**
 * 🔔 Compliance Renewal Monitor
 * Scans daily for expiring certificates and sends alerts
 */
export default function RenewalMonitor() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkRenewals = async () => {
      try {
        const documents = await base44.entities.ComplianceDocument.filter({
          renewal_alert_enabled: true
        });

        const today = new Date();

        for (const doc of documents) {
          if (!doc.expiry_date) continue;

          const expiryDate = parseISO(doc.expiry_date);
          const daysUntilExpiry = differenceInDays(expiryDate, today);

          // Check if alert needed
          let alertType = null;
          let severity = 'info';

          if (daysUntilExpiry < 0) {
            alertType = 'expired';
            severity = 'urgent';
          } else if (daysUntilExpiry <= 7) {
            alertType = '7_days';
            severity = 'critical';
          } else if (daysUntilExpiry <= 15) {
            alertType = '15_days';
            severity = 'warning';
          } else if (daysUntilExpiry <= 30) {
            alertType = '30_days';
            severity = 'warning';
          }

          if (!alertType) continue;

          // Check if alert already sent recently
          const existingAlerts = await base44.entities.ComplianceRenewalAlert.filter({
            document_id: doc.id,
            alert_type: alertType,
            status: { $in: ['sent', 'pending'] }
          });

          if (existingAlerts.length > 0) continue; // Already alerted

          // Get managers to notify
          const managers = await base44.entities.User.filter({
            $or: [
              { position: 'manager' },
              { position: 'owner' },
              { role: 'admin' }
            ]
          });

          const recipientEmails = managers.map(m => m.email);

          // Create renewal alert
          const alert = await base44.entities.ComplianceRenewalAlert.create({
            document_id: doc.id,
            document_title: doc.title,
            document_category: doc.category,
            expiry_date: doc.expiry_date,
            days_until_expiry: daysUntilExpiry,
            alert_type: alertType,
            severity,
            recipient_emails: recipientEmails,
            status: 'pending',
          });

          // Create EventHub event
          const event = await base44.entities.Event.create({
            source_module: 'system',
            event_type: 'system_alert',
            title: `${doc.category.replace(/_/g, ' ')} ${daysUntilExpiry < 0 ? 'Expired!' : 'Expiring Soon'}`,
            message: `${doc.title} ${daysUntilExpiry < 0 ? 'has expired' : `expires in ${daysUntilExpiry} days`}. Renewal required.`,
            severity: daysUntilExpiry < 0 ? 'critical' : 'warning',
            recipient_emails: recipientEmails,
            recipient_roles: ['manager', 'owner'],
            status: 'unread',
            linked_entity_type: 'ComplianceDocument',
            linked_entity_id: doc.id,
            linked_entity_name: doc.title,
            action_url: createPageUrl('ComplianceCore'),
          });

          // Update alert with event reference
          await base44.entities.ComplianceRenewalAlert.update(alert.id, {
            event_id: event.id,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          // If expired, create renewal task
          if (daysUntilExpiry <= 7 && !doc.renewal_task_id) {
            const task = await base44.entities.OperationTask.create({
              title: `Renew: ${doc.title}`,
              type: 'general',
              frequency: 'one_time',
              department: doc.department,
              assigned_to: recipientEmails[0],
              assigned_to_name: managers[0]?.full_name,
              status: 'pending',
              due_date: expiryDate.toISOString(),
              priority: daysUntilExpiry < 0 ? 'critical' : 'high',
              comments: `Certificate expiry renewal required`,
              auto_generated: true,
            });

            await base44.entities.ComplianceDocument.update(doc.id, {
              renewal_task_id: task.id
            });

            await base44.entities.ComplianceRenewalAlert.update(alert.id, {
              renewal_task_created: true,
              renewal_task_id: task.id,
            });
          }

          // Update document status
          const newStatus = daysUntilExpiry < 0 ? 'expired' :
                           daysUntilExpiry <= 30 ? 'expiring_soon' :
                           'active';

          await base44.entities.ComplianceDocument.update(doc.id, {
            status: newStatus,
            last_renewal_alert_sent: new Date().toISOString(),
          });
        }

        queryClient.invalidateQueries({ queryKey: ['complianceDocuments'] });
        queryClient.invalidateQueries({ queryKey: ['renewalAlerts'] });

      } catch (error) {
        console.error('[RenewalMonitor] Error:', error);
      }
    };

    // Run on mount and daily at 8 AM
    checkRenewals();
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 8 && now.getMinutes() < 30) {
        checkRenewals();
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}