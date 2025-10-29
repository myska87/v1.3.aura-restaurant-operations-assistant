
import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { startOfWeek, addDays, addWeeks, addMonths, format } from 'date-fns';

/**
 * 🤖 Operations Task Automation Engine
 * Auto-generates tasks from SOPs, Checklists, and Quality templates
 */
export default function TaskAutomationEngine() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const generateTasks = async () => {
      try {
        // Get current user for logging
        const user = await base44.auth.me().catch(() => null);
        if (!user) return;

        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });

        // 1. Generate from Active SOPs
        const sops = await base44.entities.SOPDocument.filter({
          status: 'active',
          active_status: true
        });

        for (const sop of sops) {
          // Check if task already exists for this period
          const existingTasks = await base44.entities.OperationTask.filter({
            linked_sop_id: sop.id,
            status: { $in: ['pending', 'in_progress'] }
          });

          if (existingTasks.length === 0) {
            let dueDate = today;
            
            if (sop.frequency === 'daily') {
              dueDate = addDays(today, 1);
            } else if (sop.frequency === 'weekly') {
              dueDate = addWeeks(weekStart, 1);
            } else if (sop.frequency === 'monthly') {
              dueDate = addMonths(today, 1);
            }

            await base44.entities.OperationTask.create({
              title: sop.title,
              type: 'sop',
              frequency: sop.frequency || 'daily',
              department: sop.category || 'all',
              linked_sop_id: sop.id,
              linked_sop_title: sop.title,
              status: 'pending',
              due_date: dueDate.toISOString(),
              auto_generated: true,
              priority: sop.is_mandatory ? 'high' : 'medium',
            });
          }
        }

        // 2. Generate from Checklist Templates
        const checklistTemplates = await base44.entities.ChecklistTemplate.filter({
          is_active: true
        });

        for (const template of checklistTemplates) {
          const existingChecklist = await base44.entities.OperationTask.filter({
            linked_checklist_id: template.id,
            status: { $in: ['pending', 'in_progress'] }
          });

          if (existingChecklist.length === 0 && template.frequency === 'daily') {
            await base44.entities.OperationTask.create({
              title: template.name,
              type: 'checklist',
              frequency: template.frequency,
              department: 'all',
              linked_checklist_id: template.id,
              linked_checklist_name: template.name,
              status: 'pending',
              due_date: addDays(today, 1).toISOString(),
              auto_generated: true,
              priority: 'medium',
            });
          }
        }

        // 3. Generate from Quality Templates
        const qualityTemplates = await base44.entities.QualityTemplate.filter({
          is_active: true
        });

        for (const template of qualityTemplates) {
          const existingQuality = await base44.entities.OperationTask.filter({
            linked_quality_id: template.id,
            status: { $in: ['pending', 'in_progress'] }
          });

          if (existingQuality.length === 0 && template.frequency === 'daily') {
            await base44.entities.OperationTask.create({
              title: template.template_name,
              type: 'quality',
              frequency: template.frequency,
              department: 'all',
              linked_quality_id: template.id,
              linked_quality_title: template.template_name,
              status: 'pending',
              due_date: addDays(today, 1).toISOString(),
              auto_generated: true,
              priority: 'medium',
            });
          }
        }

        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ['operationTasks'] });

      } catch (error) {
        console.error('[TaskAutomation] Error:', error);
      }
    };

    // Run on mount and every 6 hours
    generateTasks();
    const interval = setInterval(generateTasks, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}
