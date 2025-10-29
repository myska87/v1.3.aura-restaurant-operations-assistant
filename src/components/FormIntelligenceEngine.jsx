import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * 🧠 FORM INTELLIGENCE ENGINE
 * Auto-assigns forms based on position, shift, and operational events
 * Processes triggers and manages smart form distribution
 */
export default function FormIntelligenceEngine() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const processAssignments = async () => {
      try {
        // Get all active form templates with auto-assign enabled
        const templates = await base44.entities.FormTemplate.filter({
          is_active: true,
          auto_assign_enabled: true,
          status: 'active'
        });

        for (const template of templates) {
          await processFormTemplate(template);
        }
      } catch (error) {
        console.error('[FormIntelligence] Error processing assignments:', error);
      }
    };

    // Process every 2 minutes
    const interval = setInterval(processAssignments, 120000);
    processAssignments(); // Run immediately

    return () => clearInterval(interval);
  }, []);

  const processFormTemplate = async (template) => {
    const today = new Date().toISOString().split('T')[0];

    try {
      // Handle different trigger types
      switch (template.trigger_type) {
        case 'shift_start':
          await handleShiftStartTrigger(template, today);
          break;
        case 'shift_end':
          await handleShiftEndTrigger(template, today);
          break;
        case 'opening':
          await handleOpeningTrigger(template, today);
          break;
        case 'closing':
          await handleClosingTrigger(template, today);
          break;
        case 'mid_day':
          await handleMidDayTrigger(template, today);
          break;
        default:
          // Manual or custom - no auto-assignment
          break;
      }
    } catch (error) {
      console.error(`[FormIntelligence] Error processing template ${template.form_name}:`, error);
    }
  };

  const handleShiftStartTrigger = async (template, today) => {
    // Get shifts starting today that match the position
    const shifts = await base44.entities.Shift.filter({
      shift_date: today,
      status: 'scheduled'
    });

    for (const shift of shifts) {
      // Check if position matches (or form is for 'any' position)
      const positionMatch = template.assigned_position === 'any' || 
                           shift.role?.toLowerCase() === template.assigned_position?.toLowerCase();

      if (!positionMatch) continue;

      // Check if form already assigned to this shift
      const existingAssignments = await base44.entities.FormAssignmentMetadata.filter({
        form_id: template.id,
        linked_shift_id: shift.id
      });

      if (existingAssignments.length > 0) continue;

      // Create assignment
      const shiftStart = new Date(`${shift.shift_date}T${shift.start_time}`);
      const dueDate = new Date(shiftStart.getTime() + 4 * 60 * 60 * 1000); // 4 hours after shift start

      await base44.entities.FormAssignmentMetadata.create({
        form_id: template.id,
        form_name: template.form_name,
        assignment_type: 'shift_based',
        trigger_event: 'shift_started',
        linked_shift_id: shift.id,
        assigned_to_email: shift.staff_email,
        assigned_to_name: shift.staff_name,
        assigned_position: shift.role,
        assigned_by: 'system',
        due_date: dueDate.toISOString(),
        completion_status: 'pending',
        metadata: {
          shift_type: shift.shift_type,
          shift_date: shift.shift_date,
          auto_assigned: true
        }
      });

      console.log(`[FormIntelligence] Assigned form "${template.form_name}" to ${shift.staff_name} for shift ${shift.id}`);

      // Emit DataBridge event
      await base44.entities.BridgeEventLog.create({
        event_id: `form_assigned_${Date.now()}`,
        source_module: 'formAI',
        event_type: 'form_auto_assigned',
        reference_id: template.id,
        reference_type: 'FormTemplate',
        payload: {
          form_id: template.id,
          form_name: template.form_name,
          staff_email: shift.staff_email,
          shift_id: shift.id,
          trigger_type: 'shift_start'
        },
        target_modules: ['workforce', 'notifications'],
        status: 'pending',
        priority: 'normal',
        triggered_by_user: 'system',
        triggered_by_name: 'Form Intelligence Engine'
      });
    }
  };

  const handleShiftEndTrigger = async (template, today) => {
    // Get shifts ending soon (within next 2 hours)
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const shifts = await base44.entities.Shift.filter({
      shift_date: today,
      status: 'in_progress'
    });

    for (const shift of shifts) {
      const shiftEnd = new Date(`${shift.shift_date}T${shift.end_time}`);
      
      if (shiftEnd > now && shiftEnd <= twoHoursFromNow) {
        const positionMatch = template.assigned_position === 'any' || 
                             shift.role?.toLowerCase() === template.assigned_position?.toLowerCase();

        if (!positionMatch) continue;

        const existingAssignments = await base44.entities.FormAssignmentMetadata.filter({
          form_id: template.id,
          linked_shift_id: shift.id
        });

        if (existingAssignments.length > 0) continue;

        await base44.entities.FormAssignmentMetadata.create({
          form_id: template.id,
          form_name: template.form_name,
          assignment_type: 'shift_based',
          trigger_event: 'shift_ending_soon',
          linked_shift_id: shift.id,
          assigned_to_email: shift.staff_email,
          assigned_to_name: shift.staff_name,
          assigned_position: shift.role,
          assigned_by: 'system',
          due_date: shiftEnd.toISOString(),
          completion_status: 'pending',
          metadata: {
            shift_type: shift.shift_type,
            auto_assigned: true
          }
        });
      }
    }
  };

  const handleOpeningTrigger = async (template, today) => {
    // Get opening shifts (typically 6am - 10am)
    const shifts = await base44.entities.Shift.filter({
      shift_date: today,
      shift_type: 'opening'
    });

    for (const shift of shifts) {
      const positionMatch = template.assigned_position === 'any' || 
                           shift.role?.toLowerCase() === template.assigned_position?.toLowerCase();

      if (!positionMatch) continue;

      const existingAssignments = await base44.entities.FormAssignmentMetadata.filter({
        form_id: template.id,
        linked_shift_id: shift.id
      });

      if (existingAssignments.length > 0) continue;

      const shiftStart = new Date(`${shift.shift_date}T${shift.start_time}`);
      const dueDate = new Date(shiftStart.getTime() + 2 * 60 * 60 * 1000); // Due 2 hours after opening

      await base44.entities.FormAssignmentMetadata.create({
        form_id: template.id,
        form_name: template.form_name,
        assignment_type: 'position_based',
        trigger_event: 'opening_shift',
        linked_shift_id: shift.id,
        assigned_to_email: shift.staff_email,
        assigned_to_name: shift.staff_name,
        assigned_position: shift.role,
        assigned_by: 'system',
        due_date: dueDate.toISOString(),
        completion_status: 'pending',
        metadata: {
          opening_checklist: true,
          auto_assigned: true
        }
      });
    }
  };

  const handleClosingTrigger = async (template, today) => {
    // Get closing shifts
    const shifts = await base44.entities.Shift.filter({
      shift_date: today,
      shift_type: 'closing'
    });

    for (const shift of shifts) {
      const positionMatch = template.assigned_position === 'any' || 
                           shift.role?.toLowerCase() === template.assigned_position?.toLowerCase();

      if (!positionMatch) continue;

      const existingAssignments = await base44.entities.FormAssignmentMetadata.filter({
        form_id: template.id,
        linked_shift_id: shift.id
      });

      if (existingAssignments.length > 0) continue;

      const shiftEnd = new Date(`${shift.shift_date}T${shift.end_time}`);

      await base44.entities.FormAssignmentMetadata.create({
        form_id: template.id,
        form_name: template.form_name,
        assignment_type: 'position_based',
        trigger_event: 'closing_shift',
        linked_shift_id: shift.id,
        assigned_to_email: shift.staff_email,
        assigned_to_name: shift.staff_name,
        assigned_position: shift.role,
        assigned_by: 'system',
        due_date: shiftEnd.toISOString(),
        completion_status: 'pending',
        metadata: {
          closing_checklist: true,
          auto_assigned: true
        }
      });
    }
  };

  const handleMidDayTrigger = async (template, today) => {
    // Get mid-shift staff
    const shifts = await base44.entities.Shift.filter({
      shift_date: today,
      shift_type: 'mid_shift'
    });

    for (const shift of shifts) {
      const positionMatch = template.assigned_position === 'any' || 
                           shift.role?.toLowerCase() === template.assigned_position?.toLowerCase();

      if (!positionMatch) continue;

      const existingAssignments = await base44.entities.FormAssignmentMetadata.filter({
        form_id: template.id,
        linked_shift_id: shift.id
      });

      if (existingAssignments.length > 0) continue;

      const shiftEnd = new Date(`${shift.shift_date}T${shift.end_time}`);

      await base44.entities.FormAssignmentMetadata.create({
        form_id: template.id,
        form_name: template.form_name,
        assignment_type: 'position_based',
        trigger_event: 'mid_day_shift',
        linked_shift_id: shift.id,
        assigned_to_email: shift.staff_email,
        assigned_to_name: shift.staff_name,
        assigned_position: shift.role,
        assigned_by: 'system',
        due_date: shiftEnd.toISOString(),
        completion_status: 'pending',
        metadata: {
          mid_day_check: true,
          auto_assigned: true
        }
      });
    }
  };

  // This component doesn't render anything
  return null;
}