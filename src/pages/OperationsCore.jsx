import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
  Calendar,
  Plus,
  FileText,
  Star,
  ClipboardCheck,
  TrendingUp,
  Users,
  Zap,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

export default function OperationsCore() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: operationTasks = [], isLoading } = useQuery({
    queryKey: ['operationTasks'],
    queryFn: () => base44.entities.OperationTask.list('-due_date', 100),
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const { data: weeklySummary } = useQuery({
    queryKey: ['weeklySummary', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const summaries = await base44.entities.OperationWeeklySummary.filter({
        week_start_date: format(weekStart, 'yyyy-MM-dd')
      });
      return summaries[0] || null;
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, comments, attachments }) => {
      return await base44.entities.OperationTask.update(taskId, {
        status: 'completed',
        completion_date: new Date().toISOString(),
        completed_by_email: user.email,
        completed_by_name: user.full_name,
        comments,
        attachments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationTasks'] });
    },
  });

  const filteredTasks = operationTasks.filter(task => {
    const matchesType = filterType === 'all' || task.type === filterType;
    const matchesDept = filterDepartment === 'all' || task.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    return matchesType && matchesDept && matchesStatus;
  });

  const stats = {
    total: operationTasks.length,
    pending: operationTasks.filter(t => t.status === 'pending').length,
    inProgress: operationTasks.filter(t => t.status === 'in_progress').length,
    completed: operationTasks.filter(t => t.status === 'completed').length,
    overdue: operationTasks.filter(t => t.status === 'overdue').length,
    completionRate: operationTasks.length > 0
      ? Math.round((operationTasks.filter(t => t.status === 'completed').length / operationTasks.length) * 100)
      : 0,
  };

  const getTypeIcon = (type) => {
    if (type === 'sop') return <FileText className="w-5 h-5 text-purple-600" />;
    if (type === 'audit') return <Star className="w-5 h-5 text-amber-600" />;
    if (type === 'checklist') return <ClipboardCheck className="w-5 h-5 text-blue-600" />;
    return <Target className="w-5 h-5 text-gray-600" />;
  };

  const getStatusColor = (status) => {
    if (status === 'completed') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (status === 'overdue') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTaskLink = (task) => {
    if (task.linked_sop_id) return createPageUrl(`SOPViewer?id=${task.linked_sop_id}`);
    if (task.linked_checklist_id) return createPageUrl(`ExecuteChecklist?id=${task.linked_checklist_id}`);
    if (task.linked_quality_id) return createPageUrl(`QualityDashboardHub`);
    if (task.linked_form_id) return createPageUrl(`FormIntelligence?openForm=${task.linked_form_id}`);
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-600">Total Tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-900">{stats.pending}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-900">{stats.completed}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-900">{stats.overdue}</p>
            <p className="text-sm text-gray-600">Overdue</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-none">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2" />
            <p className="text-3xl font-bold">{stats.completionRate}%</p>
            <p className="text-sm opacity-90">Completion</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Weekly Summary */}
      {weeklySummary && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              AI Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-800 leading-relaxed">
              {weeklySummary.ai_summary || 'Generating insights...'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Task Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sop">SOPs</SelectItem>
                <SelectItem value="audit">Audits</SelectItem>
                <SelectItem value="checklist">Checklists</SelectItem>
                <SelectItem value="quality">Quality</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
                <SelectItem value="front_of_house">Front of House</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="management">Management</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Operational Tasks ({filteredTasks.length})</CardTitle>
            {isManager && (
              <Link to={createPageUrl('CreateOperationTask')}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tasks Found</h3>
              <p className="text-gray-600">
                {filterType !== 'all' || filterDepartment !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Tasks will be auto-generated based on schedules'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task, index) => {
                const taskLink = getTaskLink(task);

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className={`border-2 rounded-lg p-4 ${getStatusColor(task.status)} hover:shadow-lg transition-all`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getTypeIcon(task.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900">{task.title}</h3>
                              <Badge variant="outline" className="text-xs capitalize">
                                {task.type}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-2 text-sm text-gray-700 mb-2">
                              {task.department && (
                                <span className="capitalize">📍 {task.department}</span>
                              )}
                              {task.assigned_to_name && (
                                <span>👤 {task.assigned_to_name}</span>
                              )}
                            </div>

                            {task.due_date && (
                              <p className="text-xs text-gray-600">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Due: {format(parseISO(task.due_date), 'MMM d, h:mm a')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {taskLink && (
                            <Link to={taskLink}>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                          {task.status === 'pending' && task.assigned_to === user?.email && (
                            <Button
                              size="sm"
                              onClick={() => completeTaskMutation.mutate({ taskId: task.id, comments: '', attachments: [] })}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}