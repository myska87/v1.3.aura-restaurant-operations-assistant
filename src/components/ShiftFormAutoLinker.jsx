import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * ShiftFormAutoLinker - Automatically assigns forms/SOPs when shifts are created
 * Monitors shift creation and links relevant documents based on role
 */
export default function ShiftFormAutoLinker({ shiftId, staffEmail, role, shiftDate }) {
  useEffect(() => {
    if (!shiftId || !staffEmail || !role) return;

    const linkFormsAndSOPs = async () => {
      try {
        // Find forms that should be auto-assigned for this role
        const formTemplates = await base44.entities.FormTemplate.filter({
          assigned_position: role,
          auto_assign_enabled: true,
          is_active: true
        });

        // Create form assignments
        for (const template of formTemplates) {
          // Check if already assigned
          const existing = await base44.entities.FormAssignmentMetadata.filter({
            form_id: template.id,
            linked_shift_id: shiftId,
            assigned_to_email: staffEmail
          });

          if (existing.length === 0) {
            // Calculate due date based on form settings
            const dueDate = new Date(shiftDate);
            dueDate.setHours(
              parseInt(template.schedule_time?.split(':')[0] || '23'),
              parseInt(template.schedule_time?.split(':')[1] || '59')
            );

            await base44.entities.FormAssignmentMetadata.create({
              form_id: template.id,
              form_name: template.form_name,
              assignment_type: 'shift_based',
              linked_shift_id: shiftId,
              assigned_to_email: staffEmail,
              due_date: dueDate.toISOString(),
              completion_status: 'pending',
            });

            console.log(`✅ Auto-assigned form: ${template.form_name} to ${staffEmail}`);
          }
        }

        // Find SOPs for this role
        const allSOPs = await base44.entities.SOPDocument.filter({
          is_active: true,
          status: 'active'
        });

        const roleSOPs = allSOPs.filter(sop => 
          sop.role_assigned?.includes(role) || sop.role_assigned?.includes('all')
        );

        // Create SOP certifications if not exists
        for (const sop of roleSOPs) {
          const existingCert = await base44.entities.SOPCertification.filter({
            staff_email: staffEmail,
            sop_id: sop.id,
            status: { $in: ['pending', 'in_progress', 'completed'] }
          });

          if (existingCert.length === 0) {
            await base44.entities.SOPCertification.create({
              staff_id: staffEmail,
              staff_email: staffEmail,
              sop_id: sop.id,
              sop_title: sop.title,
              sop_version: sop.version,
              status: 'pending',
              assigned_date: new Date().toISOString(),
            });

            console.log(`✅ Auto-assigned SOP: ${sop.title} to ${staffEmail}`);
          }
        }

      } catch (error) {
        console.error('Error auto-linking forms/SOPs:', error);
      }
    };

    linkFormsAndSOPs();
  }, [shiftId, staffEmail, role, shiftDate]);

  return null; // This is a background component
}