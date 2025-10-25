
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  GripVertical,
  Trash2,
  Eye,
  Save,
  ArrowLeft,
  Home,
  Type,
  Hash,
  List,
  CheckSquare,
  Circle,
  ToggleLeft,
  Calendar as CalendarIcon,
  Upload,
  Camera,
  PenTool,
  Star,
  AlignLeft,
  Copy,
  Check, // Added for Yes/No buttons
  X,     // Added for Yes/No buttons
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Field Type Icons Map
const fieldIcons = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  dropdown: List,
  checkbox: CheckSquare,
  radio: Circle,
  yesno: ToggleLeft,
  date: CalendarIcon,
  file: Upload,
  photo: Camera,
  signature: PenTool,
  rating: Star,
  section_header: AlignLeft,
};

// Sortable Field Item
function SortableField({ field, onUpdate, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.field_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const FieldIcon = fieldIcons[field.field_type] || Type;

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <Card className="bg-white border-2 border-gray-200 hover:border-blue-400 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing mt-2"
            >
              <GripVertical className="w-5 h-5 text-gray-400" />
            </button>

            {/* Field Icon */}
            <div className="p-2 bg-blue-50 rounded-lg mt-1">
              <FieldIcon className="w-5 h-5 text-blue-600" />
            </div>

            {/* Field Content */}
            <div className="flex-1">
              <Input
                value={field.field_label}
                onChange={(e) => onUpdate(field.field_id, { field_label: e.target.value })}
                placeholder="Field label..."
                className="font-medium mb-2"
              />

              <Input
                value={field.field_hint || ""}
                onChange={(e) => onUpdate(field.field_id, { field_hint: e.target.value })}
                placeholder="Hint text (optional)"
                className="text-sm text-gray-600 mb-2"
              />

              {/* Options for dropdown/radio/checkbox */}
              {(field.field_type === 'dropdown' || field.field_type === 'radio' || field.field_type === 'checkbox') && (
                <div className="mt-2">
                  <Label className="text-xs text-gray-600">Options (comma-separated)</Label>
                  <Input
                    value={field.options?.join(', ') || ''}
                    onChange={(e) => onUpdate(field.field_id, {
                      options: e.target.value.split(',').map(opt => opt.trim()).filter(Boolean)
                    })}
                    placeholder="Option 1, Option 2, Option 3"
                    className="text-sm"
                  />
                </div>
              )}

              {/* Yes/No Auto-Notify Manager Option */}
              {field.field_type === 'yesno' && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold text-amber-900">⚠️ Auto-Notify Manager on "No"</Label>
                    <Switch
                      checked={field.notify_manager_on_no || false}
                      onCheckedChange={(checked) => onUpdate(field.field_id, { notify_manager_on_no: checked })}
                    />
                  </div>
                  {field.notify_manager_on_no && (
                    <p className="text-xs text-amber-700">
                      Manager will be automatically notified if user answers "No"
                    </p>
                  )}
                </div>
              )}

              {/* Required Toggle */}
              <div className="flex items-center gap-2 mt-3">
                <Switch
                  checked={field.required}
                  onCheckedChange={(checked) => onUpdate(field.field_id, { required: checked })}
                />
                <Label className="text-sm">Required field</Label>
                <Badge variant="outline" className="ml-auto">{field.field_type}</Badge>
              </div>
            </div>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(field.field_id)}
              className="text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FormBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const [formData, setFormData] = useState({
    form_name: "",
    description: "",
    category: "hygiene",
    fields: [],
    requires_signature: true,
    auto_calculate_score: false,
    passing_score: 80,
    version_number: 1,
    is_active: true,
    color_theme: "#014D40",
    icon: "📋",
  });

  const [showPreview, setShowPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: existingForm } = useQuery({
    queryKey: ['formTemplate', editId],
    queryFn: async () => {
      if (!editId) return null;
      const forms = await base44.entities.FormTemplate.list();
      return forms.find(f => f.id === editId);
    },
    enabled: !!editId,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          ...data,
          fields: data.fields || [],
        });
      }
    },
  });

  const createFormMutation = useMutation({
    mutationFn: (data) => editId 
      ? base44.entities.FormTemplate.update(editId, data)
      : base44.entities.FormTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formTemplates'] });
      navigate(createPageUrl('FormLibrary'));
    },
  });

  const addField = (fieldType) => {
    const newField = {
      field_id: `field_${Date.now()}`,
      field_type: fieldType,
      field_label: `New ${fieldType} field`,
      field_hint: "",
      options: fieldType === 'dropdown' || fieldType === 'radio' || fieldType === 'checkbox' ? [] : undefined,
      required: false,
      notify_manager_on_no: fieldType === 'yesno' ? false : undefined,
      order_index: formData.fields.length,
    };

    setFormData({
      ...formData,
      fields: [...formData.fields, newField],
    });
  };

  const updateField = (fieldId, updates) => {
    setFormData({
      ...formData,
      fields: formData.fields.map(f =>
        f.field_id === fieldId ? { ...f, ...updates } : f
      ),
    });
  };

  const removeField = (fieldId) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter(f => f.field_id !== fieldId),
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setFormData(prev => {
        const oldIndex = prev.fields.findIndex(f => f.field_id === active.id);
        const newIndex = prev.fields.findIndex(f => f.field_id === over.id);
        const reordered = arrayMove(prev.fields, oldIndex, newIndex);
        
        return {
          ...prev,
          fields: reordered.map((f, idx) => ({ ...f, order_index: idx })),
        };
      });
    }
  };

  const handleSave = () => {
    if (!formData.form_name || formData.fields.length === 0) {
      alert('Please add a form name and at least one field');
      return;
    }

    createFormMutation.mutate(formData);
  };

  const fieldTypes = [
    { type: 'text', label: 'Short Text', icon: Type },
    { type: 'textarea', label: 'Long Text / Paragraph', icon: AlignLeft },
    { type: 'number', label: 'Number', icon: Hash },
    { type: 'dropdown', label: 'Dropdown', icon: List },
    { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
    { type: 'radio', label: 'Radio Buttons', icon: Circle },
    { type: 'yesno', label: 'Yes/No Toggle', icon: ToggleLeft },
    { type: 'date', label: 'Date Picker', icon: CalendarIcon },
    { type: 'file', label: 'File Upload', icon: Upload },
    { type: 'photo', label: 'Photo Capture', icon: Camera },
    { type: 'signature', label: 'Signature', icon: PenTool },
    { type: 'rating', label: 'Star Rating', icon: Star },
    { type: 'section_header', label: 'Section Header', icon: AlignLeft },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('FormLibrary')}>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {editId ? 'Edit Form Template' : 'Create New Form'}
              </h1>
              <p className="text-gray-600">Drag and drop fields to build your form</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={createFormMutation.isPending} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              {createFormMutation.isPending ? 'Saving...' : 'Save Form'}
            </Button>
          </div>
        </div>

        {/* Builder Layout */}
        <div className="grid lg:grid-cols-[300px_1fr_300px] gap-6">
          {/* Toolbox */}
          <div className="space-y-4">
            <Card className="bg-white sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Field Toolbox
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {fieldTypes.map(({ type, label, icon: Icon }) => (
                  <Button
                    key={type}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addField(type)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Canvas */}
          <div>
            <Card className="bg-white">
              <CardHeader>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Form Name *</Label>
                    <Input
                      value={formData.form_name}
                      onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
                      placeholder="e.g., Daily Kitchen Hygiene Check"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
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
                </div>

                <div className="mt-4">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What is this form for?"
                    rows={2}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline">{formData.fields.length} fields</Badge>
                </div>

                {formData.fields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <Plus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No fields yet. Add fields from the toolbox.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={formData.fields.map(f => f.field_id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {formData.fields.map(field => (
                        <SortableField
                          key={field.field_id}
                          field={field}
                          onUpdate={updateField}
                          onRemove={removeField}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}

                {/* Submit Button Preview */}
                {formData.fields.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                    <Button className="bg-green-600 hover:bg-green-700 w-full md:w-auto" disabled>
                      <Save className="w-4 h-4 mr-2" />
                      Submit Form
                    </Button>
                    <p className="text-xs text-green-700 mt-2">
                      ✓ Submit button will appear at the end of the form
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <Card className="bg-white sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Require Signature</Label>
                  <Switch
                    checked={formData.requires_signature}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_signature: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Auto-Calculate Score</Label>
                  <Switch
                    checked={formData.auto_calculate_score}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_calculate_score: checked })}
                  />
                </div>

                {formData.auto_calculate_score && (
                  <div>
                    <Label>Passing Score (%)</Label>
                    <Input
                      type="number"
                      value={formData.passing_score}
                      onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
                      min="0"
                      max="100"
                    />
                  </div>
                )}

                <div>
                  <Label>Form Icon</Label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Emoji or icon"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Form Preview: {formData.form_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {formData.fields.map(field => (
                <div key={field.field_id} className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-base font-semibold">
                    {field.field_label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.field_hint && (
                    <p className="text-sm text-gray-600 mt-1">{field.field_hint}</p>
                  )}
                  {field.notify_manager_on_no && (
                    <Badge className="mt-1 bg-amber-100 text-amber-800">
                      ⚠️ Manager notified if "No"
                    </Badge>
                  )}
                  <div className="mt-2">
                    {field.field_type === 'text' && <Input placeholder="Text input" disabled />}
                    {field.field_type === 'textarea' && <Textarea placeholder="Long text / paragraph" disabled rows={4} />}
                    {field.field_type === 'number' && <Input type="number" placeholder="Number" disabled />}
                    {field.field_type === 'dropdown' && (
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option..." />
                        </SelectTrigger>
                      </Select>
                    )}
                    {field.field_type === 'yesno' && (
                      <div className="flex gap-4">
                        <Button variant="outline" size="sm" disabled className="flex-1 bg-green-50">
                          <Check className="w-4 h-4 mr-1" /> Yes
                        </Button>
                        <Button variant="outline" size="sm" disabled className="flex-1 bg-red-50">
                          <X className="w-4 h-4 mr-1" /> No
                        </Button>
                      </div>
                    )}
                    {field.field_type === 'photo' && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Photo capture</p>
                      </div>
                    )}
                    {field.field_type === 'signature' && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <PenTool className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Signature pad</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Submit Button in Preview */}
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Button className="bg-green-600 hover:bg-green-700 w-full" disabled>
                  <Save className="w-4 h-4 mr-2" />
                  Submit Form
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
