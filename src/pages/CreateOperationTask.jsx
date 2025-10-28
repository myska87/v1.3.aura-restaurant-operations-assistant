import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  Save,
  ArrowLeft,
  Home,
  FileText,
  Star,
  ClipboardCheck,
  Users,
  Calendar,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { addDays, addWeeks, addMonths } from 'date-fns';

export default function CreateOperationTask() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: sops = [] } = useQuery({
    queryKey: ['sopsForLink'],
    queryFn: () => base44.entities.SOPDocument.filter({ status: 'active' }),
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['checklistsForLink'],
    queryFn: () => base44.entities.ChecklistTemplate.filter({ is_active: true }),
  });

  const { data: qualityTemplates = [] } = useQuery({
    queryKey: ['qualityForLink'],
    queryFn: () => base44.entities.QualityTemplate.filter({ is_active: true }),
  });

  const [formData, setFormData] = useState({
    title: '',
    type: 'general',
    frequency: 'daily',
    department: 'all',
    assigned_to: '',
    linked_sop_id: '',
    linked_checklist_id: '',
    linked_quality_id: '',
    priority: 'medium',
    comments: '',
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.OperationTask.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationTasks'] });
      alert('✅ Operation Task Created!');
      navigate(createPageUrl('OperationsCore'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title || !formData.assigned_to) {
      alert('Please provide title and assignee');
      return;
    }

    const assignedUser = staff.find(s => s.email === formData.assigned_to);

    // Calculate due date based on frequency
    let dueDate = new Date();
    if (formData.frequency === 'daily') {
      dueDate = addDays(dueDate, 1);
    } else if (formData.frequency === 'weekly') {
      dueDate = addWeeks(dueDate, 1);
    } else if (formData.frequency === 'monthly') {
      dueDate = addMonths(dueDate, 1);
    }

    const linkedSOP = sops.find(s => s.id === formData.linked_sop_id);
    const linkedChecklist = checklists.find(c => c.id === formData.linked_checklist_id);
    const linkedQuality = qualityTemplates.find(q => q.id === formData.linked_quality_id);

    const taskData = {
      ...formData,
      assigned_to_name: assignedUser?.full_name || '',
      linked_sop_title: linkedSOP?.title || '',
      linked_checklist_name: linkedChecklist?.name || '',
      linked_quality_title: linkedQuality?.template_name || '',
      status: 'pending',
      due_date: dueDate.toISOString(),
      auto_generated: false,
    };

    createTaskMutation.mutate(taskData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('OperationsCore')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent mb-2">
            Create Operation Task
          </h1>
          <p className="text-gray-600">Create a unified operational task</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Task Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Daily Kitchen Audit"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Task Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({...formData, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Task</SelectItem>
                      <SelectItem value="sop">SOP Review</SelectItem>
                      <SelectItem value="audit">Quality Audit</SelectItem>
                      <SelectItem value="checklist">Checklist</SelectItem>
                      <SelectItem value="quality">Quality Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({...formData, frequency: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="one_time">One Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({...formData, department: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="front_of_house">Front of House</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({...formData, priority: value})}
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
              </div>

              <div>
                <Label>Assign To *</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) => setFormData({...formData, assigned_to: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(member => (
                      <SelectItem key={member.email} value={member.email}>
                        {member.full_name} ({member.position})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Link to Existing Items */}
          <Card>
            <CardHeader>
              <CardTitle>Link to Existing Items (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Link to SOP</Label>
                <Select
                  value={formData.linked_sop_id}
                  onValueChange={(value) => setFormData({...formData, linked_sop_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select SOP (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {sops.map(sop => (
                      <SelectItem key={sop.id} value={sop.id}>
                        {sop.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Link to Checklist Template</Label>
                <Select
                  value={formData.linked_checklist_id}
                  onValueChange={(value) => setFormData({...formData, linked_checklist_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select checklist (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {checklists.map(checklist => (
                      <SelectItem key={checklist.id} value={checklist.id}>
                        {checklist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Link to Quality Template</Label>
                <Select
                  value={formData.linked_quality_id}
                  onValueChange={(value) => setFormData({...formData, linked_quality_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {qualityTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.template_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({...formData, comments: e.target.value})}
                  placeholder="Add any notes or instructions..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl('OperationsCore'))}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600"
                >
                  {createTaskMutation.isPending ? 'Creating...' : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Task
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}