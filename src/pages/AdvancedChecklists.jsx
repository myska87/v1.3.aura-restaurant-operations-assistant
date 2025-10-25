
import React, { useState, useEffect } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch"; // New import for Switch
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
  Camera,
  Thermometer,
  Signature,
  ArrowLeft,
  X,
  Image,
  Upload,
  RotateCw,
  Check,
  Ban,
  ChevronUp,
  ChevronDown,
  PenTool,
  Save, // New import for Save icon
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  const [newTask, setNewTask] = useState(""); // Changed from object to string
  const [statusFilterFromStats, setStatusFilterFromStats] = useState('all'); // New state for filtering from stats cards

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Check if user is admin or owner
  const isAdmin = user?.role === 'admin';
  const isOwner = user?.position === 'owner';
  const hasFullAccess = isAdmin || isOwner;

  const { data: templates = [] } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: () => base44.entities.ChecklistTemplate.list(),
    enabled: hasFullAccess, // Only fetch if admin/owner
  });

  const { data: myExecutions = [] } = useQuery({
    queryKey: ['myChecklistExecutions', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      // Get all executions assigned to current user (not just today)
      const allExecutions = await base44.entities.ChecklistExecution.list('-execution_date');
      
      // Filter by user email
      return allExecutions.filter(exec => exec.assigned_to_email === user.email);
    },
    enabled: !!user?.email,
  });

  const { data: allExecutions = [] } = useQuery({
    queryKey: ['allChecklistExecutions'],
    queryFn: () => base44.entities.ChecklistExecution.list('-execution_date'),
  });

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
    try {
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
            category: "Hygiene of Food Rooms & Equipment",
            field_type: 'standard',
          },
          {
            task_id: "hygiene_2",
            description: "Are food rooms clean and tidy and do staff clean as they go including difficult areas?",
            requires_photo: true,
            requires_temperature: false,
            order: 2,
            category: "Hygiene of Food Rooms & Equipment",
            field_type: 'standard',
          },
          {
            task_id: "hygiene_3",
            description: "Is equipment easy to clean and kept in a clean condition?",
            requires_photo: true,
            requires_temperature: false,
            order: 3,
            category: "Hygiene of Food Rooms & Equipment",
            field_type: 'standard',
          },
          {
            task_id: "hygiene_4",
            description: "Are all food and hand contact surfaces (work surfaces, slicers, fridge handles, probe thermometers) in good condition and cleaned/disinfected regularly?",
            requires_photo: true,
            requires_temperature: false,
            order: 4,
            category: "Hygiene of Food Rooms & Equipment",
            field_type: 'standard',
          },
          {
            task_id: "hygiene_5",
            description: "Are suitable BS EN approved cleaning chemicals available, stored correctly, and proper cleaning methods used?",
            requires_photo: true,
            requires_temperature: false,
            order: 5,
            category: "Hygiene of Food Rooms & Equipment",
            field_type: 'standard',
          },
          {
            task_id: "hygiene_6",
            description: "Are separate cleaning cloths used in clean areas? If re-used, are they laundered in a boil wash?",
            requires_photo: false,
            requires_temperature: false,
            order: 6,
            category: "Hygiene of Food Rooms & Equipment",
            field_type: 'standard',
          },
          
          // FOOD STORAGE
          {
            task_id: "storage_1",
            description: "Are deliveries appropriately stored immediately?",
            requires_photo: true,
            requires_temperature: false,
            order: 7,
            category: "Food Storage",
            field_type: 'standard',
          },
          {
            task_id: "storage_2",
            description: "Is ready-to-eat food stored above/separate from raw food in fridges and freezers?",
            requires_photo: true,
            requires_temperature: true,
            order: 8,
            category: "Food Storage",
            field_type: 'standard',
          },
          {
            task_id: "storage_3",
            description: "Is food in fridges/freezers covered?",
            requires_photo: true,
            requires_temperature: false,
            order: 9,
            category: "Food Storage",
            field_type: 'standard',
          },
          {
            task_id: "storage_4",
            description: "Are high risk foods date coded, codes checked daily and stock rotated?",
            requires_photo: true,
            requires_temperature: false,
            order: 10,
            category: "Food Storage",
            field_type: 'standard',
          },
          {
            task_id: "storage_5",
            description: "Are dried goods stored correctly (suitable room, off the floor, in covered containers)?",
            requires_photo: true,
            requires_temperature: false,
            order: 11,
            category: "Food Storage",
            field_type: 'standard',
          },
          {
            task_id: "storage_6",
            description: "Is outer packaging removed from ready-to-eat food before being placed into a clean area?",
            requires_photo: false,
            requires_temperature: false,
            order: 12,
            category: "Food Storage",
            field_type: 'standard',
          },
          {
            task_id: "storage_7",
            description: "Are freezers working properly?",
            requires_photo: false,
            requires_temperature: true,
            order: 13,
            category: "Food Storage",
            field_type: 'standard',
          },
          {
            task_id: "storage_8",
            description: "Are fridges and freezers defrosted regularly?",
            requires_photo: true,
            requires_temperature: false,
            order: 14,
            category: "Food Storage",
            field_type: 'standard',
          },
          
          // FOOD HANDLING PRACTICES
          {
            task_id: "handling_1",
            description: "Are ready-to-eat foods prepared in separate clean areas?",
            requires_photo: true,
            requires_temperature: false,
            order: 15,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_2",
            description: "Are separate utensils and equipment used for ready-to-eat foods unless disinfected in a dishwasher? Is the dishwasher in good working order and regularly serviced?",
            requires_photo: true,
            requires_temperature: false,
            order: 16,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_3",
            description: "Is wrapping and packaging used for ready-to-eat food kept in the clean area?",
            requires_photo: false,
            requires_temperature: false,
            order: 17,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_4",
            description: "Do separate staff handle ready-to-eat food or are controls being followed to ensure staff change clothing and wash hands before handling ready-to-eat food?",
            requires_photo: false,
            requires_temperature: false,
            order: 18,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_5",
            description: "Is separate complex equipment provided for ready-to-eat food and located in the clean area?",
            requires_photo: true,
            requires_temperature: false,
            order: 19,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_6",
            description: "Are staff handling food as little as possible (e.g., using tongs)?",
            requires_photo: false,
            requires_temperature: false,
            order: 20,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_7",
            description: "If colour coded equipment is provided (utensils, chopping boards), is it correctly used?",
            requires_photo: true,
            requires_temperature: false,
            order: 21,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_8",
            description: "Are high risk foods prepared in small batches and placed in the fridge immediately after handling/preparation?",
            requires_photo: false,
            requires_temperature: true,
            order: 22,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_9",
            description: "Is food cooled as quickly as possible away from raw food and other sources of contamination?",
            requires_photo: false,
            requires_temperature: false,
            order: 23,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_10",
            description: "Are vegetables/fruit/salads trimmed and washed thoroughly before use unless labelled as 'ready-to-eat'?",
            requires_photo: false,
            requires_temperature: false,
            order: 24,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_11",
            description: "Are ready-to-eat foods kept separate on display and screened from customers?",
            requires_photo: true,
            requires_temperature: false,
            order: 25,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_12",
            description: "Are adequate clean utensils available for self-service?",
            requires_photo: false,
            requires_temperature: false,
            order: 26,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_13",
            description: "Are frozen foods defrosted safely?",
            requires_photo: false,
            requires_temperature: false,
            order: 27,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_14",
            description: "Are controls in place to prevent contamination by chemicals/foreign bodies (glass, packaging, bolts, rust, cleaning chemicals)?",
            requires_photo: true,
            requires_temperature: false,
            order: 28,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_15",
            description: "Are staff aware of food allergy hazards?",
            requires_photo: false,
            requires_temperature: false,
            order: 29,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_16",
            description: "Are controls being followed to ensure staff wash hands after handling raw food and before touching surfaces, such as the cash register?",
            requires_photo: false,
            requires_temperature: false,
            order: 30,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          {
            task_id: "handling_17",
            description: "Is a separate probe thermometer used for ready-to-eat foods and properly cleaned/disinfected before use?",
            requires_photo: true,
            requires_temperature: false,
            order: 31,
            category: "Food Handling Practices",
            field_type: 'standard',
          },
          
          // PERSONAL HYGIENE
          {
            task_id: "personal_1",
            description: "Are staff fit to work, wearing clean, suitable protective clothing and following personal hygiene rules particularly hand washing?",
            requires_photo: false,
            requires_temperature: false,
            order: 32,
            category: "Personal Hygiene",
            field_type: 'standard',
          },
          {
            task_id: "personal_2",
            description: "Are wash hand basins clean with hot water, soap and hygienic hand drying facilities?",
            requires_photo: true,
            requires_temperature: true,
            order: 33,
            category: "Personal Hygiene",
            field_type: 'standard',
          },
          {
            task_id: "personal_3",
            description: "Are wash hand basins used for hand washing only and is effective handwashing by staff regularly observed?",
            requires_photo: false,
            requires_temperature: false,
            order: 34,
            category: "Personal Hygiene",
            field_type: 'standard',
          },
          {
            task_id: "personal_4",
            description: "Are staff toilets and changing facilities clean and tidy?",
            requires_photo: true,
            requires_temperature: false,
            order: 35,
            category: "Personal Hygiene",
            field_type: 'standard',
          },
          
          // PEST CONTROL
          {
            task_id: "pest_1",
            description: "Are premises pest proofed and free from any signs of pests?",
            requires_photo: true,
            requires_temperature: false,
            order: 36,
            category: "Pest Control",
            field_type: 'standard',
          },
          {
            task_id: "pest_2",
            description: "Where necessary, are external doors/windows fitted with suitable fly screens?",
            requires_photo: true,
            requires_temperature: false,
            order: 37,
            category: "Pest Control",
            field_type: 'standard',
          },
          {
            task_id: "pest_3",
            description: "Are insectocutors (if provided) properly maintained?",
            requires_photo: true,
            requires_temperature: false,
            order: 38,
            category: "Pest Control",
            field_type: 'standard',
          },
          {
            task_id: "pest_4",
            description: "Is food properly protected from risk of contamination by pests?",
            requires_photo: false,
            requires_temperature: false,
            order: 39,
            category: "Pest Control",
            field_type: 'standard',
          },
          
          // WASTE CONTROL
          {
            task_id: "waste_1",
            description: "Is waste in food rooms stored correctly?",
            requires_photo: true,
            requires_temperature: false,
            order: 40,
            category: "Waste Control",
            field_type: 'standard',
          },
          {
            task_id: "waste_2",
            description: "Is food waste stored correctly outside and is the refuse area kept clean?",
            requires_photo: true,
            requires_temperature: false,
            order: 41,
            category: "Waste Control",
            field_type: 'standard',
          },
          {
            task_id: "waste_3",
            description: "Is unfit food clearly labelled and stored separately from other foods?",
            requires_photo: false,
            requires_temperature: false,
            order: 42,
            category: "Waste Control",
            field_type: 'standard',
          },
          
          // CHECKS AND RECORD KEEPING
          {
            task_id: "records_1",
            description: "Are all checks properly taken and recorded?",
            requires_photo: true,
            requires_temperature: false,
            order: 43,
            category: "Checks and Record Keeping",
            field_type: 'standard',
          },
          {
            task_id: "records_2",
            description: "Has appropriate corrective action been taken where necessary?",
            requires_photo: false,
            requires_temperature: false,
            order: 44,
            category: "Checks and Record Keeping",
            field_type: 'standard',
          },
          {
            task_id: "records_3",
            description: "Are record sheets up-to-date, checked and verified?",
            requires_photo: true,
            requires_temperature: false,
            order: 45,
            category: "Checks and Record Keeping",
            field_type: 'standard',
          },
          {
            task_id: "records_4",
            description: "Are equipment time/temperature combinations regularly cross-checked?",
            requires_photo: false,
            requires_temperature: false,
            order: 46,
            category: "Checks and Record Keeping",
            field_type: 'standard',
          },
          
          // REVIEW
          {
            task_id: "review_1",
            description: "Any new suppliers and approved list updated?",
            requires_photo: false,
            requires_temperature: false,
            requires_signature: true,
            order: 47,
            category: "4-Weekly Review",
            field_type: 'standard',
          },
          {
            task_id: "review_2",
            description: "Any new menu items updated?",
            requires_photo: false,
            requires_temperature: false,
            requires_signature: true,
            order: 48,
            category: "4-Weekly Review",
            field_type: 'standard',
          },
          {
            task_id: "review_3",
            description: "Any new food handling methods or equipment updated?",
            requires_photo: false,
            requires_temperature: false,
            requires_signature: true,
            order: 49,
            category: "4-Weekly Review",
            field_type: 'standard',
          },
          {
            task_id: "final_signature",
            description: "Final Manager Sign-off - I confirm all checks have been completed and documented",
            requires_photo: false,
            requires_temperature: false,
            requires_signature: true,
            order: 50,
            category: "Final Sign-off",
            field_type: 'standard',
          }
        ]
      };

      await createTemplateMutation.mutateAsync(hygieneTemplate);
      setShowHygieneGuide(false);
      alert('✅ Hygiene template created successfully!');
    } catch (error) {
      console.error("Error creating hygiene template:", error);
      alert('❌ Failed to create template. Please try again.');
    }
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
    setNewTask(""); // Changed from object to string
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
    if (!newTask.trim()) return;
    
    const task = {
      task_id: `task_${Date.now()}`,
      description: newTask.trim(),
      requires_photo: false, // Default to false, editable per task
      requires_signature: false, // Default to false, editable per task
      requires_temperature: false, // Default to false, editable per task
      field_type: 'standard', // Can be 'standard', 'text_input', 'yesno'
      order: formData.tasks.length,
    };

    setFormData({
      ...formData,
      tasks: [...formData.tasks, task]
    });

    setNewTask(""); // Clear new task input
  };

  const handleRemoveTask = (taskId) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter(t => t.task_id !== taskId)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Template Name is required.");
      return;
    }
    if (formData.tasks.length === 0) {
      alert("At least one task is required.");
      return;
    }

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
    
    const totalAnswerableTasks = execution.tasks.filter(task => 
      task.field_type !== 'text_input' && !task.requires_signature
    ).length;

    if (totalAnswerableTasks === 0) {
      // If there are no 'standard' or 'yesno' tasks, consider progress based on signature/text tasks
      const completedNonStandard = execution.tasks.filter(task =>
        (task.field_type === 'text_input' && task.text_input_value) ||
        (task.requires_signature && task.signature)
      ).length;
      return execution.tasks.length > 0 ? Math.round((completedNonStandard / execution.tasks.length) * 100) : 0;
    }

    const completedStandardTasks = execution.tasks.filter(task =>
      (task.field_type === 'standard' && ['pass', 'fail', 'na'].includes(task.status)) ||
      (task.field_type === 'yesno' && ['yes', 'no'].includes(task.status))
    ).length;

    return Math.round((completedStandardTasks / totalAnswerableTasks) * 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'not_started':
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const today = new Date();
  today.setHours(0,0,0,0);
  const stats = {
    total: myExecutions.length,
    completed: myExecutions.filter(e => e.status === 'completed').length,
    inProgress: myExecutions.filter(e => e.status === 'in_progress').length,
    overdue: myExecutions.filter(e => {
      const execDate = new Date(e.execution_date);
      execDate.setHours(0,0,0,0);
      return execDate < today && e.status !== 'completed';
    }).length,
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
          <Card 
            className="bg-white cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-gray-500"
            onClick={() => {
              setViewMode('my-checklists');
              setStatusFilterFromStats('all');
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-600">Total Assigned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500"
            onClick={() => {
              setViewMode('my-checklists');
              setStatusFilterFromStats('completed');
            }}
          >
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

          <Card 
            className="bg-white cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500"
            onClick={() => {
              setViewMode('my-checklists');
              setStatusFilterFromStats('in_progress');
            }}
          >
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

          <Card 
            className="bg-white cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500"
            onClick={() => {
              setViewMode('my-checklists');
              setStatusFilterFromStats('overdue');
            }}
          >
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
          {hasFullAccess && (
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

        {/* Quick Test Button for Admins */}
        {hasFullAccess && viewMode === 'templates' && (
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-purple-900 mb-1">
                    🧪 Test Checklist Execution
                  </h3>
                  <p className="text-sm text-purple-700">
                    Create a test checklist execution assigned to yourself to see how it works
                  </p>
                </div>
                <Button 
                  onClick={async () => {
                    const hygieneTemplate = templates.find(t => t.name.includes('Hygiene'));
                    if (!hygieneTemplate) {
                      alert('Please create the Hygiene template first!');
                      return;
                    }
                    
                    // Create a test execution
                    const testExecution = {
                      template_id: hygieneTemplate.id,
                      template_name: hygieneTemplate.name,
                      shift_type: 'any',
                      execution_date: format(new Date(), 'yyyy-MM-dd'),
                      assigned_to_email: user?.email,
                      assigned_to_name: user?.full_name,
                      status: 'not_started',
                      tasks: hygieneTemplate.tasks.map(t => ({
                        ...t,
                        status: 'pending'
                      })),
                    };
                    
                    try {
                      await base44.entities.ChecklistExecution.create(testExecution);
                      await queryClient.invalidateQueries({ queryKey: ['myChecklistExecutions'] });
                      
                      // Automatically switch to My Checklists view
                      setViewMode('my-checklists');
                      
                      // Scroll to top smoothly
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } catch (error) {
                      console.error("Error creating test execution:", error);
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Test Execution
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hygiene Template Quick Create */}
        {hasFullAccess && viewMode === 'templates' && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="lg font-semibold text-green-900 mb-1">
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
                statusFilterProp={statusFilterFromStats}
                setStatusFilterProp={setStatusFilterFromStats}
              />
            )}

            {viewMode === 'templates' && hasFullAccess && (
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

            {viewMode === 'monitor' && hasFullAccess && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'daily')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}

            {/* Show access denied if trying to access restricted views */}
            {!hasFullAccess && viewMode !== 'my-checklists' && (
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-800">Access Restricted</p>
                  <p className="text-gray-600 mt-2">
                    Only administrators and owners can access this section.
                  </p>
                </CardContent>
              </Card>
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
                statusFilterProp={statusFilterFromStats}
                setStatusFilterProp={setStatusFilterFromStats}
              />
            )}

            {viewMode === 'templates' && hasFullAccess && (
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

            {viewMode === 'monitor' && hasFullAccess && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'weekly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}

            {!hasFullAccess && viewMode !== 'my-checklists' && (
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-800">Access Restricted</p>
                  <p className="text-gray-600 mt-2">
                    Only administrators and owners can access this section.
                  </p>
                </CardContent>
              </Card>
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
                statusFilterProp={statusFilterFromStats}
                setStatusFilterProp={setStatusFilterFromStats}
              />
            )}

            {viewMode === 'templates' && hasFullAccess && (
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

            {viewMode === 'monitor' && hasFullAccess && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'monthly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}

            {!hasFullAccess && viewMode !== 'my-checklists' && (
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-800">Access Restricted</p>
                  <p className="text-gray-600 mt-2">
                    Only administrators and owners can access this section.
                  </p>
                </CardContent>
              </Card>
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
                statusFilterProp={statusFilterFromStats}
                setStatusFilterProp={setStatusFilterFromStats}
              />
            )}

            {viewMode === 'templates' && hasFullAccess && (
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

            {viewMode === 'monitor' && hasFullAccess && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'six_monthly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}

            {!hasFullAccess && viewMode !== 'my-checklists' && (
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-800">Access Restricted</p>
                  <p className="text-gray-600 mt-2">
                    Only administrators and owners can access this section.
                  </p>
                </CardContent>
              </Card>
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
                statusFilterProp={statusFilterFromStats}
                setStatusFilterProp={setStatusFilterFromStats}
              />
            )}

            {viewMode === 'templates' && hasFullAccess && (
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

            {viewMode === 'monitor' && hasFullAccess && (
              <MonitorView
                executions={filterExecutionsByFrequency(allExecutions, 'yearly')}
                getProgress={getProgress}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
              />
            )}

            {!hasFullAccess && viewMode !== 'my-checklists' && (
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-800">Access Restricted</p>
                  <p className="text-gray-600 mt-2">
                    Only administrators and owners can access this section.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// My Checklists View Component
function MyChecklistsView({ executions, getProgress, getStatusColor, getShiftTypeColor, navigate, statusFilterProp, setStatusFilterProp }) {
  const [dateFilter, setDateFilter] = useState('all'); // 'today', 'week', 'all'
  // Use props for statusFilter, allowing parent to control it
  const statusFilter = statusFilterProp;
  const setStatusFilter = setStatusFilterProp;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredExecutions = executions.filter(exec => {
    const execDate = new Date(exec.execution_date);
    execDate.setHours(0, 0, 0, 0);
    
    // Date filtering
    let dateMatch = true;
    if (dateFilter === 'today') {
      dateMatch = execDate.getTime() === today.getTime();
    } else if (dateFilter === 'week') {
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      dateMatch = execDate >= today && execDate <= weekFromNow;
    }
    
    // Status filtering
    let statusMatch = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        const isOverdue = execDate < today && exec.status !== 'completed';
        statusMatch = isOverdue;
      } else {
        statusMatch = exec.status === statusFilter;
      }
    }
    
    return dateMatch && statusMatch;
  }).sort((a, b) => {
    // Sort by execution date, then status
    const dateA = new Date(a.execution_date).getTime();
    const dateB = new Date(b.execution_date).getTime();
    if (dateA !== dateB) return dateA - dateB;

    const statusOrder = { 'overdue': 0, 'not_started': 1, 'in_progress': 2, 'completed': 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // Count stats for current filter (based on all executions for the active tab)
  const counts = {
    all: executions.length,
    completed: executions.filter(e => e.status === 'completed').length,
    in_progress: executions.filter(e => e.status === 'in_progress').length,
    not_started: executions.filter(e => e.status === 'not_started').length,
    overdue: executions.filter(e => {
      const d = new Date(e.execution_date);
      d.setHours(0, 0, 0, 0);
      return d < today && e.status !== 'completed';
    }).length,
  };

  if (executions.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No checklists assigned to you yet</p>
          <p className="text-sm text-gray-400">Checklists will appear here when assigned by your manager</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium text-gray-700">Date:</span>
          <Button
            variant={dateFilter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateFilter('today')}
          >
            Today ({executions.filter(e => {
              const d = new Date(e.execution_date);
              d.setHours(0, 0, 0, 0);
              return d.getTime() === today.getTime();
            }).length})
          </Button>
          <Button
            variant={dateFilter === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateFilter('week')}
          >
            This Week
          </Button>
          <Button
            variant={dateFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateFilter('all')}
          >
            All
          </Button>
        </div>

        <div className="w-px h-8 bg-gray-300" />

        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All ({counts.all})
          </Button>
          <Button
            variant={statusFilter === 'not_started' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('not_started')}
            className={statusFilter === 'not_started' ? '' : 'border-gray-400 text-gray-700'}
          >
            Not Started ({counts.not_started})
          </Button>
          <Button
            variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('in_progress')}
            className={statusFilter === 'in_progress' ? 'bg-blue-600' : 'border-blue-400 text-blue-700'}
          >
            In Progress ({counts.in_progress})
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
            className={statusFilter === 'completed' ? 'bg-green-600' : 'border-green-400 text-green-700'}
          >
            Completed ({counts.completed})
          </Button>
          <Button
            variant={statusFilter === 'overdue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('overdue')}
            className={statusFilter === 'overdue' ? 'bg-red-600' : 'border-red-400 text-red-700'}
          >
            Overdue ({counts.overdue})
          </Button>
        </div>
      </div>

      {filteredExecutions.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No checklists match your filters</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setDateFilter('all');
                setStatusFilter('all');
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExecutions.map((execution) => {
            const progress = getProgress(execution);
            const execDate = new Date(execution.execution_date);
            const isOverdue = execDate < today && execution.status !== 'completed';
            
            return (
              <motion.div
                key={execution.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`bg-white border-none shadow-sm hover:shadow-md transition-all duration-200 ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {execution.template_name}
                      </CardTitle>
                      {execution.status === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {isOverdue && (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getShiftTypeColor(execution.shift_type)}>
                        {execution.shift_type?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className={getStatusColor(execution.status)}>
                        {execution.status?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline">
                        {format(new Date(execution.execution_date), 'MMM d')}
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
                        {isOverdue && (
                          <p className="text-xs mt-1 text-red-600 font-semibold">
                            ⚠️ Overdue
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={() => navigate(createPageUrl(`ExecuteChecklist?id=${execution.id}`))}
                        className="w-full"
                        variant={execution.status === 'completed' ? 'outline' : 'default'}
                      >
                        {execution.status === 'completed' ? (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            View Results
                          </>
                        ) : progress > 0 ? (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Continue Checklist
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Checklist
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
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
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [assignDate, setAssignDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedUser, setSelectedUser] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const createExecutionMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistExecution.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myChecklistExecutions'] });
      queryClient.invalidateQueries({ queryKey: ['allChecklistExecutions'] });
      setAssignDialogOpen(false);
      setSelectedTemplate(null);
      setSelectedUser('');
    },
  });

  const handleAssignChecklist = async () => {
    if (!selectedTemplate || !selectedUser) {
      alert('Please select a user');
      return;
    }

    const userToAssign = users.find(u => u.email === selectedUser);
    if (!userToAssign) {
        alert('Selected user not found.');
        return;
    }
    
    const execution = {
      template_id: selectedTemplate.id,
      template_name: selectedTemplate.name,
      shift_type: selectedTemplate.shift_type,
      execution_date: assignDate,
      assigned_to_email: userToAssign.email,
      assigned_to_name: userToAssign.full_name,
      status: 'not_started',
      tasks: selectedTemplate.tasks.map(t => ({
        ...t,
        status: t.field_type === 'standard' || t.field_type === 'yesno' ? 'pending' : undefined, // Status for standard/yesno
        text_input_value: t.field_type === 'text_input' ? '' : undefined, // Value for text input
        yesno_value: t.field_type === 'yesno' ? null : undefined, // Value for yes/no toggle
        // Retain other task properties like requires_photo etc.
      })),
    };

    try {
      await createExecutionMutation.mutateAsync(execution);
      alert(`✅ Checklist "${selectedTemplate.name}" assigned to ${userToAssign.full_name} for ${format(new Date(assignDate), 'PPP')}`);
    } catch (error) {
      console.error("Error assigning checklist:", error);
      alert('❌ Failed to assign checklist. Please try again.');
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Dialog open={showForm} onOpenChange={(open) => {
          if (!open) { // Dialog is closing
            resetForm();
          }
          setShowForm(open); // Update the state based on dialog's open status
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
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Opening Kitchen Checklist"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shift_type">Shift Phase *</Label>
                  <Select
                    value={formData.shift_type}
                    onValueChange={(value) => setFormData({ ...formData, shift_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shift phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening">Opening Shift</SelectItem>
                      <SelectItem value="mid_shift">Mid-Shift</SelectItem>
                      <SelectItem value="closing">Closing Shift</SelectItem>
                      <SelectItem value="any">Any Shift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this checklist for?"
                  rows={2}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reminder_minutes">Reminder (minutes after shift start)</Label>
                  <Input
                    id="reminder_minutes"
                    type="number"
                    value={formData.reminder_minutes}
                    onChange={(e) => setFormData({ ...formData, reminder_minutes: parseInt(e.target.value) || 15 })}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advance_notice">Advance Notice (days before due)</Label>
                  <Input
                    id="advance_notice"
                    type="number"
                    value={formData.advance_notice_days}
                    onChange={(e) => setFormData({ ...formData, advance_notice_days: parseInt(e.target.value) || 14 })}
                    min="0"
                  />
                </div>
              </div>

              {/* Task Builder */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Checklist Tasks *</Label>
                  <Badge variant="outline">{formData.tasks.length} tasks</Badge>
                </div>

                {/* Add Task Section */}
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <Input
                        placeholder="Enter task description..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTask();
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleAddTask}
                          disabled={!newTask.trim()}
                          size="sm"
                          className="flex-1"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Task
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks List */}
                {formData.tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <p>No tasks added yet. Add tasks above to build your checklist.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.tasks.map((task, index) => (
                      <Card key={task.task_id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div className="flex flex-col gap-1 items-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (index > 0) {
                                    const newTasks = [...formData.tasks];
                                    [newTasks[index], newTasks[index - 1]] = [newTasks[index - 1], newTasks[index]];
                                    setFormData({ ...formData, tasks: newTasks });
                                  }
                                }}
                                disabled={index === 0}
                                className="h-6 w-6"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (index < formData.tasks.length - 1) {
                                    const newTasks = [...formData.tasks];
                                    [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
                                    setFormData({ ...formData, tasks: newTasks });
                                  }
                                }}
                                disabled={index === formData.tasks.length - 1}
                                className="h-6 w-6"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                            </div>

                            <div className="flex-1 space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="font-semibold text-gray-500 text-sm mt-1">#{index + 1}</span>
                                <Input
                                  value={task.description}
                                  onChange={(e) => {
                                    const updatedTasks = formData.tasks.map(t =>
                                      t.task_id === task.task_id
                                        ? { ...t, description: e.target.value }
                                        : t
                                    );
                                    setFormData({ ...formData, tasks: updatedTasks });
                                  }}
                                  className="flex-1"
                                  placeholder="Task description"
                                />
                              </div>

                              {/* Field Type Selector */}
                              <div className="space-y-2">
                                <Label className="text-xs text-gray-600">Response Type</Label>
                                <Select
                                  value={task.field_type || 'standard'}
                                  onValueChange={(value) => {
                                    const updatedTasks = formData.tasks.map(t =>
                                      t.task_id === task.task_id
                                        ? { ...t, field_type: value, notify_manager_on_no: value === 'yesno' ? (t.notify_manager_on_no || false) : undefined }
                                        : t
                                    );
                                    setFormData({ ...formData, tasks: updatedTasks });
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select response type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="standard">Pass/Fail/N/A</SelectItem>
                                    <SelectItem value="yesno">Yes/No Toggle</SelectItem>
                                    <SelectItem value="text_input">Text Input</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Yes/No Auto-Notify Option */}
                              {task.field_type === 'yesno' && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <Label className="text-sm font-semibold text-amber-900">⚠️ Auto-Notify Manager on "No"</Label>
                                    <Switch
                                      checked={task.notify_manager_on_no || false}
                                      onCheckedChange={(checked) => {
                                        const updatedTasks = formData.tasks.map(t =>
                                          t.task_id === task.task_id
                                            ? { ...t, notify_manager_on_no: checked }
                                            : t
                                        );
                                        setFormData({ ...formData, tasks: updatedTasks });
                                      }}
                                    />
                                  </div>
                                  {task.notify_manager_on_no && (
                                    <p className="text-xs text-amber-700">
                                      Manager will be automatically notified if user answers "No"
                                    </p>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2">
                                <label className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={task.requires_photo}
                                    onCheckedChange={(checked) => {
                                      const updatedTasks = formData.tasks.map(t =>
                                        t.task_id === task.task_id
                                          ? { ...t, requires_photo: checked }
                                          : t
                                      );
                                      setFormData({ ...formData, tasks: updatedTasks });
                                    }}
                                  />
                                  <Camera className="w-3 h-3" />
                                  Photo
                                </label>

                                <label className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={task.requires_temperature}
                                    onCheckedChange={(checked) => {
                                      const updatedTasks = formData.tasks.map(t =>
                                        t.task_id === task.task_id
                                          ? { ...t, requires_temperature: checked }
                                          : t
                                      );
                                      setFormData({ ...formData, tasks: updatedTasks });
                                    }}
                                  />
                                  <Thermometer className="w-3 h-3" />
                                  Temperature
                                </label>

                                <label className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={task.requires_signature}
                                    onCheckedChange={(checked) => {
                                      const updatedTasks = formData.tasks.map(t =>
                                        t.task_id === task.task_id
                                          ? { ...t, requires_signature: checked }
                                          : t
                                      );
                                      setFormData({ ...formData, tasks: updatedTasks });
                                    }}
                                  />
                                  <PenTool className="w-3 h-3" />
                                  Signature
                                </label>
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Submit Button Preview */}
                {formData.tasks.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                    <Button className="bg-green-600 hover:bg-green-700 w-full md:w-auto" disabled>
                      <Save className="w-4 h-4 mr-2" />
                      Submit Checklist
                    </Button>
                    <p className="text-xs text-green-700 mt-2">
                      ✓ Submit button will appear at the end of the checklist
                    </p>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!formData.name || formData.tasks.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
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
                <div className="space-y-3">
                  {template.description && (
                    <p className="text-sm text-gray-600">{template.description}</p>
                  )}
                  <div className="pt-2 border-t border-gray-100 space-y-1 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">{template.tasks?.length || 0}</span> tasks
                    </p>
                    <p className="text-gray-600 text-xs">
                      Reminder: {template.reminder_minutes || 15} min after shift start
                    </p>
                    {template.advance_notice_days > 0 && (
                      <p className="text-gray-600 text-xs">
                        Visible {template.advance_notice_days} days before due
                      </p>
                    )}
                  </div>
                  
                  {/* ASSIGN CHECKLIST BUTTON */}
                  <Button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setAssignDialogOpen(true);
                    }}
                    className="w-full mt-3 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Assign to User
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Assign Checklist Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Template</Label>
              <Input value={selectedTemplate?.name || ''} disabled />
            </div>
            
            <div>
              <Label htmlFor="assign-user">Assign to User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger id="assign-user">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assign-date">Due Date</Label>
              <Input
                id="assign-date"
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              <p><strong>This will create a checklist execution that the user can start filling out.</strong></p>
              <p className="mt-1">The checklist will appear in their "My Checklists" page.</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignChecklist}
                disabled={!selectedUser || createExecutionMutation.isPending}
              >
                {createExecutionMutation.isPending ? 'Assigning...' : 'Assign Checklist'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

// Fillable Checklist Execution Page Component
export function ExecuteChecklistPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { search } = useLocation();
  const executionId = new URLSearchParams(search).get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const {
    data: executionData,
    isLoading: isExecutionLoading,
    isError: isExecutionError,
    error: executionError,
  } = useQuery({
    queryKey: ['checklistExecution', executionId],
    queryFn: () => base44.entities.ChecklistExecution.get(executionId),
    enabled: !!executionId,
  });

  const [currentExecution, setCurrentExecution] = useState(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [currentTaskForImage, setCurrentTaskForImage] = useState(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showProgressAlert, setShowProgressAlert] = useState(false);

  useEffect(() => {
    if (executionData) {
      setCurrentExecution(executionData);
    }
  }, [executionData]);

  const updateExecutionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChecklistExecution.update(id, data),
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ['checklistExecution', executionId] });
      queryClient.invalidateQueries({ queryKey: ['myChecklistExecutions'] });
      queryClient.invalidateQueries({ queryKey: ['allChecklistExecutions'] });
      setCurrentExecution(updatedData); // Update local state with fresh data
    },
    onError: (error) => {
      console.error("Failed to update checklist execution:", error);
      // alert("Failed to save changes. Please try again."); // Removed for smoother UX
    }
  });

  const handleTaskUpdate = (taskId, updates) => {
    if (!currentExecution || isReadOnly) return;

    const updatedTasks = currentExecution.tasks.map(task =>
      task.task_id === taskId ? { ...task, ...updates } : task
    );

    const areAllAnswerableTasksAnswered = updatedTasks.every(task => {
      if (task.field_type === 'standard') {
        return ['pass', 'fail', 'na'].includes(task.status);
      } else if (task.field_type === 'yesno') {
        return ['yes', 'no'].includes(task.yesno_value); // Note: using yesno_value for yes/no
      } else if (task.field_type === 'text_input') {
        return !!task.text_input_value?.trim();
      }
      return true; // Tasks with only signature/photo are considered "answered" if those are done, but for completion, we check standard/yesno/text input
    });

    const hasAnyTaskBeenAnswered = updatedTasks.some(task => 
      (task.field_type === 'standard' && ['pass', 'fail', 'na'].includes(task.status)) ||
      (task.field_type === 'yesno' && ['yes', 'no'].includes(task.yesno_value)) ||
      (task.field_type === 'text_input' && !!task.text_input_value?.trim()) ||
      (task.requires_signature && !!task.signature?.trim()) ||
      (task.requires_photo && !!task.photo_url?.trim())
    );

    const newStatus = areAllAnswerableTasksAnswered ? 'completed' : (hasAnyTaskBeenAnswered ? 'in_progress' : 'not_started');

    const updatedExecution = {
      ...currentExecution,
      tasks: updatedTasks,
      status: newStatus,
      started_at: currentExecution.started_at || new Date().toISOString(), // Mark started if first task updated
      completed_at: areAllAnswerableTasksAnswered ? new Date().toISOString() : null,
    };

    setCurrentExecution(updatedExecution);
    updateExecutionMutation.mutate({ id: currentExecution.id, data: updatedExecution });
  };

  const handleCompleteChecklist = () => {
    if (!currentExecution) return;

    const allTasksAnswered = currentExecution.tasks.every(task => {
      if (task.field_type === 'standard') {
        return ['pass', 'fail', 'na'].includes(task.status);
      } else if (task.field_type === 'yesno') {
        return ['yes', 'no'].includes(task.yesno_value);
      } else if (task.field_type === 'text_input') {
        return !!task.text_input_value?.trim();
      }
      if (task.requires_signature) { // Signature is mandatory for completion if required
        return !!task.signature?.trim();
      }
      return true; // Tasks with just photo, no specific field_type, or not required for completion count as complete
    });
    
    if (!allTasksAnswered) {
      setShowProgressAlert(true);
      return;
    }

    const completedExecution = {
      ...currentExecution,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    updateExecutionMutation.mutate({ id: currentExecution.id, data: completedExecution }, {
      onSuccess: () => {
        setShowCompleteDialog(false);
        navigate(createPageUrl("AdvancedChecklists")); // Go back to main view
      }
    });
  };

  const handleImageUpload = (taskId) => {
    handleTaskUpdate(taskId, { photo_url: imageUrlInput });
    setShowImageDialog(false);
    setImageUrlInput('');
    setCurrentTaskForImage(null);
  };

  const getProgress = (execution) => {
    if (!execution || !execution.tasks || execution.tasks.length === 0) return 0;
    
    const totalTasksToAnswer = execution.tasks.filter(task =>
      task.field_type === 'standard' ||
      task.field_type === 'yesno' ||
      task.field_type === 'text_input' ||
      task.requires_signature // Signatures are also a form of answer
    ).length;

    if (totalTasksToAnswer === 0) return 0;

    const answeredTasks = execution.tasks.filter(task => {
      if (task.field_type === 'standard') {
        return ['pass', 'fail', 'na'].includes(task.status);
      } else if (task.field_type === 'yesno') {
        return ['yes', 'no'].includes(task.yesno_value);
      } else if (task.field_type === 'text_input') {
        return !!task.text_input_value?.trim();
      } else if (task.requires_signature) {
        return !!task.signature?.trim();
      }
      return false;
    }).length;

    return Math.round((answeredTasks / totalTasksToAnswer) * 100);
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'not_started':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isAssignedToCurrentUser = user && currentExecution?.assigned_to_email === user.email;
  const isReadOnly = !isAssignedToCurrentUser || currentExecution?.status === 'completed';

  if (isExecutionLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <RotateCw className="animate-spin h-8 w-8 text-blue-600" />
        <p className="ml-2 text-gray-700">Loading checklist...</p>
      </div>
    );
  }

  if (isExecutionError || !currentExecution) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
        <Card className="bg-white">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-800">Error loading checklist.</p>
            <p className="text-gray-600 mt-2">
              {executionError?.message || "Checklist not found or an error occurred."}
            </p>
            <Button onClick={() => navigate(createPageUrl("AdvancedChecklists"))} className="mt-6">
              Go Back to Checklists
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tasksByCategory = currentExecution.tasks.reduce((acc, task) => {
    const category = task.category || 'General Tasks';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(task);
    return acc;
  }, {});

  const currentProgress = getProgress(currentExecution);

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate(createPageUrl("AdvancedChecklists"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checklists
          </Button>
          <div className="flex gap-2">
            <Badge className={getStatusColor(currentExecution.status)}>
              {currentExecution.status?.replace(/_/g, ' ')}
            </Badge>
            {updateExecutionMutation.isPending && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <RotateCw className="h-3 w-3 animate-spin" /> Saving...
              </Badge>
            )}
          </div>
        </div>

        <Card className="mb-6 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">
              {currentExecution.template_name}
            </CardTitle>
            <p className="text-gray-600 mt-1">
              Assigned to: <span className="font-medium">{currentExecution.assigned_to_name}</span> for{" "}
              {format(new Date(currentExecution.execution_date), 'PPP')} ({currentExecution.shift_type?.replace(/_/g, ' ')})
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Overall Progress</span>
                  <span className="font-medium text-gray-900">{currentProgress}%</span>
                </div>
                <Progress value={currentProgress} className="h-2" />
              </div>
              {!isAssignedToCurrentUser && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-yellow-700">
                  <p className="font-semibold flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Viewing Only: This checklist is assigned to another user.
                  </p>
                </div>
              )}
              {currentExecution.status === 'completed' && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4 text-green-700">
                  <p className="font-semibold flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    This checklist has been completed on {format(new Date(currentExecution.completed_at), 'PPP h:mm a')}.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {Object.keys(tasksByCategory).map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 sticky top-0 bg-gray-50 z-10 py-2 -mx-6 px-6 border-b border-gray-200">
              {category}
            </h2>
            <div className="space-y-4">
              {tasksByCategory[category].map((task) => (
                <Card key={task.task_id} className="bg-white shadow-sm border border-gray-200">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-3 mt-1">
                        {task.field_type === 'standard' && task.status === 'pass' && <Check className="w-5 h-5 text-green-500" />}
                        {task.field_type === 'standard' && task.status === 'fail' && <X className="w-5 h-5 text-red-500" />}
                        {task.field_type === 'standard' && task.status === 'na' && <Ban className="w-5 h-5 text-gray-500" />}
                        {task.field_type === 'yesno' && task.yesno_value === 'yes' && <Check className="w-5 h-5 text-green-500" />}
                        {task.field_type === 'yesno' && task.yesno_value === 'no' && <X className="w-5 h-5 text-red-500" />}
                        {(task.field_type === 'text_input' && task.text_input_value) || (task.requires_signature && task.signature) ? <Check className="w-5 h-5 text-blue-500" /> : null}
                        {
                          (task.field_type === 'standard' && (!task.status || task.status === 'pending')) ||
                          (task.field_type === 'yesno' && task.yesno_value === null) ||
                          (task.field_type === 'text_input' && !task.text_input_value) ||
                          (task.requires_signature && !task.signature)
                          ? <Clock className="w-5 h-5 text-gray-400" /> : null
                        }
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-2">
                          {task.order}. {task.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {task.requires_photo && <Badge variant="secondary">📸 Photo</Badge>}
                          {task.requires_temperature && <Badge variant="secondary">🌡️ Temp</Badge>}
                          {task.requires_signature && <Badge variant="secondary">✍️ Sign</Badge>}
                          {task.field_type === 'yesno' && <Badge variant="secondary">✅ Yes/No</Badge>}
                          {task.field_type === 'text_input' && <Badge variant="secondary">📝 Text</Badge>}
                        </div>

                        {/* Render based on field_type */}
                        {task.field_type === 'standard' && !isReadOnly && (
                          <div className="flex gap-2 mb-3">
                            <Button
                              variant={task.status === 'pass' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleTaskUpdate(task.task_id, { status: 'pass' })}
                            >
                              Pass
                            </Button>
                            <Button
                              variant={task.status === 'fail' ? 'destructive' : 'outline'}
                              size="sm"
                              onClick={() => handleTaskUpdate(task.task_id, { status: 'fail' })}
                            >
                              Fail
                            </Button>
                            <Button
                              variant={task.status === 'na' ? 'secondary' : 'outline'}
                              size="sm"
                              onClick={() => handleTaskUpdate(task.task_id, { status: 'na' })}
                            >
                              N/A
                            </Button>
                          </div>
                        )}

                        {task.field_type === 'yesno' && (
                          <div className="mb-3">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`yesno-${task.task_id}`}
                                checked={task.yesno_value === 'yes'}
                                onCheckedChange={(checked) => handleTaskUpdate(task.task_id, { yesno_value: checked ? 'yes' : 'no' })}
                                disabled={isReadOnly}
                              />
                              <Label htmlFor={`yesno-${task.task_id}`}>
                                {task.yesno_value === 'yes' ? 'Yes' : task.yesno_value === 'no' ? 'No' : 'Toggle Yes/No'}
                              </Label>
                            </div>
                            {task.yesno_value === 'no' && task.notify_manager_on_no && (
                              <p className="text-xs text-red-600 mt-1">
                                Manager will be notified of "No".
                              </p>
                            )}
                          </div>
                        )}

                        {task.field_type === 'text_input' && (
                          <div className="flex flex-col gap-2 mb-3">
                            <Label htmlFor={`textinput-${task.task_id}`} className="sr-only">Text Input</Label>
                            <Input
                              id={`textinput-${task.task_id}`}
                              placeholder="Enter text here..."
                              value={task.text_input_value || ''}
                              onChange={(e) => handleTaskUpdate(task.task_id, { text_input_value: e.target.value })}
                              disabled={isReadOnly}
                            />
                          </div>
                        )}

                        <div className="space-y-3">
                          <Label htmlFor={`notes-${task.task_id}`} className="sr-only">Notes</Label>
                          <Textarea
                            id={`notes-${task.task_id}`}
                            placeholder="Add notes (e.g., observations, corrective actions)"
                            value={task.notes || ''}
                            onChange={(e) => handleTaskUpdate(task.task_id, { notes: e.target.value })}
                            rows={2}
                            disabled={isReadOnly}
                          />

                          {task.requires_photo && (
                            <div className="flex flex-col gap-2">
                              <Label htmlFor={`photo-${task.task_id}`}>Photo</Label>
                              {task.photo_url && (
                                <img
                                  src={task.photo_url}
                                  alt="Task photo"
                                  className="max-w-xs max-h-48 object-cover rounded-md border border-gray-200"
                                />
                              )}
                              {!isReadOnly && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentTaskForImage(task);
                                    setImageUrlInput(task.photo_url || '');
                                    setShowImageDialog(true);
                                  }}
                                >
                                  <Camera className="w-4 h-4 mr-2" />
                                  {task.photo_url ? 'Change Photo' : 'Add Photo'}
                                </Button>
                              )}
                            </div>
                          )}

                          {task.requires_temperature && (
                            <div className="flex flex-col gap-2">
                              <Label htmlFor={`temperature-${task.task_id}`}>Temperature (°C)</Label>
                              <Input
                                id={`temperature-${task.task_id}`}
                                type="number"
                                placeholder="Enter temperature"
                                value={task.temperature || ''}
                                onChange={(e) => handleTaskUpdate(task.task_id, { temperature: e.target.value })}
                                disabled={isReadOnly}
                              />
                            </div>
                          )}

                          {task.requires_signature && (
                            <div className="flex flex-col gap-2">
                              <Label htmlFor={`signature-${task.task_id}`}>Signature</Label>
                              <Input
                                id={`signature-${task.task_id}`}
                                placeholder="Enter signature (e.g., your name)"
                                value={task.signature || ''}
                                onChange={(e) => handleTaskUpdate(task.task_id, { signature: e.target.value })}
                                disabled={isReadOnly}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
          <Button
            onClick={() => setShowCompleteDialog(true)}
            disabled={isReadOnly || updateExecutionMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Checklist
          </Button>
        </div>
      </div>

      {/* Complete Checklist Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Completion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this checklist as completed?
              You won't be able to make further changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteChecklist}>
              Yes, Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Alert Dialog */}
      <AlertDialog open={showProgressAlert} onOpenChange={setShowProgressAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Checklist Incomplete
            </AlertDialogTitle>
            <AlertDialogDescription>
              You must complete all tasks (Pass, Fail, N/A, Yes/No, or fill in text/signature fields) before finalizing the checklist.
              Please go back and mark all tasks accordingly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowProgressAlert(false)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Upload Dialog (Mock) */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photo for Task</DialogTitle>
            <p className="text-sm text-gray-500">
              {currentTaskForImage?.description}
            </p>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Label htmlFor="image-url-input">Image URL (for mock upload)</Label>
            <Input
              id="image-url-input"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="e.g., https://example.com/image.jpg"
            />
            {imageUrlInput && (
              <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden">
                <img
                  src={imageUrlInput}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <p className="text-xs text-gray-500">
              In a real application, this would be a file upload interface.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleImageUpload(currentTaskForImage.task_id)}
              disabled={!imageUrlInput}
            >
              <Upload className="w-4 h-4 mr-2" />
              Save Photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
