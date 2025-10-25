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
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function TeamDirectory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPosition, setFilterPosition] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

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
    notes: "",
    status: "active",
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

  // Merge staff with team member data
  const enrichedStaff = allStaff.map(staff => {
    const teamMember = teamMembers.find(tm => tm.staff_email === staff.email);
    return {
      ...staff,
      ...teamMember,
      position: teamMember?.position || staff.position,
      phone: teamMember?.phone || staff.phone,
    };
  });

  const filteredStaff = enrichedStaff.filter(staff => {
    const matchesSearch = 
      staff.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.position?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPosition = filterPosition === 'all' || staff.position === filterPosition;
    const matchesDepartment = filterDepartment === 'all' || staff.department === filterDepartment;
    
    return matchesSearch && matchesPosition && matchesDepartment;
  });

  // Create/Update Team Member
  const saveMemberMutation = useMutation({
    mutationFn: async (data) => {
      if (editingMember) {
        // Update existing
        return await base44.entities.TeamMember.update(editingMember.id, data);
      } else {
        // Create new
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

  // Delete Team Member
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
      notes: "",
      status: "active",
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
      notes: member.notes || "",
      status: member.status || "active",
    });
    setShowAddDialog(true);
  };

  const closeDialog = () => {
    setShowAddDialog(false);
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
      notes: "",
      status: "active",
    });
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
    if (memberToDelete) {
      deleteMemberMutation.mutate(memberToDelete.id);
    }
  };

  const getPositionColor = (position) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      chef: 'bg-red-100 text-red-800',
      line_cook: 'bg-orange-100 text-orange-800',
      server: 'bg-green-100 text-green-800',
      bartender: 'bg-teal-100 text-teal-800',
      cleaner: 'bg-gray-100 text-gray-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
    };
    return colors[position] || 'bg-gray-100 text-gray-800';
  };

  const getDepartmentColor = (department) => {
    const colors = {
      kitchen: 'bg-red-50 text-red-700',
      front_of_house: 'bg-blue-50 text-blue-700',
      bar: 'bg-purple-50 text-purple-700',
      management: 'bg-indigo-50 text-indigo-700',
      cleaning: 'bg-green-50 text-green-700',
      maintenance: 'bg-yellow-50 text-yellow-700',
    };
    return colors[department] || 'bg-gray-50 text-gray-700';
  };

  // Available options
  const availablePositions = [
    { value: "manager", label: "Manager" },
    { value: "chef", label: "Chef" },
    { value: "line_cook", label: "Line Cook" },
    { value: "server", label: "Server" },
    { value: "bartender", label: "Bartender" },
    { value: "cleaner", label: "Cleaner" },
    { value: "maintenance", label: "Maintenance" },
    { value: "owner", label: "Owner" },
  ];

  const availableDepartments = [
    { value: "kitchen", label: "Kitchen" },
    { value: "front_of_house", label: "Front of House" },
    { value: "bar", label: "Bar" },
    { value: "management", label: "Management" },
    { value: "cleaning", label: "Cleaning" },
    { value: "maintenance", label: "Maintenance" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("CommunicationFeedback")}>
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

        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-10 h-10 text-green-600" />
              <h1 className="text-4xl font-bold text-gray-900">Team Directory</h1>
            </div>
            <p className="text-gray-600">Connect with your colleagues</p>
          </div>
          
          {isManager && (
            <Button onClick={handleOpenAddDialog} className="bg-green-600 hover:bg-green-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or position..."
                  className="pl-10"
                />
              </div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-48">
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
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {availablePositions.map(pos => (
                    <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{enrichedStaff.length}</p>
              <p className="text-sm text-gray-600">Total Team Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">
                {enrichedStaff.filter(s => s.position === 'manager' || s.position === 'owner').length}
              </p>
              <p className="text-sm text-gray-600">Management</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600">
                {enrichedStaff.filter(s => s.department === 'kitchen').length}
              </p>
              <p className="text-sm text-gray-600">Kitchen Staff</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {enrichedStaff.filter(s => s.department === 'front_of_house').length}
              </p>
              <p className="text-sm text-gray-600">Front of House</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((staff, index) => (
            <motion.div
              key={staff.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="bg-white border-none shadow-sm hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      {staff.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-lg text-gray-900 truncate">
                          {staff.full_name}
                        </h3>
                        {isManager && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(createPageUrl(`StaffProfile?staff_email=${staff.email}`))}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
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
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={getPositionColor(staff.position)}>
                          {staff.position?.replace(/_/g, ' ')}
                        </Badge>
                        {staff.department && (
                          <Badge variant="outline" className={getDepartmentColor(staff.department)}>
                            {staff.department?.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{staff.email}</span>
                        </div>
                        {staff.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span>{staff.phone}</span>
                          </div>
                        )}
                        {staff.hire_date && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>Joined {format(new Date(staff.hire_date), 'MMM yyyy')}</span>
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

        {filteredStaff.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No team members found</p>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? 'Edit Team Member' : 'Add New Team Member'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email *</Label>
                  <Input
                    value={formData.staff_email}
                    onChange={(e) => setFormData({...formData, staff_email: e.target.value})}
                    placeholder="email@example.com"
                    disabled={!!editingMember}
                  />
                </div>
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.staff_name}
                    onChange={(e) => setFormData({...formData, staff_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Position *</Label>
                  <Select 
                    value={formData.position} 
                    onValueChange={(value) => setFormData({...formData, position: value})}
                  >
                    <SelectTrigger>
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
                  <Label>Department</Label>
                  <Select 
                    value={formData.department} 
                    onValueChange={(value) => setFormData({...formData, department: value})}
                  >
                    <SelectTrigger>
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
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+44 7XXX XXXXXX"
                  />
                </div>
                <div>
                  <Label>Hire Date</Label>
                  <Input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Shift Start Time</Label>
                  <Input
                    type="time"
                    value={formData.shift_start}
                    onChange={(e) => setFormData({...formData, shift_start: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Shift End Time</Label>
                  <Input
                    type="time"
                    value={formData.shift_end}
                    onChange={(e) => setFormData({...formData, shift_end: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Emergency Contact</Label>
                <Input
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                  placeholder="Name: Phone"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              {editingMember && (
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="probation">Probation</SelectItem>
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
                className="bg-green-600 hover:bg-green-700"
              >
                {saveMemberMutation.isPending 
                  ? 'Saving...' 
                  : editingMember ? 'Update Member' : 'Add Member'
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Removal</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Are you sure you want to remove <strong>{memberToDelete?.staff_name || memberToDelete?.full_name}</strong> from the team?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This will set their status to inactive. You can reactivate them later.
              </p>
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
                {deleteMemberMutation.isPending ? 'Removing...' : 'Remove Member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}