import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, ArrowLeft, Sun, Moon, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ChecklistBuilder() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterType, setFilterType] = useState('opening');
  const [filterDepartment, setFilterDepartment] = useState('kitchen');

  const [taskForm, setTaskForm] = useState({
    checklist_type: 'opening',
    department: 'kitchen',
    task_name: '',
    description: '',
    priority: 'medium',
    category: 'hygiene',
    required_photo: false,
    requires_temperature: false,
    order_index: 0,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['templateTasks'],
    queryFn: () => base44.entities.ChecklistTemplateTask.list('order_index'),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistTemplateTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templateTasks'] });
      resetForm();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChecklistTemplateTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templateTasks'] });
      resetForm();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistTemplateTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templateTasks'] });
    },
  });

  const resetForm = () => {
    setTaskForm({
      checklist_type: 'opening',
      department: 'kitchen',
      task_name: '',
      description: '',
      priority: 'medium',
      category: 'hygiene',
      required_photo: false,
      requires_temperature: false,
      order_index: 0,
    });
    setSelectedTask(null);
    setShowDialog(false);
  };

  const handleSubmit = () => {
    if (selectedTask) {
      updateTaskMutation.mutate({ id: selectedTask.id, data: taskForm });
    } else {
      createTaskMutation.mutate(taskForm);
    }
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setTaskForm(task);
    setShowDialog(true);
  };

  const filteredTasks = tasks.filter(
    t => t.checklist_type === filterType && t.department === filterDepartment
  );

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <Link to={createPageUrl("DailyChecklists")}>
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checklists
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Checklist Template Builder
          </h1>
          <p className="text-lg text-gray-600">
            Create and manage default tasks for opening and closing checklists
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4 items-end">
              <div>
                <Label>Checklist Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opening">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        Opening
                      </div>
                    </SelectItem>
                    <SelectItem value="closing">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        Closing
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Department</Label>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="front_of_house">Front of House</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => setShowDialog(true)} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.map((task, index) => (
            <Card key={task.id} className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold text-sm">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{task.task_name}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={
                          task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline">{task.category}</Badge>
                        {task.required_photo && <Badge variant="outline">📸 Photo</Badge>}
                        {task.requires_temperature && <Badge variant="outline">🌡️ Temp</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(task)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this task?')) {
                          deleteTaskMutation.mutate(task.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Checklist Type *</Label>
                  <Select 
                    value={taskForm.checklist_type} 
                    onValueChange={(value) => setTaskForm({...taskForm, checklist_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening">Opening</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Department *</Label>
                  <Select 
                    value={taskForm.department} 
                    onValueChange={(value) => setTaskForm({...taskForm, department: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="front_of_house">Front of House</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>Task Name *</Label>
                  <Input
                    value={taskForm.task_name}
                    onChange={(e) => setTaskForm({...taskForm, task_name: e.target.value})}
                    placeholder="e.g., Check fridge temperature"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                    rows={2}
                    placeholder="Additional details..."
                  />
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={taskForm.priority} 
                    onValueChange={(value) => setTaskForm({...taskForm, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select 
                    value={taskForm.category} 
                    onValueChange={(value) => setTaskForm({...taskForm, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hygiene">Hygiene</SelectItem>
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="prep">Prep</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="required_photo"
                    checked={taskForm.required_photo}
                    onChange={(e) => setTaskForm({...taskForm, required_photo: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="required_photo">Require Photo Evidence</Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requires_temperature"
                    checked={taskForm.requires_temperature}
                    onChange={(e) => setTaskForm({...taskForm, requires_temperature: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="requires_temperature">Require Temperature Reading</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!taskForm.task_name}
                  className="bg-blue-600"
                >
                  {selectedTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}