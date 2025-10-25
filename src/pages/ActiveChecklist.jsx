import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  Camera,
  ArrowLeft,
  Clock,
  AlertTriangle,
  Sun,
  Moon,
  ThermometerSun,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ActiveChecklist() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const checklistId = urlParams.get('id');
  const viewOnly = urlParams.get('view') === 'true';
  
  const [uploading, setUploading] = useState(false);

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['activeChecklist', checklistId],
    queryFn: async () => {
      const lists = await base44.entities.DailyChecklist.list();
      return lists.find(c => c.id === checklistId);
    },
    enabled: !!checklistId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['checklistItems', checklistId],
    queryFn: () => base44.entities.ChecklistItem.filter({
      checklist_id: checklistId
    }, 'order_index'),
    enabled: !!checklistId,
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChecklistItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistItems'] });
      updateChecklistProgress();
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DailyChecklist.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeChecklist'] });
    },
  });

  const updateChecklistProgress = async () => {
    const completedCount = items.filter(i => i.status === 'done').length;
    const percentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

    await updateChecklistMutation.mutateAsync({
      id: checklistId,
      data: {
        completed_tasks: completedCount,
        completion_percentage: percentage,
        status: percentage === 100 ? 'completed' : 'in_progress',
        ...(percentage === 100 && { completed_time: new Date().toISOString() })
      }
    });
  };

  const handlePhotoUpload = async (e, itemId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await updateItemMutation.mutateAsync({
        id: itemId,
        data: { photo_url: file_url }
      });
    } catch (error) {
      alert('Failed to upload photo');
    }
    setUploading(false);
  };

  const handleTaskUpdate = async (item, status, additionalData = {}) => {
    if (viewOnly) return;

    const user = await base44.auth.me();

    await updateItemMutation.mutateAsync({
      id: item.id,
      data: {
        status,
        completed_by_email: user?.email,
        completed_by_name: user?.full_name,
        completed_time: new Date().toISOString(),
        ...additionalData
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading checklist...</p>
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="p-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Checklist Not Found</h3>
            <Button onClick={() => navigate(createPageUrl('DailyChecklists'))}>
              Back to Checklists
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const TypeIcon = checklist.checklist_type === 'opening' ? Sun : Moon;
  const headerColor = checklist.checklist_type === 'opening'
    ? 'from-emerald-500 to-green-600'
    : 'from-blue-500 to-indigo-600';

  const completedTasks = items.filter(i => i.status === 'done').length;
  const progress = items.length > 0 ? Math.round((completedTasks / items.length) * 100) : 0;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Button
          onClick={() => navigate(createPageUrl('DailyChecklists'))}
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Checklists
        </Button>

        {/* Header Card */}
        <Card className="mb-6 border-none shadow-lg overflow-hidden">
          <div className={`p-8 bg-gradient-to-br ${headerColor} text-white`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <TypeIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold capitalize">
                  {checklist.checklist_type} Checklist
                </h1>
                <p className="text-lg opacity-90 capitalize">
                  {checklist.department.replace('_', ' ')}
                </p>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2 opacity-90">
                <span>Progress</span>
                <span className="font-bold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3 bg-white/20" />
              <p className="text-sm mt-2 opacity-90">
                {completedTasks} of {items.length} tasks completed
              </p>
            </div>

            {viewOnly && (
              <Badge className="mt-4 bg-white/20 text-white">
                View Only Mode
              </Badge>
            )}
          </div>
        </Card>

        {/* Tasks */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <Card 
              key={item.id} 
              className={`border-2 transition-all ${
                item.status === 'done' 
                  ? 'border-green-300 bg-green-50' 
                  : item.status === 'failed'
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <CardContent className="p-6">
                {/* Task Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold text-sm">
                        {index + 1}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.task_name}
                      </h3>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 ml-11">{item.description}</p>
                    )}
                  </div>

                  <Badge className={
                    item.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {item.priority}
                  </Badge>
                </div>

                {/* Photo Upload */}
                {item.required_photo && (
                  <div className="mb-4 ml-11">
                    <Label className="text-sm text-gray-700 mb-2 block">
                      📸 Photo Evidence Required
                    </Label>
                    {item.photo_url ? (
                      <img 
                        src={item.photo_url} 
                        alt="Evidence" 
                        className="w-full h-48 object-cover rounded-lg border-2 border-green-300"
                      />
                    ) : !viewOnly && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`photo-${item.id}`).click()}
                          disabled={uploading}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Take Photo'}
                        </Button>
                        <input
                          id={`photo-${item.id}`}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handlePhotoUpload(e, item.id)}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Temperature Input */}
                {item.requires_temperature && (
                  <div className="mb-4 ml-11">
                    <Label className="text-sm text-gray-700 mb-2 flex items-center gap-2">
                      <ThermometerSun className="w-4 h-4" />
                      Temperature (°C)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={item.temperature_value || ''}
                      onChange={(e) => {
                        if (!viewOnly) {
                          updateItemMutation.mutate({
                            id: item.id,
                            data: { temperature_value: parseFloat(e.target.value) }
                          });
                        }
                      }}
                      className="w-32"
                      disabled={viewOnly}
                    />
                  </div>
                )}

                {/* Comment */}
                <div className="mb-4 ml-11">
                  <Label className="text-sm text-gray-700 mb-2 block">Notes (Optional)</Label>
                  <Textarea
                    value={item.comment || ''}
                    onChange={(e) => {
                      if (!viewOnly) {
                        updateItemMutation.mutate({
                          id: item.id,
                          data: { comment: e.target.value }
                        });
                      }
                    }}
                    rows={2}
                    placeholder="Add any observations..."
                    disabled={viewOnly}
                  />
                </div>

                {/* Status Buttons */}
                {!viewOnly && item.status !== 'done' && (
                  <div className="flex gap-3 ml-11">
                    <Button
                      onClick={() => handleTaskUpdate(item, 'done')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={item.required_photo && !item.photo_url}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                    <Button
                      onClick={() => handleTaskUpdate(item, 'failed')}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Failed
                    </Button>
                  </div>
                )}

                {/* Completed Status */}
                {item.status === 'done' && (
                  <div className="ml-11 flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Completed</p>
                      {item.completed_by_name && (
                        <p className="text-sm">
                          by {item.completed_by_name} at {format(new Date(item.completed_time), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Button */}
        {!viewOnly && progress === 100 && checklist.status !== 'verified' && (
          <Card className="mt-6 bg-green-50 border-green-200">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-green-900 mb-2">
                All Tasks Completed!
              </h3>
              <p className="text-green-700 mb-4">
                Your checklist has been submitted for manager review
              </p>
              <Button 
                onClick={() => navigate(createPageUrl('DailyChecklists'))}
                className="bg-green-600 hover:bg-green-700"
              >
                Back to Checklists
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}