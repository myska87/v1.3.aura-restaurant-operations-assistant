
/**
 * AI SOP Generator Component
 * Generates SOPs instantly using AI
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Loader2, 
  Check, 
  Edit, 
  Wand2, 
  Plus, 
  X,
  AlertTriangle, // Added
  Clock,         // Added
  Users          // Added
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SOPAIGenerator({ onGenerated }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedSOP, setGeneratedSOP] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedSOP, setEditedSOP] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async (promptText) => {
      // Use AI to generate SOP structure
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert restaurant operations consultant. Create a detailed Standard Operating Procedure (SOP) for: "${promptText}"

Generate a comprehensive SOP with the following structure:
- Title (clear and concise)
- Description (2-3 sentences explaining what this SOP covers)
- Category (one of: kitchen, service, cleaning, admin, hygiene, maintenance, customer_service, equipment, recipe, other)
- Steps (detailed step-by-step instructions with:
  - Step title
  - Detailed description
  - Time estimate in minutes
  - Role responsible (chef, line_cook, server, bartender, cleaner, manager, maintenance)
  - Equipment needed (list)
  - Safety notes if applicable
)
- Total time estimate
- Required roles
- Safety precautions
- Hygiene notes
- Frequency (daily, weekly, monthly, quarterly, as_needed)
- Difficulty level (beginner, intermediate, advanced, expert)

Make it practical, specific, and EHO-compliant for UK restaurants.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step_number: { type: "number" },
                  title: { type: "string" },
                  description: { type: "string" },
                  time_estimate_minutes: { type: "number" },
                  role_responsible: { type: "string" },
                  equipment_needed: {
                    type: "array",
                    items: { type: "string" }
                  },
                  safety_notes: { type: "string" }
                }
              }
            },
            total_time_minutes: { type: "number" },
            role_assigned: {
              type: "array",
              items: { type: "string" }
            },
            safety_notes: { type: "string" },
            hygiene_notes: { type: "string" },
            frequency: { type: "string" },
            difficulty_level: { type: "string" }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setGeneratedSOP(data);
      setEditedSOP(data);
      setGenerating(false);
    },
    onError: (error) => {
      console.error('AI Generation Error:', error);
      alert('Failed to generate SOP. Please try again.');
      setGenerating(false);
    }
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (sopData) => {
      const user = await base44.auth.me();
      
      return await base44.entities.SOPDocument.create({
        ...sopData,
        version: 0,
        created_by: user.email,
        created_by_name: user.full_name,
        active_status: false, // Draft mode
        status: 'draft',
        view_count: 0,
        completion_count: 0,
        signature_count: 0,
        requires_signature: true,
        is_mandatory: false,
        review_frequency_months: 6,
        tags: ['ai-generated', 'draft'],
      });
    },
    onSuccess: (newSOP) => {
      queryClient.invalidateQueries({ queryKey: ['sops'] });
      alert('✅ SOP draft saved! You can edit it from the SOP Dashboard.');
      if (onGenerated) onGenerated(newSOP);
      // Reset
      setPrompt('');
      setGeneratedSOP(null);
      setEditedSOP(null);
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (sopData) => {
      const user = await base44.auth.me();
      
      const nextReviewDate = new Date();
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 6);
      
      return await base44.entities.SOPDocument.create({
        ...sopData,
        version: 1,
        created_by: user.email,
        created_by_name: user.full_name,
        active_status: true,
        status: 'active',
        last_reviewed_date: new Date().toISOString().split('T')[0],
        next_review_date: nextReviewDate.toISOString().split('T')[0],
        view_count: 0,
        completion_count: 0,
        signature_count: 0,
        requires_signature: true,
        is_mandatory: false,
        review_frequency_months: 6,
        tags: ['ai-generated'],
      });
    },
    onSuccess: (newSOP) => {
      queryClient.invalidateQueries({ queryKey: ['sops'] });
      alert('✅ SOP published successfully!');
      navigate(createPageUrl(`SOPViewer?id=${newSOP.id}`));
    }
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      alert('Please enter a description for the SOP you want to create.');
      return;
    }

    setGenerating(true);
    generateMutation.mutate(prompt);
  };

  const handleSaveDraft = () => {
    saveDraftMutation.mutate(editedSOP);
  };

  const handlePublish = () => {
    if (confirm('Publish this SOP and make it visible to the team?')) {
      publishMutation.mutate(editedSOP);
    }
  };

  const addStep = () => {
    const newStep = {
      step_number: editedSOP.steps.length + 1,
      title: '',
      description: '',
      time_estimate_minutes: 5,
      role_responsible: 'chef',
      equipment_needed: [],
      safety_notes: ''
    };
    
    setEditedSOP({
      ...editedSOP,
      steps: [...editedSOP.steps, newStep]
    });
  };

  const removeStep = (index) => {
    const newSteps = editedSOP.steps.filter((_, i) => i !== index);
    // Renumber steps
    newSteps.forEach((step, i) => {
      step.step_number = i + 1;
    });
    
    setEditedSOP({
      ...editedSOP,
      steps: newSteps
    });
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...editedSOP.steps];
    newSteps[index] = {
      ...newSteps[index],
      [field]: value
    };
    
    setEditedSOP({
      ...editedSOP,
      steps: newSteps
    });
  };

  return (
    <div className="space-y-6">
      {/* Generator Input */}
      {!generatedSOP && (
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Wand2 className="w-6 h-6 text-purple-600" />
              🧠 AI SOP Generator
            </CardTitle>
            <p className="text-gray-600">
              Describe what you want to create, and AI will generate a complete SOP instantly.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What SOP do you want to create?
              </label>
              <Textarea
                placeholder="e.g., 'Cleaning the coffee machine', 'Karak Chai brewing process', 'Opening kitchen checklist', 'Customer complaint handling procedure'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full"
                disabled={generating}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate SOP
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated SOP Preview/Edit */}
      {generatedSOP && editedSOP && (
        <div className="space-y-6">
          <Card className="bg-white border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">
                  {editMode ? '✏️ Edit SOP' : '✨ AI Generated SOP'}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditMode(!editMode)}
                    variant="outline"
                    className="bg-white text-emerald-700 border-white hover:bg-emerald-50"
                  >
                    {editMode ? <Check className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                    {editMode ? 'Preview' : 'Edit'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  {editMode ? (
                    <Input
                      value={editedSOP.title}
                      onChange={(e) => setEditedSOP({ ...editedSOP, title: e.target.value })}
                      className="text-lg font-bold"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-gray-900">{editedSOP.title}</h2>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  {editMode ? (
                    <Textarea
                      value={editedSOP.description}
                      onChange={(e) => setEditedSOP({ ...editedSOP, description: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-gray-700">{editedSOP.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    {editMode ? (
                      <Select 
                        value={editedSOP.category} 
                        onValueChange={(val) => setEditedSOP({ ...editedSOP, category: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kitchen">Kitchen</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="hygiene">Hygiene</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="recipe">Recipe</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="customer_service">Customer Service</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className="capitalize bg-emerald-100 text-emerald-800">{editedSOP.category}</Badge>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                    {editMode ? (
                      <Select 
                        value={editedSOP.difficulty_level} 
                        onValueChange={(val) => setEditedSOP({ ...editedSOP, difficulty_level: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="capitalize">{editedSOP.difficulty_level}</Badge>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    {editMode ? (
                      <Select 
                        value={editedSOP.frequency} 
                        onValueChange={(val) => setEditedSOP({ ...editedSOP, frequency: val })}
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
                    ) : (
                      <Badge variant="outline" className="capitalize">{editedSOP.frequency}</Badge>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Time</label>
                    <Badge className="bg-blue-100 text-blue-800">
                      {editedSOP.total_time_minutes} min
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Steps</h3>
                  {editMode && (
                    <Button onClick={addStep} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Step
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {editedSOP.steps.map((step, index) => (
                    <Card key={index} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge className="bg-emerald-600 text-white">Step {step.step_number}</Badge>
                          {editMode && (
                            <Button
                              onClick={() => removeStep(index)}
                              size="icon"
                              variant="ghost"
                              className="text-red-500 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {editMode ? (
                          <div className="space-y-3">
                            <Input
                              placeholder="Step title"
                              value={step.title}
                              onChange={(e) => updateStep(index, 'title', e.target.value)}
                              className="font-bold"
                            />
                            <Textarea
                              placeholder="Step description"
                              value={step.description}
                              onChange={(e) => updateStep(index, 'description', e.target.value)}
                              rows={2}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Time (min)</label>
                                <Input
                                  type="number"
                                  value={step.time_estimate_minutes}
                                  onChange={(e) => updateStep(index, 'time_estimate_minutes', parseInt(e.target.value))}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Responsible</label>
                                <Select
                                  value={step.role_responsible}
                                  onValueChange={(val) => updateStep(index, 'role_responsible', val)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="chef">Chef</SelectItem>
                                    <SelectItem value="line_cook">Line Cook</SelectItem>
                                    <SelectItem value="server">Server</SelectItem>
                                    <SelectItem value="bartender">Bartender</SelectItem>
                                    <SelectItem value="cleaner">Cleaner</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <h4 className="font-bold text-gray-900">{step.title}</h4>
                            <p className="text-gray-700">{step.description}</p>
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                ⏱️ {step.time_estimate_minutes} min
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                👤 {step.role_responsible}
                              </Badge>
                            </div>
                            {step.safety_notes && (
                              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm text-amber-900">
                                ⚠️ {step.safety_notes}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Safety & Hygiene Notes */}
              {(editedSOP.safety_notes || editedSOP.hygiene_notes) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {editedSOP.safety_notes && (
                    <Card className="bg-amber-50 border-amber-200">
                      <CardHeader>
                        <CardTitle className="text-sm text-amber-900">⚠️ Safety Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-amber-800">{editedSOP.safety_notes}</p>
                      </CardContent>
                    </Card>
                  )}
                  {editedSOP.hygiene_notes && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-sm text-blue-900">🧼 Hygiene Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-blue-800">{editedSOP.hygiene_notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => {
                    setGeneratedSOP(null);
                    setEditedSOP(null);
                    setEditMode(false);
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDraft}
                  variant="outline"
                  disabled={saveDraftMutation.isLoading}
                >
                  {saveDraftMutation.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    '💾 Save as Draft'
                  )}
                </Button>
                <Button
                  onClick={handlePublish}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={publishMutation.isLoading}
                >
                  {publishMutation.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    '✅ Publish SOP'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
