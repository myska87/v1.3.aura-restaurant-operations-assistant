import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function ChecklistTemplates() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    frequency: "daily",
    shift_type: "opening",
    applicable_roles: [],
    reminder_minutes: 15,
    tasks: [],
  });
  const [newTask, setNewTask] = useState({
    description: "",
    requires_photo: false,
    requires_signature: false,
    requires_temperature: false,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ChecklistTemplate.list(),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      resetForm();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChecklistTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      resetForm();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      frequency: "daily",
      shift_type: "opening",
      applicable_roles: [],
      reminder_minutes: 15,
      tasks: [],
    });
    setNewTask({
      description: "",
      requires_photo: false,
      requires_signature: false,
      requires_temperature: false,
    });
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      frequency: template.frequency,
      shift_type: template.shift_type,
      applicable_roles: template.applicable_roles || [],
      reminder_minutes: template.reminder_minutes || 15,
      tasks: template.tasks || [],
    });
    setShowForm(true);
  };

  const handleAddTask = () => {
    if (!newTask.description.trim()) return;
    
    const task = {
      task_id: `task_${Date.now()}`,
      description: newTask.description,
      requires_photo: newTask.requires_photo,
      requires_signature: newTask.requires_signature,
      requires_temperature: newTask.requires_temperature,
      order: formData.tasks.length,
    };

    setFormData({
      ...formData,
      tasks: [...formData.tasks, task]
    });

    setNewTask({
      description: "",
      requires_photo: false,
      requires_signature: false,
      requires_temperature: false,
    });
  };

  const handleRemoveTask = (taskId) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter(t => t.task_id !== taskId)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      is_active: true,
    };

    if (editingTemplate) {
      await updateTemplateMutation.mutateAsync({ id: editingTemplate.id, data });
    } else {
      await createTemplateMutation.mutateAsync(data);
    }
  };

  const getShiftTypeColor = (shiftType) => {
    switch (shiftType) {
      case 'opening':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'mid_shift':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Checklist Templates</h1>
            <p className="text-gray-600">Create shift-based checklist templates</p>
          </div>
          <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Edit Template' : 'Create Checklist Template'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Opening Kitchen Routine"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shift_type">Shift Phase</Label>
                    <Select
                      value={formData.shift_type}
                      onValueChange={(value) => setFormData({ ...formData, shift_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opening">Opening Shift</SelectItem>
                        <SelectItem value="mid_shift">Mid-Shift</SelectItem>
                        <SelectItem value="closing">Closing Shift</SelectItem>
                        <SelectItem value="any">Any Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminder_minutes">Reminder (minutes after shift start)</Label>
                    <Input
                      id="reminder_minutes"
                      type="number"
                      value={formData.reminder_minutes}
                      onChange={(e) => setFormData({ ...formData, reminder_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                {/* Tasks Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Tasks</Label>
                    <span className="text-sm text-gray-500">{formData.tasks.length} tasks</span>
                  </div>

                  {/* Add Task Form */}
                  <Card className="bg-gray-50">
                    <CardContent className="p-4 space-y-3">
                      <Input
                        placeholder="Task description..."
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                      />
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="requires_photo"
                            checked={newTask.requires_photo}
                            onCheckedChange={(checked) => setNewTask({ ...newTask, requires_photo: checked })}
                          />
                          <Label htmlFor="requires_photo" className="text-sm cursor-pointer">
                            Requires Photo
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="requires_temperature"
                            checked={newTask.requires_temperature}
                            onCheckedChange={(checked) => setNewTask({ ...newTask, requires_temperature: checked })}
                          />
                          <Label htmlFor="requires_temperature" className="text-sm cursor-pointer">
                            Requires Temperature
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="requires_signature"
                            checked={newTask.requires_signature}
                            onCheckedChange={(checked) => setNewTask({ ...newTask, requires_signature: checked })}
                          />
                          <Label htmlFor="requires_signature" className="text-sm cursor-pointer">
                            Requires Signature
                          </Label>
                        </div>
                      </div>
                      <Button type="button" onClick={handleAddTask} size="sm" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Tasks List */}
                  {formData.tasks.length > 0 && (
                    <div className="space-y-2">
                      {formData.tasks.map((task, index) => (
                        <Card key={task.task_id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                <GripVertical className="w-5 h-5 text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-gray-900">{index + 1}. {task.description}</p>
                                    <div className="flex gap-2 mt-1">
                                      {task.requires_photo && (
                                        <Badge variant="outline" className="text-xs">📸 Photo</Badge>
                                      )}
                                      {task.requires_temperature && (
                                        <Badge variant="outline" className="text-xs">🌡️ Temp</Badge>
                                      )}
                                      {task.requires_signature && (
                                        <Badge variant="outline" className="text-xs">✍️ Sign</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveTask(task.task_id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending || formData.tasks.length === 0}
                  >
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : templates.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <p className="text-gray-500">No checklist templates created yet</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                        {template.name}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getShiftTypeColor(template.shift_type)}>
                          {template.shift_type.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {template.frequency}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Delete this template?')) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {template.description && (
                      <p className="text-gray-600">{template.description}</p>
                    )}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-gray-600">
                        <span className="font-medium text-gray-900">{template.tasks?.length || 0}</span> tasks
                      </p>
                      <p className="text-gray-600 text-xs mt-1">
                        Reminder: {template.reminder_minutes || 15} min after shift start
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}