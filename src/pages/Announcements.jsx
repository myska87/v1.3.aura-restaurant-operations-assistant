import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import { Megaphone, Plus, Pin, AlertCircle, Calendar, User, ArrowLeft, Home, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Announcements() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'info',
    department: 'all',
    is_pinned: false,
    target_audience: 'all',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-created_date'),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: isManager,
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data) => {
      const announcement = await base44.entities.Announcement.create(data);
      
      // Create notifications for all relevant users
      const targetUsers = formData.target_audience === 'all' 
        ? allUsers 
        : allUsers.filter(u => {
            if (formData.target_audience === 'managers') return u.position === 'manager' || u.position === 'owner';
            if (formData.target_audience === 'kitchen') return ['chef', 'sous_chef', 'line_cook'].includes(u.position);
            if (formData.target_audience === 'front_of_house') return ['server', 'bartender', 'host'].includes(u.position);
            if (formData.target_audience === 'bar') return u.position === 'bartender';
            return true;
          });

      for (const targetUser of targetUsers) {
        await base44.entities.Notification.create({
          user_email: targetUser.email,
          user_name: targetUser.full_name,
          type: 'announcement',
          title: data.title,
          message: data.content.substring(0, 200),
          link_module: 'Announcements',
          priority: data.priority === 'urgent' ? 'high' : 'normal',
          sender_email: user?.email,
          sender_name: user?.full_name,
          target_audience: formData.target_audience,
        });
      }

      return announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowForm(false);
      setFormData({
        title: '',
        content: '',
        priority: 'info',
        department: 'all',
        is_pinned: false,
        target_audience: 'all',
      });
      alert('✅ Announcement posted and notifications sent!');
    },
  });

  const updatePinMutation = useMutation({
    mutationFn: ({ id, is_pinned }) => base44.entities.Announcement.update(id, { is_pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createAnnouncementMutation.mutate({
      ...formData,
      created_by_email: user?.email,
      created_by_name: user?.full_name,
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-50';
      case 'celebration':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-600">🚨 Urgent</Badge>;
      case 'celebration':
        return <Badge className="bg-yellow-600">🎉 Celebration</Badge>;
      default:
        return <Badge className="bg-blue-600">ℹ️ Info</Badge>;
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('CommunicationFeedback')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Communication Hub
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-[#014D40]" />
              Team Announcements
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Company-wide updates and important news</p>
          </div>
          {isManager && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Post Announcement
            </Button>
          )}
        </div>

        {/* Announcements Feed */}
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-12 text-center">
                <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No announcements yet</p>
              </CardContent>
            </Card>
          ) : (
            announcements.map((announcement) => (
              <Card
                key={announcement.id}
                className={`border-l-4 ${getPriorityColor(announcement.priority)} dark:bg-gray-800`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {announcement.is_pinned && (
                          <Pin className="w-5 h-5 text-[#014D40]" />
                        )}
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {announcement.title}
                        </h3>
                        {getPriorityBadge(announcement.priority)}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {announcement.content}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {announcement.created_by_name}
                      </span>
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDistanceToNow(new Date(announcement.created_date), { addSuffix: true })}
                      </span>
                      {announcement.department !== 'all' && (
                        <Badge variant="outline">{announcement.department}</Badge>
                      )}
                    </div>

                    {isManager && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updatePinMutation.mutate({
                          id: announcement.id,
                          is_pinned: !announcement.is_pinned,
                        })}
                        className={announcement.is_pinned ? 'text-[#014D40]' : 'text-gray-400'}
                      >
                        <Pin className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Post Announcement Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-[#014D40]" />
                Post Team Announcement
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., New Menu Launch This Friday!"
                  required
                  className="text-lg"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Message *</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Share your announcement with the team..."
                  rows={6}
                  required
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Priority</label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">ℹ️ Info</SelectItem>
                      <SelectItem value="urgent">🚨 Urgent</SelectItem>
                      <SelectItem value="celebration">🎉 Celebration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Department</label>
                  <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="front_of_house">Front of House</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Send To</label>
                  <Select value={formData.target_audience} onValueChange={(v) => setFormData({ ...formData, target_audience: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🌍 Everyone</SelectItem>
                      <SelectItem value="managers">👔 Managers Only</SelectItem>
                      <SelectItem value="kitchen">👨‍🍳 Kitchen Staff</SelectItem>
                      <SelectItem value="front_of_house">👥 Front of House</SelectItem>
                      <SelectItem value="bar">🍹 Bar Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="w-4 h-4"
                  id="pin-announcement"
                />
                <label htmlFor="pin-announcement" className="text-sm font-semibold flex items-center gap-2">
                  <Pin className="w-4 h-4" />
                  Pin to top of feed
                </label>
              </div>

              <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <Bell className="w-4 h-4 inline mr-2" />
                    <strong>Notifications:</strong> All selected staff will receive a bell notification instantly.
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAnnouncementMutation.isPending}
                  className="bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  {createAnnouncementMutation.isPending ? 'Posting...' : 'Post Announcement'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}