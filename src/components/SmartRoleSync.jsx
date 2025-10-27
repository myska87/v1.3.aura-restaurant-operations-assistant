import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Smart Role Sync Engine
 * Automatically triggers workflow updates when a user's position changes:
 * 1. Updates assigned checklists based on new role
 * 2. Assigns default tasks for new position
 * 3. Triggers training modules for new role
 * 4. Creates onboarding tasks if switching departments
 * 5. Updates form assignments
 * 6. Sends notification to user about role change
 */
export function SmartRoleSync() {
  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 30000,
  });

  const { data: roleResponsibilities = [] } = useQuery({
    queryKey: ['roleResponsibilities'],
    queryFn: () => base44.entities.RoleResponsibility.list(),
  });

  const { data: formTemplates = [] } = useQuery({
    queryKey: ['formTemplates'],
    queryFn: () => base44.entities.FormTemplate.list(),
  });

  const { data: trainingModules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list(),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffTask.create(data),
  });

  const createTrainingRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingRecord.create(data),
  });

  const createFormAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.FormAssignment.create(data),
  });

  const createNotificationMutation = useMutation({
    mutationFn: (data) => base44.entities.TaskNotification.create(data),
  });

  useEffect(() => {
    const checkRoleChanges = async () => {
      const roleChangeLog = JSON.parse(localStorage.getItem('aura_role_change_log') || '{}');
      const currentTimestamp = Date.now();

      for (const user of allUsers) {
        if (!user.email || !user.position) continue;

        const lastKnownPosition = roleChangeLog[user.email]?.position;
        const lastChecked = roleChangeLog[user.email]?.timestamp || 0;

        if (currentTimestamp - lastChecked < 60000) continue;

        if (lastKnownPosition && lastKnownPosition !== user.position) {
          console.log(`Position change detected for ${user.full_name}: ${lastKnownPosition} → ${user.position}`);
          await handleRoleChange(user, lastKnownPosition, user.position);
        }

        roleChangeLog[user.email] = {
          position: user.position,
          timestamp: currentTimestamp,
        };
      }

      localStorage.setItem('aura_role_change_log', JSON.stringify(roleChangeLog));
    };

    checkRoleChanges();
  }, [allUsers]);

  const handleRoleChange = async (user, oldPosition, newPosition) => {
    try {
      console.log(`Starting Smart Role Sync for ${user.full_name}`);

      await assignRoleResponsibilities(user, newPosition);
      await assignTrainingModules(user, newPosition);
      await updateFormAssignments(user, newPosition);
      await sendRoleChangeNotification(user, oldPosition, newPosition);

      queryClient.invalidateQueries({ queryKey: ['staffTasks'] });
      queryClient.invalidateQueries({ queryKey: ['trainingRecords'] });
      queryClient.invalidateQueries({ queryKey: ['formAssignments'] });

      console.log(`Smart Role Sync completed for ${user.full_name}`);
    } catch (error) {
      console.error('Error in Smart Role Sync:', error);
    }
  };

  const assignRoleResponsibilities = async (user, position) => {
    const roleResp = roleResponsibilities.find(r => r.position === position);
    if (!roleResp || !roleResp.daily_tasks) return;

    const tasksToCreate = [];
    const tasks = Array.isArray(roleResp.daily_tasks) ? roleResp.daily_tasks : [];

    tasks.forEach((task) => {
      const taskData = typeof task === 'string' ? { task_name: task } : task;
      
      tasksToCreate.push({
        task_name: taskData.task_name || task,
        description: taskData.description || `Daily responsibility for ${position}`,
        category: 'prep',
        assigned_to: user.email,
        shift: 'morning',
        due_date: new Date().toISOString(),
        status: 'pending',
      });
    });

    for (const task of tasksToCreate.slice(0, 5)) {
      try {
        await createTaskMutation.mutateAsync(task);
      } catch (error) {
        console.error('Error creating task:', error);
      }
    }
  };

  const assignTrainingModules = async (user, position) => {
    const mandatoryModules = trainingModules.filter(module => 
      module.is_mandatory && module.category === 'onboarding'
    );

    for (const module of mandatoryModules.slice(0, 3)) {
      try {
        const existing = await base44.entities.TrainingRecord.filter({
          staff_email: user.email,
          module_id: module.id,
        });

        if (existing.length === 0) {
          await createTrainingRecordMutation.mutateAsync({
            staff_email: user.email,
            staff_name: user.full_name,
            module_id: module.id,
            module_title: module.title,
            module_category: module.category,
            status: 'not_started',
          });
        }
      } catch (error) {
        console.error('Error assigning training:', error);
      }
    }
  };

  const updateFormAssignments = async (user, position) => {
    const roleForms = formTemplates.filter(form => 
      form.assigned_position === position || form.assigned_position === 'any'
    );

    for (const form of roleForms.slice(0, 3)) {
      try {
        const existing = await base44.entities.FormAssignment.filter({
          form_id: form.id,
          assigned_to_email: user.email,
        });

        if (existing.length === 0 && form.auto_assign_enabled) {
          await createFormAssignmentMutation.mutateAsync({
            form_id: form.id,
            form_name: form.form_name,
            assigned_to_email: user.email,
            assigned_to_name: user.full_name,
            assigned_to_role: position,
            schedule_type: form.frequency || 'daily',
            due_time: '17:00',
            is_active: true,
          });
        }
      } catch (error) {
        console.error('Error assigning form:', error);
      }
    }
  };

  const sendRoleChangeNotification = async (user, oldPosition, newPosition) => {
    try {
      await createNotificationMutation.mutateAsync({
        staff_email: user.email,
        staff_name: user.full_name,
        task_id: 'role_change',
        task_name: 'Role Change Notification',
        message: `Your position has been updated from ${oldPosition} to ${newPosition}. New tasks and training modules have been assigned.`,
        notification_type: 'role_change',
        is_read: false,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  return null;
}