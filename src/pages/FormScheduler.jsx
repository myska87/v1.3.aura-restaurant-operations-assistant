import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  Settings,
  Plus,
  Home,
  ArrowLeft,
  Filter,
  Download,
  Eye,
  Edit3,
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function FormScheduler() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [viewMode, setViewMode] = useState('calendar'); // calendar | list
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['formTemplates'],
    queryFn: () => base44.entities.FormTemplate.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['formAssignments'],
    queryFn: () => base44.entities.FormAssignmentMetadata.list('-assigned_at'),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // 10 EHO Compliance Categories
  const categories = [
    {
      id: 'haccp',
      name: 'HACCP Plan',
      icon: '🛡️',
      color: 'from-red-500 to-red-600',
      description: 'Critical Control Points & Temperature Logs',
      frequency: 'daily',
      position: 'chef',
    },
    {
      id: 'workflow',
      name: 'Workflow Design',
      icon: '⚙️',
      color: 'from-blue-500 to-blue-600',
      description: 'Opening & Closing Procedures',
      frequency: 'daily',
      position: 'manager',
    },
    {
      id: 'equipment',
      name: 'Equipment Checks',
      icon: '🔧',
      color: 'from-green-500 to-green-600',
      description: 'Calibration & Maintenance Records',
      frequency: 'weekly',
      position: 'chef',
    },
    {
      id: 'pest',
      name: 'Pest Control',
      icon: '🐜',
      color: 'from-purple-500 to-purple-600',
      description: 'Monitoring Logs & Sightings',
      frequency: 'weekly',
      position: 'manager',
    },
    {
      id: 'sops',
      name: 'SOPs',
      icon: '📋',
      color: 'from-cyan-500 to-cyan-600',
      description: 'Cleaning & Sanitisation',
      frequency: 'daily',
      position: 'cleaner',
    },
    {
      id: 'training',
      name: 'Staff Training',
      icon: '🎓',
      color: 'from-amber-500 to-amber-600',
      description: 'Attendance & Competency',
      frequency: 'monthly',
      position: 'manager',
    },
    {
      id: 'suppliers',
      name: 'Supplier Management',
      icon: '🚚',
      color: 'from-orange-500 to-orange-600',
      description: 'Delivery Temps & Audits',
      frequency: 'daily',
      position: 'chef',
    },
    {
      id: 'allergens',
      name: 'Allergen Management',
      icon: '⚠️',
      color: 'from-yellow-500 to-yellow-600',
      description: 'Labels & Storage Verification',
      frequency: 'weekly',
      position: 'chef',
    },
    {
      id: 'chemicals',
      name: 'Cleaning Chemicals',
      icon: '🧪',
      color: 'from-pink-500 to-pink-600',
      description: 'Storage & Safety Data Sheets',
      frequency: 'monthly',
      position: 'cleaner',
    },
    {
      id: 'waste',
      name: 'Waste Management',
      icon: '♻️',
      color: 'from-teal-500 to-teal-600',
      description: 'Disposal & Recycling Tracking',
      frequency: 'weekly',
      position: 'maintenance',
    },
  ];

  // Filter templates by category
  const filteredTemplates = templates.filter(t => {
    const categoryMatch = selectedCategory === 'all' || t.category === selectedCategory;
    const positionMatch = selectedPosition === 'all' || t.assigned_position === selectedPosition;
    return categoryMatch && positionMatch && t.status === 'active';
  });

  // Calculate stats
  const totalForms = templates.filter(t => t.status === 'active').length;
  const autoAssignedForms = templates.filter(t => t.auto_assign_enabled).length;
  const pendingAssignments = assignments.filter(a => a.completion_status === 'pending').length;
  const overdueAssignments = assignments.filter(a => {
    return a.completion_status === 'pending' && new Date(a.due_date) < new Date();
  }).length;

  // Get upcoming assignments for this week
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const thisWeekAssignments = assignments.filter(a => {
    const dueDate = new Date(a.due_date);
    return dueDate >= weekStart && dueDate <= weekEnd;
  });

  if (!isManager) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Access Restricted</h3>
            <p className="text-red-700">Form Scheduler is only accessible to managers.</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("FormIntelligence")}>
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
              <Calendar className="w-8 h-8 text-[#014D40]" />
              EHO Compliance Scheduler
            </h1>
            <p className="text-gray-600 mt-2">10-step food safety framework with automated scheduling</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-[#014D40] hover:bg-[#013830]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Schedule
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Forms</p>
                  <p className="text-2xl font-bold text-gray-900">{totalForms}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Auto-Assigned</p>
                  <p className="text-2xl font-bold text-gray-900">{autoAssignedForms}</p>
                </div>
                <Settings className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending This Week</p>
                  <p className="text-2xl font-bold text-gray-900">{thisWeekAssignments.length}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{overdueAssignments}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 10 EHO Categories Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">EHO Compliance Framework</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {categories.map((category, index) => {
              const categoryForms = templates.filter(t => t.category === category.id && t.status === 'active');
              
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all border-none"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <CardContent className="p-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-3 text-2xl`}>
                        {category.icon}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">{category.name}</h3>
                      <p className="text-xs text-gray-600 mb-3">{category.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {category.frequency}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900">
                          {categoryForms.length} forms
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Positions</option>
                <option value="manager">Manager</option>
                <option value="chef">Chef</option>
                <option value="cleaner">Cleaner</option>
                <option value="maintenance">Maintenance</option>
              </select>

              <div className="ml-auto flex gap-2">
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Calendar
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  List
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading forms...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Forms Found</h3>
                <p className="text-gray-600 mb-6">Create your first scheduled form</p>
                <Button onClick={() => setShowCreateDialog(true)} className="bg-[#014D40] hover:bg-[#013830]">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Form
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredTemplates.map(form => {
              const formAssignments = assignments.filter(a => a.form_id === form.id);
              const pending = formAssignments.filter(a => a.completion_status === 'pending').length;
              const completed = formAssignments.filter(a => a.completion_status === 'completed').length;

              return (
                <Card key={form.id} className="border-none shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{form.form_name}</h3>
                          {form.auto_assign_enabled && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Auto
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {form.trigger_type?.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        {form.description && (
                          <p className="text-sm text-gray-600 mb-3">{form.description}</p>
                        )}

                        <div className="flex gap-4 text-sm">
                          <span className="text-gray-600">
                            Position: <span className="font-medium text-gray-900">{form.assigned_position}</span>
                          </span>
                          <span className="text-gray-600">
                            Assignments: <span className="font-medium text-gray-900">{formAssignments.length}</span>
                          </span>
                          <span className="text-gray-600">
                            Completed: <span className="font-medium text-green-600">{completed}</span>
                          </span>
                          <span className="text-gray-600">
                            Pending: <span className="font-medium text-amber-600">{pending}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link to={createPageUrl(`FormEditor?id=${form.id}`)}>
                          <Button variant="outline" size="sm">
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}