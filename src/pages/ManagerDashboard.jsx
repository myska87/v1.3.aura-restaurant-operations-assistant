
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Calendar, CheckCircle, Clock, AlertCircle, AlertTriangle, ArrowLeft, Home, Users, TrendingUp, Award, Edit, Trash2, Upload, Eye, Bell, Settings, MoreVertical, UserPlus, FileText, Target, Search, Filter, Download, ChevronUp, ChevronDown, Mail, Phone } from "lucide-react";
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
  const [selectedRole, setSelectedRole] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

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
    setShowAddResponsibilityDialog(true);
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
              <CardHeader>
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {activeMembers} active • {onProbation} on probation • {onLeave} on leave
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Quick Links */}
                    <Link to={createPageUrl("CoachingDashboard")}>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Award className="w-3 h-3 mr-1" />
                        Coaching
                      </Button>
                    </Link>
                    <Link to={createPageUrl("WeeklyRotaSchedule")}>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        Schedule
                      </Button>
                    </Link>

                    {/* View Toggle */}
                    <div className="flex border rounded-lg overflow-hidden">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="rounded-none"
                      >
                        Grid
                      </Button>
                      <Button
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className="rounded-none"
                      >
                        Table
                      </Button>
                    </div>

                    <Button onClick={() => setShowAddMemberDialog(true)} className="bg-blue-600">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Member
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by name or position..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="front_of_house">Front of House</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="probation">Probation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Grid View */}
                {viewMode === 'grid' && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTeamMembers.map((member, index) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                                {member.staff_name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate">{member.staff_name}</h4>
                                <p className="text-sm text-gray-600 capitalize">{member.position?.replace('_', ' ')}</p>
                                <Badge className={`${getStatusColor(member.status)} mt-1 text-[10px]`}>
                                  {member.status}
                                </Badge>
                              </div>

                              {/* Actions Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedMember(member);
                                    setShowProfileModal(true);
                                  }}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedMember(member);
                                    setShowAddMemberDialog(true);
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Member
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => navigate(createPageUrl(`StartCoachingSession?staff_email=${member.staff_email}`))}
                                  >
                                    <Award className="w-4 h-4 mr-2" />
                                    Start Coaching
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => navigate(createPageUrl(`WeeklyRotaSchedule?staff_email=${member.staff_email}`))}
                                  >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    View Schedule
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      setMemberToDelete(member);
                                      setShowDeleteConfirm(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="space-y-1 text-xs text-gray-600 mb-3">
                              {member.staff_email && (
                                <p className="truncate">📧 {member.staff_email}</p>
                              )}
                              {member.phone && (
                                <p>📞 {member.phone}</p>
                              )}
                              {member.shift_start && member.shift_end && (
                                <p>⏰ {member.shift_start} - {member.shift_end}</p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Link to={createPageUrl(`ViewCoachingSession?staff_email=${member.staff_email}`)} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full text-xs">
                                  View Profile
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Photo</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Name</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Role</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Department</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Next Shift</th>
                          <th className="text-right p-3 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeamMembers.map((member) => (
                          <tr key={member.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                                {member.staff_name?.charAt(0)?.toUpperCase()}
                              </div>
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-gray-900">{member.staff_name}</p>
                                <p className="text-xs text-gray-500">{member.staff_email}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <p className="text-sm capitalize">{member.position?.replace('_', ' ')}</p>
                            </td>
                            <td className="p-3">
                              <p className="text-sm capitalize">{member.department?.replace('_', ' ')}</p>
                            </td>
                            <td className="p-3">
                              <Badge className={`${getStatusColor(member.status)} text-[10px]`}>
                                {member.status}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {member.shift_start && member.shift_end ? (
                                <p className="text-sm text-gray-700">
                                  {member.shift_start} - {member.shift_end}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400">Not set</p>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowProfileModal(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowAddMemberDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setMemberToDelete(member);
                                    setShowDeleteConfirm(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {filteredTeamMembers.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No team members found</p>
                  </div>
                )}
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
                    <Button onClick={() => setShowAddResponsibilityDialog(true)} className="bg-purple-600">
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
                                {role.position?.replace('_', ' ')}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {role.department}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditResponsibility(role)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Daily Tasks */}
                          {role.daily_tasks && role.daily_tasks.length > 0 && (
                            <div className="mb-3">
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Daily Tasks</Label>
                              <ul className="space-y-1">
                                {role.daily_tasks.slice(0, 3).map((task, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                    <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span>{task}</span>
                                  </li>
                                ))}
                                {role.daily_tasks.length > 3 && (
                                  <li className="text-xs text-gray-500">+{role.daily_tasks.length - 3} more</li>
                                )}
                              </ul>
                            </div>
                          )}

                          {/* Weekly Tasks */}
                          {role.weekly_tasks && role.weekly_tasks.length > 0 && (
                            <div className="mb-3">
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Weekly Tasks</Label>
                              <ul className="space-y-1">
                                {role.weekly_tasks.slice(0, 2).map((task, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                    <Calendar className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <span>{task}</span>
                                  </li>
                                ))}
                                {role.weekly_tasks.length > 2 && (
                                  <li className="text-xs text-gray-500">+{role.weekly_tasks.length - 2} more</li>
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

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowProfileModal(false)}>
                    Close
                  </Button>
                  <Link to={createPageUrl(`ViewCoachingSession?staff_email=${selectedMember.staff_email}`)}>
                    <Button className="bg-blue-600">
                      View Full Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
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
              <div className="flex justify-end gap-3">
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
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
