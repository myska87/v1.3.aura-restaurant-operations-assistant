
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit3, // Retained as it's used for handleEdit
  Eye,
  Lock, // Retained as it's used for active/inactive forms
  Unlock, // Retained as it's used for active/inactive forms
  Copy,
  Trash2,
  User, // Retained as it's used for grouping forms by position
  Clock,
  Calendar, // Retained as it's used in stats overview
  AlertCircle, // Retained as it's used for access restricted message
  CheckCircle,
  Search,
  // Filter, // Removed as it's not explicitly used as an icon in the JSX
  Home,
  ArrowLeft, // Retained as it's used for navigation back
  Settings,
  FileText, // New import from outline
  Sparkles, // New import from outline
  Save, // New import from outline
  BarChart3, // New import from outline
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom"; // Retained useNavigate as it's used
import { createPageUrl } from "@/utils";
import FormEditor from "../components/FormEditor";
import { motion } from "framer-motion";
import LoadingSpinner from "../components/common/LoadingSpinner"; // New import from outline
import EmptyState from "../components/common/EmptyState"; // New import from outline

export default function FormIntelligence() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTrigger, setFilterTrigger] = useState("all");
  const [filterPosition, setFilterPosition] = useState("all");
  const [showEditor, setShowEditor] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [aiPrompt, setAiPrompt] = useState(""); // New state for AI prompt
  const [showAiGenerator, setShowAiGenerator] = useState(false); // New state to control AI generator dialog

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['formTemplates'],
    queryFn: () => base44.entities.FormTemplate.list('-created_date'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['formAssignments'],
    queryFn: () => base44.entities.FormAssignmentMetadata.list(),
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['formResponses'],
    queryFn: () => base44.entities.FormResponse.list('-submitted_at'),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const deleteFormMutation = useMutation({
    mutationFn: (id) => base44.entities.FormTemplate.update(id, { status: 'archived', is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formTemplates'] });
      setShowDeleteConfirm(false);
      setFormToDelete(null);
    },
  });

  const duplicateFormMutation = useMutation({
    mutationFn: async (form) => {
      const newForm = {
        ...form,
        form_name: `${form.form_name} (Copy)`,
        version_number: 1,
        status: 'draft',
        created_date: undefined,
        id: undefined,
      };
      return await base44.entities.FormTemplate.create(newForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formTemplates'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) => 
      base44.entities.FormTemplate.update(id, { is_active: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formTemplates'] });
    },
  });

  const generateFormMutation = useMutation({
    mutationFn: async (prompt) => {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate a restaurant hygiene/operations form. Request: "${prompt}". Return valid JSON only with: form_name (string), description (string), category (haccp/workflow/equipment/pest/sops/training/suppliers/allergens/chemicals/waste/other), assigned_position (manager/chef/line_cook/server/bartender/cleaner/maintenance/any), fields (array of objects with field_id, field_type (text/number/dropdown/checkbox/yesno/date/photo/signature/rating/textarea), field_label, field_hint, options (array), required (boolean), order_index (number)), requires_signature (boolean), frequency (daily/weekly/monthly/six_monthly/yearly/custom).`,
          response_json_schema: {
            type: "object",
            properties: {
              form_name: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              assigned_position: { type: "string" },
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field_id: { type: "string" },
                    field_type: { type: "string" },
                    field_label: { type: "string" },
                    field_hint: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    required: { type: "boolean" },
                    order_index: { type: "number" }
                  }
                }
              },
              requires_signature: { type: "boolean" },
              frequency: { type: "string" }
            }
          }
        });

        if (!result || !result.form_name) {
          throw new Error('Invalid response from AI');
        }

        return result;
      } catch (error) {
        console.error('AI generation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      const newFormData = {
        form_name: data.form_name || 'New Form',
        description: data.description || '',
        category: data.category || 'other',
        assigned_position: data.assigned_position || 'any',
        fields: data.fields || [],
        requires_signature: data.requires_signature !== false,
        frequency: data.frequency || 'daily',
        trigger_type: 'manual', // Default trigger type for AI generated forms
        is_active: true,
      };
      setSelectedForm(newFormData);
      setShowEditor(true);
      setAiPrompt('');
      setShowAiGenerator(false);
      alert('✅ Form generated! Review and customize below, then click "Create Form"');
    },
    onError: (error) => {
      console.error('AI generation error:', error);
      alert('❌ AI generation failed. Please try creating the form manually instead.');
      setShowAiGenerator(false);
    }
  });

  // Check URL params for auto-opening a form
  useEffect(() => {
    // Only proceed if forms data is loaded and not empty
    if (forms.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const formIdToOpen = urlParams.get('openForm');
      
      if (formIdToOpen) {
        // Find and open the form
        const form = forms.find(f => f.id === formIdToOpen);
        if (form) {
          setSelectedForm(form);
          setShowEditor(true);
        }
        // Optionally, clear the URL param to prevent re-opening on subsequent renders
        // navigate(window.location.pathname, { replace: true }); 
      }
    }
  }, [forms, navigate]); // Add navigate to dependency array if used to clear URL params

  // Filter forms
  const filteredForms = forms.filter(form => {
    const matchesSearch = form.form_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         form.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrigger = filterTrigger === 'all' || form.trigger_type === filterTrigger;
    const matchesPosition = filterPosition === 'all' || form.assigned_position === filterPosition;
    return matchesSearch && matchesTrigger && matchesPosition && form.status !== 'archived';
  });

  // Group forms by position
  const formsByPosition = filteredForms.reduce((acc, form) => {
    const position = form.assigned_position || 'any';
    if (!acc[position]) acc[position] = [];
    acc[position].push(form);
    return acc;
  }, {});

  const getTriggerColor = (triggerType) => {
    switch (triggerType) {
      case 'opening':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'mid_day':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closing':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'shift_start':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shift_end':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFormStats = (formId) => {
    const formAssignments = assignments.filter(a => a.form_id === formId);
    const formResponses = responses.filter(r => r.form_id === formId);
    const completedResponses = formResponses.filter(r => r.status === 'submitted' || r.status === 'approved');
    
    return {
      assigned: formAssignments.length,
      completed: completedResponses.length,
      pending: formAssignments.length - completedResponses.length,
      completionRate: formAssignments.length > 0 
        ? Math.round((completedResponses.length / formAssignments.length) * 100) 
        : 0
    };
  };

  const handleEdit = (form) => {
    setSelectedForm(form);
    setShowEditor(true);
  };

  const handleDuplicate = (form) => {
    duplicateFormMutation.mutate(form);
  };

  const handleDelete = (form) => {
    setFormToDelete(form);
    setShowDeleteConfirm(true);
  };

  const handleToggleActive = (form) => {
    toggleActiveMutation.mutate({ id: form.id, isActive: form.is_active });
  };

  if (!isManager) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Access Restricted</h3>
            <p className="text-red-700">Form Intelligence is only accessible to managers.</p>
            <Link to={createPageUrl("Dashboard")}>
              <Button className="mt-4">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showEditor) {
    return (
      <div className="p-6 md:p-8">
        <FormEditor
          template={selectedForm}
          onSave={() => {
            setShowEditor(false);
            setSelectedForm(null);
            queryClient.invalidateQueries({ queryKey: ['formTemplates'] }); // Invalidate to refresh form list
          }}
          onCancel={() => {
            setShowEditor(false);
            setSelectedForm(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("AdvancedChecklists")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-[#014D40]" />
              Form Intelligence
            </h1>
            <p className="text-gray-600 mt-2">Smart forms that adapt to positions, shifts & operations</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setShowAiGenerator(true);
              }}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              AI Generate Form
            </Button>
            <Button
              onClick={() => {
                setSelectedForm(null);
                setShowEditor(true);
              }}
              className="bg-[#014D40] hover:bg-[#013830]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Form
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Forms</p>
                  <p className="text-2xl font-bold text-gray-900">{forms.filter(f => f.status !== 'archived').length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Forms</p>
                  <p className="text-2xl font-bold text-gray-900">{forms.filter(f => f.is_active && f.status === 'active').length}</p>
                </div>
                <Unlock className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Auto-Assigned</p>
                  <p className="text-2xl font-bold text-gray-900">{forms.filter(f => f.auto_assign_enabled).length}</p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {responses.filter(r => 
                      r.submitted_at && new Date(r.submitted_at).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search forms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select
                value={filterTrigger}
                onValueChange={setFilterTrigger}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Triggers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Triggers</SelectItem>
                  <SelectItem value="opening">Opening</SelectItem>
                  <SelectItem value="mid_day">Mid-Day</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                  <SelectItem value="shift_start">Shift Start</SelectItem>
                  <SelectItem value="shift_end">Shift End</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterPosition}
                onValueChange={setFilterPosition}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="any">Any Position</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="line_cook">Line Cook</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="bartender">Bartender</SelectItem>
                  <SelectItem value="cleaner">Cleaner</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <BarChart3 className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                {viewMode === 'grid' ? 'Grid View' : 'List View'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Forms Display */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Object.entries(formsByPosition).length === 0 ? (
          <EmptyState
            icon={Settings}
            title="No Forms Found"
            description="Get started by creating your first smart form."
            buttonText="Create Form"
            onButtonClick={() => {
              setSelectedForm(null);
              setShowEditor(true);
            }}
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(formsByPosition).map(([position, positionForms]) => (
              <div key={position}>
                <h2 className="text-xl font-bold text-gray-900 mb-4 capitalize flex items-center gap-2">
                  <User className="w-5 h-5 text-[#014D40]" />
                  {position === 'any' ? 'All Positions' : position.replace('_', ' ')}
                  <Badge variant="outline">{positionForms.length} forms</Badge>
                </h2>

                <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                  {positionForms.map((form, index) => {
                    const stats = getFormStats(form.id);
                    
                    return (
                      <motion.div
                        key={form.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`${
                          form.is_active 
                            ? 'border-l-4 border-l-[#014D40]' 
                            : 'border-l-4 border-l-gray-300 opacity-60'
                        } hover:shadow-lg transition-all`}>
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-lg font-bold text-gray-900">{form.form_name}</h3>
                                  {form.is_active ? (
                                    <Unlock className="w-4 h-4 text-green-600" title="Active" />
                                  ) : (
                                    <Lock className="w-4 h-4 text-gray-400" title="Inactive" />
                                  )}
                                </div>
                                {form.description && (
                                  <p className="text-sm text-gray-600 mb-3">{form.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                              <Badge className={getTriggerColor(form.trigger_type)}>
                                {form.trigger_type?.replace('_', ' ')}
                              </Badge>
                              {form.auto_assign_enabled && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  Auto-Assign
                                </Badge>
                              )}
                              {form.requires_signature && (
                                <Badge variant="outline">
                                  Signature Required
                                </Badge>
                              )}
                              <Badge variant="outline">
                                v{form.version_number || 1}
                              </Badge>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                              <div className="text-center">
                                <p className="text-xs text-gray-600">Assigned</p>
                                <p className="text-lg font-bold text-gray-900">{stats.assigned}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-600">Completed</p>
                                <p className="text-lg font-bold text-green-600">{stats.completed}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-600">Rate</p>
                                <p className="text-lg font-bold text-blue-600">{stats.completionRate}%</p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(form)}
                                className="flex-1"
                              >
                                <Edit3 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDuplicate(form)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleActive(form)}
                                className={form.is_active ? 'text-gray-600' : 'text-green-600'}
                              >
                                {form.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(form)}
                                className="text-red-600 hover:bg-red-50"
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
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive Form?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Are you sure you want to archive "<strong>{formToDelete?.form_name}</strong>"?
              </p>
              <p className="text-sm text-gray-600 mt-2">
                This form will be moved to archived status and no longer appear in active forms.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => deleteFormMutation.mutate(formToDelete.id)}
                disabled={deleteFormMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteFormMutation.isPending ? 'Archiving...' : 'Archive Form'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Generator Dialog */}
        <Dialog open={showAiGenerator} onOpenChange={setShowAiGenerator}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" /> AI Form Generator
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-gray-700">
                Describe the form you want to create. The AI will generate a draft for you.
              </p>
              <div>
                <Label htmlFor="ai-prompt">Form Description</Label>
                <Textarea
                  id="ai-prompt"
                  placeholder="e.g., 'Daily temperature log for kitchen equipment for a line cook'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={4}
                />
              </div>
              {generateFormMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <LoadingSpinner className="w-4 h-4" /> Generating form, please wait...
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAiGenerator(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => generateFormMutation.mutate(aiPrompt)}
                disabled={generateFormMutation.isPending || !aiPrompt.trim()}
                className="bg-[#014D40] hover:bg-[#013830]"
              >
                {generateFormMutation.isPending ? 'Generating...' : 'Generate Form'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
