import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Play,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  Camera,
  Thermometer,
  PenTool,
  Home,
  Save,
  Settings,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function RestaurantRoutines() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("opening");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);

  const [routineData, setRoutineData] = useState({
    name: "",
    description: "",
    shift_type: "opening",
    frequency: "daily",
    auto_assign: true,
    applicable_roles: [],
    tasks: [],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ChecklistTemplate.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: staffProfiles = [] } = useQuery({
    queryKey: ['staffProfiles'],
    queryFn: () => base44.entities.StaffProfile.list(),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      setShowBuilder(false);
      resetRoutine();
      alert('✅ Routine created successfully!');
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      alert('✅ Routine duplicated successfully!');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
    },
  });

  const resetRoutine = () => {
    setRoutineData({
      name: "",
      description: "",
      shift_type: "opening",
      frequency: "daily",
      auto_assign: true,
      applicable_roles: [],
      tasks: [],
    });
    setEditingRoutine(null);
  };

  const addTask = (taskType) => {
    const newTask = {
      task_id: `task_${Date.now()}`,
      description: "",
      requires_photo: taskType === 'photo',
      requires_temperature: taskType === 'temperature',
      requires_signature: taskType === 'signature',
      order: routineData.tasks.length,
      category: "General",
    };

    setRoutineData({
      ...routineData,
      tasks: [...routineData.tasks, newTask],
    });
  };

  const updateTask = (taskId, updates) => {
    setRoutineData({
      ...routineData,
      tasks: routineData.tasks.map(t => 
        t.task_id === taskId ? { ...t, ...updates } : t
      ),
    });
  };

  const removeTask = (taskId) => {
    setRoutineData({
      ...routineData,
      tasks: routineData.tasks.filter(t => t.task_id !== taskId),
    });
  };

  const moveTask = (taskId, direction) => {
    const index = routineData.tasks.findIndex(t => t.task_id === taskId);
    if (direction === 'up' && index > 0) {
      const newTasks = [...routineData.tasks];
      [newTasks[index], newTasks[index - 1]] = [newTasks[index - 1], newTasks[index]];
      setRoutineData({ ...routineData, tasks: newTasks });
    } else if (direction === 'down' && index < routineData.tasks.length - 1) {
      const newTasks = [...routineData.tasks];
      [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
      setRoutineData({ ...routineData, tasks: newTasks });
    }
  };

  const handleSubmit = async () => {
    if (!routineData.name || routineData.tasks.length === 0) {
      alert('Please add a name and at least one task');
      return;
    }

    const templateData = {
      name: routineData.name,
      description: routineData.description,
      frequency: routineData.frequency,
      shift_type: routineData.shift_type,
      applicable_roles: routineData.applicable_roles,
      tasks: routineData.tasks.map((t, idx) => ({ ...t, order: idx })),
      is_active: true,
      reminder_minutes: 15,
      advance_notice_days: 0,
    };

    await createTemplateMutation.mutateAsync(templateData);
  };

  const handleDuplicate = (template) => {
    const duplicatedData = {
      ...template,
      name: `${template.name} (Copy)`,
      id: undefined,
    };
    duplicateTemplateMutation.mutate(duplicatedData);
  };

  const filterByShiftType = (temps, shiftType) => {
    return temps.filter(t => t.shift_type === shiftType && t.frequency === 'daily');
  };

  // Pre-built routine templates
  const quickTemplates = [
    {
      name: "Opening Kitchen Routine",
      shift_type: "opening",
      tasks: [
        { description: "Check fridge temperatures (must be below 5°C)", requires_temperature: true },
        { description: "Inspect food storage - no expired items", requires_photo: true },
        { description: "Check cleanliness of prep surfaces", requires_photo: true },
        { description: "Verify equipment is working (ovens, fryers, etc.)" },
        { description: "Review today's menu specials and prep list" },
        { description: "Check stock levels for high-demand items" },
        { description: "Wash hands and put on clean uniform" },
      ]
    },
    {
      name: "Opening Front of House",
      shift_type: "opening",
      tasks: [
        { description: "Clean and set all tables", requires_photo: true },
        { description: "Check restrooms - stock supplies and clean", requires_photo: true },
        { description: "Count cash float and verify till balance" },
        { description: "Turn on music and check lighting" },
        { description: "Review reservations for the day" },
        { description: "Check menus for damage and cleanliness" },
        { description: "Brief team on specials and allergen info" },
      ]
    },
    {
      name: "Closing Kitchen Routine",
      shift_type: "closing",
      tasks: [
        { description: "Turn off all cooking equipment safely" },
        { description: "Deep clean all surfaces and equipment", requires_photo: true },
        { description: "Store all food properly - label and date", requires_photo: true },
        { description: "Empty and clean grease traps" },
        { description: "Sweep and mop floors", requires_photo: true },
        { description: "Take out all garbage and recycling" },
        { description: "Check fridge/freezer temperatures before leaving", requires_temperature: true },
        { description: "Lock all doors and set alarm", requires_signature: true },
      ]
    },
    {
      name: "Closing Front of House",
      shift_type: "closing",
      tasks: [
        { description: "Count cash and prepare deposit" },
        { description: "Clean and sanitize all tables and chairs", requires_photo: true },
        { description: "Vacuum/mop dining area", requires_photo: true },
        { description: "Clean and restock bar area" },
        { description: "Check restrooms final time and lock" },
        { description: "Turn off music, lights, and equipment" },
        { description: "Set alarm and lock all doors", requires_signature: true },
      ]
    },
  ];

  const createQuickTemplate = async (template) => {
    const templateData = {
      name: template.name,
      description: `Standard ${template.shift_type} routine`,
      frequency: "daily",
      shift_type: template.shift_type,
      applicable_roles: template.shift_type.includes('Kitchen') ? ['chef', 'line_cook'] : ['server', 'bartender', 'manager'],
      tasks: template.tasks.map((t, idx) => ({
        task_id: `task_${Date.now()}_${idx}`,
        description: t.description,
        requires_photo: t.requires_photo || false,
        requires_temperature: t.requires_temperature || false,
        requires_signature: t.requires_signature || false,
        order: idx,
        category: "Standard Routine",
      })),
      is_active: true,
      reminder_minutes: 15,
      advance_notice_days: 0,
    };

    await createTemplateMutation.mutateAsync(templateData);
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🍽️ Restaurant Routines</h1>
          <p className="text-gray-600">Create and manage daily routines for your restaurant operations</p>
        </div>

        {/* Quick Start Templates */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Quick Start: Pre-Built Routines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 mb-4">
              Get started quickly with these standard restaurant routines. Click to create:
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {quickTemplates.map((template, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-start"
                  onClick={() => createQuickTemplate(template)}
                >
                  <span className="font-semibold text-sm">{template.name}</span>
                  <span className="text-xs text-gray-500">{template.tasks.length} tasks</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Create Routine Button */}
        <div className="flex justify-end mb-6">
          <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Routine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Build Your Restaurant Routine</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Routine Name</Label>
                    <Input
                      placeholder="e.g., Morning Opening Checklist"
                      value={routineData.name}
                      onChange={(e) => setRoutineData({ ...routineData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Shift Type</Label>
                    <Select
                      value={routineData.shift_type}
                      onValueChange={(value) => setRoutineData({ ...routineData, shift_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opening">Opening Shift</SelectItem>
                        <SelectItem value="mid_shift">Mid-Shift</SelectItem>
                        <SelectItem value="closing">Closing Shift</SelectItem>
                        <SelectItem value="any">Any Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={routineData.frequency}
                      onValueChange={(value) => setRoutineData({ ...routineData, frequency: value })}
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
                    <Label>Assign To</Label>
                    <Select
                      value={routineData.applicable_roles[0] || ''}
                      onValueChange={(value) => setRoutineData({ ...routineData, applicable_roles: [value] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Managers</SelectItem>
                        <SelectItem value="chef">Chefs</SelectItem>
                        <SelectItem value="line_cook">Line Cooks</SelectItem>
                        <SelectItem value="server">Servers</SelectItem>
                        <SelectItem value="bartender">Bartenders</SelectItem>
                        <SelectItem value="cleaner">Cleaners</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Brief description of this routine..."
                    value={routineData.description}
                    onChange={(e) => setRoutineData({ ...routineData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                {/* Task Builder */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Tasks ({routineData.tasks.length})</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTask('standard')}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Task
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTask('photo')}
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Photo Task
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTask('temperature')}
                      >
                        <Thermometer className="w-4 h-4 mr-1" />
                        Temperature
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTask('signature')}
                      >
                        <PenTool className="w-4 h-4 mr-1" />
                        Signature
                      </Button>
                    </div>
                  </div>

                  {routineData.tasks.length === 0 ? (
                    <Card className="bg-gray-50">
                      <CardContent className="p-12 text-center">
                        <p className="text-gray-500">No tasks added yet. Click a button above to add tasks.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {routineData.tasks.map((task, index) => (
                        <Card key={task.task_id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col gap-1 mt-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveTask(task.task_id, 'up')}
                                  disabled={index === 0}
                                >
                                  ↑
                                </Button>
                                <GripVertical className="w-5 h-5 text-gray-400" />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveTask(task.task_id, 'down')}
                                  disabled={index === routineData.tasks.length - 1}
                                >
                                  ↓
                                </Button>
                              </div>

                              <div className="flex-1 space-y-2">
                                <Input
                                  placeholder={`Task ${index + 1}: Enter task description...`}
                                  value={task.description}
                                  onChange={(e) => updateTask(task.task_id, { description: e.target.value })}
                                />
                                
                                <div className="flex flex-wrap gap-2">
                                  {task.requires_photo && <Badge variant="secondary">📸 Photo Required</Badge>}
                                  {task.requires_temperature && <Badge variant="secondary">🌡️ Temperature</Badge>}
                                  {task.requires_signature && <Badge variant="secondary">✍️ Signature</Badge>}
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTask(task.task_id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => { setShowBuilder(false); resetRoutine(); }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!routineData.name || routineData.tasks.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Routine
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Existing Routines */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-6">
            <TabsTrigger value="opening">Opening</TabsTrigger>
            <TabsTrigger value="mid_shift">Mid-Shift</TabsTrigger>
            <TabsTrigger value="closing">Closing</TabsTrigger>
            <TabsTrigger value="any">Any Time</TabsTrigger>
          </TabsList>

          {['opening', 'mid_shift', 'closing', 'any'].map(shiftType => (
            <TabsContent key={shiftType} value={shiftType}>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterByShiftType(templates, shiftType).length === 0 ? (
                  <div className="col-span-full">
                    <Card className="bg-white">
                      <CardContent className="p-12 text-center">
                        <p className="text-gray-500">No {shiftType.replace('_', ' ')} routines created yet</p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  filterByShiftType(templates, shiftType).map((template) => (
                    <Card key={template.id} className="bg-white hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <CheckCircle className="w-4 h-4" />
                            <span>{template.tasks?.length || 0} tasks</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Users className="w-4 h-4" />
                            <span>{template.applicable_roles?.join(', ') || 'All staff'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Calendar className="w-4 h-4" />
                            <span>{template.frequency}</span>
                          </div>

                          <div className="flex gap-2 pt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleDuplicate(template)}
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              Duplicate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm('Delete this routine?')) {
                                  deleteTemplateMutation.mutate(template.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}