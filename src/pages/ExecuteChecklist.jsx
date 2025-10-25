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
import { CheckCircle, XCircle, MinusCircle, Camera, ArrowLeft, Home } from "lucide-react";
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

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['checklistExecution', checklistId],
    queryFn: () => base44.entities.ChecklistExecution.list().then(lists => 
      lists.find(c => c.id === checklistId)
    ),
    enabled: !!checklistId,
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
    },
  });

  const createMaintenanceTicketMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceTicket.create(data),
  });

  useEffect(() => {
    if (checklist && checklist.status === 'not_started') {
      updateChecklistMutation.mutate({
        id: checklist.id,
        data: {
          status: 'in_progress',
          started_at: new Date().toISOString(),
        }
      });
    }
  }, [checklist?.id]);

  const handleTaskUpdate = async (taskId, status, additionalData = {}) => {
    const updatedTasks = checklist.tasks.map(task => 
      task.task_id === taskId
        ? {
            ...task,
            status,
            completed_at: new Date().toISOString(),
            ...additionalData
          }
        : task
    );

    const allCompleted = updatedTasks.every(t => 
      t.status === 'pass' || t.status === 'fail' || t.status === 'na'
    );

    const passCount = updatedTasks.filter(t => t.status === 'pass').length;
    const passRate = Math.round((passCount / updatedTasks.length) * 100);

    // AUTO-CREATE MAINTENANCE TICKET FOR FAILED ITEMS
    if (status === 'fail' && checklist.template_name.includes('Hygiene')) {
      const currentTaskData = updatedTasks.find(t => t.task_id === taskId);
      
      await createMaintenanceTicketMutation.mutateAsync({
        title: `🚨 URGENT: Hygiene Check Failed - ${currentTaskData.description.substring(0, 50)}...`,
        description: `**AUTOMATIC TICKET FROM 6-MONTHLY HYGIENE INSPECTION**\n\n` +
                    `**Failed Check:** ${currentTaskData.description}\n\n` +
                    `**Inspector:** ${user?.full_name}\n` +
                    `**Date:** ${format(new Date(), 'PPP')}\n\n` +
                    `**Notes:** ${currentTaskData.notes || 'No additional notes provided'}\n\n` +
                    `**Category:** ${currentTaskData.category || 'Food Safety'}\n\n` +
                    `⚠️ This issue must be resolved immediately to maintain food safety compliance.`,
        category: "hygiene",
        location: checklist.template_name,
        priority: "urgent",
        status: "open",
        reported_by: user?.full_name || user?.email,
        photo_urls: currentTaskData.photo_url ? [currentTaskData.photo_url] : [],
      });
    }

    await updateChecklistMutation.mutateAsync({
      id: checklist.id,
      data: {
        tasks: updatedTasks,
        status: allCompleted ? 'completed' : 'in_progress',
        completed_at: allCompleted ? new Date().toISOString() : null,
        completed_by_email: allCompleted ? user?.email : null,
        completed_by_name: allCompleted ? user?.full_name : null,
        overall_pass_rate: passRate,
      }
    });

    if (allCompleted) {
      navigate(createPageUrl('AdvancedChecklists'));
    } else if (currentTaskIndex < checklist.tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    }
  };

  const handlePhotoUpload = async (e, taskId) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    }
    setUploading(false);
  };

  if (isLoading || !checklist) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading checklist...</div>
      </div>
    );
  }

  const currentTask = checklist.tasks[currentTaskIndex];
  const completedTasks = checklist.tasks.filter(t => 
    t.status === 'pass' || t.status === 'fail' || t.status === 'na'
  ).length;
  const progress = Math.round((completedTasks / checklist.tasks.length) * 100);

  // Group tasks by category for hygiene checklist
  const isHygieneChecklist = checklist.template_name.includes('Hygiene');
  const currentCategory = currentTask?.category;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('MyChecklists'))}
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
                    {checklist.shift_type.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="outline">
                    Task {currentTaskIndex + 1} of {checklist.tasks.length}
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
        {currentTask && currentTask.status === 'pending' && (
          <Card className="bg-white border-none shadow-lg">
            <CardHeader>
              {isHygieneChecklist && currentCategory && (
                <Badge className="mb-2 w-fit bg-blue-100 text-blue-800">
                  {currentCategory}
                </Badge>
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
                      disabled={uploading}
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
                    onChange={(e) => {
                      const updatedTasks = checklist.tasks.map(task =>
                        task.task_id === currentTask.task_id
                          ? { ...task, temperature_value: parseFloat(e.target.value) }
                          : task
                      );
                      updateChecklistMutation.mutate({
                        id: checklist.id,
                        data: { tasks: updatedTasks }
                      });
                    }}
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
                  onChange={(e) => {
                    const updatedTasks = checklist.tasks.map(task =>
                      task.task_id === currentTask.task_id
                        ? { ...task, notes: e.target.value }
                        : task
                    );
                    updateChecklistMutation.mutate({
                      id: checklist.id,
                      data: { tasks: updatedTasks }
                    });
                  }}
                />
              </div>

              {/* Action Buttons - YES / NO / N/A */}
              <div className="space-y-3 pt-4">
                {isHygieneChecklist && (
                  <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900">
                    <strong>Answer:</strong> YES (Pass) if compliant, NO (Fail) if action needed, or N/A if not applicable
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleTaskUpdate(currentTask.task_id, 'pass', {
                      notes: currentTask.notes,
                      temperature_value: currentTask.temperature_value,
                      photo_url: currentTask.photo_url,
                    })}
                    className="bg-green-600 hover:bg-green-700 h-16"
                    disabled={
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
                      handleTaskUpdate(currentTask.task_id, 'fail', {
                        notes: currentTask.notes,
                        temperature_value: currentTask.temperature_value,
                        photo_url: currentTask.photo_url,
                      });
                    }}
                    className="bg-red-600 hover:bg-red-700 h-16"
                  >
                    <div className="text-center">
                      <XCircle className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm">NO</span>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => handleTaskUpdate(currentTask.task_id, 'na')}
                    variant="outline"
                    className="h-16"
                  >
                    <div className="text-center">
                      <MinusCircle className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm">N/A</span>
                    </div>
                  </Button>
                </div>

                {isHygieneChecklist && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-800">
                    <strong>⚠️ Important:</strong> Answering NO will automatically create an URGENT maintenance ticket that must be resolved immediately.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Tasks Summary */}
        {completedTasks > 0 && (
          <Card className="bg-white border-none shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Completed Tasks ({completedTasks}/{checklist.tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {checklist.tasks
                  .filter(t => t.status !== 'pending')
                  .map((task, index) => (
                    <div key={task.task_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {task.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {task.status === 'fail' && <XCircle className="w-5 h-5 text-red-600" />}
                        {task.status === 'na' && <MinusCircle className="w-5 h-5 text-gray-600" />}
                        <span className="text-sm text-gray-900">{task.description}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {task.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}