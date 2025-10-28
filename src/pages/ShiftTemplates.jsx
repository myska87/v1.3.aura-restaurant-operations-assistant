import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  BookTemplate,
  ArrowLeft,
  Save,
  X,
  Clock,
  Users,
  Calendar,
  Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { useUnifiedStaff } from '@/components/UnifiedStaffData';

export default function ShiftTemplates() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { staff: allStaff } = useUnifiedStaff();

  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    description: '',
    template_type: 'weekly',
    shifts_config: [],
    is_default: false,
    tags: [],
  });

  const [shiftEntry, setShiftEntry] = useState({
    day_of_week: 'monday',
    role: '',
    department: 'kitchen',
    shift_type: 'mid_shift',
    start_time: '09:00',
    end_time: '17:00',
    staff_count: 1,
    preferred_staff_emails: [],
    notes: '',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates = [], refetch } = useQuery({
    queryKey: ['shiftTemplates'],
    queryFn: () => base44.entities.ShiftTemplate.list('-last_used'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTemplates'] });
      alert('✅ Template created!');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTemplates'] });
      alert('✅ Template updated!');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTemplates'] });
      alert('✅ Template deleted!');
    },
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingTemplate(null);
    setTemplateForm({
      template_name: '',
      description: '',
      template_type: 'weekly',
      shifts_config: [],
      is_default: false,
      tags: [],
    });
    setShiftEntry({
      day_of_week: 'monday',
      role: '',
      department: 'kitchen',
      shift_type: 'mid_shift',
      start_time: '09:00',
      end_time: '17:00',
      staff_count: 1,
      preferred_staff_emails: [],
      notes: '',
    });
  };

  const handleAddShiftToTemplate = () => {
    if (!shiftEntry.role) {
      alert('Please select a role');
      return;
    }

    setTemplateForm({
      ...templateForm,
      shifts_config: [...templateForm.shifts_config, { ...shiftEntry }],
    });

    setShiftEntry({
      ...shiftEntry,
      day_of_week: shiftEntry.day_of_week,
      role: '',
      preferred_staff_emails: [],
      notes: '',
    });
  };

  const handleRemoveShift = (index) => {
    const newShifts = [...templateForm.shifts_config];
    newShifts.splice(index, 1);
    setTemplateForm({ ...templateForm, shifts_config: newShifts });
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.template_name || templateForm.shifts_config.length === 0) {
      alert('Please provide a template name and add at least one shift');
      return;
    }

    const totalHours = templateForm.shifts_config.reduce((sum, shift) => {
      const [startH, startM] = shift.start_time.split(':').map(Number);
      const [endH, endM] = shift.end_time.split(':').map(Number);
      const hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
      return sum + hours;
    }, 0);

    const dataToSave = {
      ...templateForm,
      total_shifts: templateForm.shifts_config.length,
      total_hours: Math.round(totalHours * 10) / 10,
      created_by: user?.email,
      created_by_name: user?.full_name,
    };

    if (editingTemplate) {
      await updateMutation.mutateAsync({ id: editingTemplate.id, data: dataToSave });
    } else {
      await createMutation.mutateAsync(dataToSave);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setTemplateForm(template);
    setShowDialog(true);
  };

  const handleDuplicate = async (template) => {
    const duplicated = {
      ...template,
      template_name: `${template.template_name} (Copy)`,
      id: undefined,
      created_date: undefined,
      updated_date: undefined,
      last_used: undefined,
      times_used: 0,
      created_by: user?.email,
      created_by_name: user?.full_name,
    };

    await createMutation.mutateAsync(duplicated);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('SmartScheduler')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Scheduler
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <BookTemplate className="w-8 h-8 text-purple-600" />
              Shift Templates
            </h1>
            <p className="text-gray-600">Create reusable shift schedules for faster planning</p>
          </div>
          <Button
            onClick={() => {
              setEditingTemplate(null);
              setShowDialog(true);
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.template_name}</CardTitle>
                    {template.is_default && (
                      <Badge className="bg-purple-100 text-purple-800 mt-2">
                        <Star className="w-3 h-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline">{template.template_type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{template.total_shifts} shifts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{template.total_hours}h</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">Used {template.times_used || 0}x</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template_name">Template Name *</Label>
                  <Input
                    id="template_name"
                    value={templateForm.template_name}
                    onChange={(e) => setTemplateForm({ ...templateForm, template_name: e.target.value })}
                    placeholder="e.g., Standard Week"
                  />
                </div>
                <div>
                  <Label htmlFor="template_type">Type</Label>
                  <Select
                    value={templateForm.template_type}
                    onValueChange={(value) => setTemplateForm({ ...templateForm, template_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="weekend">Weekend</SelectItem>
                      <SelectItem value="special_event">Special Event</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Describe when to use this template..."
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold mb-4">Add Shifts to Template</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label htmlFor="day_of_week">Day</Label>
                    <Select
                      value={shiftEntry.day_of_week}
                      onValueChange={(value) => setShiftEntry({ ...shiftEntry, day_of_week: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={shiftEntry.role}
                      onValueChange={(value) => setShiftEntry({ ...shiftEntry, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chef">Chef</SelectItem>
                        <SelectItem value="line_cook">Line Cook</SelectItem>
                        <SelectItem value="server">Server</SelectItem>
                        <SelectItem value="bartender">Bartender</SelectItem>
                        <SelectItem value="cleaner">Cleaner</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="shift_type">Type</Label>
                    <Select
                      value={shiftEntry.shift_type}
                      onValueChange={(value) => setShiftEntry({ ...shiftEntry, shift_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opening">Opening</SelectItem>
                        <SelectItem value="mid_shift">Mid Shift</SelectItem>
                        <SelectItem value="closing">Closing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="start_time">Start</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={shiftEntry.start_time}
                      onChange={(e) => setShiftEntry({ ...shiftEntry, start_time: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_time">End</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={shiftEntry.end_time}
                      onChange={(e) => setShiftEntry({ ...shiftEntry, end_time: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="staff_count">Staff Needed</Label>
                    <Input
                      id="staff_count"
                      type="number"
                      min="1"
                      value={shiftEntry.staff_count}
                      onChange={(e) => setShiftEntry({ ...shiftEntry, staff_count: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddShiftToTemplate}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Shift to Template
                </Button>
              </div>

              {/* Shifts List */}
              {templateForm.shifts_config.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-bold mb-4">Template Shifts ({templateForm.shifts_config.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {templateForm.shifts_config.map((shift, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {shift.day_of_week.charAt(0).toUpperCase() + shift.day_of_week.slice(1)} - {shift.role}
                          </p>
                          <p className="text-xs text-gray-600">
                            {shift.start_time} - {shift.end_time} • {shift.shift_type}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveShift(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}