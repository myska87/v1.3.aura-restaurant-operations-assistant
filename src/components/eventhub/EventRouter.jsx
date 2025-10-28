import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * 📡 Event Router
 * Routes events to correct recipients based on role, department, and context
 */
export default function EventRouter() {
  useEffect(() => {
    const routeEvents = async () => {
      try {
        const user = await base44.auth.me().catch(() => null);
        if (!user) return;

        // Get users by role for routing
        const allUsers = await base44.entities.User.list();
        const managers = allUsers.filter(u => u.position === 'manager' || u.position === 'owner' || u.role === 'admin');
        const chefs = allUsers.filter(u => u.position === 'chef' || u.position === 'sous_chef');

        // Get unrouted events (events without recipients)
        const events = await base44.entities.Event.filter({
          recipient_emails: { $exists: false }
        }, '-created_date', 20);

        for (const event of events) {
          let recipients = [];
          let roles = [];

          // Kitchen-related events → Kitchen Manager + Chefs
          if (event.source_module === 'inventory' || 
              event.source_module === 'quality' && event.metadata?.area === 'kitchen') {
            recipients = [...managers.map(m => m.email), ...chefs.map(c => c.email)];
            roles = ['manager', 'chef'];
          }

          // SOP events → All staff in assigned role
          if (event.source_module === 'sop') {
            roles = ['all'];
          }

          // Critical events → All managers
          if (event.severity === 'critical') {
            recipients = managers.map(m => m.email);
            roles = ['manager', 'owner'];
          }

          // Hygiene alerts → Managers
          if (event.source_module === 'hygiene') {
            recipients = managers.map(m => m.email);
            roles = ['manager'];
          }

          // Shift events → Assigned staff + managers
          if (event.source_module === 'rota') {
            roles = ['manager'];
            if (event.metadata?.staff_email) {
              recipients.push(event.metadata.staff_email);
            }
          }

          // Update event with recipients
          if (recipients.length > 0 || roles.length > 0) {
            await base44.entities.Event.update(event.id, {
              recipient_emails: [...new Set(recipients)], // Remove duplicates
              recipient_roles: [...new Set(roles)],
            });
          }
        }

      } catch (error) {
        console.error('[EventRouter] Error:', error);
      }
    };

    // Run every 30 seconds
    routeEvents();
    const interval = setInterval(routeEvents, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}