import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  GripVertical,
  Save,
  ArrowLeft,
  AlertCircle,
  Settings,
  Calendar,
  Clock,
  Upload,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";

export default function FormEditor({ template, onSave, onCancel }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    form_name: "",
    description: "",
    category: "other",
    assigned_position: "any",
    trigger_type: "manual",
    frequency: "daily",
    schedule_day_of_week: "monday",
    schedule_day_of_month: 1,
    schedule_time: "09:00",
    auto_generate: false,
    auto_assign_enabled: false,
    requires_signature: true,
    fields: [],
    is_active: true,
    status: "active",
    completion_deadline_hours: 24,
    icon: "📋",
    color_theme: "#014D40",
    ...template,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const saveFormMutation = useMutation({
    mutationFn: async (data) => {
      if (data.auto_generate && !data.next_due_date) {
        const nextDue = new Date();
        if (data.schedule_time) {
          const [hours, minutes] = data.schedule_time.split(':');
          nextDue.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        data.next_due_date = nextDue.toISOString();
      }

      if (template?.id) {
        await base44.entities.FormTemplate.update(template.id, data);
        
        await base44.entities.FormHistory.create({
          form_id: template.id,
          form_name: data.form_name,
          version_number: (data.version_number || 1) + 1,
          fields_snapshot: data.fields,
          changes_made: "Form updated via editor",
          edited_by: (await base44.auth.me()).email,
          edited_by_name: (await base44.auth.me()).full_name,
          previous_version: data.version_number || 1
        });
      } else {
        await base44.entities.FormTemplate.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formTemplates'] });
      onSave();
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

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      alert('Please describe what form you want to create');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional form template for a restaurant based on this request: "${aiPrompt}". 

Return a JSON with:
- form_name (string)
- description (string) 
- category (one of: haccp, workflow, equipment, pest, sops, training, suppliers, allergens, chemicals, waste, other)
- assigned_position (one of: manager, chef, line_cook, server, bartender, cleaner, maintenance, any)
- trigger_type (one of: shift_start, shift_end, opening, closing, mid_day, manual)
- requires_signature (boolean)
- fields (array of objects with: field_id, field_type, field_label, field_hint, required, order_index)

Field types: text, textarea, number, yesno, dropdown, checkbox, radio, date, photo, file, signature, rating, section_header`,
        response_json_schema: {
          type: "object",
          properties: {
            form_name: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            assigned_position: { type: "string" },
            trigger_type: { type: "string" },
            requires_signature: { type: "boolean" },
            fields: { type: "array" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        ...response,
        icon: "✨",
      }));
      setShowAIHelper(false);
      setAiPrompt("");
    } catch (error) {
      alert('AI generation failed. Please try again.');
    }
    setAiGenerating(false);
  };

  const handleAddField = () => {
    const newField = {
      field_id: `field_${Date.now()}`,
      field_type: "text",
      field_label: "New Field",
      field_hint: "",
      required: false,
      order_index: formData.fields.length,
    };

    setFormData({
      ...formData,
      fields: [...formData.fields, newField],
    });
  };

  const handleRemoveField = (fieldId) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter(f => f.field_id !== fieldId),
    });
  };

  const handleFieldChange = (fieldId, key, value) => {
    setFormData({
      ...formData,
      fields: formData.fields.map(f =>
        f.field_id === fieldId ? { ...f, [key]: value } : f
      ),
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(formData.fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedFields = items.map((field, index) => ({
      ...field,
      order_index: index,
    }));

    setFormData({ ...formData, fields: updatedFields });
  };

  const handleSave = () => {
    if (!formData.form_name) {
      alert("Form name is required");
      return;
    }

    saveFormMutation.mutate(formData);
  };

  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "textarea", label: "Long Text" },
    { value: "number", label: "Number" },
    { value: "yesno", label: "Yes/No" },
    { value: "dropdown", label: "Dropdown" },
    { value: "checkbox", label: "Checkbox" },
    { value: "radio", label: "Radio" },
    { value: "date", label: "Date" },
    { value: "photo", label: "Photo Upload" },
    { value: "file", label: "File Upload" },
    { value: "signature", label: "Signature" },
    { value: "rating", label: "Rating (1-5)" },
    { value: "section_header", label: "Section Header" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {template ? "Edit Form" : "Create New Form"}
          </h2>
          <p className="text-gray-600">Design your smart form with conditional logic</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAIHelper(!showAIHelper)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Helper
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveFormMutation.isPending}
            className="bg-[#014D40] hover:bg-[#013830]"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveFormMutation.isPending ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>

      {showAIHelper && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">AI Form Generator</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Describe the form you need and AI will generate the structure for you
                </p>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Create a daily fridge temperature log with fields for each fridge, temperature readings, signature, and photo upload..."
                  rows={3}
                  className="mb-3"
                />
                <Button
                  onClick={handleGenerateWithAI}
                  disabled={aiGenerating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {aiGenerating ? 'Generating...' : 'Generate Form with AI'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Form Name *
            </label>
            <Input
              value={formData.form_name}
              onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
              placeholder="e.g., Daily Temperature Log"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this form for?"
              rows={2}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Category
              </label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="haccp">🛡️ HACCP Plan</SelectItem>
                  <SelectItem value="workflow">⚙️ Workflow Design</SelectItem>
                  <SelectItem value="equipment">🔧 Equipment Checks</SelectItem>
                  <SelectItem value="pest">🐜 Pest Control</SelectItem>
                  <SelectItem value="sops">📋 SOPs</SelectItem>
                  <SelectItem value="training">🎓 Staff Training</SelectItem>
                  <SelectItem value="suppliers">🚚 Supplier Management</SelectItem>
                  <SelectItem value="allergens">⚠️ Allergen Management</SelectItem>
                  <SelectItem value="chemicals">🧪 Cleaning Chemicals</SelectItem>
                  <SelectItem value="waste">♻️ Waste Management</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Assigned Position
              </label>
              <Select
                value={formData.assigned_position}
                onValueChange={(value) => setFormData({ ...formData, assigned_position: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Form Icon & Image (Optional)
            </label>
            <div className="flex gap-3">
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Emoji (e.g., 📋, 🌡️)"
                className="w-32"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('form-hero-image').click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Image'}
              </Button>
              <input
                id="form-hero-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {formData.hero_image_url && (
                <Badge className="bg-green-100 text-green-800">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Image uploaded
                </Badge>
              )}
            </div>
            {formData.hero_image_url && (
              <img
                src={formData.hero_image_url}
                alt="Form"
                className="mt-2 w-full h-32 object-cover rounded-lg"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Scheduling & Automation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              checked={formData.auto_generate}
              onChange={(e) => setFormData({ ...formData, auto_generate: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-900">
              Enable Automatic Scheduling
            </label>
          </div>

          {formData.auto_generate && (
            <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Frequency
                </label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="six_monthly">Every 6 Months</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency === 'weekly' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Day of Week
                  </label>
                  <Select
                    value={formData.schedule_day_of_week}
                    onValueChange={(value) => setFormData({ ...formData, schedule_day_of_week: value })}
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
              )}

              {formData.frequency === 'monthly' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Day of Month
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.schedule_day_of_month}
                    onChange={(e) => setFormData({ ...formData, schedule_day_of_month: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Schedule Time
                </label>
                <Input
                  type="time"
                  value={formData.schedule_time}
                  onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Trigger Type
              </label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shift_start">Shift Start</SelectItem>
                  <SelectItem value="shift_end">Shift End</SelectItem>
                  <SelectItem value="opening">Opening</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                  <SelectItem value="mid_day">Mid-Day</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Completion Deadline (hours)
              </label>
              <Input
                type="number"
                value={formData.completion_deadline_hours}
                onChange={(e) => setFormData({ ...formData, completion_deadline_hours: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.auto_assign_enabled}
                onChange={(e) => setFormData({ ...formData, auto_assign_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">
                Enable Smart Auto-Assignment
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requires_signature}
                onChange={(e) => setFormData({ ...formData, requires_signature: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">
                Require Signature
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Form Fields</CardTitle>
            <Button onClick={handleAddField} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.fields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No fields yet. Click "Add Field" to get started.</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {formData.fields.map((field, index) => (
                      <Draggable key={field.field_id} draggableId={field.field_id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start gap-3">
                              <div {...provided.dragHandleProps} className="mt-2">
                                <GripVertical className="w-5 h-5 text-gray-400" />
                              </div>

                              <div className="flex-1 space-y-3">
                                <div className="grid md:grid-cols-2 gap-3">
                                  <Input
                                    placeholder="Field Label"
                                    value={field.field_label}
                                    onChange={(e) => handleFieldChange(field.field_id, 'field_label', e.target.value)}
                                  />
                                  <Select
                                    value={field.field_type}
                                    onValueChange={(value) => handleFieldChange(field.field_id, 'field_type', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {fieldTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <Input
                                  placeholder="Hint text (optional)"
                                  value={field.field_hint || ""}
                                  onChange={(e) => handleFieldChange(field.field_id, 'field_hint', e.target.value)}
                                />

                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={field.required}
                                      onChange={(e) => handleFieldChange(field.field_id, 'required', e.target.checked)}
                                      className="w-4 h-4"
                                    />
                                    <label className="text-sm text-gray-700">Required</label>
                                  </div>

                                  {field.field_type === 'number' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const criticalCheck = field.critical_value_check || {
                                          enabled: true,
                                          condition: 'greater_than',
                                          threshold_value: 8,
                                          require_photo: true,
                                          require_comment: true,
                                          alert_manager: true
                                        };
                                        handleFieldChange(field.field_id, 'critical_value_check', criticalCheck);
                                      }}
                                    >
                                      <AlertCircle className="w-4 h-4 mr-2" />
                                      Add Critical Alert
                                    </Button>
                                  )}
                                </div>

                                {field.critical_value_check?.enabled && (
                                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                    <p className="text-sm font-medium text-red-900 mb-2">
                                      ⚠️ Critical Value Alert
                                    </p>
                                    <div className="grid md:grid-cols-2 gap-2 text-xs">
                                      <Input
                                        type="number"
                                        placeholder="Threshold value"
                                        value={field.critical_value_check.threshold_value || ""}
                                        onChange={(e) => {
                                          const updated = { ...field.critical_value_check, threshold_value: parseFloat(e.target.value) };
                                          handleFieldChange(field.field_id, 'critical_value_check', updated);
                                        }}
                                      />
                                      <Select
                                        value={field.critical_value_check.condition}
                                        onValueChange={(value) => {
                                          const updated = { ...field.critical_value_check, condition: value };
                                          handleFieldChange(field.field_id, 'critical_value_check', updated);
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="greater_than">Greater than</SelectItem>
                                          <SelectItem value="less_than">Less than</SelectItem>
                                          <SelectItem value="equals">Equals</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex gap-3 mt-2">
                                      <label className="flex items-center gap-1 text-xs">
                                        <input
                                          type="checkbox"
                                          checked={field.critical_value_check.require_photo}
                                          onChange={(e) => {
                                            const updated = { ...field.critical_value_check, require_photo: e.target.checked };
                                            handleFieldChange(field.field_id, 'critical_value_check', updated);
                                          }}
                                        />
                                        Require Photo
                                      </label>
                                      <label className="flex items-center gap-1 text-xs">
                                        <input
                                          type="checkbox"
                                          checked={field.critical_value_check.require_comment}
                                          onChange={(e) => {
                                            const updated = { ...field.critical_value_check, require_comment: e.target.checked };
                                            handleFieldChange(field.field_id, 'critical_value_check', updated);
                                          }}
                                        />
                                        Require Comment
                                      </label>
                                      <label className="flex items-center gap-1 text-xs">
                                        <input
                                          type="checkbox"
                                          checked={field.critical_value_check.alert_manager}
                                          onChange={(e) => {
                                            const updated = { ...field.critical_value_check, alert_manager: e.target.checked };
                                            handleFieldChange(field.field_id, 'critical_value_check', updated);
                                          }}
                                        />
                                        Alert Manager
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveField(field.field_id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}