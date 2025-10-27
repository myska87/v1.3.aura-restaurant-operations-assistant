import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  RefreshCw,
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
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("name");
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
    photo_url: "",
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Fetch all users
  const { data: allUsers = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 0, // Always fetch fresh data
  });

  // Fetch all team members
  const { data: teamMembers = [], isLoading: loadingTeamMembers, refetch: refetchTeamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    staleTime: 0, // Always fetch fresh data
  });

  // Merge users and team members into unified staff list
  const enrichedStaff = React.useMemo(() => {
    const staffMap = new Map();
    
    // Add all users first
    allUsers.forEach(user => {
      staffMap.set(user.email, {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        position: user.position,
        department: user.department,
        phone: user.phone,
        photo_url: user.photo_url,
        hire_date: user.hire_date,
        status: user.status || 'active',
        shift_start: user.shift_start,
        shift_end: user.shift_end,
        emergency_contact: user.emergency_contact,
        hourly_rate: user.hourly_rate,
        source: 'user',
        has_team_member: false,
      });
    });
    
    // Enrich with team member data
    teamMembers.forEach(member => {
      if (staffMap.has(member.staff_email)) {
        // User exists - enrich with team member data
        const existing = staffMap.get(member.staff_email);
        staffMap.set(member.staff_email, {
          ...existing,
          full_name: member.staff_name || existing.full_name,
          position: member.position || existing.position,
          department: member.department || existing.department,
          phone: member.phone || existing.phone,
          photo_url: member.photo_url || existing.photo_url,
          shift_start: member.shift_start || existing.shift_start,
          shift_end: member.shift_end || existing.shift_end,
          status: member.status || existing.status,
          hire_date: member.hire_date || existing.hire_date,
          hourly_rate: member.hourly_rate || existing.hourly_rate,
          emergency_contact: member.emergency_contact || existing.emergency_contact,
          manager_email: member.manager_email,
          notes: member.notes,
          source: 'merged',
          has_team_member: true,
          team_member_id: member.id,
        });
      } else {
        // Team member without user account - add as pending
        staffMap.set(member.staff_email, {
          id: member.id,
          email: member.staff_email,
          full_name: member.staff_name,
          position: member.position,
          department: member.department,
          phone: member.phone,
          photo_url: member.photo_url,
          hire_date: member.hire_date,
          status: member.status || 'active',
          shift_start: member.shift_start,
          shift_end: member.shift_end,
          hourly_rate: member.hourly_rate,
          emergency_contact: member.emergency_contact,
          manager_email: member.manager_email,
          notes: member.notes,
          source: 'team_member_only',
          has_team_member: true,
          team_member_id: member.id,
          isTeamMemberOnly: true, // Flag for pending user account
        });
      }
    });
    
    return Array.from(staffMap.values());
  }, [allUsers, teamMembers]);

  const isLoading = loadingUsers || loadingTeamMembers;

  // Filter staff
  let filteredStaff = enrichedStaff.filter(staff => {
    const nameMatch = (staff.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (staff.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const positionMatch = (staff.position || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = nameMatch || emailMatch || positionMatch;
    
    const matchesPosition = filterPosition === 'all' || staff.position === filterPosition;
    const matchesDepartment = filterDepartment === 'all' || staff.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || staff.status === filterStatus;
    
    return matchesSearch && matchesPosition && matchesDepartment && matchesStatus;
  });

  // Sort staff
  filteredStaff = filteredStaff.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.full_name || '').localeCompare(b.full_name || '');
      case 'hire_date':
        return new Date(b.hire_date || 0) - new Date(a.hire_date || 0);
      case 'position':
        return (a.position || '').localeCompare(b.position || '');
      default:
        return 0;
    }
  });

  // Calculate stats
  const stats = {
    total: enrichedStaff.length,
    active: enrichedStaff.filter(s => s.status === 'active').length,
    managers: enrichedStaff.filter(s => s.position === 'manager' || s.position === 'owner').length,
    kitchen: enrichedStaff.filter(s => s.department === 'kitchen').length,
    frontHouse: enrichedStaff.filter(s => s.department === 'front_of_house').length,
  };

  // CRUD operations
  const saveMemberMutation = useMutation({
    mutationFn: async (data) => {
      const existingMember = teamMembers.find(tm => tm.staff_email === data.staff_email);
      
      if (existingMember) {
        return await base44.entities.TeamMember.update(existingMember.id, data);
      } else {
        return await base44.entities.TeamMember.create(data);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch both queries
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      refetchTeamMembers();
      refetchUsers();
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
      refetchTeamMembers();
      setShowDeleteDialog(false);
      setMemberToDelete(null);
    },
  });

  const handleRefresh = () => {
    refetchUsers();
    refetchTeamMembers();
  };

  const handleOpenAddDialog = () => {
    setEditingMember(null);
    setPhotoPreview(null);
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
      photo_url: "",
    });
    setShowAddDialog(true);
  };

  const handleOpenEditDialog = (member) => {
    setEditingMember(member);
    setPhotoPreview(member.photo_url || null);
    setFormData({
      staff_email: member.email || member.staff_email,
      staff_name: member.full_name || member.staff_name,
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
      photo_url: member.photo_url || "",
    });
    setShowAddDialog(true);
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingMember(null);
    setPhotoPreview(null);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: file_url });
      setPhotoPreview(file_url);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    }
    setUploadingPhoto(false);
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
    if (memberToDelete && (memberToDelete.team_member_id || memberToDelete.id)) {
      deleteMemberMutation.mutate(memberToDelete.team_member_id || memberToDelete.id);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xl font-semibold">Loading Team Directory...</span>
        </div>
      </div>
    );
  }

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
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[250px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, position..."
                  className="pl-10"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-blue-50 border-blue-200' : ''}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="hire_date">Hire Date</SelectItem>
                  <SelectItem value="position">Position</SelectItem>
                </SelectContent>
              </Select>

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
                key={staff.id || staff.email}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <Card className="bg-white border-none shadow-sm hover:shadow-xl transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        {staff.photo_url ? (
                          <img
                            src={staff.photo_url}
                            alt={staff.full_name}
                            className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                            {(staff.full_name?.charAt(0)?.toUpperCase() || "?")}
                          </div>
                        )}
                        {staff.status === 'active' && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
                        )}
                        {staff.isTeamMemberOnly && (
                          <div className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-lg text-gray-900 truncate">
                            {staff.full_name || 'Unknown'}
                          </h3>
                          {isManager && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!staff.isTeamMemberOnly && (
                                  <>
                                    <DropdownMenuItem onClick={() => navigate(createPageUrl(`StaffProfile?staff_email=${staff.email}`))}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
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
                        
                        {staff.isTeamMemberOnly && (
                          <div className="mb-2">
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                              Pending User Account
                            </Badge>
                          </div>
                        )}

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {staff.position && (
                            <Badge className={`${getPositionColor(staff.position)} text-xs border`}>
                              {staff.position.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {staff.department && (
                            <Badge variant="outline" className={`${getDepartmentColor(staff.department)} text-xs border`}>
                              {staff.department.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {staff.status && staff.status !== 'active' && (
                            <Badge className={`${getStatusColor(staff.status)} text-xs border`}>
                              {staff.status.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Contact Info */}
                        <div className="space-y-1.5 text-sm">
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
                    <th className="text-center p-4 text-sm font-semibold text-gray-700">Status</th>
                    {isManager && <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id || staff.email} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {staff.photo_url ? (
                            <img
                              src={staff.photo_url}
                              alt={staff.full_name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                              {(staff.full_name?.charAt(0)?.toUpperCase() || "?")}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{staff.full_name}</p>
                            <p className="text-sm text-gray-500">{staff.email}</p>
                            {staff.isTeamMemberOnly && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs mt-1">
                                Pending User Account
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {staff.position ? (
                          <Badge className={`${getPositionColor(staff.position)} text-xs border`}>
                            {staff.position.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {staff.department ? (
                          <Badge variant="outline" className={`${getDepartmentColor(staff.department)} text-xs border`}>
                            {staff.department.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {staff.status ? (
                          <Badge className={`${getStatusColor(staff.status)} text-xs border`}>
                            {staff.status.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 text-xs border border-gray-200">
                            Unknown
                          </Badge>
                        )}
                      </td>
                      {isManager && (
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            {!staff.isTeamMemberOnly && (
                              <Link to={createPageUrl(`StaffProfile?staff_email=${staff.email}`)}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
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
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center gap-4 pb-4 border-b border-gray-200">
                <div className="relative">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Staff photo"
                      className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-5xl font-bold border-4 border-blue-100 shadow-lg">
                      {formData.staff_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <input
                    type="file"
                    id="photo-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload').click()}
                    disabled={uploadingPhoto}
                    className="mb-2"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingPhoto ? 'Uploading...' : photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {photoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, photo_url: "" });
                        setPhotoPreview(null);
                      }}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      Remove Photo
                    </Button>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Recommended: Square image, max 5MB
                  </p>
                </div>
              </div>

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
                Are you sure you want to remove <strong>{memberToDelete?.full_name || memberToDelete?.staff_name}</strong> from the team?
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