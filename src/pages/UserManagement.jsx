import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Shield,
  Lock,
  Unlock,
  UserPlus,
  RefreshCw,
  Home,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Mail,
  Link as LinkIcon,
  Loader2,
  X,
  Copy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [syncing, setSyncing] = useState(false);
  
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteType, setInviteType] = useState('email');
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    name: '',
    position: 'server',
    department: 'front_of_house',
  });
  const [generatedLink, setGeneratedLink] = useState(null);
  const [showRegistrationRequests, setShowRegistrationRequests] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    position: '',
    department: '',
    phone: '',
    status: 'active',
    hire_date: '',
    hourly_rate: '',
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.position === 'owner';
  const isManager = currentUser?.position === 'manager';

  const { data: allUsers = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list('-created_date'),
    staleTime: 0,
  });

  const { data: teamMembers = [], refetch: refetchTeamMembers } = useQuery({
    queryKey: ['allTeamMembers'],
    queryFn: () => base44.entities.TeamMember.list('-created_date'),
    staleTime: 0,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['userInvitations'],
    queryFn: () => base44.entities.UserInvitation.list('-created_date'),
  });

  const { data: registrationRequests = [] } = useQuery({
    queryKey: ['registrationRequests'],
    queryFn: () => base44.entities.RegistrationRequest.filter({ status: 'pending' }),
  });

  const unifiedUsers = React.useMemo(() => {
    const userMap = new Map();

    allUsers.forEach(user => {
      userMap.set(user.email, {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        position: user.position,
        department: user.department,
        phone: user.phone,
        photo_url: user.photo_url,
        status: user.status || 'active',
        hire_date: user.hire_date,
        role: user.role,
        hourly_rate: user.hourly_rate,
        created_date: user.created_date,
        source: 'user',
        has_team_member: false,
        team_member_id: null,
      });
    });

    teamMembers.forEach(member => {
      if (userMap.has(member.staff_email)) {
        const existing = userMap.get(member.staff_email);
        userMap.set(member.staff_email, {
          ...existing,
          full_name: member.staff_name || existing.full_name,
          position: member.position || existing.position,
          department: member.department || existing.department,
          phone: member.phone || existing.phone,
          photo_url: member.photo_url || existing.photo_url,
          status: member.status || existing.status,
          has_team_member: true,
          team_member_id: member.id,
        });
      } else {
        userMap.set(member.staff_email, {
          id: null,
          email: member.staff_email,
          full_name: member.staff_name,
          position: member.position,
          department: member.department,
          phone: member.phone,
          photo_url: member.photo_url,
          status: member.status,
          hire_date: member.hire_date,
          role: 'user',
          hourly_rate: member.hourly_rate,
          created_date: member.created_date,
          source: 'team_member_only',
          has_team_member: true,
          team_member_id: member.id,
        });
      }
    });

    return Array.from(userMap.values()).sort((a, b) => 
      (a.full_name || '').localeCompare(b.full_name || '')
    );
  }, [allUsers, teamMembers]);

  const filteredUsers = unifiedUsers.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || user.position === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: unifiedUsers.length,
    active: unifiedUsers.filter(u => u.status === 'active').length,
    managers: unifiedUsers.filter(u => u.position === 'manager' || u.position === 'owner').length,
    synced: unifiedUsers.filter(u => u.has_team_member).length,
  };

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, teamMemberId, data }) => {
      const promises = [];
      
      if (userId) {
        promises.push(base44.entities.User.update(userId, {
          position: data.position,
          department: data.department,
          phone: data.phone,
          status: data.status,
          hire_date: data.hire_date,
          hourly_rate: parseFloat(data.hourly_rate) || 0,
        }));
      }

      if (teamMemberId) {
        promises.push(base44.entities.TeamMember.update(teamMemberId, {
          staff_name: data.full_name,
          position: data.position,
          department: data.department,
          phone: data.phone,
          status: data.status,
          hire_date: data.hire_date,
          hourly_rate: parseFloat(data.hourly_rate) || 0,
        }));
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
      setShowEditDialog(false);
      setEditingUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, teamMemberId }) => {
      const promises = [];
      
      if (userId) {
        promises.push(base44.entities.User.update(userId, { status: 'inactive' }));
      }
      if (teamMemberId) {
        promises.push(base44.entities.TeamMember.update(teamMemberId, { status: 'inactive' }));
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
      setShowDeleteDialog(false);
      setUserToDelete(null);
    },
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async (inviteData) => {
      const invitationCode = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const registrationLink = `${window.location.origin}/register?code=${invitationCode}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await base44.entities.UserInvitation.create({
        invitation_code: invitationCode,
        invited_email: inviteData.email,
        invited_name: inviteData.name,
        invited_position: inviteData.position,
        invited_department: inviteData.department,
        invited_by: currentUser.email,
        invited_by_name: currentUser.full_name,
        invitation_type: inviteData.type,
        registration_link: registrationLink,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      });

      if (inviteData.type === 'email') {
        try {
          await base44.integrations.Core.SendEmail({
            to: inviteData.email,
            subject: `You are invited to join ${currentUser.full_name} team`,
            body: `
Hello ${inviteData.name},

You have been invited to join our team as a ${inviteData.position}!

To complete your registration, please click the link below:
${registrationLink}

This invitation will expire in 7 days.

Best regards,
${currentUser.full_name}
            `.trim(),
          });

          await base44.entities.UserInvitation.update(invitation.id, {
            email_sent_at: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Email send error:', error);
        }
      }

      return invitation;
    },
    onSuccess: (invitation) => {
      queryClient.invalidateQueries({ queryKey: ['userInvitations'] });
      
      if (inviteType === 'link') {
        setGeneratedLink(invitation.registration_link);
      } else {
        setShowInviteDialog(false);
        setInviteFormData({ email: '', name: '', position: 'server', department: 'front_of_house' });
        alert('✅ Invitation sent successfully!');
      }
    },
  });

  const approveRegistrationMutation = useMutation({
    mutationFn: async (request) => {
      await base44.entities.RegistrationRequest.update(request.id, {
        status: 'approved',
        reviewed_by: currentUser.email,
        reviewed_by_name: currentUser.full_name,
        reviewed_at: new Date().toISOString(),
      });

      try {
        await base44.integrations.Core.SendEmail({
          to: request.email,
          subject: 'Your registration has been approved!',
          body: `
Hello ${request.full_name},

Great news! Your registration has been approved.

You can now log in to the system with your credentials.

Welcome to the team!

Best regards,
${currentUser.full_name}
          `.trim(),
        });
      } catch (error) {
        console.error('Email error:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrationRequests'] });
      alert('✅ Registration approved!');
    },
  });

  const rejectRegistrationMutation = useMutation({
    mutationFn: async ({ request, reason }) => {
      await base44.entities.RegistrationRequest.update(request.id, {
        status: 'rejected',
        reviewed_by: currentUser.email,
        reviewed_by_name: currentUser.full_name,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      });

      try {
        await base44.integrations.Core.SendEmail({
          to: request.email,
          subject: 'Registration Update',
          body: `
Hello ${request.full_name},

Thank you for your interest in joining our team.

Unfortunately, we are unable to approve your registration at this time.

${reason ? `Reason: ${reason}` : ''}

Best regards,
${currentUser.full_name}
          `.trim(),
        });
      } catch (error) {
        console.error('Email error:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrationRequests'] });
      alert('Registration rejected');
    },
  });

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      position: user.position || '',
      department: user.department || '',
      phone: user.phone || '',
      status: user.status || 'active',
      hire_date: user.hire_date || '',
      hourly_rate: user.hourly_rate || '',
    });
    setShowEditDialog(true);
  };

  const handleSaveUser = () => {
    if (!editingUser) return;

    updateUserMutation.mutate({
      userId: editingUser.id,
      teamMemberId: editingUser.team_member_id,
      data: formData,
    });
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;

    deleteUserMutation.mutate({
      userId: userToDelete.id,
      teamMemberId: userToDelete.team_member_id,
    });
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await refetchUsers();
      await refetchTeamMembers();
      sessionStorage.removeItem('unified_user_sync_done');
      window.location.reload();
    } catch (error) {
      console.error('Sync error:', error);
    }
    setSyncing(false);
  };

  const handleSendInvite = () => {
    if (!inviteFormData.email || !inviteFormData.name) {
      alert('Please fill in all required fields');
      return;
    }

    sendInvitationMutation.mutate({
      ...inviteFormData,
      type: inviteType,
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard!');
  };

  const getRoleColor = (position) => {
    const colors = {
      owner: 'bg-red-100 text-red-800 border-red-200',
      manager: 'bg-purple-100 text-purple-800 border-purple-200',
      chef: 'bg-orange-100 text-orange-800 border-orange-200',
      server: 'bg-blue-100 text-blue-800 border-blue-200',
      bartender: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      cleaner: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[position] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              Only administrators and managers can access user management.
            </p>
            <Link to={createPageUrl('Dashboard')}>
              <Button>
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
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('ManagerDashboard')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Manager Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600">Unified staff directory & access control</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSyncAll}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync All'}
            </Button>
            
            <Button
              onClick={() => {
                setShowInviteDialog(true);
                setGeneratedLink(null);
                setInviteFormData({ email: '', name: '', position: 'server', department: 'front_of_house' });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>

            {registrationRequests.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowRegistrationRequests(true)}
                className="relative"
              >
                <Users className="w-4 h-4 mr-2" />
                Registrations
                <Badge className="ml-2 bg-red-500 text-white">
                  {registrationRequests.length}
                </Badge>
              </Button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <Users className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active</p>
                    <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Managers</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.managers}</p>
                  </div>
                  <Shield className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Synced</p>
                    <p className="text-3xl font-bold text-indigo-600">{stats.synced}</p>
                  </div>
                  <UserCheck className="w-10 h-10 text-indigo-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[250px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="pl-10"
                />
              </div>

              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="bartender">Bartender</SelectItem>
                  <SelectItem value="cleaner">Cleaner</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sync Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.email} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.photo_url ? (
                            <img
                              src={user.photo_url}
                              alt={user.full_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                              {user.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`${getRoleColor(user.position)} border`}>
                          {user.position || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`${getStatusColor(user.status)} border`}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.has_team_member ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 border">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Synced
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 border">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setUserToDelete(user);
                              setShowDeleteDialog(true);
                            }}>
                              {user.status === 'active' ? (
                                <>
                                  <Lock className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setUserToDelete(user);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Send an invitation via email or generate a registration link
              </DialogDescription>
            </DialogHeader>

            {!generatedLink ? (
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={inviteType === 'email' ? 'default' : 'outline'}
                    onClick={() => setInviteType('email')}
                    className="flex-1"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Invitation
                  </Button>
                  <Button
                    variant={inviteType === 'link' ? 'default' : 'outline'}
                    onClick={() => setInviteType('link')}
                    className="flex-1"
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Registration Link
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="inviteEmail">Email Address *</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteFormData.email}
                      onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="inviteName">Full Name *</Label>
                    <Input
                      id="inviteName"
                      value={inviteFormData.name}
                      onChange={(e) => setInviteFormData({ ...inviteFormData, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invitePosition">Position</Label>
                      <Select
                        value={inviteFormData.position}
                        onValueChange={(value) => setInviteFormData({ ...inviteFormData, position: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="chef">Chef</SelectItem>
                          <SelectItem value="sous_chef">Sous Chef</SelectItem>
                          <SelectItem value="line_cook">Line Cook</SelectItem>
                          <SelectItem value="server">Server</SelectItem>
                          <SelectItem value="bartender">Bartender</SelectItem>
                          <SelectItem value="host">Host</SelectItem>
                          <SelectItem value="cleaner">Cleaner</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="inviteDepartment">Department</Label>
                      <Select
                        value={inviteFormData.department}
                        onValueChange={(value) => setInviteFormData({ ...inviteFormData, department: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="management">Management</SelectItem>
                          <SelectItem value="kitchen">Kitchen</SelectItem>
                          <SelectItem value="front_of_house">Front of House</SelectItem>
                          <SelectItem value="bar">Bar</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendInvite}
                    disabled={sendInvitationMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {sendInvitationMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        {inviteType === 'email' ? <Mail className="w-4 h-4 mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                        {inviteType === 'email' ? 'Send Invitation' : 'Generate Link'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">Registration Link Generated!</h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Share this link with the new user:</p>
                  <p className="text-sm font-mono bg-white p-3 rounded border break-all">
                    {generatedLink}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGeneratedLink(null);
                      setShowInviteDialog(false);
                    }}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(generatedLink)}
                    className="flex-1 bg-blue-600"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showRegistrationRequests} onOpenChange={setShowRegistrationRequests}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registration Requests ({registrationRequests.length})</DialogTitle>
              <DialogDescription>
                Review and approve new user registrations
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {registrationRequests.map((request) => (
                <Card key={request.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {request.photo_url ? (
                            <img
                              src={request.photo_url}
                              alt={request.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                              {request.full_name?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-lg">{request.full_name}</h3>
                            <p className="text-sm text-gray-600">{request.email}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Position</p>
                            <p className="font-medium">{request.desired_position}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Department</p>
                            <p className="font-medium">{request.desired_department}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="font-medium">{request.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Submitted</p>
                            <p className="font-medium">
                              {request.requested_at ? format(new Date(request.requested_at), 'PPp') : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {request.message && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Message</p>
                            <p className="text-sm bg-gray-50 p-3 rounded">{request.message}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => approveRegistrationMutation.mutate(request)}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={approveRegistrationMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            const reason = prompt('Reason for rejection (optional):');
                            rejectRegistrationMutation.mutate({ request, reason });
                          }}
                          disabled={rejectRegistrationMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {registrationRequests.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No pending registration requests
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  disabled
                />
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  value={formData.email}
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Position</Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => setFormData({ ...formData, position: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="chef">Chef</SelectItem>
                      <SelectItem value="sous_chef">Sous Chef</SelectItem>
                      <SelectItem value="line_cook">Line Cook</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="bartender">Bartender</SelectItem>
                      <SelectItem value="host">Host</SelectItem>
                      <SelectItem value="cleaner">Cleaner</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="front_of_house">Front of House</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Hire Date</Label>
                  <Input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Hourly Rate (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogDescription>
                Are you sure you want to deactivate {userToDelete?.full_name}? They will no longer be able to access the system.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? 'Processing...' : 'Deactivate User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}