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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Star,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Copy,
  Target,
  Home,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function QualityTemplates() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
    category: 'food_quality',
    assigned_role: 'manager',
    frequency: 'daily',
    check_items: [],
  });
  const [newCheckItem, setNewCheckItem] = useState({
    title: '',
    category: 'food_quality',
    area: 'kitchen',
    requires_photo: false,
    min_score: 3,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['qualityTemplates'],
    queryFn: () => base44.entities.QualityTemplate.list('-created_date'),
  });

  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['qualityRecords'],
    queryFn: () => base44.entities.QualityRecord.list('-created_date', 100),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.QualityTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityTemplates'] });
      resetForm();
      alert('✅ Quality template created successfully!');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QualityTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityTemplates'] });
      resetForm();
      alert('✅ Template updated successfully!');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.QualityTemplate.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityTemplates'] });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData({
      template_name: '',
      description: '',
      category: 'food_quality',
      assigned_role: 'manager',
      frequency: 'daily',
      check_items: [],
    });
    setNewCheckItem({
      title: '',
      category: 'food_quality',
      area: 'kitchen',
      requires_photo: false,
      min_score: 3,
    });
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      description: template.description,
      category: template.category,
      assigned_role: template.assigned_role,
      frequency: template.frequency,
      check_items: template.check_items || [],
    });
    setShowForm(true);
  };

  const handleAddCheckItem = () => {
    if (!newCheckItem.title) {
      alert('Please enter a check item title');
      return;
    }

    setFormData(prev => ({
      ...prev,
      check_items: [
        ...prev.check_items,
        {
          ...newCheckItem,
          task_id: `task_${Date.now()}`,
          order: prev.check_items.length + 1,
        }
      ]
    }));

    setNewCheckItem({
      title: '',
      category: 'food_quality',
      area: 'kitchen',
      requires_photo: false,
      min_score: 3,
    });
  };

  const handleRemoveCheckItem = (taskId) => {
    setFormData(prev => ({
      ...prev,
      check_items: prev.check_items.filter(item => item.task_id !== taskId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.template_name || formData.check_items.length === 0) {
      alert('Please provide a template name and at least one check item');
      return;
    }

    const templateData = {
      ...formData,
      created_by: user.email,
      created_by_name: user.full_name,
      is_active: true,
      icon: '⭐',
      color: '#10B981',
    };

    if (editingTemplate) {
      await updateTemplateMutation.mutateAsync({ id: editingTemplate.id, data: templateData });
    } else {
      await createTemplateMutation.mutateAsync(templateData);
    }
  };

  const handleExecuteTemplate = (template) => {
    navigate(createPageUrl(`QuickQualityCheck?templateId=${template.id}`));
  };

  const getTemplateStats = (templateId) => {
    const relatedRecords = qualityRecords.filter(r => r.template_id === templateId);
    return {
      totalChecks: relatedRecords.length,
      avgScore: relatedRecords.length > 0 
        ? (relatedRecords.reduce((sum, r) => sum + r.score, 0) / relatedRecords.length).toFixed(1)
        : 0
    };
  };

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">Quality Templates are only accessible to Managers.</p>
              <Link to={createPageUrl("QualityDashboard")}>
                <Button>
                  <Star className="w-4 h-4 mr-2" />
                  Quality Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('QualityDashboard')}>
            <Button variant="outline" size="sm">
              <Star className="w-4 h-4 mr-2" />
              Quality Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <Target className="w-10 h-10 text-emerald-600" />
              Quality Check Templates
            </h1>
            <p className="text-gray-600">Create reusable quality inspection templates</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-emerald-500 to-green-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates.filter(t => t.is_active).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Templates Yet</h3>
              <p className="text-gray-600 mb-6">Create your first quality check template</p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.filter(t => t.is_active).map((template, index) => {
              const stats = getTemplateStats(template.id);
              
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-2">
                            {template.icon} {template.template_name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {template.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline" className="capitalize text-xs">
                          {template.category.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline" className="capitalize text-xs">
                          {template.frequency}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {template.check_items?.length || 0} items
                        </Badge>
                      </div>

                      {stats.totalChecks > 0 && (
                        <div className="p-3 bg-gray-50 rounded-lg mb-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Usage:</span>
                            <span className="font-bold">{stats.totalChecks} checks</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Avg Score:</span>
                            <span className="font-bold text-emerald-600">{stats.avgScore} ⭐</span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleExecuteTemplate(template)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Execute
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Delete this template?')) {
                              deleteTemplateMutation.mutate(template.id);
                            }
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Template Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create Quality Template'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={formData.template_name}
                    onChange={(e) => setFormData({...formData, template_name: e.target.value})}
                    placeholder="e.g., Daily Kitchen Walkthrough"
                    required
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food_quality">Food Quality</SelectItem>
                      <SelectItem value="hygiene">Hygiene</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="overall_audit">Overall Audit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Frequency</Label>
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
                      <SelectItem value="shift_based">Shift Based</SelectItem>
                      <SelectItem value="on_demand">On Demand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Assigned Role</Label>
                  <Select
                    value={formData.assigned_role}
                    onValueChange={(value) => setFormData({...formData, assigned_role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="chef">Chef</SelectItem>
                      <SelectItem value="line_cook">Line Cook</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="cleaner">Cleaner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="What does this template check?"
                  rows={2}
                />
              </div>

              {/* Check Items */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Check Items ({formData.check_items.length})</h3>
                
                {formData.check_items.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.check_items.map((item) => (
                      <div key={item.task_id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-gray-600">
                            {item.category} • {item.area} • Min: {item.min_score}⭐
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveCheckItem(item.task_id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-sm">Add Check Item</h4>
                    <Input
                      value={newCheckItem.title}
                      onChange={(e) => setNewCheckItem({...newCheckItem, title: e.target.value})}
                      placeholder="Check item title..."
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={newCheckItem.category}
                        onValueChange={(value) => setNewCheckItem({...newCheckItem, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="food_quality">Food Quality</SelectItem>
                          <SelectItem value="hygiene">Hygiene</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={newCheckItem.area}
                        onValueChange={(value) => setNewCheckItem({...newCheckItem, area: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kitchen">Kitchen</SelectItem>
                          <SelectItem value="front_of_house">Front of House</SelectItem>
                          <SelectItem value="bar">Bar</SelectItem>
                          <SelectItem value="storage">Storage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newCheckItem.requires_photo}
                        onChange={(e) => setNewCheckItem({...newCheckItem, requires_photo: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <Label>Require photo evidence</Label>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCheckItem}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}