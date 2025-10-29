import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * 🔗 Operations Link Manager
 * Automatically links OperationTasks to SOPs, Quality, and Checklists
 * Syncs completion status bidirectionally
 */
export default function OperationsLinkManager() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const syncCompletions = async () => {
      try {
        // 1. When SOP is signed → mark operation task as complete
        const sopSignatures = await base44.entities.SOPSignatureLog.list('-signed_at', 50);
        
        for (const signature of sopSignatures) {
          const opTasks = await base44.entities.OperationTask.filter({
            linked_sop_id: signature.sop_id,
            assigned_to: signature.staff_email,
            status: { $in: ['pending', 'in_progress'] }
          });

          for (const task of opTasks) {
            await base44.entities.OperationTask.update(task.id, {
              status: 'completed',
              completion_date: signature.signed_at,
              completed_by_email: signature.staff_email,
              completed_by_name: signature.staff_name,
              comments: `Completed via SOP signature`,
            });
          }
        }

        // 2. When Quality check is recorded → create/update operation task
        const qualityRecords = await base44.entities.QualityRecord.list('-created_date', 50);
        
        for (const record of qualityRecords.slice(0, 10)) {
          const existingTask = await base44.entities.OperationTask.filter({
            linked_quality_id: record.id
          });

          if (existingTask.length === 0) {
            await base44.entities.OperationTask.create({
              title: record.check_title,
              type: 'quality',
              frequency: 'daily',
              department: record.area || 'all',
              linked_quality_id: record.id,
              linked_quality_title: record.check_title,
              assigned_to: record.checked_by_email,
              assigned_to_name: record.checked_by_name,
              status: 'completed',
              completion_date: record.created_date,
              completed_by_email: record.checked_by_email,
              completed_by_name: record.checked_by_name,
              score: record.score,
              auto_generated: true,
              comments: record.comments,
            });
          }
        }

        // 3. When Checklist is completed → mark operation task
        const checklists = await base44.entities.ChecklistExecution.filter({
          status: 'completed'
        }, '-completed_at', 30);

        for (const checklist of checklists) {
          const opTasks = await base44.entities.OperationTask.filter({
            linked_checklist_id: checklist.id,
            status: { $in: ['pending', 'in_progress'] }
          });

          for (const task of opTasks) {
            await base44.entities.OperationTask.update(task.id, {
              status: 'completed',
              completion_date: checklist.completed_at,
              completed_by_email: checklist.completed_by_email,
              completed_by_name: checklist.completed_by_name,
              score: checklist.overall_pass_rate,
              comments: `Checklist completed`,
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['operationTasks'] });

      } catch (error) {
        console.error('[OperationsLink] Sync error:', error);
      }
    };

    // Run on mount and every 5 minutes
    syncCompletions();
    const interval = setInterval(syncCompletions, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}