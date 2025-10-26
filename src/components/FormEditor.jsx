
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  Eye, 
  Edit3,
  Undo,
  Copy
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * 📝 FORM EDITOR
 * Drag-and-drop form builder with live preview
 * Supports field reordering, editing, and version control
 */
export default function FormEditor({ template, onSave, onCancel }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(true);
  const [formData, setFormData] = useState(template || {
    form_name: '',
    description: '',
    category: 'other',
    assigned_position: 'any',
    trigger_type: 'manual',
    fields: [],
    requires_signature: true,
    auto_calculate_score: false,
    editable: true,
    version_number: 1,
    is_active: true,
    status: 'draft',
    auto_assign_enabled: false,
  });

  const [draggedFieldIndex, setDraggedFieldIndex] = useState(null);

  const saveFormMutation = useMutation({
    mutationFn: async (data) => {
      // Create version history entry
      if (template) {
        await base44.entities.FormHistory.create({
          form_id: template.id,
          form_name: template.form_name,
          version_number: (template.version_number || 1) + 1,
          fields_snapshot: template.fields,
          changes_made: 'Form fields updated',
          edited_by: (await base44.auth.me()).email,
          edited_by_name: (await base44.auth.me()).full_name,
          previous_version: template.version_number || 1,
        });

        // Update existing template
        return await base44.entities.FormTemplate.update(template.id, {
          ...data,
          version_number: (template.version_number || 1) + 1,
          last_edited_by: (await base44.auth.me()).email,
          last_edited_at: new Date().toISOString(),
        });
      } else {
        // Create new template
        const user = await base44.auth.me();
        return await base44.entities.FormTemplate.create({
          ...data,
          last_edited_by: user.email,
          last_edited_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formTemplates'] });
      if (onSave) onSave();
    },
  });

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'yesno', label: 'Yes/No' },
    { value: 'date', label: 'Date Picker' },
    { value: 'photo', label: 'Photo Upload' },
    { value: 'file', label: 'File Upload' },
    { value: 'signature', label: 'Digital Signature' },
    { value: 'rating', label: 'Star Rating' },
    { value: 'section_header', label: 'Section Header' },
  ];

  const addField = () => {
    const newField = {
      field_id: `field_${Date.now()}`,
      field_type: 'text',
      field_label: 'New Field',
      field_hint: '',
      options: [],
      required: false,
      order_index: formData.fields.length,
    };

    setFormData({
      ...formData,
      fields: [...formData.fields, newField]
    });
  };

  const removeField = (index) => {
    const updatedFields = formData.fields.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      fields: updatedFields
    });
  };

  const updateField = (index, updates) => {
    const updatedFields = [...formData.fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    
    // Handle conditional logic setup
    if (updates.field_type) {
      // Add validation rules for specific field types
      if (updates.field_type === 'number' && updatedFields[index].field_label?.toLowerCase().includes('temp')) {
        updatedFields[index].validation_rules = {
          type: 'temperature',
          critical_threshold: 8,
          requires_comment_if_critical: true,
          requires_photo_if_critical: true
        };
      }
    }
    
    setFormData({
      ...formData,
      fields: updatedFields
    });
  };

  const duplicateField = (index) => {
    const fieldToDuplicate = { ...formData.fields[index] };
    fieldToDuplicate.field_id = `field_${Date.now()}`;
    fieldToDuplicate.field_label = `${fieldToDuplicate.field_label} (Copy)`;
    
    const updatedFields = [
      ...formData.fields.slice(0, index + 1),
      fieldToDuplicate,
      ...formData.fields.slice(index + 1)
    ];

    setFormData({
      ...formData,
      fields: updatedFields
    });
  };

  const handleDragStart = (index) => {
    setDraggedFieldIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    
    if (draggedFieldIndex === null || draggedFieldIndex === index) return;

    const updatedFields = [...formData.fields];
    const draggedField = updatedFields[draggedFieldIndex];
    
    updatedFields.splice(draggedFieldIndex, 1);
    updatedFields.splice(index, 0, draggedField);
    
    setFormData({
      ...formData,
      fields: updatedFields.map((field, idx) => ({ ...field, order_index: idx }))
    });
    
    setDraggedFieldIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedFieldIndex(null);
  };

  const handleSave = () => {
    saveFormMutation.mutate(formData);
  };

  // Add conditional logic section in field editor
  const renderFieldEditor = (field, index) => {
    return (
      <Card
        key={field.field_id}
        draggable={editMode}
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
        className={`${
          draggedFieldIndex === index ? 'opacity-50' : ''
        } ${editMode ? 'cursor-move' : ''}`}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {editMode && (
              <div className="flex items-center">
                <GripVertical className="w-5 h-5 text-gray-400" />
              </div>
            )}

            <div className="flex-1 space-y-3">
              {/* Existing field editor code */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    value={field.field_label}
                    onChange={(e) => updateField(index, { field_label: e.target.value })}
                    placeholder="Field Label"
                    disabled={!editMode}
                  />
                </div>
                <div className="w-48">
                  <Select
                    value={field.field_type}
                    onValueChange={(value) => updateField(index, { field_type: value })}
                    disabled={!editMode}
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
              </div>

              <Input
                value={field.field_hint}
                onChange={(e) => updateField(index, { field_hint: e.target.value })}
                placeholder="Hint text (optional)"
                disabled={!editMode}
                className="text-sm"
              />

              {(field.field_type === 'dropdown' || field.field_type === 'radio') && (
                <Input
                  value={field.options?.join(', ') || ''}
                  onChange={(e) => updateField(index, { options: e.target.value.split(',').map(o => o.trim()) })}
                  placeholder="Options (comma separated)"
                  disabled={!editMode}
                  className="text-sm"
                />
              )}

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    disabled={!editMode}
                    className="rounded"
                  />
                  Required
                </label>
                
                {field.required && (
                  <Badge variant="outline" className="text-xs">
                    Required Field
                  </Badge>
                )}
              </div>

              {/* Conditional Logic Section */}
              {field.field_type === 'number' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-xs font-semibold text-blue-900 mb-2 block">
                    Conditional Logic
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Critical threshold"
                        value={field.validation_rules?.critical_threshold || ''}
                        onChange={(e) => updateField(index, {
                          validation_rules: {
                            ...field.validation_rules,
                            critical_threshold: parseFloat(e.target.value),
                            type: 'temperature'
                          }
                        })}
                        disabled={!editMode}
                        className="text-sm"
                      />
                      <span className="text-xs text-gray-600">°C</span>
                    </div>
                    
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={field.validation_rules?.requires_comment_if_critical || false}
                        onChange={(e) => updateField(index, {
                          validation_rules: {
                            ...field.validation_rules,
                            requires_comment_if_critical: e.target.checked
                          }
                        })}
                        disabled={!editMode}
                        className="rounded"
                      />
                      Require comment if above threshold
                    </label>

                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={field.validation_rules?.requires_photo_if_critical || false}
                        onChange={(e) => updateField(index, {
                          validation_rules: {
                            ...field.validation_rules,
                            requires_photo_if_critical: e.target.checked
                          }
                        })}
                        disabled={!editMode}
                        className="rounded"
                      />
                      Require photo if above threshold
                    </label>

                    {field.validation_rules?.critical_threshold !== undefined && (
                      <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                        ⚠️ If value {'>'} {field.validation_rules.critical_threshold}°C: 
                        {field.validation_rules.requires_comment_if_critical && ' + Comment'}
                        {field.validation_rules.requires_photo_if_critical && ' + Photo'}
                        {(!field.validation_rules.requires_comment_if_critical && !field.validation_rules.requires_photo_if_critical) && ' (No additional actions configured)'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Show/Hide Conditional Logic */}
              {field.field_type !== 'section_header' && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <Label className="text-xs font-semibold text-purple-900 mb-2 block">
                    Show/Hide Rules
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={field.conditional_logic?.show_if_field || ''}
                      onChange={(e) => updateField(index, {
                        conditional_logic: {
                          ...field.conditional_logic,
                          show_if_field: e.target.value
                        }
                      })}
                      disabled={!editMode}
                      className="text-xs px-2 py-1 border rounded"
                    >
                      <option value="">Always show</option>
                      {formData.fields
                        .filter((f, i) => i < index && f.field_type !== 'section_header')
                        .map(f => (
                          <option key={f.field_id} value={f.field_id}>
                            If "{f.field_label}"...
                          </option>
                        ))}
                    </select>

                    <Input
                      placeholder="equals value..."
                      value={field.conditional_logic?.show_if_value || ''}
                      onChange={(e) => updateField(index, {
                        conditional_logic: {
                          ...field.conditional_logic,
                          show_if_value: e.target.value
                        }
                      })}
                      disabled={!editMode || !field.conditional_logic?.show_if_field}
                      className="text-xs"
                    />
                  </div>
                  {field.conditional_logic?.show_if_field && (
                    <p className="text-xs text-purple-700 mt-2">
                      This field appears only when the selected condition is met.
                    </p>
                  )}
                </div>
              )}
            </div>

            {editMode && (
              <div className="flex flex-col gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => duplicateField(index)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeField(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {template ? 'Edit Form' : 'Create New Form'}
          </h2>
          {template && (
            <p className="text-sm text-gray-600 mt-1">
              Version {template.version_number || 1} • Last edited by {template.last_edited_by || 'Unknown'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? <><Eye className="w-4 h-4 mr-2" /> Preview</> : <><Edit3 className="w-4 h-4 mr-2" /> Edit</>}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
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

      {/* Form Settings */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="form_name">Form Name *</Label>
              <Input
                id="form_name"
                value={formData.form_name}
                onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
                placeholder="e.g., Daily Opening Checklist"
                disabled={!editMode}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={!editMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="hygiene">Hygiene</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="audit">Audit</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assigned_position">Assigned Position</Label>
              <Select
                value={formData.assigned_position}
                onValueChange={(value) => setFormData({ ...formData, assigned_position: value })}
                disabled={!editMode}
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

            <div>
              <Label htmlFor="trigger_type">Trigger Type</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
                disabled={!editMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="shift_start">Shift Start</SelectItem>
                  <SelectItem value="shift_end">Shift End</SelectItem>
                  <SelectItem value="opening">Opening</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                  <SelectItem value="mid_day">Mid-Day</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what this form is for"
              disabled={!editMode}
            />
          </div>

          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.auto_assign_enabled}
                onChange={(e) => setFormData({ ...formData, auto_assign_enabled: e.target.checked })}
                disabled={!editMode}
                className="rounded"
              />
              <span className="text-sm">Enable Auto-Assignment</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requires_signature}
                onChange={(e) => setFormData({ ...formData, requires_signature: e.target.checked })}
                disabled={!editMode}
                className="rounded"
              />
              <span className="text-sm">Require Signature</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.auto_calculate_score}
                onChange={(e) => setFormData({ ...formData, auto_calculate_score: e.target.checked })}
                disabled={!editMode}
                className="rounded"
              />
              <span className="text-sm">Auto-Calculate Score</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Form Fields Editor */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Form Fields</h3>
            {editMode && (
              <Button
                onClick={addField}
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {formData.fields.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No fields added yet</p>
                {editMode && (
                  <Button
                    onClick={addField}
                    variant="outline"
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Field
                  </Button>
                )}
              </div>
            ) : (
              formData.fields.map(renderFieldEditor)
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
