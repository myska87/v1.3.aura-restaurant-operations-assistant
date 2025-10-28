/**
 * Dashboard API - Pre-aggregated data service
 * Acts as internal API endpoint for dashboard metrics
 * Filters data by user role and department automatically
 */

import { base44 } from '@/api/base44Client';
import { format, isToday, parseISO, startOfWeek, endOfWeek } from 'date-fns';

/**
 * Main Dashboard Summary Endpoint
 * Returns pre-aggregated metrics filtered by role
 * 
 * @param {Object} user - Current user object
 * @returns {Object} Dashboard summary data
 */
export async function getDashboardSummary(user) {
  if (!user) {
    throw new Error('User authentication required');
  }

  const isAdmin = user.role === 'admin';
  const isManager = user.position === 'manager' || user.position === 'owner';
  const isStaff = !isAdmin && !isManager;

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Fetch data in parallel for performance
  const [
    tasks,
    forms,
    shifts,
    inventory,
    qualityRecords,
    complianceChecks,
    hygieneRecords,
  ] = await Promise.all([
    isStaff
      ? base44.entities.StaffTask.filter({ assigned_to: user.email })
      : base44.entities.StaffTask.list('-due_date', 100),
    isStaff
      ? base44.entities.FormAssignmentMetadata.filter({ assigned_to_email: user.email })
      : base44.entities.FormAssignmentMetadata.list('-due_date', 100),
    base44.entities.Shift.filter({ shift_date: todayStr }),
    isManager || isAdmin
      ? base44.entities.Ingredient.list('', 100)
      : Promise.resolve([]),
    isManager || isAdmin
      ? base44.entities.QualityRecord.list('-created_date', 50)
      : Promise.resolve([]),
    isManager || isAdmin
      ? base44.entities.ComplianceCheck.list('-check_date', 50)
      : Promise.resolve([]),
    isManager || isAdmin
      ? base44.entities.HygieneRecord.list('-created_date', 50)
      : Promise.resolve([]),
  ]);

  // Filter today's records
  const todayQuality = qualityRecords.filter(r => isToday(parseISO(r.created_date)));
  const todayCompliance = complianceChecks.filter(c => isToday(parseISO(c.check_date)));
  const todayHygiene = hygieneRecords.filter(h => isToday(parseISO(h.created_date)));

  // Calculate metrics
  const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
  const tasksPending = tasks.filter(t => 
    t.status === 'pending' || t.status === 'in_progress'
  ).length;
  const tasksTotal = tasks.length;
  const tasksCompletionRate = tasksTotal > 0 
    ? Math.round((tasksCompleted / tasksTotal) * 100) 
    : 0;

  const formsCompleted = forms.filter(f => f.completion_status === 'completed').length;
  const formsPending = forms.filter(f => 
    f.completion_status === 'pending' || f.completion_status === 'in_progress'
  ).length;
  const formsTotal = forms.length;
  const formsCompletionRate = formsTotal > 0
    ? Math.round((formsCompleted / formsTotal) * 100)
    : 0;

  const qualityScore = todayQuality.length > 0
    ? (todayQuality.reduce((sum, r) => sum + (r.score || 0), 0) / todayQuality.length).toFixed(1)
    : 4.8;

  const complianceRate = todayCompliance.length > 0
    ? Math.round((todayCompliance.filter(c => c.status === 'passed').length / todayCompliance.length) * 100)
    : 100;

  const hygieneScore = todayHygiene.length > 0
    ? todayHygiene.filter(h => h.is_in_range !== false).length / todayHygiene.length * 100
    : 100;

  const inventoryAlerts = inventory.filter(item =>
    parseFloat(item.current_stock || 0) <= parseFloat(item.reorder_point || 0)
  ).length;

  const checklistProgress = Math.round((tasksCompletionRate + formsCompletionRate) / 2);

  const staffOnDuty = shifts.filter(s => s.status === 'in_progress').length;
  const staffScheduled = shifts.length;

  const myActiveShift = isStaff
    ? shifts.find(s => s.staff_email === user.email && s.status === 'in_progress')
    : null;

  // Role-specific response
  if (isStaff) {
    return {
      role: 'staff',
      user: {
        email: user.email,
        name: user.full_name,
        position: user.position,
        department: user.department,
      },
      summary: {
        my_tasks_pending: tasksPending,
        my_tasks_completed: tasksCompleted,
        my_tasks_total: tasksTotal,
        my_forms_pending: formsPending,
        my_forms_completed: formsCompleted,
        my_shift_status: myActiveShift ? 'active' : 'none',
        my_shift_id: myActiveShift?.id || null,
      },
      metrics: {
        task_completion_rate: tasksCompletionRate,
        form_completion_rate: formsCompletionRate,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Manager/Admin response
  return {
    role: isAdmin ? 'admin' : 'manager',
    user: {
      email: user.email,
      name: user.full_name,
      position: user.position,
      department: user.department,
    },
    summary: {
      tasks_completed: tasksCompleted,
      tasks_pending: tasksPending,
      tasks_total: tasksTotal,
      forms_completed: formsCompleted,
      forms_pending: formsPending,
      forms_total: formsTotal,
      quality_score: parseFloat(qualityScore),
      compliance_rate: complianceRate,
      hygiene_score: Math.round(hygieneScore),
      inventory_alerts: inventoryAlerts,
      checklist_progress: checklistProgress,
      staff_on_duty: staffOnDuty,
      staff_scheduled: staffScheduled,
    },
    metrics: {
      task_completion_rate: tasksCompletionRate,
      form_completion_rate: formsCompletionRate,
      quality_checks_today: todayQuality.length,
      compliance_checks_today: todayCompliance.length,
      hygiene_records_today: todayHygiene.length,
    },
    alerts: {
      critical_count: inventoryAlerts > 5 ? 1 : 0,
      warning_count: tasksPending > 10 ? 1 : 0,
      info_count: formsPending,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get Weekly Trend Data for Charts
 * Returns last 7 days of metrics
 */
export async function getWeeklyTrends(user) {
  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';
  
  if (!isManager) {
    return null; // Only managers see trends
  }

  const [qualityRecords, tasks, complianceChecks] = await Promise.all([
    base44.entities.QualityRecord.list('-created_date', 200),
    base44.entities.StaffTask.list('-created_date', 200),
    base44.entities.ComplianceCheck.list('-check_date', 200),
  ]);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return format(date, 'yyyy-MM-dd');
  });

  const trendData = last7Days.map(dateStr => {
    const dayQuality = qualityRecords.filter(r =>
      format(parseISO(r.created_date), 'yyyy-MM-dd') === dateStr
    );
    const dayTasks = tasks.filter(t =>
      format(parseISO(t.created_date), 'yyyy-MM-dd') === dateStr
    );
    const dayCompliance = complianceChecks.filter(c =>
      format(parseISO(c.check_date), 'yyyy-MM-dd') === dateStr
    );

    const avgQuality = dayQuality.length > 0
      ? dayQuality.reduce((sum, r) => sum + (r.score || 0), 0) / dayQuality.length
      : 0;

    const tasksCompleted = dayTasks.filter(t => t.status === 'completed').length;

    const complianceRate = dayCompliance.length > 0
      ? (dayCompliance.filter(c => c.status === 'passed').length / dayCompliance.length) * 100
      : 0;

    return {
      date: dateStr,
      label: format(parseISO(dateStr), 'EEE'),
      quality_score: parseFloat(avgQuality.toFixed(1)),
      tasks_completed: tasksCompleted,
      compliance_rate: Math.round(complianceRate),
    };
  });

  return trendData;
}

/**
 * Get Department Breakdown (Manager/Admin only)
 */
export async function getDepartmentMetrics(user) {
  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';
  
  if (!isManager) {
    return null;
  }

  const [allUsers, tasks, qualityRecords] = await Promise.all([
    base44.entities.User.list(),
    base44.entities.StaffTask.list('', 100),
    base44.entities.QualityRecord.list('-created_date', 100),
  ]);

  const departments = ['kitchen', 'front_of_house', 'bar', 'management', 'cleaning'];

  const metrics = departments.map(dept => {
    const deptStaff = allUsers.filter(u => u.department === dept);
    const deptTasks = tasks.filter(t => {
      const assignedUser = allUsers.find(u => u.email === t.assigned_to);
      return assignedUser?.department === dept;
    });
    const deptQuality = qualityRecords.filter(q => q.area?.toLowerCase().includes(dept));

    const tasksCompleted = deptTasks.filter(t => t.status === 'completed').length;
    const avgQuality = deptQuality.length > 0
      ? deptQuality.reduce((sum, r) => sum + (r.score || 0), 0) / deptQuality.length
      : 0;

    return {
      department: dept,
      staff_count: deptStaff.length,
      tasks_total: deptTasks.length,
      tasks_completed: tasksCompleted,
      completion_rate: deptTasks.length > 0 
        ? Math.round((tasksCompleted / deptTasks.length) * 100) 
        : 0,
      quality_score: parseFloat(avgQuality.toFixed(1)),
    };
  });

  return metrics;
}

/**
 * Refresh Dashboard Cache
 * Call this when user manually refreshes
 */
export async function refreshDashboardData(user, queryClient) {
  await queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
  await queryClient.invalidateQueries({ queryKey: ['weeklyTrends'] });
  await queryClient.invalidateQueries({ queryKey: ['departmentMetrics'] });
  
  // Refetch immediately
  return await getDashboardSummary(user);
}