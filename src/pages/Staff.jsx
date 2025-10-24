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
import { Plus, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Staff() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    task_name: "",
    description: "",
    category: "opening",
    assigned_to: "",
    shift: "morning",
    due_date: "",
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['staffTasks'],
    queryFn: () => base44.entities.StaffTask.list("-due_date"),
  });

  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.User.list(),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffTasks'] });
      setShowForm(false);
      setFormData({
        task_name: "",
        description: "",
        category: "opening",
        assigned_to: "",
        shift: "morning",
        due_date: "",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffTasks'] });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createTaskMutation.mutateAsync({
      ...formData,
      status: "pending",
    });
  };

  const handleCompleteTask = async (taskId) => {
    await updateTaskMutation.mutateAsync({
      id: taskId,
      data: {
        status: "completed",
        completed_date: new Date().toISOString(),
      }
    });
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

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Management</h1>
            <p className="text-gray-600">Assign tasks and track team performance</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Assign Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Assign New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="task_name">Task Name</Label>
                  <Input
                    id="task_name"
                    value={formData.task_name}
                    onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opening">Opening</SelectItem>
                        <SelectItem value="closing">Closing</SelectItem>
                        <SelectItem value="prep">Prep</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shift">Shift</Label>
                    <Select
                      value={formData.shift}
                      onValueChange={(value) => setFormData({ ...formData, shift: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assigned_to">Assign To</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map(member => (
                          <SelectItem key={member.id} value={member.email}>
                            {member.full_name} - {member.position || 'Staff'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date & Time</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTaskMutation.isPending}>
                    Assign Task
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tasks Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingTasks ? (
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
          ) : tasks.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <p className="text-gray-500">No tasks assigned</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {task.task_name}
                    </CardTitle>
                    {task.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="outline">
                      {task.category}
                    </Badge>
                    <Badge variant="outline">
                      {task.shift}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {task.description && (
                      <p className="text-gray-700">{task.description}</p>
                    )}
                    <div className="pt-2 space-y-1 text-gray-600">
                      <p>Assigned to: <span className="font-medium text-gray-900">{task.assigned_to}</span></p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <p>Due: {format(new Date(task.due_date), "PPp")}</p>
                      </div>
                      {task.completed_date && (
                        <p className="text-green-600">
                          Completed: {format(new Date(task.completed_date), "PPp")}
                        </p>
                      )}
                    </div>
                  </div>
                  {task.status !== 'completed' && (
                    <Button
                      onClick={() => handleCompleteTask(task.id)}
                      className="w-full mt-4"
                      size="sm"
                    >
                      Mark Complete
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}