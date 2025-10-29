import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Save, 
  AlertTriangle,
  Clock,
  User,
  Calendar,
  CheckSquare
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ExecuteChecklist() {
  const queryClient = useQueryClient();
  const [checklistId, setChecklistId] = useState(null);
  const [taskStatuses, setTaskStatuses] = useState({});
  const [notes, setNotes] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setChecklistId(id);
    }
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: execution, isLoading } = useQuery({
    queryKey: ['checklistExecution', checklistId],
    queryFn: async () => {
      if (!checklistId) return null;
      const executions = await base44.entities.ChecklistExecution.filter({
        id: checklistId
      });
      return executions[0] || null;
    },
    enabled: !!checklistId,
  });

  const { data: template } = useQuery({
    queryKey: ['checklistTemplate', execution?.template_id],
    queryFn: async () => {
      if (!execution?.template_id) return null;
      const templates = await base44.entities.ChecklistTemplate.filter({
        id: execution.template_id
      });
      return templates[0] || null;
    },
    enabled: !!execution?.template_id,
  });

  useEffect(() => {
    if (execution?.task_results) {
      const statuses = {};
      const taskNotes = {};
      execution.task_results.forEach(task => {
        statuses[task.task_id] = task.status;
        taskNotes[task.task_id] = task.notes || '';
      });
      setTaskStatuses(statuses);
      setNotes(taskNotes);
    }
  }, [execution]);

  const updateExecutionMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ChecklistExecution.update(checklistId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistExecution', checklistId] });
    },
  });

  const handleTaskToggle = (taskId) => {
    const newStatus = taskStatuses[taskId] === 'completed' ? 'pending' : 'completed';
    const updatedStatuses = { ...taskStatuses, [taskId]: newStatus };
    setTaskStatuses(updatedStatuses);

    const taskResults = template?.tasks?.map(task => ({
      task_id: task.id || task.title,
      task_title: task.title,
      status: updatedStatuses[task.id || task.title] || 'pending',
      notes: notes[task.id || task.title] || '',
      completed_at: updatedStatuses[task.id || task.title] === 'completed' ? new Date().toISOString() : null,
    })) || [];

    const completedCount = taskResults.filter(t => t.status === 'completed').length;
    const totalCount = taskResults.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    updateExecutionMutation.mutate({
      task_results: taskResults,
      progress: progress,
      status: progress === 100 ? 'completed' : 'in_progress',
      completed_at: progress === 100 ? new Date().toISOString() : null,
    });
  };

  const handleNotesChange = (taskId, value) => {
    setNotes({ ...notes, [taskId]: value });
  };

  const handleSaveNotes = (taskId) => {
    const taskResults = template?.tasks?.map(task => ({
      task_id: task.id || task.title,
      task_title: task.title,
      status: taskStatuses[task.id || task.title] || 'pending',
      notes: task.id === taskId || task.title === taskId ? notes[taskId] : (notes[task.id || task.title] || ''),
      completed_at: taskStatuses[task.id || task.title] === 'completed' ? new Date().toISOString() : null,
    })) || [];

    updateExecutionMutation.mutate({
      task_results: taskResults,
    });
  };

  const handleCompleteChecklist = () => {
    if (!window.confirm('Mark this checklist as complete?')) return;

    const taskResults = template?.tasks?.map(task => ({
      task_id: task.id || task.title,
      task_title: task.title,
      status: taskStatuses[task.id || task.title] || 'completed',
      notes: notes[task.id || task.title] || '',
      completed_at: new Date().toISOString(),
    })) || [];

    updateExecutionMutation.mutate({
      task_results: taskResults,
      progress: 100,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    alert('✅ Checklist completed successfully!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Clock className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading checklist...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!execution || !template) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800">
              Checklist not found. Please select a valid checklist.
            </AlertDescription>
          </Alert>
          <Link to={createPageUrl('MyChecklists')}>
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Checklists
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const completedTasks = Object.values(taskStatuses).filter(s => s === 'completed').length;
  const totalTasks = template.tasks?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to={createPageUrl('MyChecklists')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Badge className={
            execution.status === 'completed' ? 'bg-green-500' :
            execution.status === 'in_progress' ? 'bg-blue-500' :
            'bg-gray-400'
          }>
            {execution.status === 'completed' ? 'Completed' :
             execution.status === 'in_progress' ? 'In Progress' :
             'Pending'}
          </Badge>
        </div>

        {/* Checklist Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{template.name}</CardTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">{execution.assigned_to_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">{format(new Date(execution.created_date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">{completedTasks} / {totalTasks} tasks</span>
              </div>
              <div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${execution.progress || 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1">{execution.progress || 0}%</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tasks List */}
        <div className="space-y-3">
          {template.tasks?.map((task, index) => {
            const taskId = task.id || task.title;
            const isCompleted = taskStatuses[taskId] === 'completed';

            return (
              <Card key={taskId} className={isCompleted ? 'bg-green-50 border-green-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => handleTaskToggle(taskId)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {index + 1}. {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          )}
                        </div>
                        {isCompleted && (
                          <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                        )}
                      </div>
                      
                      <div className="mt-3">
                        <Textarea
                          placeholder="Add notes..."
                          value={notes[taskId] || ''}
                          onChange={(e) => handleNotesChange(taskId, e.target.value)}
                          className="min-h-[60px]"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => handleSaveNotes(taskId)}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save Notes
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Complete Button */}
        {execution.status !== 'completed' && (
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
            <CardContent className="p-6 text-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                onClick={handleCompleteChecklist}
                disabled={completedTasks < totalTasks}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Complete Checklist
              </Button>
              {completedTasks < totalTasks && (
                <p className="text-sm text-gray-600 mt-2">
                  Complete all tasks to finish this checklist
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}