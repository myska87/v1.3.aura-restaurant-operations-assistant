import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, RefreshCw, Home, ArrowLeft, CheckCircle, AlertTriangle, Shield, UserCheck, UserPlus, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [syncing, setSyncing] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.position === 'owner';
  const isManager = currentUser?.position === 'manager';

  const { data: allUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { data: teamMembers = [], refetch: refetchTeamMembers } = useQuery({
    queryKey: ['allTeamMembers'],
    queryFn: () => base44.entities.TeamMember.list('-created_date'),
  });

  const unifiedUsers = useMemo(() => {
    const userMap = new Map();
    allUsers.forEach(user => {
      userMap.set(user.email, {
        ...user,
        source: 'user',
        has_team_member: false,
      });
    });
    teamMembers.forEach(member => {
      if (userMap.has(member.staff_email)) {
        userMap.set(member.staff_email, {
          ...userMap.get(member.staff_email),
          has_team_member: true,
        });
      }
    });
    return Array.from(userMap.values());
  }, [allUsers, teamMembers]);

  const filteredUsers = unifiedUsers.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || user.position === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSyncAll = async () => {
    setSyncing(true);
    await refetchUsers();
    await refetchTeamMembers();
    setSyncing(false);
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">Only admins can access this page.</p>
            <Link to={createPageUrl('Dashboard')}>
              <Button><Home className="w-4 h-4 mr-2" />Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('ManagerDashboard')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />Manager Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-gray-600">Staff directory & access control</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncAll} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
            <Button className="bg-blue-600">
              <UserPlus className="w-4 h-4 mr-2" />Invite User
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Users</p>
                    <p className="text-3xl font-bold">{unifiedUsers.length}</p>
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
                    <p className="text-3xl font-bold text-green-600">{unifiedUsers.filter(u => u.status === 'active').length}</p>
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
                    <p className="text-3xl font-bold text-purple-600">{unifiedUsers.filter(u => u.position === 'manager' || u.position === 'owner').length}</p>
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
                    <p className="text-3xl font-bold text-indigo-600">{unifiedUsers.filter(u => u.has_team_member).length}</p>
                  </div>
                  <UserCheck className="w-10 h-10 text-indigo-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
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
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <tr key={user.email} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {user.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="bg-purple-100 text-purple-800">{user.position || 'N/A'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {user.status || 'active'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {user.has_team_member ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />Synced
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />Pending
                          </Badge>
                        )}
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
      </div>
    </div>
  );
}