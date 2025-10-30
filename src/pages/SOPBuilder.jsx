
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Save,
  Eye,
  Plus,
  Trash2,
  ArrowLeft,
  Home,
  Upload,
  X,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReactQuill from 'react-quill';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SOPBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiGenerating, setAIGenerating] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const sopId = urlParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: editingSOP } = useQuery({
    queryKey: ['sop', sopId],
    queryFn: async () => {
      const sops = await base44.entities.SOPDocument.list();
      return sops.find(s => s.id === sopId);
    },
    enabled: !!sopId,
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'kitchen',
    objective: '',
    scope: '',
    content_html: '',
    procedure_steps: [],
    role_assigned: ['all'],
    frequency: 'daily',
    equipment_required: [],
    safety_notes: '',
    hygiene_notes: '',
    video_url: '',
    hero_image_url: '',
    requires_signature: true,
    is_mandatory: false,
    review_frequency_months: 6,
    quality_standards: '', // Added for AI generation
  });

  const [newStep, setNewStep] = useState({
    title: '',
    description: '',
    time_estimate_minutes: 5,
  });

  const [newEquipment, setNewEquipment] = useState('');

  useEffect(() => {
    if (editingSOP) {
      setFormData({
        title: editingSOP.title || '',
        description: editingSOP.description || '',
        category: editingSOP.category || 'kitchen',
        objective: editingSOP.objective || '',
        scope: editingSOP.scope || '',
        content_html: editingSOP.content_html || '',
        procedure_steps: editingSOP.procedure_steps || [],
        role_assigned: editingSOP.role_assigned || ['all'],
        frequency: editingSOP.frequency || 'daily',
        equipment_required: editingSOP.equipment_required || [],
        safety_notes: editingSOP.safety_notes || '',
        hygiene_notes: editingSOP.hygiene_notes || '',
        video_url: editingSOP.video_url || '',
        hero_image_url: editingSOP.hero_image_url || '',
        requires_signature: editingSOP.requires_signature ?? true,
        is_mandatory: editingSOP.is_mandatory || false,
        review_frequency_months: editingSOP.review_frequency_months || 6,
        quality_standards: editingSOP.quality_standards || '', // Added for AI generation
      });
    }
  }, [editingSOP]);

  const saveSopMutation = useMutation({
    mutationFn: async (data) => {
      if (editingSOP) {
        return await base44.entities.SOPDocument.update(editingSOP.id, data);
      } else {
        return await base44.entities.SOPDocument.create(data);
      }
    },
    onSuccess: async (savedSOP) => {
      queryClient.invalidateQueries({ queryKey: ['sops'] });
      
      if (!editingSOP) {
        await base44.entities.ActivityLog.create({
          activity_type: 'sop_added',
          title: 'New SOP Created',
          description: savedSOP.title,
          user_email: user.email,
          user_name: user.full_name,
          icon: 'file',
          color: 'purple',
          related_entity: 'SOPDocument',
          related_entity_id: savedSOP.id,
          is_important: true,
        });
      }
      
      alert(editingSOP ? '✅ SOP Updated Successfully!' : '✅ SOP Created Successfully!');
      navigate(createPageUrl('SOPDashboard'));
    },
    onError: (error) => {
      alert(`❌ Save failed: ${error.message}`);
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, hero_image_url: file_url }));
    } catch (error) {
      alert('Failed to upload image');
    }
    setUploading(false);
  };

  const handleAddStep = () => {
    if (!newStep.title) {
      alert('Please enter step title');
      return;
    }

    setFormData(prev => ({
      ...prev,
      procedure_steps: [
        ...prev.procedure_steps,
        {
          ...newStep,
          step_number: prev.procedure_steps.length + 1,
          role_responsible: formData.role_assigned[0] || 'chef',
          equipment_needed: [],
        }
      ]
    }));

    setNewStep({ title: '', description: '', time_estimate_minutes: 5 });
  };

  const handleRemoveStep = (stepNumber) => {
    setFormData(prev => ({
      ...prev,
      procedure_steps: prev.procedure_steps
        .filter(s => s.step_number !== stepNumber)
        .map((s, idx) => ({ ...s, step_number: idx + 1 }))
    }));
  };

  const handleAddEquipment = () => {
    if (!newEquipment.trim()) return;

    setFormData(prev => ({
      ...prev,
      equipment_required: [...prev.equipment_required, newEquipment.trim()]
    }));
    setNewEquipment('');
  };

  const handleRemoveEquipment = (item) => {
    setFormData(prev => ({
      ...prev,
      equipment_required: prev.equipment_required.filter(e => e !== item)
    }));
  };

  const handleSubmit = async (isDraft = false) => {
    if (!formData.title || !formData.category) {
      alert('Please fill in title and category');
      return;
    }

    const sopData = {
      ...formData,
      status: isDraft ? 'draft' : 'active',
      created_by: user.email,
      created_by_name: user.full_name,
      version: editingSOP?.version || 1,
      active_status: true,
      last_updated_by: user.email,
      last_updated_by_name: user.full_name,
    };

    await saveSopMutation.mutateAsync(sopData);
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a description for the SOP');
      return;
    }

    setAIGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert at creating Standard Operating Procedures (SOPs) for restaurants.

Create a detailed SOP based on this request: "${aiPrompt}"

Generate a comprehensive SOP with:
1. Clear title
2. Objective (what this SOP achieves)
3. Scope (who this applies to)
4. Step-by-step procedure (5-10 detailed steps), including a title, description, and estimated time for each step.
5. Quality standards
6. Safety notes if applicable

Format the response as a structured JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            objective: { type: "string" },
            scope: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step_number: { type: "number" },
                  title: { type: "string" },
                  description: { type: "string" },
                  time_estimate_minutes: { type: "number" },
                  // safety_notes: { type: "string" } // Removed as per existing formData structure
                },
                required: ["step_number", "title", "description", "time_estimate_minutes"]
              }
            },
            quality_standards: { type: "string" },
            safety_notes: { type: "string" }
          },
          required: ["title", "objective", "scope", "steps", "quality_standards"]
        }
      });
      
      setFormData(prev => ({
        ...prev,
        title: response.title || '',
        objective: response.objective || '',
        scope: response.scope || '',
        procedure_steps: (response.steps || []).map((step, index) => ({
          step_number: index + 1,
          title: step.title,
          description: step.description,
          time_estimate_minutes: step.time_estimate_minutes,
          role_responsible: prev.role_assigned[0] || 'chef', // Default for new steps
          equipment_needed: [], // Default for new steps
        })),
        quality_standards: response.quality_standards || '',
        safety_notes: response.safety_notes || '',
      }));

      setShowAIModal(false);
      setAIPrompt('');
      alert('✅ SOP generated successfully! Review and edit as needed.');
    } catch (error) {
      console.error('AI generation failed:', error);
      alert(`❌ Failed to generate SOP. Please try again. Error: ${error.message}`);
    }
    setAIGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="flex gap-3">
              <Link to={createPageUrl('SOPDashboard')}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to SOPs
                </Button>
              </Link>
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
            <div className="h-full border-l border-gray-300 mx-2"></div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {editingSOP ? 'Edit SOP' : 'Create New SOP'}
              </h1>
              <p className="text-gray-600 text-sm">Build a comprehensive standard operating procedure</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAIModal(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate with AI
          </Button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>SOP Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Karak Chai Preparation Procedure"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="hygiene">Hygiene</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="customer_service">Customer Service</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="recipe">Recipe</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="as_needed">As Needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief overview of what this SOP covers..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Hero Image (Optional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('hero-image').click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <input
                    id="hero-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {formData.hero_image_url && (
                    <Badge className="bg-green-100 text-green-800">Image uploaded</Badge>
                  )}
                </div>
                {formData.hero_image_url && (
                  <img
                    src={formData.hero_image_url}
                    alt="Hero"
                    className="mt-2 w-full h-48 object-cover rounded-lg"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Objective */}
          <Card>
            <CardHeader>
              <CardTitle>Objective</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.objective}
                onChange={(e) => setFormData({...formData, objective: e.target.value})}
                placeholder="What is the main goal or purpose of this SOP?"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Scope */}
          <Card>
            <CardHeader>
              <CardTitle>Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.scope}
                onChange={(e) => setFormData({...formData, scope: e.target.value})}
                placeholder="Who does this SOP apply to? What areas or tasks does it cover?"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Quality Standards */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Standards</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.quality_standards}
                onChange={(e) => setFormData({...formData, quality_standards: e.target.value})}
                placeholder="Describe the expected quality outcomes and standards for this procedure."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Procedure Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Procedure Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.procedure_steps.length > 0 && (
                <div className="space-y-3 mb-4">
                  {formData.procedure_steps.map((step) => (
                    <div key={step.step_number} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {step.step_number}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{step.title}</h4>
                        <p className="text-sm text-gray-600">{step.description}</p>
                        {step.time_estimate_minutes && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            ~{step.time_estimate_minutes} min
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveStep(step.step_number)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Add New Step</h4>
                  <Input
                    value={newStep.title}
                    onChange={(e) => setNewStep({...newStep, title: e.target.value})}
                    placeholder="Step title..."
                  />
                  <Textarea
                    value={newStep.description}
                    onChange={(e) => setNewStep({...newStep, description: e.target.value})}
                    placeholder="Step description..."
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newStep.time_estimate_minutes}
                      onChange={(e) => setNewStep({...newStep, time_estimate_minutes: parseInt(e.target.value) || 5})}
                      placeholder="Minutes"
                      className="w-24"
                    />
                    <Button
                      type="button"
                      onClick={handleAddStep}
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Step
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Full Content (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactQuill
                value={formData.content_html}
                onChange={(value) => setFormData({...formData, content_html: value})}
                className="bg-white"
                theme="snow"
              />
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.equipment_required.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.equipment_required.map((item) => (
                    <Badge key={item} variant="outline" className="gap-1">
                      {item}
                      <button onClick={() => handleRemoveEquipment(item)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  placeholder="e.g., Milk frother, Saucepan"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEquipment())}
                />
                <Button type="button" onClick={handleAddEquipment}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>SOP Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Assigned Roles</Label>
                <Select
                  value={formData.role_assigned[0] || 'all'}
                  onValueChange={(value) => setFormData({...formData, role_assigned: [value]})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    <SelectItem value="chef">Chefs</SelectItem>
                    <SelectItem value="line_cook">Line Cooks</SelectItem>
                    <SelectItem value="server">Servers</SelectItem>
                    <SelectItem value="bartender">Bartenders</SelectItem>
                    <SelectItem value="cleaner">Cleaners</SelectItem>
                    <SelectItem value="manager">Managers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Safety Notes</Label>
                <Textarea
                  value={formData.safety_notes}
                  onChange={(e) => setFormData({...formData, safety_notes: e.target.value})}
                  placeholder="Important safety warnings..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Hygiene Notes</Label>
                <Textarea
                  value={formData.hygiene_notes}
                  onChange={(e) => setFormData({...formData, hygiene_notes: e.target.value})}
                  placeholder="Hygiene requirements..."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requires_signature}
                    onChange={(e) => setFormData({...formData, requires_signature: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label>Require signature</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_mandatory}
                    onChange={(e) => setFormData({...formData, is_mandatory: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label>Mandatory training</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl('SOPDashboard'))}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={saveSopMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={saveSopMutation.isPending}
                  className="bg-gradient-to-r from-[#014D40] to-emerald-600"
                >
                  {saveSopMutation.isPending ? 'Publishing...' : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Publish SOP
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Generation Modal */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Generate SOP with AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="ai-prompt">Describe the SOP you want to create</Label>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAIPrompt(e.target.value)}
                placeholder="Example: Create an SOP for preparing Masala Chai from start to finish, including temperature control and quality checks"
                rows={6}
                className="mt-2"
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                💡 <strong>Tip:</strong> Be specific about what you want. Include details like:
                steps, safety requirements, quality standards, and target audience.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAIModal(false)} disabled={aiGenerating}>
                Cancel
              </Button>
              <Button 
                onClick={handleAIGenerate}
                disabled={aiGenerating || !aiPrompt.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {aiGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate SOP
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
