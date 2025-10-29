import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl, safeNumber } from "@/utils";
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { format, parseISO } from "date-fns";

export default function MyChecklists() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: executions = [], isLoading } = useQuery({
    queryKey: ['myChecklistExecutions', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.ChecklistExecution.filter({
        assigned_to: user.email,
      }, '-created_date', 50);
    },
    enabled: !!user?.email,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ChecklistTemplate.list(),
  });

  const startChecklistMutation = useMutation({
    mutationFn: async (templateId) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      return await base44.entities.ChecklistExecution.create({
        template_id: templateId,
        template_name: template.name,
        assigned_to: user.email,
        assigned_to_name: user.full_name,
        status: 'in_progress',
        items: template.items?.map(item => ({
          ...item,
          status: 'pending',
          checked: false,
        })) || [],
      });
    },
    onSuccess: (newExecution) => {
      queryClient.invalidateQueries({ queryKey: ['myChecklistExecutions'] });
      navigate(createPageUrl(`ExecuteChecklist?id=${newExecution.id}`));
    },
  });

  const deleteExecutionMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistExecution.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myChecklistExecutions'] });
    },
  });

  const stats = {
    total: executions.length,
    inProgress: executions.filter(e => e.status === 'in_progress').length,
    completed: executions.filter(e => e.status === 'completed').length,
    overdue: executions.filter(e => e.status === 'overdue').length,
  };

  const getStatusBadge = (status) => {
    const badges = {
      in_progress: <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>,
      completed: <Badge className="bg-green-100 text-green-800">Completed</Badge>,
      overdue: <Badge className="bg-red-100 text-red-800">Overdue</Badge>,
      pending: <Badge className="bg-gray-100 text-gray-800">Pending</Badge>,
    };
    return badges[status] || <Badge>Unknown</Badge>;
  };

  const getCompletionPercentage = (execution) => {
    if (!execution.items || execution.items.length === 0) return 0;
    const completed = execution.items.filter(item => item.checked || item.status === 'completed').length;
    return Math.round((completed / execution.items.length) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Checklists</h1>
            <p className="text-gray-600">Track and complete your assigned checklists</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardList className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-blue-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-600">In Progress</p>
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
        </div>

        {/* Available Templates */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Start New Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {templates.length === 0 ? (
                <div className="col-span-3">
                  <EmptyState
                    icon={ClipboardList}
                    title="No Templates Available"
                    description="No checklist templates have been created yet"
                  />
                </div>
              ) : (
                templates.map((template) => (
                  <Card key={template.id} className="border-2 hover:border-emerald-500 transition-colors">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{template.items?.length || 0} items</Badge>
                        <Button
                          size="sm"
                          onClick={() => startChecklistMutation.mutate(template.id)}
                          disabled={startChecklistMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Checklists */}
        <Card>
          <CardHeader>
            <CardTitle>My Checklists ({executions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSpinner />
            ) : executions.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No Checklists Yet"
                description="Start a checklist from the templates above"
              />
            ) : (
              <div className="space-y-4">
                {executions.map((execution) => {
                  const completion = getCompletionPercentage(execution);
                  
                  return (
                    <Card key={execution.id} className="border-2 hover:border-emerald-500 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 mb-1">
                              {execution.template_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Started {execution.created_date && format(parseISO(execution.created_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(execution.status)}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Progress</span>
                            <span className="text-sm font-semibold text-emerald-600">{completion}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {execution.status !== 'completed' && (
                            <Link to={createPageUrl(`ExecuteChecklist?id=${execution.id}`)} className="flex-1">
                              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                                Continue
                              </Button>
                            </Link>
                          )}
                          {execution.status === 'completed' && (
                            <Link to={createPageUrl(`ExecuteChecklist?id=${execution.id}`)} className="flex-1">
                              <Button variant="outline" className="w-full">
                                View Details
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => deleteExecutionMutation.mutate(execution.id)}
                            disabled={deleteExecutionMutation.isPending}
                            className="text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}