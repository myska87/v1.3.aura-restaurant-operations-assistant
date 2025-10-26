import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ChecklistReview() {
  const [executionId, setExecutionId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setExecutionId(id);
    }
  }, []);

  const { data: execution, isLoading } = useQuery({
    queryKey: ['checklistExecution', executionId],
    queryFn: async () => {
      if (!executionId) return null;
      const executions = await base44.entities.ChecklistExecution.filter({
        id: executionId
      });
      return executions[0] || null;
    },
    enabled: !!executionId,
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

  const handleExportPDF = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Clock className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading checklist review...</p>
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
              Checklist not found. Please select a valid checklist to review.
            </AlertDescription>
          </Alert>
          <Link to={createPageUrl('ChecklistMonitor')}>
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Monitor
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const completedTasks = execution.task_results?.filter(t => t.status === 'completed').length || 0;
  const totalTasks = execution.task_results?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <Link to={createPageUrl('ChecklistMonitor')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Monitor
            </Button>
          </Link>
          <Button onClick={handleExportPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{template.name}</CardTitle>
                <p className="text-gray-600 mt-2">{template.description}</p>
              </div>
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
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Assigned To</span>
                </div>
                <p className="text-gray-900">{execution.assigned_to_name}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Date</span>
                </div>
                <p className="text-gray-900">{format(new Date(execution.created_date), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Completion Time</span>
                </div>
                <p className="text-gray-900">
                  {execution.completed_at ? format(new Date(execution.completed_at), 'h:mm a') : 'Not completed'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm font-medium text-gray-900">{completedTasks} / {totalTasks} tasks</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${execution.progress || 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Review */}
        <Card>
          <CardHeader>
            <CardTitle>Task Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {execution.task_results?.map((task, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border-2 ${
                    task.status === 'completed' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {task.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                        <h4 className="font-medium text-gray-900">
                          {index + 1}. {task.task_title}
                        </h4>
                      </div>
                      
                      {task.notes && (
                        <div className="ml-7 mt-2 p-3 bg-white rounded border border-gray-200">
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                            <FileText className="w-3 h-3" />
                            <span className="font-medium">Notes</span>
                          </div>
                          <p className="text-sm text-gray-700">{task.notes}</p>
                        </div>
                      )}
                      
                      {task.completed_at && (
                        <p className="ml-7 mt-2 text-xs text-gray-500">
                          Completed: {format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}