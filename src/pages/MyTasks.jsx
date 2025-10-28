import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Home,
  Camera,
  Upload,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, isPast, isToday } from "date-fns";
import { motion } from "framer-motion";

export default function MyTasks() {
  const queryClient = useQueryClient();
  const [expandedTask, setExpandedTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // ✅ FIXED: Proper query with correct field name
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['myTasks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.StaffTask.filter({
        assigned_to: user.email
      }, '-due_date', 50);
    },
    enabled: !!user?.email,
  });

  // ✅ FIXED: Complete task mutation with activity logging
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, notes, photoUrl }) => {
      return await base44.entities.StaffTask.update(taskId, {
        status: 'completed',
        completed_date: new Date().toISOString(),
        completion_notes: notes,
        photo_url: photoUrl,
      });
    },
    onSuccess: async (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      
      // ✨ Log activity
      await base44.entities.ActivityLog.create({
        activity_type: 'task_completed',
        title: 'Task Completed',
        description: updatedTask.task_name,
        user_email: user.email,
        user_name: user.full_name,
        icon: 'check',
        color: 'green',
        related_entity: 'StaffTask',
        related_entity_id: updatedTask.id,
      });
      
      setExpandedTask(null);
      setCompletionNotes('');
      setPhotoUrl('');
      alert('✅ Task completed successfully!');
    },
    onError: (error) => {
      alert(`❌ Failed to complete task: ${error.message}`);
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(file_url);
    } catch (error) {
      alert('Photo upload failed');
    }
    setUploading(false);
  };

  const handleCompleteTask = async (task) => {
    if (task.photo_url && !photoUrl) {
      alert('This task requires photo evidence');
      return;
    }

    await completeTaskMutation.mutateAsync({
      taskId: task.id,
      notes: completionNotes,
      photoUrl,
    });
  };

  const getTaskPriority = (task) => {
    if (!task.due_date) return 'normal';
    
    const dueDate = new Date(task.due_date);
    if (isPast(dueDate) && task.status !== 'completed') return 'overdue';
    if (isToday(dueDate)) return 'today';
    return 'normal';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      overdue: 'bg-red-100 text-red-800 border-red-300',
      today: 'bg-amber-100 text-amber-800 border-amber-300',
      normal: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[priority] || colors.normal;
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Tasks</h1>
          <p className="text-gray-600">Track and complete your assigned tasks</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{pendingTasks.length}</p>
              <p className="text-sm text-gray-600">Pending Tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{completedTasks.length}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {pendingTasks.filter(t => getTaskPriority(t) === 'overdue').length}
              </p>
              <p className="text-sm text-gray-600">Overdue</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pending Tasks ({pendingTasks.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingTasks.map((task, index) => {
                const priority = getTaskPriority(task);
                const isExpanded = expandedTask === task.id;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className={`border-2 rounded-lg p-4 ${getPriorityColor(priority)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{task.task_name}</h3>
                          {task.description && (
                            <p className="text-sm text-gray-700 mb-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline" className="capitalize">
                              {task.category}
                            </Badge>
                            {task.due_date && (
                              <Badge variant="outline">
                                <Calendar className="w-3 h-3 mr-1" />
                                Due {format(new Date(task.due_date), 'MMM d, HH:mm')}
                              </Badge>
                            )}
                            {priority === 'overdue' && (
                              <Badge className="bg-red-600 text-white">OVERDUE</Badge>
                            )}
                            {priority === 'today' && (
                              <Badge className="bg-amber-600 text-white">DUE TODAY</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          {isExpanded ? 'Cancel' : 'Complete'}
                        </Button>
                      </div>

                      {/* Completion Form */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mt-4 pt-4 border-t space-y-3"
                        >
                          <div>
                            <Label>Completion Notes</Label>
                            <Textarea
                              value={completionNotes}
                              onChange={(e) => setCompletionNotes(e.target.value)}
                              placeholder="Add any notes about completing this task..."
                              rows={2}
                            />
                          </div>

                          <div>
                            <Label>Photo Evidence (Optional)</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => document.getElementById('task-photo').click()}
                                disabled={uploading}
                              >
                                <Camera className="w-4 h-4 mr-2" />
                                {uploading ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Add Photo'}
                              </Button>
                              <input
                                id="task-photo"
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                              />
                              {photoUrl && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPhotoUrl('')}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            {photoUrl && (
                              <img
                                src={photoUrl}
                                alt="Evidence"
                                className="mt-2 w-32 h-32 object-cover rounded-lg"
                              />
                            )}
                          </div>

                          <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => handleCompleteTask(task)}
                            disabled={completeTaskMutation.isPending}
                          >
                            {completeTaskMutation.isPending ? (
                              'Completing...'
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark as Complete
                              </>
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recently Completed ({completedTasks.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium text-gray-900">{task.task_name}</p>
                    <p className="text-xs text-gray-600">
                      Completed {format(new Date(task.completed_date), 'MMM d, HH:mm')}
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && tasks.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tasks Assigned</h3>
              <p className="text-gray-600">You don't have any tasks at the moment</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}