import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

/**
 * Background automation component for daily checklists
 * Auto-generates opening/closing checklists based on shift schedule
 */
export default function ChecklistAutomation() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get today's date
  const today = format(new Date(), 'yyyy-MM-dd');

  // Get today's shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ['todayShifts', today],
    queryFn: () => base44.entities.Shift.filter({
      shift_date: today
    }),
    enabled: !!user,
    refetchInterval: 60000, // Check every minute
  });

  // Get existing checklists for today
  const { data: existingChecklists = [] } = useQuery({
    queryKey: ['todayChecklists', today],
    queryFn: () => base44.entities.DailyChecklist.filter({
      checklist_date: today
    }),
    enabled: !!user,
  });

  // Get checklist templates
  const { data: templates = [] } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ChecklistTemplateTask.list(),
    enabled: !!user,
  });

  const createChecklistMutation = useMutation({
    mutationFn: async ({ type, department, shifts, templates }) => {
      // Only create if templates exist
      if (!templates || templates.length === 0) {
        console.log(`No templates found for ${type} checklist in ${department}`);
        return null;
      }

      // Create checklist
      const checklist = await base44.entities.DailyChecklist.create({
        checklist_type: type,
        department: department,
        checklist_date: today,
        assigned_staff: shifts.map(s => ({
          staff_email: s.staff_email,
          staff_name: s.staff_name
        })),
        status: 'pending',
        linked_shift_ids: shifts.map(s => s.id),
        total_tasks: templates.length,
        completed_tasks: 0,
        completion_percentage: 0,
        auto_generated: true,
      });

      // Create checklist items from templates
      for (const [index, template] of templates.entries()) {
        await base44.entities.ChecklistItem.create({
          checklist_id: checklist.id,
          task_name: template.task_name,
          description: template.description,
          priority: template.priority,
          category: template.category,
          required_photo: template.required_photo,
          requires_temperature: template.requires_temperature,
          status: 'pending',
          order_index: index,
        });
      }

      return checklist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayChecklists'] });
    },
    onError: (error) => {
      console.error('Error creating checklist:', error);
    }
  });

  // Auto-generate checklists
  useEffect(() => {
    if (!shifts.length || !templates.length) return;

    // Group shifts by department
    const shiftsByDept = shifts.reduce((acc, shift) => {
      if (!acc[shift.department]) acc[shift.department] = [];
      acc[shift.department].push(shift);
      return acc;
    }, {});

    // For each department, check if opening/closing checklists exist
    Object.entries(shiftsByDept).forEach(([dept, deptShifts]) => {
      // Sort shifts by start time
      const sortedShifts = deptShifts.sort((a, b) => 
        a.start_time.localeCompare(b.start_time)
      );

      const firstShift = sortedShifts[0];
      const lastShift = sortedShifts[sortedShifts.length - 1];

      // Check if opening checklist exists
      const openingExists = existingChecklists.some(
        c => c.checklist_type === 'opening' && c.department === dept
      );

      if (!openingExists) {
        const openingTemplates = templates.filter(
          t => t.checklist_type === 'opening' && t.department === dept && t.is_active
        );

        if (openingTemplates.length > 0) {
          createChecklistMutation.mutate({
            type: 'opening',
            department: dept,
            shifts: [firstShift],
            templates: openingTemplates,
          });
        }
      }

      // Check if closing checklist exists
      const closingExists = existingChecklists.some(
        c => c.checklist_type === 'closing' && c.department === dept
      );

      if (!closingExists) {
        const closingTemplates = templates.filter(
          t => t.checklist_type === 'closing' && t.department === dept && t.is_active
        );

        if (closingTemplates.length > 0) {
          createChecklistMutation.mutate({
            type: 'closing',
            department: dept,
            shifts: [lastShift],
            templates: closingTemplates,
          });
        }
      }
    });
  }, [shifts, existingChecklists, templates]);

  return null; // This is a background component
}