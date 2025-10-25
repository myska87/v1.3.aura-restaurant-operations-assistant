
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Calendar, CheckCircle, Clock, AlertCircle, AlertTriangle, ArrowLeft, Home, Users, TrendingUp, Award, Edit, Trash2, Upload, Eye, Bell, Settings, MoreVertical, UserPlus, FileText, Target, Search, Filter, Download, ChevronUp, ChevronDown, Mail, Phone, X, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function ManagerDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("team");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showAddDocumentDialog, setShowAddDocumentDialog] = useState(false);
  const [showAddResponsibilityDialog, setShowAddResponsibilityDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null); // This is for editing responsibilities
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // For team members
  const [memberToDelete, setMemberToDelete] = useState(null);

  // New states for Responsibility Form
  const [newRolePosition, setNewRolePosition] = useState("");
  const [newRoleDepartment, setNewRoleDepartment] = useState("");
  const [newRoleDailyTasks, setNewRoleDailyTasks] = useState("");
  const [newRoleWeeklyTasks, setNewRoleWeeklyTasks] = useState("");
  const [newRoleMonthlyTasks, setNewRoleMonthlyTasks] = useState(""); // New state for Monthly Tasks
  const [newRoleSkills, setNewRoleSkills] = useState("");

  // New states for Delete Responsibility Confirmation
  const [showDeleteResponsibilityConfirm, setShowDeleteResponsibilityConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Inline task editing states
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskValue, setEditingTaskValue] = useState("");
  const [editingTaskType, setEditingTaskType] = useState("");


  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list('-created_date'),
  });

  const { data: hrDocuments = [] } = useQuery({
    queryKey: ['hrDocuments'],
    queryFn: () => base44.entities.HRDocument.list('-uploaded_at'),
  });

  const { data: responsibilities = [] } = useQuery({
    queryKey: ['responsibilities'],
    queryFn: () => base44.entities.RoleResponsibility.list(),
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.list(),
  });

  // Dynamic Stats Calculations
  const totalTeam = teamMembers.length;
  const activeMembers = teamMembers.filter(m => m.status === 'active').length;
  const onLeave = teamMembers.filter(m => m.status === 'on_leave').length;
  const onProbation = teamMembers.filter(m => m.status === 'probation').length;

  // Calculate documents needing attention
  const documentsExpiring = hrDocuments.filter(doc => {
    if (!doc.expiry_date) return false;
    const daysUntilExpiry = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }).length;

  const documentsExpired = hrDocuments.filter(doc => doc.status === 'expired').length;
  const documentsPending = hrDocuments.filter(doc => doc.status === 'pending_review').length;
  const totalDocumentAlerts = documentsExpiring + documentsExpired + documentsPending;

  // Department breakdown
  const departmentStats = teamMembers.reduce((acc, member) => {
    acc[member.department] = (acc[member.department] || 0) + 1;
    return acc;
  }, {});

  // Position breakdown
  const positionStats = teamMembers.reduce((acc, member) => {
    acc[member.position] = (acc[member.position] || 0) + 1;
    return acc;
  }, {});

  // Additional calculations for enhanced stats
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['todayAttendance'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return await base44.entities.ClockEvent.filter({
        timestamp: { $gte: `${today}T00:00:00Z` }
      });
    },
  });

  const { data: trainingRecords = [] } = useQuery({
    queryKey: ['trainingRecords'],
    queryFn: () => base44.entities.TrainingRecord.list(),
  });

  const { data: coachingSessions = [] } = useQuery({
    queryKey: ['coachingSessions'],
    queryFn: () => base44.entities.CoachingSession.list('-session_date'),
  });

  const attendanceToday = new Set(todayAttendance.map(a => a.user_email)).size;
  const trainingCompleted = trainingRecords.filter(t => t.status === 'completed').length;
  const totalTraining = trainingRecords.length;
  const trainingPercentage = totalTraining > 0 ? Math.round((trainingCompleted / totalTraining) * 100) : 0;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const feedbackThisMonth = coachingSessions.filter(s =>
    s.session_date?.startsWith(thisMonth) && s.status === 'completed'
  ).length;

  const pendingHRActions = documentsPending + documentsExpiring;

  // Filtered team members
  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = member.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.position?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || member.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      case 'probation': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentStatusColor = (status) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'missing': return 'bg-gray-100 text-gray-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to handle editing responsibility
  const handleEditResponsibility = (roleToEdit) => {
    setSelectedRole(roleToEdit); // Set the selected role here
    setNewRolePosition(roleToEdit.position);
    setNewRoleDepartment(roleToEdit.department);
    setNewRoleDailyTasks(roleToEdit.daily_tasks?.join(', ') || '');
    setNewRoleWeeklyTasks(roleToEdit.weekly_tasks?.join(', ') || '');
    setNewRoleMonthlyTasks(roleToEdit.monthly_tasks?.join(', ') || ''); // Populate new monthly tasks field
    setNewRoleSkills(roleToEdit.key_skills_required?.join(', ') || '');
    setShowAddResponsibilityDialog(true);
    cancelEditTask(); // Clear any inline task editing
  };

  // Function to handle adding new responsibility (opens empty form)
  const handleAddResponsibility = () => {
    setSelectedRole(null); // Clear selected role for "add" mode
    setNewRolePosition("");
    setNewRoleDepartment("");
    setNewRoleDailyTasks("");
    setNewRoleWeeklyTasks("");
    setNewRoleMonthlyTasks(""); // Clear new monthly tasks field
    setNewRoleSkills("");
    setShowAddResponsibilityDialog(true);
    cancelEditTask(); // Clear any inline task editing
  };

  // Function to close responsibility dialog and reset form
  const closeResponsibilityDialog = () => {
    setShowAddResponsibilityDialog(false);
    setSelectedRole(null);
    setNewRolePosition("");
    setNewRoleDepartment("");
    setNewRoleDailyTasks("");
    setNewRoleWeeklyTasks("");
    setNewRoleMonthlyTasks(""); // Clear new monthly tasks field
    setNewRoleSkills("");
  };

  // Function to prepare array strings from textarea input
  const parseCommaSeparatedString = (str) =>
    str.split(',').map(s => s.trim()).filter(s => s.length > 0);

  // Inline task editing functions
  const startEditTask = (roleId, taskType, taskIndex, currentValue) => {
    setEditingTaskId(`${roleId}-${taskType}-${taskIndex}`);
    setEditingTaskValue(currentValue);
    setEditingTaskType(taskType);
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskValue("");
    setEditingTaskType("");
  };

  const saveEditTask = async (role, taskType, taskIndex) => {
    const updatedRoleData = { ...role };
    
    if (taskType === 'daily_tasks') {
      updatedRoleData.daily_tasks = [...(role.daily_tasks || [])];
      updatedRoleData.daily_tasks[taskIndex] = editingTaskValue;
    } else if (taskType === 'weekly_tasks') {
      updatedRoleData.weekly_tasks = [...(role.weekly_tasks || [])];
      updatedRoleData.weekly_tasks[taskIndex] = editingTaskValue;
    } else if (taskType === 'monthly_tasks') {
      updatedRoleData.monthly_tasks = [...(role.monthly_tasks || [])];
      updatedRoleData.monthly_tasks[taskIndex] = editingTaskValue;
    }

    await updateResponsibilityMutation.mutateAsync({
      id: role.id,
      updatedRole: {
        position: updatedRoleData.position,
        department: updatedRoleData.department,
        daily_tasks: updatedRoleData.daily_tasks || [],
        weekly_tasks: updatedRoleData.weekly_tasks || [],
        monthly_tasks: updatedRoleData.monthly_tasks || [],
        key_skills_required: updatedRoleData.key_skills_required || [],
        last_updated: new Date().toISOString(),
        updated_by: user?.email,
      }
    });

    cancelEditTask();
  };

  const deleteTask = async (role, taskType, taskIndex) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    const updatedRoleData = { ...role };
    
    if (taskType === 'daily_tasks') {
      updatedRoleData.daily_tasks = (role.daily_tasks || []).filter((_, i) => i !== taskIndex);
    } else if (taskType === 'weekly_tasks') {
      updatedRoleData.weekly_tasks = (role.weekly_tasks || []).filter((_, i) => i !== taskIndex);
    } else if (taskType === 'monthly_tasks') {
      updatedRoleData.monthly_tasks = (role.monthly_tasks || []).filter((_, i) => i !== taskIndex);
    }

    await updateResponsibilityMutation.mutateAsync({
      id: role.id,
      updatedRole: {
        position: updatedRoleData.position,
        department: updatedRoleData.department,
        daily_tasks: updatedRoleData.daily_tasks || [],
        weekly_tasks: updatedRoleData.weekly_tasks || [],
        monthly_tasks: updatedRoleData.monthly_tasks || [],
        key_skills_required: updatedRoleData.key_skills_required || [],
        last_updated: new Date().toISOString(),
        updated_by: user?.email,
      }
    });
  };

  // Mutations for Role Responsibilities
  const addResponsibilityMutation = useMutation({
    mutationFn: (newRole) => base44.entities.RoleResponsibility.create(newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responsibilities'] });
      closeResponsibilityDialog();
    },
  });

  const updateResponsibilityMutation = useMutation({
    mutationFn: ({ id, updatedRole }) => base44.entities.RoleResponsibility.update(id, updatedRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responsibilities'] });
      closeResponsibilityDialog();
    },
  });

  const deleteResponsibilityMutation = useMutation({
    mutationFn: (id) => base44.entities.RoleResponsibility.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responsibilities'] });
      setShowDeleteResponsibilityConfirm(false);
      setRoleToDelete(null);
    },
  });

  const handleSubmitResponsibility = async () => {
    const roleData = {
      position: newRolePosition,
      department: newRoleDepartment,
      daily_tasks: parseCommaSeparatedString(newRoleDailyTasks),
      weekly_tasks: parseCommaSeparatedString(newRoleWeeklyTasks),
      monthly_tasks: parseCommaSeparatedString(newRoleMonthlyTasks), // Include monthly tasks
      key_skills_required: parseCommaSeparatedString(newRoleSkills),
    };

    if (selectedRole) {
      await updateResponsibilityMutation.mutateAsync({ id: selectedRole.id, updatedRole: roleData });
    } else {
      await addResponsibilityMutation.mutateAsync(roleData);
    }
  };

  const handleDeleteResponsibility = (roleId) => {
    setRoleToDelete(roleId);
    setShowDeleteResponsibilityConfirm(true);
  };

  const confirmDeleteResponsibility = async () => {
    if (roleToDelete) {
      await deleteResponsibilityMutation.mutateAsync(roleToDelete);
    }
  };

  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamMember.update(id, { status: 'inactive' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setShowDeleteConfirm(false);
      setMemberToDelete(null);
    },
  });

  const handleDeleteMember = async () => {
    if (memberToDelete) {
      await deleteMemberMutation.mutateAsync(memberToDelete.id);
    }
  };

  if (!isManager) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Access Restricted</h3>
            <p className="text-red-700">This page is only accessible to managers and owners.</p>
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

  // Pre-defined lists for selects
  const availableDepartments = [
    { value: "kitchen", label: "Kitchen" },
    { value: "front_of_house", label: "Front of House" },
    { value: "bar", label: "Bar" },
    { value: "management", label: "Management" },
    { value: "cleaning", label: "Cleaning" },
    { value: "maintenance", label: "Maintenance" },
    { value: "other", label: "Other" },
  ];

  const availablePositions = [
    { value: "manager", label: "Manager" },
    { value: "assistant_manager", label: "Assistant Manager" },
    { value: "chef", label: "Chef" },
    { value: "sous_chef", label: "Sous Chef" },
    { value: "line_cook", label: "Line Cook" },
    { value: "dishwasher", label: "Dishwasher" },
    { value: "waiter", label: "Waiter" },
    { value: "bartender", label: "Bartender" },
    { value: "host", label: "Host" },
    { value: "cleaner", label: "Cleaner" },
    { value: "maintenance_worker", label: "Maintenance Worker" },
    { value: "owner", label: "Owner" },
    { value: "admin", label: "Admin" },
    { value: "hr", label: "HR" },
    { value: "security", label: "Security" },
    { value: "cashier", label: "Cashier" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header with Profile, Notifications, Settings */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("PerformanceGrowth")}>
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

          {/* Right side icons */}
          <div className="ml-auto flex items-center gap-3">
            {/* Notifications */}
            <Button variant="outline" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {pendingHRActions > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingHRActions}
                </span>
              )}
            </Button>

            {/* Settings */}
            <Button variant="outline" size="icon">
              <Settings className="w-5 h-5" />
            </Button>

            {/* Profile Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 px-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.full_name?.charAt(0)?.toUpperCase() || "M"}
                  </div>
                  <span className="hidden md:inline text-sm font-medium">{user?.full_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(createPageUrl("PerformanceGrowth"))}>
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(createPageUrl("Dashboard"))}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => base44.auth.logout()}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center gap-3">
            <Users className="w-10 h-10 text-blue-600" />
            Manager Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Manage your team, HR documents, and role responsibilities
          </p>
        </div>

        {/* Quick Access Buttons */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Link to={createPageUrl("WeeklyPayrollReport")}>
            <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all h-24">
              <div className="text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold">Weekly Payroll Report</p>
                <p className="text-xs text-green-100">Staff hours & pay calculation</p>
              </div>
            </Button>
          </Link>

          <Link to={createPageUrl("AttendanceReports")}>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all h-24">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold">Attendance Reports</p>
                <p className="text-xs text-blue-100">Track staff attendance</p>
              </div>
            </Button>
          </Link>

          <Link to={createPageUrl("WeeklyRotaSchedule")}>
            <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all h-24">
              <div className="text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold">Weekly Schedule</p>
                <p className="text-xs text-purple-100">View & print schedules</p>
              </div>
            </Button>
          </Link>

          <Link to={createPageUrl("TeamDirectory")}>
            <Button className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all h-24">
              <div className="text-center">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold">Team Directory</p>
                <p className="text-xs text-indigo-100">Contact information</p>
              </div>
            </Button>
          </Link>
        </div>

        {/* Enhanced Stats Grid - 5 Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-white border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-600" />
                  <Badge variant="outline" className="text-xs">Total</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalTeam}</p>
                <p className="text-xs text-gray-600 mt-1">Total Staff</p>
                <p className="text-xs text-green-600 mt-1">↑ {activeMembers} active</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-white border-l-4 border-l-green-500 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <Badge variant="outline" className="text-xs">Today</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{attendanceToday}</p>
                <p className="text-xs text-gray-600 mt-1">Attendance Today</p>
                <p className="text-xs text-gray-500 mt-1">Out of {activeMembers}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-white border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Award className="w-8 h-8 text-purple-600" />
                  <Badge variant="outline" className="text-xs">Progress</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{trainingPercentage}%</p>
                <p className="text-xs text-gray-600 mt-1">Training Completed</p>
                <p className="text-xs text-gray-500 mt-1">{trainingCompleted}/{totalTraining} courses</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white border-l-4 border-l-indigo-500 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-indigo-600" />
                  <Badge variant="outline" className="text-xs">This Month</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{feedbackThisMonth}</p>
                <p className="text-xs text-gray-600 mt-1">Feedback Sessions</p>
                <p className="text-xs text-gray-500 mt-1">Coaching completed</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-white border-l-4 border-l-red-500 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                  <Badge variant="outline" className="text-xs">Urgent</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{pendingHRActions}</p>
                <p className="text-xs text-gray-600 mt-1">Pending HR Actions</p>
                <p className="text-xs text-red-600 mt-1">Requires attention</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-none">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-900">{departmentStats.kitchen || 0}</p>
              <p className="text-xs text-blue-700 font-medium">Kitchen Staff</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-none">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-900">{departmentStats.front_of_house || 0}</p>
              <p className="text-xs text-purple-700 font-medium">Front of House</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-none">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-pink-900">{departmentStats.bar || 0}</p>
              <p className="text-xs text-pink-700 font-medium">Bar Staff</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-none">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-900">{departmentStats.cleaning || 0}</p>
              <p className="text-xs text-green-700 font-medium">Cleaning</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-none">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-900">{departmentStats.maintenance || 0}</p>
              <p className="text-xs text-orange-700 font-medium">Maintenance</p>
            </CardContent>
          </Card>
        </div>

        {/* Task Matrix View - Quick Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Smart Task Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Role</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Tasks Count</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Linked Forms</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Auto Assign</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {responsibilities.map((role) => {
                    const dailyCount = role.daily_tasks?.length || 0;
                    const weeklyCount = role.weekly_tasks?.length || 0;
                    const monthlyCount = role.monthly_tasks?.length || 0;
                    const totalTasks = dailyCount + weeklyCount + monthlyCount;
                    // Note: This assumes tasks might be objects with a linked_form_id.
                    // If tasks are simple strings, this will always evaluate to false.
                    const hasLinkedForms = [
                      ...(role.daily_tasks || []),
                      ...(role.weekly_tasks || []),
                      ...(role.monthly_tasks || [])
                    ].some(t => typeof t === 'object' && t !== null && t.linked_form_id);

                    // Note: auto_assign_enabled is a hypothetical field for display purposes here.
                    // It would need to be added to the RoleResponsibility entity and its management UI.
                    const autoAssignEnabled = role.auto_assign_enabled ?? false;

                    return (
                      <tr key={role.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {role.position ? role.position.replace(/_/g, ' ') : 'Unknown Position'}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {role.department ? role.department.replace(/_/g, ' ') : 'No Department'}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {dailyCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {dailyCount} Daily
                              </Badge>
                            )}
                            {weeklyCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {weeklyCount} Weekly
                              </Badge>
                            )}
                            {monthlyCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {monthlyCount} Monthly
                              </Badge>
                            )}
                            {totalTasks === 0 && (
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                No Tasks
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {hasLinkedForms ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">No forms</span>
                          )}
                        </td>
                        <td className="p-3">
                          {autoAssignEnabled ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              ✅ Enabled
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 text-xs">
                              ❌ Disabled
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActiveTab('responsibilities');
                                // Use setTimeout to ensure tab change renders before dialog attempts to open
                                setTimeout(() => handleEditResponsibility(role), 0);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveTab('responsibilities')}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {responsibilities.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="mb-4">No role responsibilities defined yet</p>
                <Button onClick={() => setActiveTab('responsibilities')} className="bg-purple-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Role
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tab Navigation with Indicators */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setActiveTab("team")}
                variant={activeTab === "team" ? "default" : "outline"}
                className="flex items-center gap-2 relative"
              >
                <Users className="w-4 h-4" />
                Team Management
                <Badge className={`ml-2 ${activeTab === "team" ? "bg-white text-blue-600" : "bg-blue-100 text-blue-800"}`}>
                  {totalTeam}
                </Badge>
                {onLeave + onProbation > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center">
                    {onLeave + onProbation}
                  </span>
                )}
              </Button>

              <Button
                onClick={() => setActiveTab("hr")}
                variant={activeTab === "hr" ? "default" : "outline"}
                className="flex items-center gap-2 relative"
              >
                <FileText className="w-4 h-4" />
                HR Tools
                <Badge className={`ml-2 ${activeTab === "hr" ? "bg-white text-green-600" : "bg-green-100 text-green-800"}`}>
                  {hrDocuments.length}
                </Badge>
                {totalDocumentAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {totalDocumentAlerts}
                  </span>
                )}
              </Button>

              <Button
                onClick={() => setActiveTab("responsibilities")}
                variant={activeTab === "responsibilities" ? "default" : "outline"}
                className="flex items-center gap-2 relative"
              >
                <Target className="w-4 h-4" />
                Responsibilities
                <Badge className={`ml-2 ${activeTab === "responsibilities" ? "bg-white text-purple-600" : "bg-purple-100 text-purple-800"}`}>
                  {responsibilities.length}
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Management Tab */}
        {activeTab === "team" && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Team Directory</h3>
                <p className="text-gray-600 mb-6">
                  Manage your team members, view profiles, and track performance
                </p>
                <Link to={createPageUrl("TeamDirectory")}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Users className="w-5 h-5 mr-2" />
                    Go to Team Directory
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* HR Tools Tab */}
        {activeTab === "hr" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>HR Documents</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {documentsExpired} expired • {documentsExpiring} expiring soon • {documentsPending} pending review
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setActiveTab("team")}>
                      <Users className="w-3 h-3 mr-1" />
                      View Team
                    </Button>
                    <Button onClick={() => setShowAddDocumentDialog(true)} className="bg-green-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Document
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Document Alerts */}
                {(documentsExpiring > 0 || documentsExpired > 0 || documentsPending > 0) && (
                  <div className="space-y-2 mb-6">
                    {documentsExpired > 0 && (
                      <Card className="bg-red-50 border-red-200">
                        <CardContent className="p-4 flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <div>
                            <p className="font-semibold text-red-900">
                              {documentsExpired} document{documentsExpired > 1 ? 's have' : ' has'} expired
                            </p>
                            <p className="text-sm text-red-700">Urgent action required</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {documentsExpiring > 0 && (
                      <Card className="bg-yellow-50 border-yellow-200">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-yellow-600" />
                          <div>
                            <p className="font-semibold text-yellow-900">
                              {documentsExpiring} document{documentsExpiring > 1 ? 's expire' : ' expires'} within 30 days
                            </p>
                            <p className="text-sm text-yellow-700">Review and renew soon</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {documentsPending > 0 && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Upload className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-semibold text-blue-900">
                              {documentsPending} document{documentsPending > 1 ? 's are' : ' is'} pending review
                            </p>
                            <p className="text-sm text-blue-700">Awaiting your approval</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}


                {/* Documents by Staff Member */}
                <div className="space-y-4">
                  {allStaff.map(staff => {
                    const staffDocs = hrDocuments.filter(doc => doc.staff_email === staff.email);
                    if (staffDocs.length === 0) return null;

                    return (
                      <Card key={staff.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                {staff.full_name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{staff.full_name}</h4>
                                <p className="text-sm text-gray-600">{staffDocs.length} documents</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-2">
                            {staffDocs.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2 flex-1">
                                  <FileText className="w-4 h-4 text-gray-600" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate capitalize">
                                      {doc.document_type.replace('_', ' ')}
                                    </p>
                                    {doc.expiry_date && (
                                      <p className="text-xs text-gray-600">
                                        Expires: {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Badge className={`${getDocumentStatusColor(doc.status)} text-[10px]`}>
                                  {doc.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {hrDocuments.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No HR documents uploaded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Responsibilities Tab */}
        {activeTab === "responsibilities" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Role Responsibilities</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {responsibilities.length} roles defined across all departments
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={createPageUrl("AdvancedChecklists")}>
                      <Button variant="outline" size="sm" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        View Checklists
                      </Button>
                    </Link>
                    <Button onClick={handleAddResponsibility} className="bg-purple-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Role
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {responsibilities.map((role, index) => (
                    <motion.div
                      key={role.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border-2 hover:border-purple-300 transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 capitalize mb-1">
                                {role.position ? role.position.replace(/_/g, ' ') : 'Unknown Position'}
                              </h3>
                              <Badge variant="outline" className="text-xs capitalize">
                                {role.department ? role.department.replace(/_/g, ' ') : 'No Department'}
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditResponsibility(role)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteResponsibility(role.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Daily Tasks with Inline Editing */}
                          {role.daily_tasks && role.daily_tasks.length > 0 && (
                            <div className="mb-3">
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block flex items-center justify-between">
                                <span>Daily Tasks</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => handleEditResponsibility(role)}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add
                                </Button>
                              </Label>
                              <ul className="space-y-1">
                                {role.daily_tasks.map((task, i) => {
                                  const taskId = `${role.id}-daily_tasks-${i}`;
                                  const isEditing = editingTaskId === taskId;

                                  return (
                                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2 group">
                                      <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                      {isEditing ? (
                                        <div className="flex-1 flex gap-2 items-center">
                                          <Input
                                            value={editingTaskValue}
                                            onChange={(e) => setEditingTaskValue(e.target.value)} // Fixed here
                                            className="h-7 text-sm"
                                            autoFocus
                                            onKeyPress={(e) => {
                                              if (e.key === 'Enter') {
                                                saveEditTask(role, 'daily_tasks', i);
                                              }
                                            }}
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => saveEditTask(role, 'daily_tasks', i)}
                                          >
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={cancelEditTask}
                                          >
                                            <X className="w-3 h-3 text-red-600" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <>
                                          <span className="flex-1">{task}</span>
                                          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={() => startEditTask(role.id, 'daily_tasks', i, task)}
                                            >
                                              <Edit className="w-3 h-3 text-blue-600" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={() => deleteTask(role, 'daily_tasks', i)}
                                            >
                                              <Trash2 className="w-3 h-3 text-red-600" />
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {/* Weekly Tasks with Inline Editing */}
                          {role.weekly_tasks && role.weekly_tasks.length > 0 && (
                            <div className="mb-3">
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block flex items-center justify-between">
                                <span>Weekly Tasks</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => handleEditResponsibility(role)}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add
                                </Button>
                              </Label>
                              <ul className="space-y-1">
                                {role.weekly_tasks.map((task, i) => {
                                  const taskId = `${role.id}-weekly_tasks-${i}`;
                                  const isEditing = editingTaskId === taskId;

                                  return (
                                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2 group">
                                      <Calendar className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                      {isEditing ? (
                                        <div className="flex-1 flex gap-2 items-center">
                                          <Input
                                            value={editingTaskValue}
                                            onChange={(e) => setEditingTaskValue(e.target.value)} // Fixed here
                                            className="h-7 text-sm"
                                            autoFocus
                                            onKeyPress={(e) => {
                                              if (e.key === 'Enter') {
                                                saveEditTask(role, 'weekly_tasks', i);
                                              }
                                            }}
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => saveEditTask(role, 'weekly_tasks', i)}
                                          >
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={cancelEditTask}
                                          >
                                            <X className="w-3 h-3 text-red-600" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <>
                                          <span className="flex-1">{task}</span>
                                          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={() => startEditTask(role.id, 'weekly_tasks', i, task)}
                                            >
                                              <Edit className="w-3 h-3 text-blue-600" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={() => deleteTask(role, 'weekly_tasks', i)}
                                            >
                                              <Trash2 className="w-3 h-3 text-red-600" />
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </li>
                                  );
                                })}
                                {role.weekly_tasks.length > 2 && (
                                  <li className="text-xs text-gray-500">+{role.weekly_tasks.length - 2} more</li>
                                )}
                              </ul>
                            </div>
                          )}

                          {/* Monthly Tasks with Inline Editing */}
                          {role.monthly_tasks && role.monthly_tasks.length > 0 && (
                            <div className="mb-3">
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block flex items-center justify-between">
                                <span>Monthly Tasks</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => handleEditResponsibility(role)}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add
                                </Button>
                              </Label>
                              <ul className="space-y-1">
                                {role.monthly_tasks.map((task, i) => {
                                  const taskId = `${role.id}-monthly_tasks-${i}`;
                                  const isEditing = editingTaskId === taskId;

                                  return (
                                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2 group">
                                      <Target className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0" />
                                      {isEditing ? (
                                        <div className="flex-1 flex gap-2 items-center">
                                          <Input
                                            value={editingTaskValue}
                                            onChange={(e) => setEditingTaskValue(e.target.value)} // Fixed here
                                            className="h-7 text-sm"
                                            autoFocus
                                            onKeyPress={(e) => {
                                              if (e.key === 'Enter') {
                                                saveEditTask(role, 'monthly_tasks', i);
                                              }
                                            }}
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => saveEditTask(role, 'monthly_tasks', i)}
                                          >
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={cancelEditTask}
                                          >
                                            <X className="w-3 h-3 text-red-600" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <>
                                          <span className="flex-1">{task}</span>
                                          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={() => startEditTask(role.id, 'monthly_tasks', i, task)}
                                            >
                                              <Edit className="w-3 h-3 text-blue-600" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={() => deleteTask(role, 'monthly_tasks', i)}
                                            >
                                              <Trash2 className="w-3 h-3 text-red-600" />
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </li>
                                  );
                                })}
                                {role.monthly_tasks.length > 2 && (
                                  <li className="text-xs text-gray-500">+{role.monthly_tasks.length - 2} more</li>
                                )}
                              </ul>
                            </div>
                          )}

                          {/* Skills Required */}
                          {role.key_skills_required && role.key_skills_required.length > 0 && (
                            <div>
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Key Skills</Label>
                              <div className="flex flex-wrap gap-1">
                                {role.key_skills_required.slice(0, 3).map((skill, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px]">
                                    {skill}
                                  </Badge>
                                ))}
                                {role.key_skills_required.length > 3 && (
                                  <Badge variant="outline" className="text-[10px]">
                                    +{role.key_skills_required.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {responsibilities.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No role responsibilities defined yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Profile View Modal */}
        {selectedMember && showProfileModal && (
          <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Staff Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {selectedMember.staff_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedMember.staff_name}</h3>
                    <p className="text-gray-600 capitalize">{selectedMember.position?.replace('_', ' ')}</p>
                    <Badge className={`${getStatusColor(selectedMember.status)} mt-1`}>
                      {selectedMember.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Email</Label>
                    <p className="text-sm font-medium">{selectedMember.staff_email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Phone</Label>
                    <p className="text-sm font-medium">{selectedMember.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Department</Label>
                    <p className="text-sm font-medium capitalize">{selectedMember.department?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Shift</Label>
                    <p className="text-sm font-medium">
                      {selectedMember.shift_start && selectedMember.shift_end
                        ? `${selectedMember.shift_start} - ${selectedMember.shift_end}`
                        : 'Not set'}
                    </p>
                  </div>
                  {selectedMember.hire_date && (
                    <div>
                      <Label className="text-xs text-gray-500">Hire Date</Label>
                      <p className="text-sm font-medium">{format(new Date(selectedMember.hire_date), 'PPP')}</p>
                    </div>
                  )}
                  {selectedMember.emergency_contact && (
                    <div>
                      <Label className="text-xs text-gray-500">Emergency Contact</Label>
                      <p className="text-sm font-medium">{selectedMember.emergency_contact}</p>
                    </div>
                  )}
                </div>

                {selectedMember.notes && (
                  <div>
                    <Label className="text-xs text-gray-500">Notes</Label>
                    <p className="text-sm text-gray-700 mt-1">{selectedMember.notes}</p>
                  </div>
                )}

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setShowProfileModal(false)}>
                    Close
                  </Button>
                  <Link to={createPageUrl(`ViewCoachingSession?staff_email=${selectedMember.staff_email}`)}>
                    <Button className="bg-blue-600">
                      View Full Profile
                    </Button>
                  </Link>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Member Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Removal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-gray-700">
                Are you sure you want to remove <strong>{memberToDelete?.staff_name}</strong> from the team?
                This will set their status to inactive.
              </p>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteMember}
                  disabled={deleteMemberMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteMemberMutation.isPending ? 'Removing...' : 'Remove Member'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Responsibility Dialog */}
        <Dialog open={showAddResponsibilityDialog} onOpenChange={closeResponsibilityDialog}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{selectedRole ? "Edit Role Responsibility" : "Add New Role Responsibility"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rolePosition" className="text-right">
                  Position
                </Label>
                <Select value={newRolePosition} onValueChange={setNewRolePosition}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a position" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePositions.map(pos => (
                      <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="roleDepartment" className="text-right">
                  Department
                </Label>
                <Select value={newRoleDepartment} onValueChange={setNewRoleDepartment}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDepartments.map(dep => (
                      <SelectItem key={dep.value} value={dep.value}>{dep.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dailyTasks" className="text-right">
                  Daily Tasks
                </Label>
                <Textarea
                  id="dailyTasks"
                  value={newRoleDailyTasks}
                  onChange={(e) => setNewRoleDailyTasks(e.target.value)}
                  placeholder="Task 1, Task 2, Task 3 (comma-separated)"
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="weeklyTasks" className="text-right">
                  Weekly Tasks
                </Label>
                <Textarea
                  id="weeklyTasks"
                  value={newRoleWeeklyTasks}
                  onChange={(e) => setNewRoleWeeklyTasks(e.target.value)}
                  placeholder="Weekly Task 1, Weekly Task 2 (comma-separated)"
                  className="col-span-3"
                />
              </div>

              {/* New Monthly Tasks field */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="monthlyTasks" className="text-right">
                  Monthly Tasks
                </Label>
                <Textarea
                  id="monthlyTasks"
                  value={newRoleMonthlyTasks}
                  onChange={(e) => setNewRoleMonthlyTasks(e.target.value)}
                  placeholder="Monthly Task 1, Monthly Task 2 (comma-separated)"
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="keySkills" className="text-right">
                  Key Skills
                </Label>
                <Textarea
                  id="keySkills"
                  value={newRoleSkills}
                  onChange={(e) => setNewRoleSkills(e.target.value)}
                  placeholder="Skill 1, Skill 2, Skill 3 (comma-separated)"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeResponsibilityDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitResponsibility}
                disabled={addResponsibilityMutation.isPending || updateResponsibilityMutation.isPending}
              >
                {selectedRole
                  ? (updateResponsibilityMutation.isPending ? 'Saving...' : 'Save Changes')
                  : (addResponsibilityMutation.isPending ? 'Adding...' : 'Add Role')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Responsibility Confirmation Dialog */}
        <Dialog open={showDeleteResponsibilityConfirm} onOpenChange={setShowDeleteResponsibilityConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Role Deletion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-gray-700">
                Are you sure you want to delete this role responsibility? This action cannot be undone.
              </p>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowDeleteResponsibilityConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteResponsibility}
                  disabled={deleteResponsibilityMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteResponsibilityMutation.isPending ? 'Deleting...' : 'Delete Role'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
