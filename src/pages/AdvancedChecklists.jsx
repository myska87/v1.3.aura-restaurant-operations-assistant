
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Play,
  Eye,
  GripVertical,
  Home,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function AdvancedChecklists() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("daily");
  const [viewMode, setViewMode] = useState("my-checklists"); // "my-checklists" or "templates" or "monitor"
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showHygieneGuide, setShowHygieneGuide] = useState(false); // New state for hygiene guide dialog
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    frequency: "daily",
    shift_type: "opening",
    applicable_roles: [],
    reminder_minutes: 15,
    advance_notice_days: 14, // New field for advance notice
    tasks: [],
  });
  const [newTask, setNewTask] = useState({
    description: "",
    requires_photo: false,
    requires_signature: false,
    requires_temperature: false,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ChecklistTemplate.list(),
  });

  const { data: myExecutions = [] } = useQuery({
    queryKey: ['myChecklistExecutions', user?.email],
    queryFn: () => base44.entities.ChecklistExecution.filter({
      assigned_to_email: user?.email,
      execution_date: format(new Date(), 'yyyy-MM-dd')
    }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: allExecutions = [] } = useQuery({
    queryKey: ['allChecklistExecutions'],
    queryFn: () => base44.entities.ChecklistExecution.list('-execution_date'),
  });

  const isAdmin = user?.role === 'admin';

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      resetForm();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChecklistTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      resetForm();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
    },
  });

  const createHygieneTemplate = async () => {
    const hygieneTemplate = {
      name: "6-Monthly Food Safety & Hygiene Inspection",
      description: "Comprehensive food safety checklist covering hygiene, storage, handling, pest control, and compliance",
      frequency: "six_monthly",
      shift_type: "any",
      applicable_roles: ["manager", "owner"],
      advance_notice_days: 14,
      reminder_minutes: 0,
      is_active: true,
      tasks: [
        // HYGIENE OF FOOD ROOMS & EQUIPMENT
        {
          task_id: "hygiene_1",
          description: "Are food rooms and equipment in good condition and well maintained?",
          requires_photo: true,
          requires_temperature: false,
          order: 1,
          category: "Hygiene of Food Rooms & Equipment"
        },
        {
          task_id: "hygiene_2",
          description: "Are food rooms clean and tidy and do staff clean as they go including difficult areas?",
          requires_photo: true,
          requires_temperature: false,
          order: 2,
          category: "Hygiene of Food Rooms & Equipment"
        },
        {
          task_id: "hygiene_3",
          description: "Is equipment easy to clean and kept in a clean condition?",
          requires_photo: true,
          requires_temperature: false,
          order: 3,
          category: "Hygiene of Food Rooms & Equipment"
        },
        {
          task_id: "hygiene_4",
          description: "Are all food and hand contact surfaces (work surfaces, slicers, fridge handles, probe thermometers) in good condition and cleaned/disinfected regularly?",
          requires_photo: true,
          requires_temperature: false,
          order: 4,
          category: "Hygiene of Food Rooms & Equipment"
        },
        {
          task_id: "hygiene_5",
          description: "Are suitable BS EN approved cleaning chemicals available, stored correctly, and proper cleaning methods used?",
          requires_photo: true,
          requires_temperature: false,
          order: 5,
          category: "Hygiene of Food Rooms & Equipment"
        },
        {
          task_id: "hygiene_6",
          description: "Are separate cleaning cloths used in clean areas? If re-used, are they laundered in a boil wash?",
          requires_photo: false,
          requires_temperature: false,
          order: 6,
          category: "Hygiene of Food Rooms & Equipment"
        },
        
        // FOOD STORAGE
        {
          task_id: "storage_1",
          description: "Are deliveries appropriately stored immediately?",
          requires_photo: true,
          requires_temperature: false,
          order: 7,
          category: "Food Storage"
        },
        {
          task_id: "storage_2",
          description: "Is ready-to-eat food stored above/separate from raw food in fridges and freezers?",
          requires_photo: true,
          requires_temperature: true,
          order: 8,
          category: "Food Storage"
        },
        {
          task_id: "storage_3",
          description: "Is food in fridges/freezers covered?",
          requires_photo: true,
          requires_temperature: false,
          order: 9,
          category: "Food Storage"
        },
        {
          task_id: "storage_4",
          description: "Are high risk foods date coded, codes checked daily and stock rotated?",
          requires_photo: true,
          requires_temperature: false,
          order: 10,
          category: "Food Storage"
        },
        {
          task_id: "storage_5",
          description: "Are dried goods stored correctly (suitable room, off the floor, in covered containers)?",
          requires_photo: true,
          requires_temperature: false,
          order: 11,
          category: "Food Storage"
        },
        {
          task_id: "storage_6",
          description: "Is outer packaging removed from ready-to-eat food before being placed into a clean area?",
          requires_photo: false,
          requires_temperature: false,
          order: 12,
          category: "Food Storage"
        },
        {
          task_id: "storage_7",
          description: "Are freezers working properly?",
          requires_photo: false,
          requires_temperature: true,
          order: 13,
          category: "Food Storage"
        },
        {
          task_id: "storage_8",
          description: "Are fridges and freezers defrosted regularly?",
          requires_photo: true,
          requires_temperature: false,
          order: 14,
          category: "Food Storage"
        },
        
        // FOOD HANDLING PRACTICES
        {
          task_id: "handling_1",
          description: "Are ready-to-eat foods prepared in separate clean areas?",
          requires_photo: true,
          requires_temperature: false,
          order: 15,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_2",
          description: "Are separate utensils and equipment used for ready-to-eat foods unless disinfected in a dishwasher? Is the dishwasher in good working order and regularly serviced?",
          requires_photo: true,
          requires_temperature: false,
          order: 16,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_3",
          description: "Is wrapping and packaging used for ready-to-eat food kept in the clean area?",
          requires_photo: false,
          requires_temperature: false,
          order: 17,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_4",
          description: "Do separate staff handle ready-to-eat food or are controls being followed to ensure staff change clothing and wash hands before handling ready-to-eat food?",
          requires_photo: false,
          requires_temperature: false,
          order: 18,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_5",
          description: "Is separate complex equipment provided for ready-to-eat food and located in the clean area?",
          requires_photo: true,
          requires_temperature: false,
          order: 19,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_6",
          description: "Are staff handling food as little as possible (e.g. using tongs)?",
          requires_photo: false,
          requires_temperature: false,
          order: 20,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_7",
          description: "If colour coded equipment is provided (utensils, chopping boards), is it correctly used?",
          requires_photo: true,
          requires_temperature: false,
          order: 21,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_8",
          description: "Are high risk foods prepared in small batches and placed in the fridge immediately after handling/preparation?",
          requires_photo: false,
          requires_temperature: true,
          order: 22,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_9",
          description: "Is food cooled as quickly as possible away from raw food and other sources of contamination?",
          requires_photo: false,
          requires_temperature: false,
          order: 23,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_10",
          description: "Are vegetables/fruit/salads trimmed and washed thoroughly before use unless labelled as 'ready-to-eat'?",
          requires_photo: false,
          requires_temperature: false,
          order: 24,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_11",
          description: "Are ready-to-eat foods kept separate on display and screened from customers?",
          requires_photo: true,
          requires_temperature: false,
          order: 25,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_12",
          description: "Are adequate clean utensils available for self-service?",
          requires_photo: false,
          requires_temperature: false,
          order: 26,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_13",
          description: "Are frozen foods defrosted safely?",
          requires_photo: false,
          requires_temperature: false,
          order: 27,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_14",
          description: "Are controls in place to prevent contamination by chemicals/foreign bodies (glass, packaging, bolts, rust, cleaning chemicals)?",
          requires_photo: true,
          requires_temperature: false,
          order: 28,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_15",
          description: "Are staff aware of food allergy hazards?",
          requires_photo: false,
          requires_temperature: false,
          order: 29,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_16",
          description: "Are controls being followed to ensure staff wash hands after handling raw food and before touching surfaces, such as the cash register?",
          requires_photo: false,
          requires_temperature: false,
          order: 30,
          category: "Food Handling Practices"
        },
        {
          task_id: "handling_17",
          description: "Is a separate probe thermometer used for ready-to-eat foods and properly cleaned/disinfected before use?",
          requires_photo: true,
          requires_temperature: false,
          order: 31,
          category: "Food Handling Practices"
        },
        
        // PERSONAL HYGIENE
        {
          task_id: "personal_1",
          description: "Are staff fit to work, wearing clean, suitable protective clothing and following personal hygiene rules particularly hand washing?",
          requires_photo: false,
          requires_temperature: false,
          order: 32,
          category: "Personal Hygiene"
        },
        {
          task_id: "personal_2",
          description: "Are wash hand basins clean with hot water, soap and hygienic hand drying facilities?",
          requires_photo: true,
          requires_temperature: true,
          order: 33,
          category: "Personal Hygiene"
        },
        {
          task_id: "personal_3",
          description: "Are wash hand basins used for hand washing only and is effective handwashing by staff regularly observed?",
          requires_photo: false,
          requires_temperature: false,
          order: 34,
          category: "Personal Hygiene"
        },
        {
          task_id: "personal_4",
          description: "Are staff toilets and changing facilities clean and tidy?",
          requires_photo: true,
          requires_temperature: false,
          order: 35,
          category: "Personal Hygiene"
        },
        
        // PEST CONTROL
        {
          task_id: "pest_1",
          description: "Are premises pest proofed and free from any signs of pests?",
          requires_photo: true,
          requires_temperature: false,
          order: 36,
          category: "Pest Control"
        },
        {
          task_id: "pest_2",
          description: "Where necessary, are external doors/windows fitted with suitable fly screens?",
          requires_photo: true,
          requires_temperature: false,
          order: 37,
          category: "Pest Control"
        },
        {
          task_id: "pest_3",
          description: "Are insectocutors (if provided) properly maintained?",
          requires_photo: true,
          requires_temperature: false,
          order: 38,
          category: "Pest Control"
        },
        {
          task_id: "pest_4",
          description: "Is food properly protected from risk of contamination by pests?",
          requires_photo: false,
          requires_temperature: false,
          order: 39,
          category: "Pest Control"
        },
        
        // WASTE CONTROL
        {
          task_id: "waste_1",
          description: "Is waste in food rooms stored correctly?",
          requires_photo: true,
          requires_temperature: false,
          order: 40,
          category: "Waste Control"
        },
        {
          task_id: "waste_2",
          description: "Is food waste stored correctly outside and is the refuse area kept clean?",
          requires_photo: true,
          requires_temperature: false,
          order: 41,
          category: "Waste Control"
        },
        {
          task_id: "waste_3",
          description: "Is unfit food clearly labelled and stored separately from other foods?",
          requires_photo: false,
          requires_temperature: false,
          order: 42,
          category: "Waste Control"
        },
        
        // CHECKS AND RECORD KEEPING
        {
          task_id: "records_1",
          description: "Are all checks properly taken and recorded?",
          requires_photo: true,
          requires_temperature: false,
          order: 43,
          category: "Checks and Record Keeping"
        },
        {
          task_id: "records_2",
          description: "Has appropriate corrective action been taken where necessary?",
          requires_photo: false,
          requires_temperature: false,
          order: 44,
          category: "Checks and Record Keeping"
        },
        {
          task_id: "records_3",
          description: "Are record sheets up-to-date, checked and verified?",
          requires_photo: true,
          requires_temperature: false,
          order: 45,
          category: "Checks and Record Keeping"
        },
        {
          task_id: "records_4",
          description: "Are equipment time/temperature combinations regularly cross-checked?",
          requires_photo: false,
          requires_temperature: false,
          order: 46,
          category: "Checks and Record Keeping"
        },
        
        // REVIEW
        {
          task_id: "review_1",
          description: "Any new suppliers and approved list updated?",
          requires_photo: false,
          requires_temperature: false,
          requires_signature: true,
          order: 47,
          category: "4-Weekly Review"
        },
        {
          task_id: "review_2",
          description: "Any new menu items updated?",
          requires_photo: false,
          requires_temperature: false,
          requires_signature: true,
          order: 48,
          category: "4-Weekly Review"
        },
        {
          task_id: "review_3",
          description: "Any new food handling methods or equipment updated?",
          requires_photo: false,
          requires_temperature: false,
          requires_signature: true,
          order: 49,
          category: "4-Weekly Review"
        },
        {
          task_id: "final_signature",
          description: "Final Manager Sign-off - I confirm all checks have been completed and documented",
          requires_photo: false,
          requires_temperature: false,
          requires_signature: true,
          order: 50,
          category: "Final Sign-off"
        }
      ]
    };

    await createTemplateMutation.mutateAsync(hygieneTemplate);
    setShowHygieneGuide(false);
  };

  const resetForm = () => {
    setShowTemplateForm(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      frequency: activeTab,
      shift_type: "opening",
      applicable_roles: [],
      reminder_minutes: 15,
      advance_notice_days: 14, // Reset this new field
      tasks: [],
    });
    setNewTask({
      description: "",
      requires_photo: false,
      requires_signature: false,
      requires_temperature: false,
    });
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      frequency: template.frequency,
      shift_type: template.shift_type,
      applicable_roles: template.applicable_roles || [],
      reminder_minutes: template.reminder_minutes || 15,
      advance_notice_days: template.advance_notice_days || 14, // Load this new field
      tasks: template.tasks || [],
    });
    setShowTemplateForm(true);
  };

  const handleAddTask = () => {
    if (!newTask.description.trim()) return;
    
    const task = {
      task_id: `task_${Date.now()}`,
      description: newTask.description,
      requires_photo: newTask.requires_photo,
      requires_signature: newTask.requires_signature,
      requires_temperature: newTask.requires_temperature,
      order: formData.tasks.length,
    };

    setFormData({
      ...formData,
      tasks: [...formData.tasks, task]
    });

    setNewTask({
      description: "",
      requires_photo: false,
      requires_signature: false,
      requires_temperature: false,
    });
  };

  const handleRemoveTask = (taskId) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter(t => t.task_id !== taskId)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      is_active: true,
    };

    if (editingTemplate) {
      await updateTemplateMutation.mutateAsync({ id: editingTemplate.id, data });
    } else {
      await createTemplateMutation.mutateAsync(data);
    }
  };

  const getProgress = (execution) => {
    if (!execution.tasks || execution.tasks.length === 0) return 0;
    const completed = execution.tasks.filter(t => 
      t.status === 'pass' || t.status === 'fail' || t.status === 'na'
    ).length;
    return Math.round((completed / execution.tasks.length) * 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getShiftTypeColor = (shiftType) => {
    switch (shiftType) {
      case 'opening':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'mid_shift':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'any':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'; // Color for 'any' shift
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filterByFrequency = (items, frequency) => {
    return items.filter(item => item.frequency === frequency);
  };

  const filterExecutionsByFrequency = (executions, frequency) => {
    return executions.filter(exec => {
      const template = templates.find(t => t.id === exec.template_id);
      return template?.frequency === frequency;
    });
  };

  const stats = {
    total: myExecutions.length,
    completed: myExecutions.filter(e => e.status === 'completed').length,
    inProgress: myExecutions.filter(e => e.status === 'in_progress').length,
    overdue: myExecutions.filter(e => e.status === 'overdue').length,
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Checklists</h1>
          <p className="text-gray-600">Manage daily, weekly, monthly, 6-monthly and yearly checklists</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-600">Total Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                  <p className="text-xs text-gray-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Play className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                  <p className="text-xs text-gray-600">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
                  <p className="text-xs text-gray-600">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-3 mb-6">
          <Button
            variant={viewMode === 'my-checklists' ? 'default' : 'outline'}
            onClick={() => setViewMode('my-checklists')}
          >
            My Checklists
          </Button>
          {isAdmin && (
            <>
              <Button
                variant={viewMode === 'templates' ? 'default' : 'outline'}
                onClick={() => setViewMode('templates')}
              >
                Templates
              </Button>
              <Button
                variant={viewMode === 'monitor' ? 'default' : 'outline'}
                onClick={() => setViewMode('monitor')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Monitor All
              </Button>
            </>
          )}
        </div>

        {/* Hygiene Template Quick Create */}
        {isAdmin && viewMode === 'templates' && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-900 mb-1">
                    🧼 Quick Setup: 6-Monthly Hygiene Inspection
                  </h3>
                  <p className="text-sm text-green-700">
                    Comprehensive food safety checklist with 50 inspection points (assigned to managers only)
                  </p>
                </div>
                <Button 
                  onClick={() => setShowHygieneGuide(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hygiene Template Preview Dialog */}
        <Dialog open={showHygieneGuide} onOpenChange={setShowHygieneGuide}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>6-Monthly Food Safety & Hygiene Inspection Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Template Details</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>✓ Frequency: Every 6 months</li>
                  <li>✓ Assigned to: Managers and Owners only</li>
                  <li>✓ Advance Notice: Appears 2 weeks before due date</li>
                  <li>✓ Tasks: 50 comprehensive food safety checks</li>
                  <li>✓ Auto-creates maintenance tickets for failed items</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Inspection Categories Include:</h4>
                <div className="grid gap-2">
                  {[
                    "🏠 Hygiene of Food Rooms & Equipment (6 checks)",
                    "📦 Food Storage (8 checks)",
                    "🍴 Food Handling Practices (17 checks)",
                    "🧼 Personal Hygiene (4 checks)",
                    "🐛 Pest Control (4 checks)",
                    "🗑️ Waste Control (3 checks)",
                    "📝 Checks and Record Keeping (4 checks)",
                    "🔄 4-Weekly Review (3 checks)",
                    "✍️ Final Manager Sign-off (1 signature)"
                  ].map((category, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{category}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2">🚨 Intelligent Failure Handling</h4>
                <ul className="space-y-1 text-sm text-red-800">
                  <li>• Any "FAIL" answer automatically creates a maintenance ticket</li>
                  <li>• Ticket is flagged as "urgent" priority</li>
                  <li>• Photos and notes are attached to the ticket</li>
                  <li>• Manager is notified immediately</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowHygieneGuide(false)}>
                  Cancel
                </Button>
                <Button onClick={createHygieneTemplate} className="bg-green-600 hover:bg-green-700">
                  Create This Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tabs for Frequency */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl mb-8"> {/* Changed to grid-cols-5 */}
            <TabsTrigger value="daily">📅 Daily</TabsTrigger>
            <TabsTrigger value="weekly">📆 Weekly</TabsTrigger>
            <TabsTrigger value="monthly">🗓️ Monthly</TabsTrigger>
            <TabsTrigger value="six_monthly">🧼 6 Months</TabsTrigger> {/* New Tab */}
            <TabsTrigger value="yearly">📊 Yearly</TabsTrigger>
          </TabsList>

          {/* Daily Tab */}
          <TabsContent value="daily">
            {viewMode === 'my-checklists' && (
              <MyChecklistsView
                executions={filterExecutionsByFrequency(myExecutions, 'daily')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
                navigate={navigate}
              />
            )}

            {viewMode === 'templates' && isAdmin && (
              <TemplatesView
                templates={filterByFrequency(templates, 'daily')}
                showForm={showTemplateForm}
                setShowForm={setShowTemplateForm}
                formData={formData}
                setFormData={setFormData}
                newTask={newTask}
                setNewTask={setNewTask}
                handleAddTask={handleAddTask}
                handleRemoveTask={handleRemoveTask}
                handleSubmit={handleSubmit}
                handleEdit={handleEdit}
                handleDelete={(id) => deleteTemplateMutation.mutate(id)}
                getShiftTypeColor={getShiftTypeColor}
                editingTemplate={editingTemplate}
                resetForm={resetForm}
                frequency="daily"
              />
            )}

            {viewMode === 'monitor' && isAdmin && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'daily')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}
          </TabsContent>

          {/* Weekly Tab */}
          <TabsContent value="weekly">
            {viewMode === 'my-checklists' && (
              <MyChecklistsView
                executions={filterExecutionsByFrequency(myExecutions, 'weekly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
                navigate={navigate}
              />
            )}

            {viewMode === 'templates' && isAdmin && (
              <TemplatesView
                templates={filterByFrequency(templates, 'weekly')}
                showForm={showTemplateForm}
                setShowForm={setShowTemplateForm}
                formData={formData}
                setFormData={setFormData}
                newTask={newTask}
                setNewTask={setNewTask}
                handleAddTask={handleAddTask}
                handleRemoveTask={handleRemoveTask}
                handleSubmit={handleSubmit}
                handleEdit={handleEdit}
                handleDelete={(id) => deleteTemplateMutation.mutate(id)}
                getShiftTypeColor={getShiftTypeColor}
                editingTemplate={editingTemplate}
                resetForm={resetForm}
                frequency="weekly"
              />
            )}

            {viewMode === 'monitor' && isAdmin && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'weekly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}
          </TabsContent>

          {/* Monthly Tab */}
          <TabsContent value="monthly">
            {viewMode === 'my-checklists' && (
              <MyChecklistsView
                executions={filterExecutionsByFrequency(myExecutions, 'monthly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
                navigate={navigate}
              />
            )}

            {viewMode === 'templates' && isAdmin && (
              <TemplatesView
                templates={filterByFrequency(templates, 'monthly')}
                showForm={showTemplateForm}
                setShowForm={setShowTemplateForm}
                formData={formData}
                setFormData={setFormData}
                newTask={newTask}
                setNewTask={setNewTask}
                handleAddTask={handleAddTask}
                handleRemoveTask={handleRemoveTask}
                handleSubmit={handleSubmit}
                handleEdit={handleEdit}
                handleDelete={(id) => deleteTemplateMutation.mutate(id)}
                getShiftTypeColor={getShiftTypeColor}
                editingTemplate={editingTemplate}
                resetForm={resetForm}
                frequency="monthly"
              />
            )}

            {viewMode === 'monitor' && isAdmin && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'monthly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}
          </TabsContent>

          {/* 6-Monthly Tab */}
          <TabsContent value="six_monthly">
            {viewMode === 'my-checklists' && (
              <MyChecklistsView
                executions={filterExecutionsByFrequency(myExecutions, 'six_monthly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
                navigate={navigate}
              />
            )}

            {viewMode === 'templates' && isAdmin && (
              <TemplatesView
                templates={filterByFrequency(templates, 'six_monthly')}
                showForm={showTemplateForm}
                setShowForm={setShowTemplateForm}
                formData={formData}
                setFormData={setFormData}
                newTask={newTask}
                setNewTask={setNewTask}
                handleAddTask={handleAddTask}
                handleRemoveTask={handleRemoveTask}
                handleSubmit={handleSubmit}
                handleEdit={handleEdit}
                handleDelete={(id) => deleteTemplateMutation.mutate(id)}
                getShiftTypeColor={getShiftTypeColor}
                editingTemplate={editingTemplate}
                resetForm={resetForm}
                frequency="six_monthly"
              />
            )}

            {viewMode === 'monitor' && isAdmin && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'six_monthly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}
          </TabsContent>

          {/* Yearly Tab */}
          <TabsContent value="yearly">
            {viewMode === 'my-checklists' && (
              <MyChecklistsView
                executions={filterExecutionsByFrequency(myExecutions, 'yearly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
                navigate={navigate}
              />
            )}

            {viewMode === 'templates' && isAdmin && (
              <TemplatesView
                templates={filterByFrequency(templates, 'yearly')}
                showForm={showTemplateForm}
                setShowForm={setShowTemplateForm}
                formData={formData}
                setFormData={setFormData}
                newTask={newTask}
                setNewTask={setNewTask}
                handleAddTask={handleAddTask}
                handleRemoveTask={handleRemoveTask}
                handleSubmit={handleSubmit}
                handleEdit={handleEdit}
                handleDelete={(id) => deleteTemplateMutation.mutate(id)}
                getShiftTypeColor={getShiftTypeColor}
                editingTemplate={editingTemplate}
                resetForm={resetForm}
                frequency="yearly"
              />
            )}

            {viewMode === 'monitor' && isAdmin && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'yearly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// My Checklists View Component
function MyChecklistsView({ executions, getProgress, getStatusColor, getShiftTypeColor, navigate }) {
  if (executions.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No checklists assigned for this frequency</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {executions.map((execution) => {
        const progress = getProgress(execution);
        return (
          <motion.div
            key={execution.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {execution.template_name}
                  </CardTitle>
                  {execution.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={getShiftTypeColor(execution.shift_type)}>
                    {execution.shift_type?.replace(/_/g, ' ')}
                  </Badge>
                  <Badge className={getStatusColor(execution.status)}>
                    {execution.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-900">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>{execution.tasks?.length || 0} tasks</p>
                    {execution.started_at && (
                      <p className="text-xs mt-1">
                        Started: {format(new Date(execution.started_at), 'h:mm a')}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => navigate(createPageUrl(`ExecuteChecklist?id=${execution.id}`))}
                    className="w-full"
                    variant={execution.status === 'completed' ? 'outline' : 'default'}
                  >
                    {execution.status === 'completed' ? 'View' : progress > 0 ? 'Continue' : 'Start Checklist'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

// Templates View Component
function TemplatesView({
  templates,
  showForm,
  setShowForm,
  formData,
  setFormData,
  newTask,
  setNewTask,
  handleAddTask,
  handleRemoveTask,
  handleSubmit,
  handleEdit,
  handleDelete,
  getShiftTypeColor,
  editingTemplate,
  resetForm,
  frequency
}) {
  return (
    <div>
      <div className="flex justify-end mb-6">
        <Dialog open={showForm} onOpenChange={(open) => {
          if (!open) {
            resetForm();
            setShowForm(false); // Explicitly set showForm to false when dialog closes
          } else {
            setShowForm(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New {frequency.charAt(0).toUpperCase() + frequency.slice(1).replace(/_/, ' ')} Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : `Create ${frequency.charAt(0).toUpperCase() + frequency.slice(1).replace(/_/, ' ')} Checklist Template`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Opening Kitchen Routine"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shift_type">Shift Phase</Label>
                  <Select
                    value={formData.shift_type}
                    onValueChange={(value) => setFormData({ ...formData, shift_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening">Opening Shift</SelectItem>
                      <SelectItem value="mid_shift">Mid-Shift</SelectItem>
                      <SelectItem value="closing">Closing Shift</SelectItem>
                      <SelectItem value="any">Any Shift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminder_minutes">Reminder (minutes after shift start)</Label>
                  <Input
                    id="reminder_minutes"
                    type="number"
                    value={formData.reminder_minutes}
                    onChange={(e) => setFormData({ ...formData, reminder_minutes: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advance_notice_days">Advance Notice (days before due)</Label>
                  <Input
                    id="advance_notice_days"
                    type="number"
                    value={formData.advance_notice_days}
                    onChange={(e) => setFormData({ ...formData, advance_notice_days: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Tasks Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Tasks</Label>
                  <span className="text-sm text-gray-500">{formData.tasks.length} tasks</span>
                </div>

                {/* Add Task Form */}
                <Card className="bg-gray-50">
                  <CardContent className="p-4 space-y-3">
                    <Input
                      placeholder="Task description..."
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                    />
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="requires_photo"
                          checked={newTask.requires_photo}
                          onCheckedChange={(checked) => setNewTask({ ...newTask, requires_photo: checked })}
                        />
                        <Label htmlFor="requires_photo" className="text-sm cursor-pointer">
                          Requires Photo
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="requires_temperature"
                          checked={newTask.requires_temperature}
                          onCheckedChange={(checked) => setNewTask({ ...newTask, requires_temperature: checked })}
                        />
                        <Label htmlFor="requires_temperature" className="text-sm cursor-pointer">
                          Requires Temperature
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="requires_signature"
                          checked={newTask.requires_signature}
                          onCheckedChange={(checked) => setNewTask({ ...newTask, requires_signature: checked })}
                        />
                        <Label htmlFor="requires_signature" className="text-sm cursor-pointer">
                          Requires Signature
                        </Label>
                      </div>
                    </div>
                    <Button type="button" onClick={handleAddTask} size="sm" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  </CardContent>
                </Card>

                {/* Tasks List */}
                {formData.tasks.length > 0 && (
                  <div className="space-y-2">
                    {formData.tasks.map((task, index) => (
                      <Card key={task.task_id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              <GripVertical className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-gray-900">{index + 1}. {task.description}</p>
                                  <div className="flex gap-2 mt-1">
                                    {task.requires_photo && (
                                      <Badge variant="outline" className="text-xs">📸 Photo</Badge>
                                    )}
                                    {task.requires_temperature && (
                                      <Badge variant="outline" className="text-xs">🌡️ Temp</Badge>
                                    )}
                                    {task.requires_signature && (
                                      <Badge variant="outline" className="text-xs">✍️ Sign</Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveTask(task.task_id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={formData.tasks.length === 0}
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.length === 0 ? (
          <div className="col-span-full">
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No {frequency.replace(/_/, ' ')} templates created yet</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                      {template.name}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getShiftTypeColor(template.shift_type)}>
                        {template.shift_type?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline">
                        {template.frequency?.replace(/_/, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this template?')) {
                          handleDelete(template.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {template.description && (
                    <p className="text-gray-600">{template.description}</p>
                  )}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">{template.tasks?.length || 0}</span> tasks
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      Reminder: {template.reminder_minutes || 15} min after shift start
                    </p>
                    {template.advance_notice_days > 0 && (
                      <p className="text-gray-600 text-xs">
                        Visible {template.advance_notice_days} days before due
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Monitor View Component
function MonitorView({ executions, getProgress, getStatusColor, getShiftTypeColor }) {
  if (executions.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">No checklist executions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {executions.map((execution) => {
        const progress = getProgress(execution);
        return (
          <Card key={execution.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {execution.template_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Assigned to: <span className="font-medium text-gray-900">{execution.assigned_to_name}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getStatusColor(execution.status)}>
                        {execution.status?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className={getShiftTypeColor(execution.shift_type)}>
                        {execution.shift_type?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-900">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                    <p>Date: {format(new Date(execution.execution_date), 'PPP')}</p>
                    {execution.started_at && (
                      <p>Started: {format(new Date(execution.started_at), 'h:mm a')}</p>
                    )}
                    {execution.completed_at && (
                      <p className="text-green-600">
                        Completed: {format(new Date(execution.completed_at), 'h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
