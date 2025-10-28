
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Home,
  Save,
  Plus,
  Trash2,
  Upload,
  Eye,
  Wand2,
  Sparkles,
  Loader2,
  X,
  Clock,
  Users,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SOPAIGenerator from '../components/SOPAIGenerator';

export default function SOPBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Get SOP ID from URL if editing
  const params = new URLSearchParams(window.location.search);
  const sopId = params.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: existingSOP } = useQuery({
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
    roles_responsibilities: {},
    procedure_steps: [],
    quality_standards: '',
    frequency: 'daily',
    status: 'draft',
    role_assigned: [],
    equipment_required: [],
    safety_notes: '',
    hygiene_notes: '',
    attachments: [],
    review_frequency_months: 6,
  });

  // Load existing SOP data
  useEffect(() => {
    if (existingSOP) {
      setFormData({
        title: existingSOP.title || '',
        description: existingSOP.description || '',
        category: existingSOP.category || 'kitchen',
        objective: existingSOP.objective || '',
        scope: existingSOP.scope || '',
        roles_responsibilities: existingSOP.roles_responsibilities || {},
        procedure_steps: existingSOP.procedure_steps || [],
        quality_standards: existingSOP.quality_standards || '',
        frequency: existingSOP.frequency || 'daily',
        status: existingSOP.status || 'draft',
        role_assigned: existingSOP.role_assigned || [],
        equipment_required: existingSOP.equipment_required || [],
        safety_notes: existingSOP.safety_notes || '',
        hygiene_notes: existingSOP.hygiene_notes || '',
        attachments: existingSOP.attachments || [],
        review_frequency_months: existingSOP.review_frequency_months || 6,
      });
    }
  }, [existingSOP]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!sopId) return; // Only auto-save when editing

    const interval = setInterval(async () => {
      setAutoSaving(true);
      try {
        await base44.entities.SOPDocument.update(sopId, {
          draft_data: formData,
          last_autosave: new Date().toISOString(),
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
      setAutoSaving(false);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [formData, sopId]);

  // ✅ ENHANCED: Add auto-refresh trigger after save
  const saveSopMutation = useMutation({
    mutationFn: async (data) => {
      if (existingSOP) { // Use existingSOP to determine if editing
        // Update existing
        return await base44.entities.SOPDocument.update(existingSOP.id, {
          ...data,
          last_updated_by: user?.email,
          last_updated_by_name: user?.full_name,
          version: (existingSOP?.version || 1) + 1,
        });
      } else {
        // Create new
        return await base44.entities.SOPDocument.create({
          ...data,
          created_by: user?.email,
          created_by_name: user?.full_name,
          version: 1,
        });
      }
    },
    onSuccess: async (savedSOP) => {
      // Invalidate queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['sops'] });

      // ✨ Log activity for new SOPs
      if (!existingSOP) { // If it was a new SOP
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

      alert(existingSOP ? '✅ SOP Updated Successfully!' : '✅ SOP Created Successfully!');
      navigate(createPageUrl('SOPDashboard'));
    },
  });


  const handleSave = async (status = 'draft') => {
    const dataToSave = {
      ...formData,
      status,
      last_reviewed_date: new Date().toISOString(),
      next_review_date: new Date(Date.now() + (formData.review_frequency_months * 30 * 24 * 60 * 60 * 1000)).toISOString(),
    };

    await saveSopMutation.mutateAsync(dataToSave);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        attachments: [
          ...prev.attachments,
          {
            file_name: file.name,
            file_url: file_url,
            file_type: file.type,
            uploaded_by: user?.email,
            uploaded_at: new Date().toISOString(),
          }
        ]
      }));
    } catch (error) {
      console.error('File upload failed:', error);
    }
    setUploading(false);
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      procedure_steps: [
        ...prev.procedure_steps,
        {
          step_number: prev.procedure_steps.length + 1,
          title: '',
          description: '',
          time_estimate_minutes: 0,
          role_responsible: '',
          equipment_needed: [],
          safety_notes: '',
        }
      ]
    }));
  };

  const updateStep = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      procedure_steps: prev.procedure_steps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const removeStep = (index) => {
    setFormData(prev => ({
      ...prev,
      procedure_steps: prev.procedure_steps.filter((_, i) => i !== index)
    }));
  };

  const handleAIGenerate = (aiData) => {
    setFormData(prev => ({
      ...prev,
      ...aiData,
    }));
    setShowAIGenerator(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex gap-3">
          <Link to={createPageUrl("SOPDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to SOPs
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>

          {lastSaved && (
            <Badge variant="outline" className="ml-auto">
              <Clock className="w-3 h-3 mr-1" />
              Saved {lastSaved.toLocaleTimeString()}
            </Badge>
          )}
          {autoSaving && (
            <Badge variant="outline">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Auto-saving...
            </Badge>
          )}
        </div>

        {/* Header */}
        <Card className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white border-none shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-3">
              {sopId ? '✏️ Edit SOP' : '✨ SOP Builder'}
            </CardTitle>
            <p className="text-white/90 text-lg">
              Create professional Standard Operating Procedures instantly
            </p>
          </CardHeader>
        </Card>

        {/* AI Generator Button */}
        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-1">✨ Generate with AI</h3>
                <p className="text-sm text-gray-600">Let AI create your SOP in seconds</p>
              </div>
              <Button
                onClick={() => setShowAIGenerator(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Generator Modal */}
        {showAIGenerator && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI SOP Generator</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAIGenerator(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <SOPAIGenerator onGenerate={handleAIGenerate} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">SOP Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Karak Chai Preparation Procedure"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief overview of this SOP..."
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitchen">🍳 Kitchen</SelectItem>
                    <SelectItem value="service">🍽️ Service</SelectItem>
                    <SelectItem value="cleaning">🧹 Cleaning</SelectItem>
                    <SelectItem value="hygiene">🧼 Hygiene</SelectItem>
                    <SelectItem value="recipe">📖 Recipe</SelectItem>
                    <SelectItem value="equipment">⚙️ Equipment</SelectItem>
                    <SelectItem value="admin">📋 Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="frequency">Frequency</Label>
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
          </CardContent>
        </Card>

        {/* Objective & Scope */}
        <Card>
          <CardHeader>
            <CardTitle>Objective & Scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="objective">Objective</Label>
              <Textarea
                id="objective"
                value={formData.objective}
                onChange={(e) => setFormData({...formData, objective: e.target.value})}
                placeholder="What is the purpose of this SOP?"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="scope">Scope</Label>
              <Textarea
                id="scope"
                value={formData.scope}
                onChange={(e) => setFormData({...formData, scope: e.target.value})}
                placeholder="What does this SOP cover? What are the boundaries?"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Procedure Steps */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Procedure Steps</CardTitle>
              <Button onClick={addStep} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.procedure_steps.map((step, index) => (
              <Card key={index} className="bg-gray-50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge>Step {index + 1}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>

                  <div>
                    <Label>Step Title</Label>
                    <Input
                      value={step.title}
                      onChange={(e) => updateStep(index, 'title', e.target.value)}
                      placeholder="e.g., Boil water to 95°C"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={step.description}
                      onChange={(e) => updateStep(index, 'description', e.target.value)}
                      placeholder="Detailed instructions for this step..."
                      rows={3}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Time Estimate (minutes)</Label>
                      <Input
                        type="number"
                        value={step.time_estimate_minutes}
                        onChange={(e) => updateStep(index, 'time_estimate_minutes', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Label>Responsible Role</Label>
                      <Input
                        value={step.role_responsible}
                        onChange={(e) => updateStep(index, 'role_responsible', e.target.value)}
                        placeholder="e.g., Barista"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {formData.procedure_steps.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No steps added yet</p>
                <p className="text-sm">Click "Add Step" to begin</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quality & Safety */}
        <Card>
          <CardHeader>
            <CardTitle>Quality & Safety Standards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="quality_standards">Quality Standards</Label>
              <Textarea
                id="quality_standards"
                value={formData.quality_standards}
                onChange={(e) => setFormData({...formData, quality_standards: e.target.value})}
                placeholder="Quality benchmarks and standards..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="safety_notes">Safety Notes</Label>
              <Textarea
                id="safety_notes"
                value={formData.safety_notes}
                onChange={(e) => setFormData({...formData, safety_notes: e.target.value})}
                placeholder="Safety warnings and precautions..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="hygiene_notes">Hygiene Notes</Label>
              <Textarea
                id="hygiene_notes"
                value={formData.hygiene_notes}
                onChange={(e) => setFormData({...formData, hygiene_notes: e.target.value})}
                placeholder="Hygiene requirements..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload').click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.docx,.png,.jpg,.jpeg"
              />
            </div>

            {formData.attachments.length > 0 && (
              <div className="space-y-2">
                {formData.attachments.map((att, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">{att.file_name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        attachments: prev.attachments.filter((_, i) => i !== index)
                      }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-3">
              <Button
                onClick={() => handleSave('draft')}
                variant="outline"
                disabled={saveSopMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save as Draft
              </Button>

              <Button
                onClick={() => handleSave('active')}
                className="bg-gradient-to-r from-[#014D40] to-emerald-600"
                disabled={saveSopMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {saveSopMutation.isPending ? 'Publishing...' : 'Publish SOP'}
              </Button>

              {sopId && (
                <Button
                  onClick={() => navigate(createPageUrl(`SOPViewer?id=${sopId}`))}
                  variant="outline"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
