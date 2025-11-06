import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Upload,
  Check,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

export default function MyTasks() {
  const queryClient = useQueryClient();
  const [expandedTask, setExpandedTask] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['myTasks', user?.email],
    queryFn: () => base44.entities.StaffTask.filter({
      assigned_to: user?.email,
    }, '-due_date'),
    enabled: !!user?.email,
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      setCompletingTask(null);
      setCompletionNotes('');
      setPhotoUrl('');
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploadingPhoto(false);
  };

  const handleCompleteTask = async (task) => {
    await completeTaskMutation.mutateAsync({
      id: task.id,
      data: {
        status: 'completed',
        completed_date: new Date().toISOString(),
        completion_notes: completionNotes,
        photo_url: photoUrl || task.photo_url,
      }
    });
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = pendingTasks.filter(t => isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const todayTasks = pendingTasks.filter(t => isToday(new Date(t.due_date)));
  const upcomingTasks = pendingTasks.filter(t => !isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));

  const TaskCard = ({ task }) => {
    const isExpanded = expandedTask === task.id;
    const isCompleting = completingTask === task.id;
    const dueDate = new Date(task.due_date);
    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    const isDueToday = isToday(dueDate);

    return (
      <Card className={`bg-white ${isOverdue ? 'border-l-4 border-l-red-500' : isDueToday ? 'border-l-4 border-l-amber-500' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-1">
                {task.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg text-gray-900">{task.task_name}</CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{task.category}</Badge>
                  {task.shift && (
                    <Badge variant="outline" className="capitalize">{task.shift}</Badge>
                  )}
                  {isOverdue && (
                    <Badge className="bg-red-100 text-red-800">Overdue</Badge>
                  )}
                  {isDueToday && (
                    <Badge className="bg-amber-100 text-amber-800">Due Today</Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedTask(isExpanded ? null : task.id)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {task.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
                  <p className="text-sm text-gray-600">{task.description}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Due: {format(dueDate, 'PPp')}</span>
              </div>

              {task.status !== 'completed' && (
                <div className="pt-4 border-t">
                  {!isCompleting ? (
                    <Button
                      onClick={() => setCompletingTask(task.id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Mark as Complete
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Add completion notes (optional)..."
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        rows={3}
                      />
                      <div>
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById(`task-photo-${task.id}`).click()}
                          disabled={uploadingPhoto}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingPhoto ? 'Uploading...' : photoUrl ? 'Photo Added ✓' : 'Add Photo (Optional)'}
                        </Button>
                        <input
                          id={`task-photo-${task.id}`}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCompletingTask(null);
                            setCompletionNotes('');
                            setPhotoUrl('');
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleCompleteTask(task)}
                          disabled={completeTaskMutation.isPending}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          Confirm Complete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {task.status === 'completed' && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-green-700 font-medium mb-2">✓ Completed</p>
                  {task.completed_date && (
                    <p className="text-xs text-gray-500">
                      {format(new Date(task.completed_date), 'PPp')}
                    </p>
                  )}
                  {task.completion_notes && (
                    <p className="text-sm text-gray-600 mt-2">{task.completion_notes}</p>
                  )}
                  {task.photo_url && (
                    <img src={task.photo_url} alt="Completion" className="mt-2 rounded-lg w-full h-32 object-cover" />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Tasks</h1>
          <p className="text-gray-600">View and manage your assigned tasks</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks assigned</h3>
              <p className="text-gray-600">You're all caught up! 🎉</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Overdue Tasks */}
            {overdueTasks.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Overdue ({overdueTasks.length})
                </h2>
                <div className="space-y-4">
                  {overdueTasks.map(task => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            )}

            {/* Today's Tasks */}
            {todayTasks.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-amber-700 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Due Today ({todayTasks.length})
                </h2>
                <div className="space-y-4">
                  {todayTasks.map(task => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            )}

            {/* Upcoming Tasks */}
            {upcomingTasks.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming ({upcomingTasks.length})
                </h2>
                <div className="space-y-4">
                  {upcomingTasks.map(task => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Completed ({completedTasks.length})
                </h2>
                <div className="space-y-4">
                  {completedTasks.slice(0, 5).map(task => <TaskCard key={task.id} task={task} />)}
                </div>
                {completedTasks.length > 5 && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    + {completedTasks.length - 5} more completed tasks
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}