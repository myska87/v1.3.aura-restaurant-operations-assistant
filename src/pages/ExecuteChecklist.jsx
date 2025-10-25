
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, MinusCircle, Camera, ArrowLeft, Home, AlertTriangle, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ExecuteChecklist() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const checklistId = urlParams.get('id');
  
  const [uploading, setUploading] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false); // New state for completion dialog

  const { data: checklist, isLoading, isError } = useQuery({
    queryKey: ['checklistExecution', checklistId],
    queryFn: async () => {
      if (!checklistId) return null;
      
      try {
        const lists = await base44.entities.ChecklistExecution.list();
        const found = lists.find(c => c.id === checklistId);
        
        if (!found) {
          console.error(`Checklist with ID ${checklistId} not found`);
        }
        
        return found || null;
      } catch (error) {
        console.error("Error fetching checklist:", error);
        throw error;
      }
    },
    enabled: !!checklistId,
    retry: 1,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChecklistExecution.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistExecution', checklistId] });
      queryClient.invalidateQueries({ queryKey: ['myChecklists'] });
      queryClient.invalidateQueries({ queryKey: ['myChecklistExecutions'] });
    },
    onError: (error) => {
      console.error("Error updating checklist:", error);
      alert("Failed to update checklist. Please try again.");
    }
  });

  const createMaintenanceTicketMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceTicket.create(data),
    onError: (error) => {
      console.error("Error creating maintenance ticket:", error);
    }
  });

  // Helper to determine if a task is still pending action
  const isTaskPending = (task) => {
    if (!task) return false; // Handle case where task might be undefined
    if (task.status === 'pending') {
      if (task.field_type === 'text_input' && task.text_response) {
        return false; // Text input task with response is considered "done"
      }
      return true; // Other pending tasks are truly pending
    }
    return false;
  };

  // Auto-start checklist only once
  useEffect(() => {
    if (checklist && checklist.status === 'not_started' && !hasStarted && user) {
      setHasStarted(true);
      updateChecklistMutation.mutate({
        id: checklist.id,
        data: {
          status: 'in_progress',
          started_at: new Date().toISOString(),
        }
      });
    }
  }, [checklist?.id, checklist?.status, hasStarted, user]);

  const handleTaskUpdate = async (taskId, updates = {}) => {
    if (!checklist) return;

    const currentTaskBeforeUpdate = checklist.tasks.find(t => t.task_id === taskId);
    
    const updatedTasks = checklist.tasks.map(task => 
      task.task_id === taskId
        ? {
            ...task,
            ...updates,
            // Only set completed_at if a status is explicitly being set AND it's different from current
            completed_at: updates.status && task.status !== updates.status ? new Date().toISOString() : task.completed_at,
          }
        : task
    );

    const currentTaskDataAfterUpdate = updatedTasks.find(t => t.task_id === taskId);

    const allTasksTrulyCompleted = updatedTasks.every(t => !isTaskPending(t));

    const passCount = updatedTasks.filter(t => t.status === 'pass').length;
    const totalTasksForPassRate = updatedTasks.length; 
    const passRate = totalTasksForPassRate > 0 ? Math.round((passCount / totalTasksForPassRate) * 100) : 0;

    // AUTO-CREATE MAINTENANCE TICKET FOR FAILED ITEMS
    // This should only trigger if the status just became 'fail' and it wasn't already 'fail'
    if (updates.status === 'fail' && currentTaskBeforeUpdate?.status !== 'fail' && checklist.template_name.includes('Hygiene')) {
      try {
        await createMaintenanceTicketMutation.mutateAsync({
          title: `🚨 URGENT: Hygiene Check Failed - ${currentTaskDataAfterUpdate.description.substring(0, 50)}...`,
          description: `**AUTOMATIC TICKET FROM 6-MONTHLY HYGIENE INSPECTION**\n\n` +
                      `**Failed Check:** ${currentTaskDataAfterUpdate.description}\n\n` +
                      `**Inspector:** ${user?.full_name || user?.email || 'Unknown'}\n` +
                      `**Date:** ${format(new Date(), 'PPP')}\n\n` +
                      `**Notes:** ${currentTaskDataAfterUpdate.notes || 'No additional notes provided'}\n\n` +
                      `**Category:** ${currentTaskDataAfterUpdate.category || 'Food Safety'}\n\n` +
                      `⚠️ This issue must be resolved immediately to maintain food safety compliance.`,
          category: "hygiene",
          location: checklist.template_name,
          priority: "urgent",
          status: "open",
          reported_by: user?.full_name || user?.email || 'System',
          photo_urls: currentTaskDataAfterUpdate.photo_url ? [currentTaskDataAfterUpdate.photo_url] : [],
        });
      } catch (error) {
        console.error("Failed to create maintenance ticket:", error);
      }
    }

    await updateChecklistMutation.mutateAsync({
      id: checklist.id,
      data: {
        tasks: updatedTasks,
        status: allTasksTrulyCompleted ? 'completed' : 'in_progress',
        completed_at: allTasksTrulyCompleted ? new Date().toISOString() : null,
        completed_by_email: allTasksTrulyCompleted ? user?.email : null,
        completed_by_name: allTasksTrulyCompleted ? user?.full_name : null,
        overall_pass_rate: passRate,
      }
    });

    if (allTasksTrulyCompleted) {
      setTimeout(() => {
        navigate(createPageUrl('AdvancedChecklists'));
      }, 1000);
    } else if (updates.status) { // Only advance if an explicit status was set (not just text input change)
      const nextPendingIndex = updatedTasks.findIndex(isTaskPending);
      if (nextPendingIndex !== -1 && nextPendingIndex !== currentTaskIndex) {
        setCurrentTaskIndex(nextPendingIndex);
      }
    }
  };

  const handlePhotoUpload = async (e, taskId) => {
    const file = e.target.files?.[0];
    if (!file || !checklist) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updatedTasks = checklist.tasks.map(task =>
        task.task_id === taskId
          ? { ...task, photo_url: file_url }
          : task
      );
      
      await updateChecklistMutation.mutateAsync({
        id: checklist.id,
        data: { tasks: updatedTasks }
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo. Please try again.");
    }
    setUploading(false);
  };

  if (!checklistId) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <Card className="bg-white max-w-md">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 mb-2">No checklist ID provided</p>
            <p className="text-sm text-gray-600 mb-6">The URL is missing the checklist ID parameter</p>
            <Button onClick={() => navigate(createPageUrl('AdvancedChecklists'))}>
              Go to Checklists
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading checklist...</p>
        </div>
      </div>
    );
  }

  if (isError || !checklist) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <Card className="bg-white max-w-md">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 mb-2">Checklist Not Found</p>
            <p className="text-sm text-gray-600 mb-2">
              The checklist with ID: <code className="bg-gray-100 px-2 py-1 rounded">{checklistId}</code> could not be found.
            </p>
            <p className="text-xs text-gray-500 mb-6">
              It may have been deleted or the link is incorrect.
            </p>
            <Button onClick={() => navigate(createPageUrl('AdvancedChecklists'))}>
              Go to Checklists
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find the current task to display, prioritizing the first truly pending one
  let currentTask = checklist.tasks[currentTaskIndex];
  if (!currentTask || !isTaskPending(currentTask)) {
    const nextPendingIndex = checklist.tasks.findIndex(isTaskPending);
    if (nextPendingIndex !== -1 && nextPendingIndex !== currentTaskIndex) {
      setCurrentTaskIndex(nextPendingIndex);
      return null; // Trigger re-render to display the new currentTask
    } else if (nextPendingIndex === -1) {
      // All tasks are truly completed or have a response.
      // currentTask will remain the last task, but UI will show "All tasks completed!"
    }
  }

  const completedTasksCount = checklist.tasks.filter(t => !isTaskPending(t)).length;
  const progress = Math.round((completedTasksCount / checklist.tasks.length) * 100);

  const isHygieneChecklist = checklist.template_name?.includes('Hygiene') || false;

  // Read-only state for current task actions
  const isCurrentTaskActionDisabled = updateChecklistMutation.isPending || uploading;

  // Read-only state for overall checklist submission button
  const allChecklistTasksTrulyCompleted = checklist.tasks.every(t => !isTaskPending(t));

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('AdvancedChecklists'))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checklists
          </Button>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <Card className="bg-white border-none shadow-lg mb-6">
          <CardHeader>
            <div className="flex justify-between items-start mb-4">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {checklist.template_name}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {checklist.shift_type?.replace(/_/g, ' ') || 'Any Shift'}
                  </Badge>
                  <Badge variant="outline">
                    Task {Math.min(currentTaskIndex + 1, checklist.tasks.length)} of {checklist.tasks.length}
                  </Badge>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Overall Progress</span>
                <span className="font-medium text-gray-900">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </CardHeader>
        </Card>

        {/* Current Task */}
        {currentTask && isTaskPending(currentTask) ? (
          <Card className="bg-white border-none shadow-lg">
            <CardHeader>
              {isHygieneChecklist && currentTask.category && (
                <div className="flex items-start gap-2 p-2 bg-gray-50 rounded mb-2 w-fit">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{currentTask.category}</span>
                </div>
              )}
              <CardTitle className="text-xl font-semibold text-gray-900">
                {currentTask.description}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {currentTask.requires_photo && (
                  <Badge variant="outline">📸 Photo Required</Badge>
                )}
                {currentTask.requires_temperature && (
                  <Badge variant="outline">🌡️ Temperature Required</Badge>
                )}
                {currentTask.requires_signature && (
                  <Badge variant="outline">✍️ Signature Required</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Photo Upload */}
              {currentTask.requires_photo && (
                <div className="space-y-2">
                  <Label>Photo Evidence</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById(`photo-${currentTask.task_id}`).click()}
                      disabled={isCurrentTaskActionDisabled}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Take Photo'}
                    </Button>
                    <input
                      id={`photo-${currentTask.task_id}`}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoUpload(e, currentTask.task_id)}
                      className="hidden"
                      disabled={isCurrentTaskActionDisabled}
                    />
                    {currentTask.photo_url && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  {currentTask.photo_url && (
                    <img
                      src={currentTask.photo_url}
                      alt="Task evidence"
                      className="w-full h-48 object-cover rounded-lg mt-2"
                    />
                  )}
                </div>
              )}

              {/* Temperature Input */}
              {currentTask.requires_temperature && (
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    placeholder="Enter temperature reading"
                    value={currentTask.temperature_value || ''}
                    onChange={(e) => {
                      handleTaskUpdate(currentTask.task_id, { temperature_value: parseFloat(e.target.value) || null });
                    }}
                    disabled={isCurrentTaskActionDisabled}
                  />
                </div>
              )}

              {/* Notes - MANDATORY FOR FAIL */}
              <div className="space-y-2">
                <Label htmlFor="notes">
                  Notes {isHygieneChecklist && <span className="text-red-600">(Required if answering NO)</span>}
                </Label>
                <Textarea
                  id="notes"
                  placeholder={isHygieneChecklist ? "Describe the issue and corrective action needed..." : "Add any observations..."}
                  rows={3}
                  value={currentTask.notes || ''}
                  onChange={(e) => {
                    handleTaskUpdate(currentTask.task_id, { notes: e.target.value });
                  }}
                  disabled={isCurrentTaskActionDisabled}
                />
              </div>

              {/* Response Type Handling */}
              <div className="space-y-3 pt-4">
                {isHygieneChecklist && (
                  <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900">
                    <strong>Answer:</strong> YES (Pass) if compliant, NO (Fail) if action needed, or N/A if not applicable
                  </div>
                )}
                
                {/* Standard (Pass/Fail/N/A) */}
                {(!currentTask.field_type || currentTask.field_type === 'standard') && (
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      onClick={() => {
                        if (currentTask.requires_photo && !currentTask.photo_url) { alert('Photo evidence is required for this task.'); return; }
                        if (currentTask.requires_temperature && !currentTask.temperature_value) { alert('Temperature reading is required for this task.'); return; }
                        handleTaskUpdate(currentTask.task_id, {
                          status: 'pass',
                          notes: currentTask.notes,
                          temperature_value: currentTask.temperature_value,
                          photo_url: currentTask.photo_url,
                        });
                      }}
                      className="bg-green-600 hover:bg-green-700 h-16"
                      disabled={
                        isCurrentTaskActionDisabled ||
                        (currentTask.requires_photo && !currentTask.photo_url) ||
                        (currentTask.requires_temperature && !currentTask.temperature_value)
                      }
                    >
                      <div className="text-center">
                        <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm">YES</span>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (isHygieneChecklist && !currentTask.notes?.trim()) {
                          alert('⚠️ Notes are required when answering NO. Please describe the issue.');
                          return;
                        }
                        handleTaskUpdate(currentTask.task_id, {
                          status: 'fail',
                          notes: currentTask.notes,
                          temperature_value: currentTask.temperature_value,
                          photo_url: currentTask.photo_url,
                        });
                      }}
                      className="bg-red-600 hover:bg-red-700 h-16"
                      disabled={isCurrentTaskActionDisabled}
                    >
                      <div className="text-center">
                        <XCircle className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm">NO</span>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => handleTaskUpdate(currentTask.task_id, { status: 'na' })}
                      variant="outline"
                      className="h-16"
                      disabled={isCurrentTaskActionDisabled}
                    >
                      <div className="text-center">
                        <MinusCircle className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm">N/A</span>
                      </div>
                    </Button>
                  </div>
                )}

                {/* Yes/No Field Type */}
                {currentTask.field_type === 'yesno' && (
                  <div className="flex gap-3">
                    <Button
                      variant={currentTask.status === 'pass' ? 'default' : 'outline'}
                      size="lg"
                      onClick={() => handleTaskUpdate(currentTask.task_id, { status: 'pass' })}
                      className={`flex-1 ${currentTask.status === 'pass' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300'}`}
                      disabled={isCurrentTaskActionDisabled}
                    >
                      <Check className="w-4 h-4 mr-1" /> Yes
                    </Button>
                    <Button
                      variant={currentTask.status === 'fail' ? 'destructive' : 'outline'}
                      size="lg"
                      onClick={() => {
                        if (isHygieneChecklist && !currentTask.notes?.trim()) {
                          alert('⚠️ Notes are required when answering NO. Please describe the issue.');
                          return;
                        }
                        handleTaskUpdate(currentTask.task_id, { status: 'fail' });
                      }}
                      className={`flex-1 ${currentTask.status === 'fail' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300'}`}
                      disabled={isCurrentTaskActionDisabled}
                    >
                      <X className="w-4 h-4 mr-1" /> No
                    </Button>
                  </div>
                )}

                {/* Text Input Field Type */}
                {currentTask.field_type === 'text_input' && (
                  <div className="mb-3">
                    <Input
                      placeholder="Enter your answer..."
                      value={currentTask.text_response || ''}
                      onChange={(e) => handleTaskUpdate(currentTask.task_id, { 
                        text_response: e.target.value,
                        status: e.target.value ? 'pass' : 'pending' // Status becomes 'pass' if text is present
                      })}
                      disabled={isCurrentTaskActionDisabled}
                    />
                  </div>
                )}

                {isHygieneChecklist && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-800">
                    <strong>⚠️ Important:</strong> Answering NO will automatically create an URGENT maintenance ticket that must be resolved immediately.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">All Tasks Completed!</h3>
              <p className="text-gray-600 mb-6">Redirecting to checklists...</p>
            </CardContent>
          </Card>
        )}

        {/* Completed Tasks Summary */}
        {completedTasksCount > 0 && (
          <Card className="bg-white border-none shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Completed Tasks ({completedTasksCount}/{checklist.tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {checklist.tasks
                  .filter(t => !isTaskPending(t))
                  .map((task) => (
                    <div key={task.task_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {task.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {task.status === 'fail' && <XCircle className="w-5 h-5 text-red-600" />}
                        {task.status === 'na' && <MinusCircle className="w-5 h-5 text-gray-600" />}
                        {task.field_type === 'text_input' && <Check className="w-5 h-5 text-blue-600" />}
                        <span className="text-sm text-gray-900">{task.description}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {task.field_type === 'text_input' ? 'TEXT' : task.status?.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
          <Button
            onClick={() => setShowCompleteDialog(true)}
            disabled={!allChecklistTasksTrulyCompleted || updateChecklistMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Submit Checklist
          </Button>
        </div>
      </div>
    </div>
  );
}
