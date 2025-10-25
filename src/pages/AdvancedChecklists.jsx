import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Play,
  Eye,
  GripVertical,
  Home,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function AdvancedChecklists() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("daily");
  const [viewMode, setViewMode] = useState("my-checklists"); // "my-checklists" or "templates" or "monitor"
  const [showTemplateForm, setShowTemplateForm] = useState(false);
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ChecklistTemplate.list(),
  });

  const { data: myExecutions = [] } = useQuery({
    queryKey: ['myChecklistExecutions', user?.email],
    queryFn: () => base44.entities.ChecklistExecution.filter({
      assigned_to_email: user?.email,
      execution_date: format(new Date(), 'yyyy-MM-dd')
    }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: allExecutions = [] } = useQuery({
    queryKey: ['allChecklistExecutions'],
    queryFn: () => base44.entities.ChecklistExecution.list('-execution_date'),
  });

  const isAdmin = user?.role === 'admin';

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
    setShowTemplateForm(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      frequency: activeTab,
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
    setShowTemplateForm(true);
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

  const getProgress = (execution) => {
    if (!execution.tasks || execution.tasks.length === 0) return 0;
    const completed = execution.tasks.filter(t => 
      t.status === 'pass' || t.status === 'fail' || t.status === 'na'
    ).length;
    return Math.round((completed / execution.tasks.length) * 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const filterByFrequency = (items, frequency) => {
    return items.filter(item => item.frequency === frequency);
  };

  const filterExecutionsByFrequency = (executions, frequency) => {
    return executions.filter(exec => {
      const template = templates.find(t => t.id === exec.template_id);
      return template?.frequency === frequency;
    });
  };

  const stats = {
    total: myExecutions.length,
    completed: myExecutions.filter(e => e.status === 'completed').length,
    inProgress: myExecutions.filter(e => e.status === 'in_progress').length,
    overdue: myExecutions.filter(e => e.status === 'overdue').length,
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Checklists</h1>
          <p className="text-gray-600">Manage daily, weekly, monthly, and yearly checklists</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-600">Total Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                  <p className="text-xs text-gray-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Play className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                  <p className="text-xs text-gray-600">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
                  <p className="text-xs text-gray-600">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-3 mb-6">
          <Button
            variant={viewMode === 'my-checklists' ? 'default' : 'outline'}
            onClick={() => setViewMode('my-checklists')}
          >
            My Checklists
          </Button>
          {isAdmin && (
            <>
              <Button
                variant={viewMode === 'templates' ? 'default' : 'outline'}
                onClick={() => setViewMode('templates')}
              >
                Templates
              </Button>
              <Button
                variant={viewMode === 'monitor' ? 'default' : 'outline'}
                onClick={() => setViewMode('monitor')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Monitor All
              </Button>
            </>
          )}
        </div>

        {/* Tabs for Frequency */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-8">
            <TabsTrigger value="daily">📅 Daily</TabsTrigger>
            <TabsTrigger value="weekly">📆 Weekly</TabsTrigger>
            <TabsTrigger value="monthly">🗓️ Monthly</TabsTrigger>
            <TabsTrigger value="yearly">📊 Yearly</TabsTrigger>
          </TabsList>

          {/* Daily Tab */}
          <TabsContent value="daily">
            {viewMode === 'my-checklists' && (
              <MyChecklistsView
                executions={filterExecutionsByFrequency(myExecutions, 'daily')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
                navigate={navigate}
              />
            )}

            {viewMode === 'templates' && isAdmin && (
              <TemplatesView
                templates={filterByFrequency(templates, 'daily')}
                showForm={showTemplateForm}
                setShowForm={setShowTemplateForm}
                formData={formData}
                setFormData={setFormData}
                newTask={newTask}
                setNewTask={setNewTask}
                handleAddTask={handleAddTask}
                handleRemoveTask={handleRemoveTask}
                handleSubmit={handleSubmit}
                handleEdit={handleEdit}
                handleDelete={(id) => deleteTemplateMutation.mutate(id)}
                getShiftTypeColor={getShiftTypeColor}
                editingTemplate={editingTemplate}
                resetForm={resetForm}
                frequency="daily"
              />
            )}

            {viewMode === 'monitor' && isAdmin && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'daily')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}
          </TabsContent>

          {/* Weekly Tab */}
          <TabsContent value="weekly">
            {viewMode === 'my-checklists' && (
              <MyChecklistsView
                executions={filterExecutionsByFrequency(myExecutions, 'weekly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
                navigate={navigate}
              />
            )}

            {viewMode === 'templates' && isAdmin && (
              <TemplatesView
                templates={filterByFrequency(templates, 'weekly')}
                showForm={showTemplateForm}
                setShowForm={setShowTemplateForm}
                formData={formData}
                setFormData={setFormData}
                newTask={newTask}
                setNewTask={setNewTask}
                handleAddTask={handleAddTask}
                handleRemoveTask={handleRemoveTask}
                handleSubmit={handleSubmit}
                handleEdit={handleEdit}
                handleDelete={(id) => deleteTemplateMutation.mutate(id)}
                getShiftTypeColor={getShiftTypeColor}
                editingTemplate={editingTemplate}
                resetForm={resetForm}
                frequency="weekly"
              />
            )}

            {viewMode === 'monitor' && isAdmin && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'weekly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}
          </TabsContent>

          {/* Monthly Tab */}
          <TabsContent value="monthly">
            {viewMode === 'my-checklists' && (
              <MyChecklistsView
                executions={filterExecutionsByFrequency(myExecutions, 'monthly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
                navigate={navigate}
              />
            )}

            {viewMode === 'templates' && isAdmin && (
              <TemplatesView
                templates={filterByFrequency(templates, 'monthly')}
                showForm={showTemplateForm}
                setShowForm={setShowTemplateForm}
                formData={formData}
                setFormData={setFormData}
                newTask={newTask}
                setNewTask={setNewTask}
                handleAddTask={handleAddTask}
                handleRemoveTask={handleRemoveTask}
                handleSubmit={handleSubmit}
                handleEdit={handleEdit}
                handleDelete={(id) => deleteTemplateMutation.mutate(id)}
                getShiftTypeColor={getShiftTypeColor}
                editingTemplate={editingTemplate}
                resetForm={resetForm}
                frequency="monthly"
              />
            )}

            {viewMode === 'monitor' && isAdmin && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'monthly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}
          </TabsContent>

          {/* Yearly Tab */}
          <TabsContent value="yearly">
            {viewMode === 'my-checklists' && (
              <MyChecklistsView
                executions={filterExecutionsByFrequency(myExecutions, 'yearly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
                navigate={navigate}
              />
            )}

            {viewMode === 'templates' && isAdmin && (
              <TemplatesView
                templates={filterByFrequency(templates, 'yearly')}
                showForm={showTemplateForm}
                setShowForm={setShowTemplateForm}
                formData={formData}
                setFormData={setFormData}
                newTask={newTask}
                setNewTask={setNewTask}
                handleAddTask={handleAddTask}
                handleRemoveTask={handleRemoveTask}
                handleSubmit={handleSubmit}
                handleEdit={handleEdit}
                handleDelete={(id) => deleteTemplateMutation.mutate(id)}
                getShiftTypeColor={getShiftTypeColor}
                editingTemplate={editingTemplate}
                resetForm={resetForm}
                frequency="yearly"
              />
            )}

            {viewMode === 'monitor' && isAdmin && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'yearly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// My Checklists View Component
function MyChecklistsView({ executions, getProgress, getStatusColor, getShiftTypeColor, navigate }) {
  if (executions.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No checklists assigned for this frequency</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {executions.map((execution) => {
        const progress = getProgress(execution);
        return (
          <motion.div
            key={execution.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {execution.template_name}
                  </CardTitle>
                  {execution.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={getShiftTypeColor(execution.shift_type)}>
                    {execution.shift_type?.replace(/_/g, ' ')}
                  </Badge>
                  <Badge className={getStatusColor(execution.status)}>
                    {execution.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-900">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>{execution.tasks?.length || 0} tasks</p>
                    {execution.started_at && (
                      <p className="text-xs mt-1">
                        Started: {format(new Date(execution.started_at), 'h:mm a')}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => navigate(createPageUrl(`ExecuteChecklist?id=${execution.id}`))}
                    className="w-full"
                    variant={execution.status === 'completed' ? 'outline' : 'default'}
                  >
                    {execution.status === 'completed' ? 'View' : progress > 0 ? 'Continue' : 'Start Checklist'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

// Templates View Component
function TemplatesView({
  templates,
  showForm,
  setShowForm,
  formData,
  setFormData,
  newTask,
  setNewTask,
  handleAddTask,
  handleRemoveTask,
  handleSubmit,
  handleEdit,
  handleDelete,
  getShiftTypeColor,
  editingTemplate,
  resetForm,
  frequency
}) {
  return (
    <div>
      <div className="flex justify-end mb-6">
        <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New {frequency.charAt(0).toUpperCase() + frequency.slice(1)} Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : `Create ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Checklist Template`}
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
                  disabled={formData.tasks.length === 0}
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
        {templates.length === 0 ? (
          <div className="col-span-full">
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No {frequency} templates created yet</p>
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
                        {template.shift_type?.replace(/_/g, ' ')}
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
                          handleDelete(template.id);
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
  );
}

// Monitor View Component
function MonitorView({ executions, getProgress, getStatusColor, getShiftTypeColor }) {
  if (executions.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">No checklist executions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {executions.map((execution) => {
        const progress = getProgress(execution);
        return (
          <Card key={execution.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {execution.template_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Assigned to: <span className="font-medium text-gray-900">{execution.assigned_to_name}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getStatusColor(execution.status)}>
                        {execution.status?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className={getShiftTypeColor(execution.shift_type)}>
                        {execution.shift_type?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-900">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                    <p>Date: {format(new Date(execution.execution_date), 'PPP')}</p>
                    {execution.started_at && (
                      <p>Started: {format(new Date(execution.started_at), 'h:mm a')}</p>
                    )}
                    {execution.completed_at && (
                      <p className="text-green-600">
                        Completed: {format(new Date(execution.completed_at), 'h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}