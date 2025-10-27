import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, Edit, Trash2, ArrowLeft, Home, Star, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QualityTemplates() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [checkItems, setCheckItems] = useState([{ title: "", category: "", area: "", requires_photo: false, min_score: 3 }]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['qualityTemplates'],
    queryFn: () => base44.entities.QualityTemplate.list(),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.QualityTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityTemplates'] });
      resetForm();
      setShowDialog(false);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QualityTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityTemplates'] });
      resetForm();
      setShowDialog(false);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.QualityTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityTemplates'] });
    },
  });

  const resetForm = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setDescription("");
    setCategory("");
    setFrequency("daily");
    setCheckItems([{ title: "", category: "", area: "", requires_photo: false, min_score: 3 }]);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setTemplateName(template.template_name);
    setDescription(template.description || "");
    setCategory(template.category);
    setFrequency(template.frequency);
    setCheckItems(template.check_items || [{ title: "", category: "", area: "", requires_photo: false, min_score: 3 }]);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    const data = {
      template_name: templateName,
      description,
      category,
      frequency,
      check_items: checkItems.map((item, idx) => ({ ...item, item_id: `item_${idx}`, order: idx })),
      created_by: user?.email,
      created_by_name: user?.full_name,
      is_active: true
    };

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const addCheckItem = () => {
    setCheckItems([...checkItems, { title: "", category: "", area: "", requires_photo: false, min_score: 3 }]);
  };

  const removeCheckItem = (index) => {
    setCheckItems(checkItems.filter((_, i) => i !== index));
  };

  const updateCheckItem = (index, field, value) => {
    const updated = [...checkItems];
    updated[index][field] = value;
    setCheckItems(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('QualityDashboard')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quality
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="w-10 h-10 text-emerald-600" />
              Quality Templates
            </h1>
            <p className="text-gray-600 mt-2">Create reusable quality check templates</p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Template
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="bg-white shadow-lg hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      {template.template_name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Badge className="capitalize">{template.category.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline" className="capitalize">{template.frequency}</Badge>
                  <Badge variant="outline">{template.check_items?.length || 0} items</Badge>
                </div>
                
                <div className="space-y-2">
                  {template.check_items?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>{item.title}</span>
                    </div>
                  ))}
                  {template.check_items?.length > 3 && (
                    <p className="text-sm text-gray-500">+{template.check_items.length - 3} more items</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <Card className="p-12 text-center">
            <Star className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Templates Yet</h3>
            <p className="text-gray-600 mb-6">Create your first quality check template to get started</p>
            <Button onClick={() => setShowDialog(true)} className="bg-emerald-600">
              <Plus className="w-5 h-5 mr-2" />
              Create Template
            </Button>
          </Card>
        )}

        {/* Template Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create Quality Template"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="templateName">Template Name *</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Daily Kitchen Walkthrough"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this template checks..."
                  className="mt-2"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select category" />
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
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select frequency" />
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
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Check Items</Label>
                  <Button type="button" size="sm" onClick={addCheckItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {checkItems.map((item, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Check item title"
                            value={item.title}
                            onChange={(e) => updateCheckItem(idx, 'title', e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCheckItem(idx)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={item.category}
                            onValueChange={(value) => updateCheckItem(idx, 'category', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="food_quality">Food Quality</SelectItem>
                              <SelectItem value="hygiene">Hygiene</SelectItem>
                              <SelectItem value="service">Service</SelectItem>
                              <SelectItem value="cleanliness">Cleanliness</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={item.area}
                            onValueChange={(value) => updateCheckItem(idx, 'area', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Area" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kitchen">Kitchen</SelectItem>
                              <SelectItem value="front_of_house">Front of House</SelectItem>
                              <SelectItem value="bar">Bar</SelectItem>
                              <SelectItem value="washroom">Washroom</SelectItem>
                              <SelectItem value="storage">Storage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDialog(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!templateName || !category || checkItems.length === 0}
                className="bg-emerald-600"
              >
                {editingTemplate ? "Update" : "Create"} Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}