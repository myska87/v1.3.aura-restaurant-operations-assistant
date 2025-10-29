import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Target,
  TrendingUp,
  Plus,
  Edit,
  Activity,
  BarChart3,
  Award,
  AlertTriangle,
  Play,
  CheckCircle
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export default function KPIDashboard() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [editingKPI, setEditingKPI] = useState(null);
  const [runningKPIs, setRunningKPIs] = useState(false);

  const [kpiForm, setKpiForm] = useState({
    department: 'all',
    role: 'all',
    metric_name: 'attendance',
    custom_metric_name: '',
    description: '',
    weight: 10,
    target_value: 95,
    minimum_acceptable: 80,
    frequency: 'weekly',
    auto_calculate: true
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  // Fetch KPI profiles
  const { data: kpiProfiles = [] } = useQuery({
    queryKey: ['kpiProfiles'],
    queryFn: () => base44.entities.KPIProfile.list('-created_date', 100),
  });

  // Fetch latest KPI reports
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const { data: kpiReports = [] } = useQuery({
    queryKey: ['kpiReports', weekStartStr],
    queryFn: () => base44.entities.KPIReport.filter({
      period_start: weekStartStr
    }, '-kpi_score', 100),
  });

  // Create KPI Profile
  const createKPIMutation = useMutation({
    mutationFn: (data) => base44.entities.KPIProfile.create({
      ...data,
      created_by: user?.email,
      created_by_name: user?.full_name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiProfiles'] });
      setShowCreateDialog(false);
      setKpiForm({
        department: 'all',
        role: 'all',
        metric_name: 'attendance',
        custom_metric_name: '',
        description: '',
        weight: 10,
        target_value: 95,
        minimum_acceptable: 80,
        frequency: 'weekly',
        auto_calculate: true
      });
      alert('✅ KPI Profile created successfully!');
    },
  });

  // Calculate KPIs for all staff
  const calculateKPIsMutation = useMutation({
    mutationFn: async () => {
      setRunningKPIs(true);
      
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

      // Get all active staff
      const allUsers = await base44.entities.User.list();
      const teamMembers = await base44.entities.TeamMember.list();
      
      const staffMap = new Map();
      allUsers.forEach(u => staffMap.set(u.email, { ...u }));
      teamMembers.forEach(m => {
        if (staffMap.has(m.staff_email)) {
          staffMap.set(m.staff_email, {
            ...staffMap.get(m.staff_email),
            position: m.position || staffMap.get(m.staff_email).position,
            department: m.department
          });
        }
      });

      const staff = Array.from(staffMap.values());

      // Get staff activities for the week
      const activities = await base44.entities.StaffActivity.filter({
        date: { $gte: weekStartStr, $lte: weekEndStr }
      });

      const reportsCreated = [];

      for (const staffMember of staff) {
        const staffActivities = activities.filter(a => a.staff_email === staffMember.email);
        
        if (staffActivities.length === 0) continue;

        // Get applicable KPIs for this staff member
        const applicableKPIs = kpiProfiles.filter(kpi =>
          (kpi.department === 'all' || kpi.department === staffMember.department) &&
          (kpi.role === 'all' || kpi.role === staffMember.position)
        );

        for (const kpi of applicableKPIs) {
          let achievedValue = 0;

          // Calculate based on metric type
          switch (kpi.metric_name) {
            case 'attendance':
              const totalShifts = staffActivities.length;
              const attendedShifts = staffActivities.filter(a => a.clock_in).length;
              achievedValue = totalShifts > 0 ? (attendedShifts / totalShifts) * 100 : 0;
              break;

            case 'punctuality':
              const totalLateness = staffActivities.reduce((sum, a) => sum + (a.lateness_minutes || 0), 0);
              const avgLateness = staffActivities.length > 0 ? totalLateness / staffActivities.length : 0;
              achievedValue = Math.max(0, 100 - avgLateness);
              break;

            case 'task_completion':
              const totalTasks = staffActivities.reduce((sum, a) => sum + (a.tasks_assigned || 0), 0);
              const completedTasks = staffActivities.reduce((sum, a) => sum + (a.tasks_completed || 0), 0);
              achievedValue = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
              break;

            case 'quality_score':
              const qualityScores = staffActivities
                .filter(a => a.average_quality)
                .map(a => a.average_quality);
              achievedValue = qualityScores.length > 0
                ? (qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length) * 20
                : 0;
              break;

            default:
              achievedValue = 0;
          }

          const variance = achievedValue - kpi.target_value;
          const variancePercentage = kpi.target_value > 0 ? (variance / kpi.target_value) * 100 : 0;
          const kpiScore = Math.min(100, Math.max(0, (achievedValue / kpi.target_value) * 100));
          
          const status = achievedValue >= kpi.target_value ? 'exceeds' :
                        achievedValue >= kpi.minimum_acceptable ? 'meets' :
                        achievedValue >= kpi.minimum_acceptable * 0.7 ? 'below' : 'critical';

          const report = await base44.entities.KPIReport.create({
            staff_email: staffMember.email,
            staff_name: staffMember.full_name,
            kpi_profile_id: kpi.id,
            metric_name: kpi.metric_name,
            department: staffMember.department,
            role: staffMember.position,
            period_start: weekStartStr,
            period_end: weekEndStr,
            target_value: kpi.target_value,
            achieved_value: parseFloat(achievedValue.toFixed(2)),
            variance: parseFloat(variance.toFixed(2)),
            variance_percentage: parseFloat(variancePercentage.toFixed(2)),
            kpi_score: parseFloat(kpiScore.toFixed(2)),
            status: status,
            data_points_used: staffActivities.length,
            calculation_notes: `Auto-calculated from ${staffActivities.length} activities`,
            generated_date: new Date().toISOString(),
            generated_by: 'system',
            alert_triggered: status === 'critical'
          });

          reportsCreated.push(report);
        }
      }

      return { reportsCreated: reportsCreated.length };
    },
    onSuccess: (result) => {
      setRunningKPIs(false);
      queryClient.invalidateQueries({ queryKey: ['kpiReports'] });
      alert(`✅ KPI Calculation Complete!\n\n${result.reportsCreated} reports generated.`);
      setShowRunDialog(false);
    },
    onError: (error) => {
      setRunningKPIs(false);
      alert(`❌ KPI calculation failed: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createKPIMutation.mutate(kpiForm);
  };

  // Group reports by staff
  const reportsByStaff = {};
  kpiReports.forEach(report => {
    if (!reportsByStaff[report.staff_email]) {
      reportsByStaff[report.staff_email] = {
        staff_name: report.staff_name,
        staff_email: report.staff_email,
        role: report.role,
        department: report.department,
        reports: []
      };
    }
    reportsByStaff[report.staff_email].reports.push(report);
  });

  const staffWithReports = Object.values(reportsByStaff);

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">KPI Dashboard</h1>
            <p className="text-gray-600">Define targets and track performance automatically</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowRunDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Calculate KPIs
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New KPI
            </Button>
          </div>
        </div>

        {/* KPI Profiles */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Active KPI Profiles ({kpiProfiles.filter(k => k.is_active).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpiProfiles.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No KPIs defined yet</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  Create First KPI
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {kpiProfiles.map((kpi) => (
                  <div key={kpi.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">
                          {kpi.metric_name.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {kpi.department} • {kpi.role || 'All roles'}
                        </p>
                      </div>
                      <Badge className={kpi.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {kpi.weight}% weight
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                      <div>
                        <p className="text-gray-500">Target</p>
                        <p className="font-semibold">{kpi.target_value}{kpi.measurement_type === 'percentage' ? '%' : ''}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Minimum</p>
                        <p className="font-semibold">{kpi.minimum_acceptable}{kpi.measurement_type === 'percentage' ? '%' : ''}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest KPI Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              This Week's Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffWithReports.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No KPI reports yet</p>
                <p className="text-sm text-gray-500 mb-4">
                  Click "Calculate KPIs" to generate this week's performance reports
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {staffWithReports.map((staff) => {
                  const avgScore = staff.reports.reduce((sum, r) => sum + r.kpi_score, 0) / staff.reports.length;
                  const criticalCount = staff.reports.filter(r => r.status === 'critical').length;
                  
                  return (
                    <div key={staff.staff_email} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{staff.staff_name}</p>
                          <p className="text-sm text-gray-600">
                            {staff.role} • {staff.department}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{avgScore.toFixed(1)}</p>
                          <p className="text-xs text-gray-600">Overall KPI Score</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {staff.reports.map((report) => (
                          <div key={report.id} className="p-3 bg-white rounded-lg border">
                            <p className="text-xs text-gray-600 mb-1 capitalize">
                              {report.metric_name.replace('_', ' ')}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-gray-900">
                                {report.achieved_value.toFixed(1)}
                                {report.metric_name.includes('percentage') || report.metric_name === 'attendance' ? '%' : ''}
                              </p>
                              <Badge className={
                                report.status === 'exceeds' ? 'bg-green-100 text-green-800' :
                                report.status === 'meets' ? 'bg-blue-100 text-blue-800' :
                                report.status === 'below' ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {report.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Target: {report.target_value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {criticalCount > 0 && (
                        <div className="mt-3 p-2 bg-red-50 rounded border border-red-200 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <p className="text-sm text-red-800">
                            {criticalCount} critical KPI{criticalCount > 1 ? 's' : ''} - attention needed
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create KPI Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create KPI Profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Metric</Label>
                  <Select
                    value={kpiForm.metric_name}
                    onValueChange={(value) => setKpiForm({ ...kpiForm, metric_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attendance">Attendance Rate</SelectItem>
                      <SelectItem value="punctuality">Punctuality</SelectItem>
                      <SelectItem value="task_completion">Task Completion</SelectItem>
                      <SelectItem value="quality_score">Quality Score</SelectItem>
                      <SelectItem value="hygiene_compliance">Hygiene Compliance</SelectItem>
                      <SelectItem value="sop_adherence">SOP Adherence</SelectItem>
                      <SelectItem value="training_completion">Training Completion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Department</Label>
                  <Select
                    value={kpiForm.department}
                    onValueChange={(value) => setKpiForm({ ...kpiForm, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="front_of_house">Front of House</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={kpiForm.description}
                  onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })}
                  placeholder="What does this KPI measure?"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Weight (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={kpiForm.weight}
                    onChange={(e) => setKpiForm({ ...kpiForm, weight: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    value={kpiForm.target_value}
                    onChange={(e) => setKpiForm({ ...kpiForm, target_value: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Minimum Acceptable</Label>
                  <Input
                    type="number"
                    value={kpiForm.minimum_acceptable}
                    onChange={(e) => setKpiForm({ ...kpiForm, minimum_acceptable: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createKPIMutation.isPending}>
                  {createKPIMutation.isPending ? 'Creating...' : 'Create KPI'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Run KPIs Dialog */}
        <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Calculate Weekly KPIs</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700 mb-4">
                This will calculate KPI scores for all staff based on their activities this week
                ({format(weekStart, 'MMM d')} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d')}).
              </p>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">This will analyze:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Attendance records</li>
                      <li>Task completion rates</li>
                      <li>Quality check scores</li>
                      <li>Hygiene compliance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRunDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => calculateKPIsMutation.mutate()}
                disabled={runningKPIs}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {runningKPIs ? 'Calculating...' : 'Run Calculation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}