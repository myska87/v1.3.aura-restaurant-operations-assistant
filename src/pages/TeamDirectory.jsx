import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Mail,
  Phone,
  Search,
  ArrowLeft,
  Home,
  Users,
  UserPlus,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  Building,
  Briefcase,
  Award,
  Clock,
  TrendingUp,
  Download,
  Upload,
  Filter,
  Grid3X3,
  List,
  Star,
  MessageCircle,
  FileText,
  DollarSign,
} from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function TeamDirectory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPosition, setFilterPosition] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [sortBy, setSortBy] = useState("name"); // name, hire_date, position
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    staff_email: "",
    staff_name: "",
    position: "",
    department: "",
    phone: "",
    shift_start: "",
    shift_end: "",
    hire_date: "",
    emergency_contact: "",
    hourly_rate: "",
    notes: "",
    status: "active",
    manager_email: "",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: allStaff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list('-created_date'),
  });

  // Get performance data
  const { data: rewards = [] } = useQuery({
    queryKey: ['allRewards'],
    queryFn: () => base44.entities.StaffReward.list('-awarded_date'),
  });

  const { data: coachingSessions = [] } = useQuery({
    queryKey: ['allCoachingSessions'],
    queryFn: () => base44.entities.CoachingSession.list('-session_date'),
  });

  // Merge staff with team member data and performance stats
  const enrichedStaff = allStaff.map(staff => {
    const teamMember = teamMembers.find(tm => tm.staff_email === staff.email);
    const staffRewards = rewards.filter(r => r.staff_email === staff.email);
    const staffSessions = coachingSessions.filter(s => s.staff_email === staff.email);
    const totalPoints = staffRewards.reduce((sum, r) => sum + (r.points_earned || 0), 0);
    const completedSessions = staffSessions.filter(s => s.status === 'completed').length;
    const tenure = teamMember?.hire_date ? differenceInMonths(new Date(), new Date(teamMember.hire_date)) : 0;

    return {
      ...staff,
      ...teamMember,
      position: teamMember?.position || staff.position,
      phone: teamMember?.phone || staff.phone,
      totalPoints,
      completedSessions,
      tenure,
      rewardCount: staffRewards.length,
    };
  });

  // Filtering and sorting
  let filteredStaff = enrichedStaff.filter(staff => {
    const matchesSearch = 
      staff.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.position?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPosition = filterPosition === 'all' || staff.position === filterPosition;
    const matchesDepartment = filterDepartment === 'all' || staff.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || staff.status === filterStatus;
    
    return matchesSearch && matchesPosition && matchesDepartment && matchesStatus;
  });

  // Sort
  filteredStaff = filteredStaff.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.full_name || '').localeCompare(b.full_name || '');
      case 'hire_date':
        return new Date(b.hire_date || 0) - new Date(a.hire_date || 0);
      case 'position':
        return (a.position || '').localeCompare(b.position || '');
      case 'points':
        return b.totalPoints - a.totalPoints;
      case 'tenure':
        return b.tenure - a.tenure;
      default:
        return 0;
    }
  });

  // Stats
  const stats = {
    total: enrichedStaff.length,
    active: enrichedStaff.filter(s => s.status === 'active').length,
    managers: enrichedStaff.filter(s => s.position === 'manager' || s.position === 'owner').length,
    kitchen: enrichedStaff.filter(s => s.department === 'kitchen').length,
    frontHouse: enrichedStaff.filter(s => s.department === 'front_of_house').length,
    avgTenure: Math.round(enrichedStaff.reduce((sum, s) => sum + (s.tenure || 0), 0) / enrichedStaff.length),
    newHires: enrichedStaff.filter(s => (s.tenure || 0) < 3).length,
  };

  // CRUD operations
  const saveMemberMutation = useMutation({
    mutationFn: async (data) => {
      if (editingMember && editingMember.id) {
        return await base44.entities.TeamMember.update(editingMember.id, data);
      } else {
        return await base44.entities.TeamMember.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['allStaff'] });
      closeDialog();
    },
    onError: (error) => {
      alert('Error saving team member: ' + error.message);
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.TeamMember.update(id, { status: 'inactive' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setShowDeleteDialog(false);
      setMemberToDelete(null);
    },
  });

  const handleOpenAddDialog = () => {
    setEditingMember(null);
    setFormData({
      staff_email: "",
      staff_name: "",
      position: "",
      department: "",
      phone: "",
      shift_start: "",
      shift_end: "",
      hire_date: "",
      emergency_contact: "",
      hourly_rate: "",
      notes: "",
      status: "active",
      manager_email: "",
    });
    setShowAddDialog(true);
  };

  const handleOpenEditDialog = (member) => {
    setEditingMember(member);
    setFormData({
      staff_email: member.staff_email || member.email,
      staff_name: member.staff_name || member.full_name,
      position: member.position || "",
      department: member.department || "",
      phone: member.phone || "",
      shift_start: member.shift_start || "",
      shift_end: member.shift_end || "",
      hire_date: member.hire_date || "",
      emergency_contact: member.emergency_contact || "",
      hourly_rate: member.hourly_rate || "",
      notes: member.notes || "",
      status: member.status || "active",
      manager_email: member.manager_email || "",
    });
    setShowAddDialog(true);
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingMember(null);
  };

  const handleSubmit = () => {
    if (!formData.staff_email || !formData.staff_name || !formData.position) {
      alert('Please fill in required fields: Email, Name, and Position');
      return;
    }

    saveMemberMutation.mutate(formData);
  };

  const handleDelete = (member) => {
    setMemberToDelete(member);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (memberToDelete && memberToDelete.id) {
      deleteMemberMutation.mutate(memberToDelete.id);
    }
  };

  const getPositionColor = (position) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800 border-purple-200',
      manager: 'bg-blue-100 text-blue-800 border-blue-200',
      chef: 'bg-red-100 text-red-800 border-red-200',
      line_cook: 'bg-orange-100 text-orange-800 border-orange-200',
      server: 'bg-green-100 text-green-800 border-green-200',
      bartender: 'bg-teal-100 text-teal-800 border-teal-200',
      cleaner: 'bg-gray-100 text-gray-800 border-gray-200',
      maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return colors[position] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getDepartmentColor = (department) => {
    const colors = {
      kitchen: 'bg-red-50 text-red-700 border-red-100',
      front_of_house: 'bg-blue-50 text-blue-700 border-blue-100',
      bar: 'bg-purple-50 text-purple-700 border-purple-100',
      management: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      cleaning: 'bg-green-50 text-green-700 border-green-100',
      maintenance: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    };
    return colors[department] || 'bg-gray-50 text-gray-700 border-gray-100';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      on_leave: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      probation: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Available options
  const availablePositions = [
    { value: "owner", label: "Owner" },
    { value: "manager", label: "Manager" },
    { value: "chef", label: "Chef" },
    { value: "line_cook", label: "Line Cook" },
    { value: "server", label: "Server" },
    { value: "bartender", label: "Bartender" },
    { value: "cleaner", label: "Cleaner" },
    { value: "maintenance", label: "Maintenance" },
  ];

  const availableDepartments = [
    { value: "management", label: "Management" },
    { value: "kitchen", label: "Kitchen" },
    { value: "front_of_house", label: "Front of House" },
    { value: "bar", label: "Bar" },
    { value: "cleaning", label: "Cleaning" },
    { value: "maintenance", label: "Maintenance" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl("ManagerDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Manager Dashboard
            </Button>
          </Link>
        </div>

        {/* Title and Actions */}
        <div className="mb-8 flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Team Directory</h1>
                <p className="text-gray-600">Manage and connect with your team</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isManager && (
              <>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button onClick={handleOpenAddDialog} className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Team Member
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                <p className="text-xs text-blue-700 font-medium">Total Team</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4 text-center">
                <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-green-900">{stats.active}</p>
                <p className="text-xs text-green-700 font-medium">Active</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4 text-center">
                <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-purple-900">{stats.managers}</p>
                <p className="text-xs text-purple-700 font-medium">Management</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-4 text-center">
                <Briefcase className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-red-900">{stats.kitchen}</p>
                <p className="text-xs text-red-700 font-medium">Kitchen</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-indigo-900">{stats.frontHouse}</p>
                <p className="text-xs text-indigo-700 font-medium">Front of House</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-orange-900">{stats.avgTenure}</p>
                <p className="text-xs text-orange-700 font-medium">Avg Months</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-teal-900">{stats.newHires}</p>
                <p className="text-xs text-teal-700 font-medium">New Hires</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="flex-1 min-w-[250px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, position..."
                  className="pl-10"
                />
              </div>

              {/* Filters Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-blue-50 border-blue-200' : ''}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="hire_date">Hire Date</SelectItem>
                  <SelectItem value="position">Position</SelectItem>
                  <SelectItem value="points">Points</SelectItem>
                  <SelectItem value="tenure">Tenure</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t grid md:grid-cols-3 gap-4"
              >
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {availableDepartments.map(dept => (
                      <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterPosition} onValueChange={setFilterPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Positions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {availablePositions.map(pos => (
                      <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Team Grid View */}
        {viewMode === 'grid' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((staff, index) => (
              <motion.div
                key={staff.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <Card className="bg-white border-none shadow-sm hover:shadow-xl transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                          {staff.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        {staff.status === 'active' && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-lg text-gray-900 truncate">
                            {staff.full_name}
                          </h3>
                          {isManager && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(createPageUrl(`StaffProfile?staff_email=${staff.email}`))}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(createPageUrl(`StartCoachingSession?staff_email=${staff.email}`))}>
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Start Coaching
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(createPageUrl(`WeeklyRotaSchedule?staff_email=${staff.email}`))}>
                                  <Calendar className="w-4 h-4 mr-2" />
                                  View Schedule
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(staff)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Member
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(staff)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        
                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <Badge className={`${getPositionColor(staff.position)} text-xs border`}>
                            {staff.position?.replace(/_/g, ' ')}
                          </Badge>
                          {staff.department && (
                            <Badge variant="outline" className={`${getDepartmentColor(staff.department)} text-xs border`}>
                              {staff.department?.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {staff.status !== 'active' && (
                            <Badge className={`${getStatusColor(staff.status)} text-xs border`}>
                              {staff.status.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Contact Info */}
                        <div className="space-y-1.5 text-sm mb-3">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate text-xs">{staff.email}</span>
                          </div>
                          {staff.phone && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="text-xs">{staff.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                          <div className="text-center">
                            <p className="text-lg font-bold text-gray-900">{staff.tenure || 0}</p>
                            <p className="text-[10px] text-gray-500">Months</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-600">{staff.totalPoints || 0}</p>
                            <p className="text-[10px] text-gray-500">Points</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">{staff.completedSessions || 0}</p>
                            <p className="text-[10px] text-gray-500">Sessions</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Team List View */}
        {viewMode === 'list' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Team Member</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Position</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Department</th>
                    <th className="text-center p-4 text-sm font-semibold text-gray-700">Tenure</th>
                    <th className="text-center p-4 text-sm font-semibold text-gray-700">Points</th>
                    <th className="text-center p-4 text-sm font-semibold text-gray-700">Status</th>
                    {isManager && <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                            {staff.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{staff.full_name}</p>
                            <p className="text-sm text-gray-500">{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`${getPositionColor(staff.position)} text-xs border`}>
                          {staff.position?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {staff.department ? (
                          <Badge variant="outline" className={`${getDepartmentColor(staff.department)} text-xs border`}>
                            {staff.department?.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <p className="text-sm font-medium text-gray-900">{staff.tenure || 0} months</p>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Award className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-bold text-gray-900">{staff.totalPoints || 0}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Badge className={`${getStatusColor(staff.status)} text-xs border`}>
                          {staff.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                      {isManager && (
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={createPageUrl(`StaffProfile?staff_email=${staff.email}`)}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEditDialog(staff)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(staff)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {filteredStaff.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No team members found</p>
              {isManager && (
                <Button onClick={handleOpenAddDialog}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add First Team Member
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingMember ? '✏️ Edit Team Member' : '➕ Add New Team Member'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Email *</Label>
                  <Input
                    value={formData.staff_email}
                    onChange={(e) => setFormData({...formData, staff_email: e.target.value})}
                    placeholder="email@example.com"
                    disabled={!!editingMember}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Full Name *</Label>
                  <Input
                    value={formData.staff_name}
                    onChange={(e) => setFormData({...formData, staff_name: e.target.value})}
                    placeholder="John Doe"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Position *</Label>
                  <Select 
                    value={formData.position} 
                    onValueChange={(value) => setFormData({...formData, position: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePositions.map(pos => (
                        <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Department</Label>
                  <Select 
                    value={formData.department} 
                    onValueChange={(value) => setFormData({...formData, department: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepartments.map(dept => (
                        <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+44 7XXX XXXXXX"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Hire Date</Label>
                  <Input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Shift Start</Label>
                  <Input
                    type="time"
                    value={formData.shift_start}
                    onChange={(e) => setFormData({...formData, shift_start: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Shift End</Label>
                  <Input
                    type="time"
                    value={formData.shift_end}
                    onChange={(e) => setFormData({...formData, shift_end: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Hourly Rate (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                    placeholder="12.50"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Emergency Contact</Label>
                <Input
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                  placeholder="Name: +44 7XXX XXXXXX"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">Manager Email</Label>
                <Input
                  value={formData.manager_email}
                  onChange={(e) => setFormData({...formData, manager_email: e.target.value})}
                  placeholder="manager@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {editingMember && (
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">✅ Active</SelectItem>
                      <SelectItem value="inactive">❌ Inactive</SelectItem>
                      <SelectItem value="on_leave">🏖️ On Leave</SelectItem>
                      <SelectItem value="probation">🎯 Probation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={saveMemberMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              >
                {saveMemberMutation.isPending 
                  ? '⏳ Saving...' 
                  : editingMember ? '💾 Update Member' : '➕ Add Member'
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>⚠️ Confirm Removal</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700 mb-3">
                Are you sure you want to remove <strong>{memberToDelete?.staff_name || memberToDelete?.full_name}</strong> from the team?
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-sm text-yellow-800">
                  💡 This will set their status to inactive. You can reactivate them later by editing their profile.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmDelete}
                disabled={deleteMemberMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMemberMutation.isPending ? '⏳ Removing...' : '🗑️ Remove Member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}