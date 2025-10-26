import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * 🌉 AURA DATA BRIDGE ENGINE
 * Central event processing system for inter-module communication
 * Runs in background, processes events, triggers actions
 */
export default function DataBridgeEngine() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const processEvents = async () => {
      try {
        // Fetch pending events
        const pendingEvents = await base44.entities.BridgeEventLog.filter({
          status: 'pending'
        });

        for (const event of pendingEvents) {
          await processEvent(event);
        }
      } catch (error) {
        console.error('DataBridge: Error processing events', error);
      }
    };

    // Process events every 30 seconds
    const interval = setInterval(processEvents, 30000);
    
    // Process immediately on mount
    processEvents();

    return () => clearInterval(interval);
  }, [queryClient]);

  const processEvent = async (event) => {
    const startTime = Date.now();
    
    try {
      console.log(`[DataBridge] Processing event: ${event.event_type} from ${event.source_module}`);

      // Update status to processing
      await base44.entities.BridgeEventLog.update(event.id, {
        status: 'processing'
      });

      // Route event to appropriate handler
      await routeEvent(event);

      // Mark as completed
      const duration = Date.now() - startTime;
      await base44.entities.BridgeEventLog.update(event.id, {
        status: 'completed',
        processed_at: new Date().toISOString(),
        processing_duration_ms: duration
      });

      // Update module health
      await updateModuleHealth(event.source_module, true, duration);

      console.log(`[DataBridge] Event ${event.event_type} completed in ${duration}ms`);
    } catch (error) {
      console.error(`[DataBridge] Error processing event ${event.event_type}:`, error);
      
      // Update event status
      await base44.entities.BridgeEventLog.update(event.id, {
        status: 'failed',
        error_message: error.message,
        retry_count: (event.retry_count || 0) + 1
      });

      // Update module health
      await updateModuleHealth(event.source_module, false);
    }
  };

  const routeEvent = async (event) => {
    const handlers = {
      // Task Events
      'task_completed': handleTaskCompleted,
      'task_created': handleTaskCreated,
      
      // Checklist Events
      'checklist_completed': handleChecklistCompleted,
      'checklist_failed': handleChecklistFailed,
      
      // Workforce Events
      'shift_started': handleShiftStarted,
      'shift_ended': handleShiftEnded,
      'staff_clocked_in': handleStaffClockedIn,
      'staff_clocked_out': handleStaffClockedOut,
      
      // Inventory Events
      'stock_received': handleStockReceived,
      'stock_low': handleStockLow,
      
      // Document Events
      'document_signed': handleDocumentSigned,
      'document_expired': handleDocumentExpired,
      
      // Compliance Events
      'audit_completed': handleAuditCompleted,
      'incident_reported': handleIncidentReported,
    };

    const handler = handlers[event.event_type];
    
    if (handler) {
      await handler(event);
    } else {
      console.warn(`[DataBridge] No handler found for event type: ${event.event_type}`);
    }
  };

  // ==================== EVENT HANDLERS ====================

  const handleTaskCompleted = async (event) => {
    const { payload } = event;
    
    // If task is from LeafeCore checklist, update hygiene score
    if (payload.task_type === 'checklist' && payload.venue_id) {
      try {
        // Recalculate hygiene score for venue
        const checklistEntries = await base44.entities.LeafeChecklistEntry.filter({
          venue_id: payload.venue_id,
          status: 'completed'
        });

        const recentEntries = checklistEntries.filter(e => {
          const entryDate = new Date(e.completion_date);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return entryDate >= weekAgo;
        });

        if (recentEntries.length > 0) {
          const avgScore = recentEntries.reduce((sum, e) => sum + (e.percentage || 0), 0) / recentEntries.length;
          
          const hygieneScores = await base44.entities.LeafeHygieneScore.filter({
            venue_id: payload.venue_id
          });

          if (hygieneScores.length > 0) {
            await base44.entities.LeafeHygieneScore.update(hygieneScores[0].id, {
              score: Math.round(avgScore),
              last_updated: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('DataBridge: Error updating hygiene score', error);
      }
    }
  };

  const handleTaskCreated = async (event) => {
    const { payload } = event;
    
    // Notify staff member about new task
    try {
      await base44.entities.TaskNotification.create({
        notification_type: 'shift_tasks_ready',
        recipient_email: payload.assigned_to_email,
        recipient_name: payload.assigned_to_name,
        title: 'New Task Assigned',
        message: `You have been assigned: ${payload.task_name}`,
        related_task_id: payload.task_id,
        priority: payload.priority || 'info'
      });
    } catch (error) {
      console.error('DataBridge: Error creating task notification', error);
    }
  };

  const handleChecklistCompleted = async (event) => {
    const { payload } = event;
    
    // Log to compliance audit
    try {
      await base44.entities.ComplianceAudit.create({
        module_name: 'checklists',
        action: 'create',
        action_description: `Checklist "${payload.checklist_name}" completed with ${payload.score}% score`,
        user_id: payload.completed_by_id,
        user_email: payload.completed_by_email,
        user_name: payload.completed_by_name,
        target_entity: 'ChecklistExecution',
        target_record_id: payload.checklist_id,
        severity: payload.score < 70 ? 'warning' : 'info',
        is_sensitive: false
      });
    } catch (error) {
      console.error('DataBridge: Error logging checklist completion', error);
    }
  };

  const handleChecklistFailed = async (event) => {
    const { payload } = event;
    
    // Alert manager if checklist failed
    if (payload.manager_email) {
      try {
        await base44.entities.ManagerAlert.create({
          alert_type: 'checklist_failed',
          severity: 'urgent',
          staff_email: payload.completed_by_email,
          staff_name: payload.completed_by_name,
          shift_id: payload.shift_id,
          shift_date: payload.shift_date,
          message: `Checklist "${payload.checklist_name}" failed with score ${payload.score}%. Immediate review required.`,
          status: 'unread'
        });
      } catch (error) {
        console.error('DataBridge: Error creating manager alert', error);
      }
    }
  };

  const handleShiftStarted = async (event) => {
    const { payload } = event;
    
    // Trigger kitchen opening checklist if venue-based shift
    if (payload.venue_id) {
      try {
        const templates = await base44.entities.LeafeChecklistTemplate.filter({
          category: 'opening',
          venue_id: payload.venue_id,
          is_active: true
        });

        for (const template of templates) {
          await base44.entities.LeafeChecklistEntry.create({
            template_id: template.id,
            template_name: template.name,
            venue_id: payload.venue_id,
            venue_name: payload.venue_name,
            staff_email: payload.staff_email,
            staff_name: payload.staff_name,
            due_date: new Date().toISOString(),
            status: 'not_started'
          });
        }
      } catch (error) {
        console.error('DataBridge: Error creating opening checklist', error);
      }
    }
  };

  const handleShiftEnded = async (event) => {
    const { payload } = event;
    
    // Trigger kitchen closing checklist
    if (payload.venue_id) {
      try {
        const templates = await base44.entities.LeafeChecklistTemplate.filter({
          category: 'closing',
          venue_id: payload.venue_id,
          is_active: true
        });

        for (const template of templates) {
          await base44.entities.LeafeChecklistEntry.create({
            template_id: template.id,
            template_name: template.name,
            venue_id: payload.venue_id,
            venue_name: payload.venue_name,
            staff_email: payload.staff_email,
            staff_name: payload.staff_name,
            due_date: new Date().toISOString(),
            status: 'not_started'
          });
        }
      } catch (error) {
        console.error('DataBridge: Error creating closing checklist', error);
      }
    }
  };

  const handleStaffClockedIn = async (event) => {
    const { payload } = event;
    
    // Log to compliance
    try {
      await base44.entities.ComplianceAudit.create({
        module_name: 'attendance',
        action: 'create',
        action_description: `Staff member clocked in for shift`,
        user_id: payload.staff_id,
        user_email: payload.staff_email,
        user_name: payload.staff_name,
        target_entity: 'ClockEvent',
        target_record_id: payload.event_id,
        severity: 'info',
        is_sensitive: false
      });
    } catch (error) {
      console.error('DataBridge: Error logging clock in', error);
    }
  };

  const handleStaffClockedOut = async (event) => {
    const { payload } = event;
    
    // Log to compliance
    try {
      await base44.entities.ComplianceAudit.create({
        module_name: 'attendance',
        action: 'create',
        action_description: `Staff member clocked out from shift`,
        user_id: payload.staff_id,
        user_email: payload.staff_email,
        user_name: payload.staff_name,
        target_entity: 'ClockEvent',
        target_record_id: payload.event_id,
        severity: 'info',
        is_sensitive: false
      });
    } catch (error) {
      console.error('DataBridge: Error logging clock out', error);
    }
  };

  const handleStockReceived = async (event) => {
    const { payload } = event;
    
    // Add document verification log to compliance
    try {
      await base44.entities.ComplianceAudit.create({
        module_name: 'inventory',
        action: 'update',
        action_description: `Stock received: ${payload.order_number}`,
        user_id: payload.received_by_id,
        user_email: payload.received_by,
        user_name: payload.received_by_name,
        target_entity: 'PurchaseOrder',
        target_record_id: payload.order_id,
        severity: 'info',
        is_sensitive: false
      });
    } catch (error) {
      console.error('DataBridge: Error logging stock receipt', error);
    }
  };

  const handleStockLow = async (event) => {
    const { payload } = event;
    
    // Alert manager about low stock
    try {
      await base44.entities.ManagerAlert.create({
        alert_type: 'stock_low',
        severity: 'warning',
        message: `${payload.ingredient_name} stock is low (${payload.current_stock} ${payload.unit}). Reorder point: ${payload.reorder_point} ${payload.unit}`,
        status: 'unread'
      });
    } catch (error) {
      console.error('DataBridge: Error creating low stock alert', error);
    }
  };

  const handleDocumentSigned = async (event) => {
    const { payload } = event;
    
    // Check if this unlocks next onboarding step
    if (payload.document_type === 'onboarding' && payload.staff_email) {
      try {
        const progressRecords = await base44.entities.OnboardingProgress.filter({
          staff_email: payload.staff_email,
          status: 'locked'
        });

        // Unlock next step
        if (progressRecords.length > 0) {
          const nextStep = progressRecords.sort((a, b) => a.step_number - b.step_number)[0];
          await base44.entities.OnboardingProgress.update(nextStep.id, {
            status: 'in_progress'
          });
        }
      } catch (error) {
        console.error('DataBridge: Error unlocking onboarding step', error);
      }
    }
  };

  const handleDocumentExpired = async (event) => {
    const { payload } = event;
    
    // Alert staff and manager
    try {
      await base44.entities.TaskNotification.create({
        notification_type: 'document_expired',
        recipient_email: payload.staff_email,
        recipient_name: payload.staff_name,
        title: 'Document Expired',
        message: `Your ${payload.document_type} document has expired. Please upload a new version.`,
        priority: 'urgent'
      });
    } catch (error) {
      console.error('DataBridge: Error creating expiry notification', error);
    }
  };

  const handleAuditCompleted = async (event) => {
    const { payload } = event;
    
    // Update venue hygiene score if from LeafeCore
    if (payload.venue_id && payload.overall_score) {
      try {
        const hygieneScores = await base44.entities.LeafeHygieneScore.filter({
          venue_id: payload.venue_id
        });

        if (hygieneScores.length > 0) {
          await base44.entities.LeafeHygieneScore.update(hygieneScores[0].id, {
            score: payload.overall_score,
            last_updated: new Date().toISOString()
          });
        } else {
          await base44.entities.LeafeHygieneScore.create({
            venue_id: payload.venue_id,
            venue_name: payload.venue_name,
            score: payload.overall_score,
            last_updated: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('DataBridge: Error updating hygiene score from audit', error);
      }
    }
  };

  const handleIncidentReported = async (event) => {
    const { payload } = event;
    
    // Alert compliance officer
    try {
      await base44.entities.ManagerAlert.create({
        alert_type: 'security_incident',
        severity: 'urgent',
        message: `Security incident reported: ${payload.incident_type} - ${payload.title}`,
        status: 'unread'
      });
    } catch (error) {
      console.error('DataBridge: Error creating incident alert', error);
    }
  };

  // ==================== HELPER FUNCTIONS ====================

  const updateModuleHealth = async (moduleName, success, duration = null) => {
    try {
      const monitors = await base44.entities.BridgeStatusMonitor.filter({
        module_name: moduleName
      });

      if (monitors.length > 0) {
        const monitor = monitors[0];
        const updates = {
          last_sync_time: new Date().toISOString(),
          total_events_processed: (monitor.total_events_processed || 0) + 1,
          events_last_hour: (monitor.events_last_hour || 0) + 1,
          events_last_24h: (monitor.events_last_24h || 0) + 1,
        };

        if (!success) {
          updates.errors_detected = (monitor.errors_detected || 0) + 1;
          updates.status = 'warning';
        } else {
          updates.status = 'healthy';
        }

        if (duration) {
          const currentAvg = monitor.avg_processing_time_ms || 0;
          const totalEvents = monitor.total_events_processed || 0;
          updates.avg_processing_time_ms = ((currentAvg * totalEvents) + duration) / (totalEvents + 1);
        }

        await base44.entities.BridgeStatusMonitor.update(monitor.id, updates);
      } else {
        // Create new monitor
        await base44.entities.BridgeStatusMonitor.create({
          module_name: moduleName,
          status: success ? 'healthy' : 'warning',
          last_sync_time: new Date().toISOString(),
          total_events_processed: 1,
          events_last_hour: 1,
          events_last_24h: 1,
          errors_detected: success ? 0 : 1,
          avg_processing_time_ms: duration || 0,
          health_check_passed: success
        });
      }
    } catch (error) {
      console.error('DataBridge: Error updating module health', error);
    }
  };

  // This component doesn't render anything
  return null;
}