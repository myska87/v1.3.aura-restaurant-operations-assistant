import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Filter,
  Search,
  Calendar,
  FileText,
  Star,
  Package,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  Home,
  Download,
  Trash2,
  Eye,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function EventFeed() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';
  const isManager = user?.position === 'manager' || isAdmin;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['allEvents'],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('-created_date', 200);
      
      if (isAdmin) return allEvents;
      if (isManager) {
        return allEvents.filter(e => 
          e.recipient_emails?.includes(user.email) ||
          e.recipient_roles?.includes('manager') ||
          e.recipient_roles?.includes('all')
        );
      }
      
      return allEvents.filter(e => 
        e.recipient_emails?.includes(user.email) ||
        e.recipient_roles?.includes(user.position) ||
        e.recipient_roles?.includes('all')
      );
    },
    enabled: !!user?.email,
  });

  const markReadMutation = useMutation({
    mutationFn: async (eventId) => {
      const event = events.find(e => e.id === eventId);
      const readBy = event.read_by || [];
      
      if (!readBy.some(r => r.user_email === user.email)) {
        readBy.push({
          user_email: user.email,
          user_name: user.full_name,
          read_at: new Date().toISOString()
        });
      }

      return await base44.entities.Event.update(eventId, { read_by: readBy, status: 'read' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEvents'] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId) => base44.entities.Event.delete(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEvents'] });
    },
  });

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchQuery || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesModule = filterModule === 'all' || event.source_module === filterModule;
    const matchesSeverity = filterSeverity === 'all' || event.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;

    return matchesSearch && matchesModule && matchesSeverity && matchesStatus;
  });

  const stats = {
    total: events.length,
    unread: events.filter(e => e.status === 'unread').length,
    critical: events.filter(e => e.severity === 'critical').length,
    today: events.filter(e => {
      const eventDate = new Date(e.created_date);
      const today = new Date();
      return eventDate.toDateString() === today.toDateString();
    }).length,
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (severity === 'warning') return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    if (severity === 'success') return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <Info className="w-5 h-5 text-blue-600" />;
  };

  const getSeverityColor = (severity) => {
    if (severity === 'critical') return 'bg-red-50 border-red-200';
    if (severity === 'warning') return 'bg-amber-50 border-amber-200';
    if (severity === 'success') return 'bg-green-50 border-green-200';
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Event Feed</h1>
              <p className="text-gray-600">Complete history of all system events and alerts</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Bell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Events</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-red-900">{stats.critical}</p>
              <p className="text-sm text-gray-600">Critical Alerts</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Info className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-blue-900">{stats.unread}</p>
              <p className="text-sm text-gray-600">Unread</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-purple-900">{stats.today}</p>
              <p className="text-sm text-gray-600">Today</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events..."
                  className="pl-10"
                />
              </div>

              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="rota">Rota</SelectItem>
                  <SelectItem value="sop">SOPs</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="hygiene">Hygiene</SelectItem>
                  <SelectItem value="ai">AI Insights</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                </SelectContent>
              </Select>

              {isAdmin && (
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading events...</p>
              </CardContent>
            </Card>
          ) : filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No events found</p>
              </CardContent>
            </Card>
          ) : (
            filteredEvents.map((event, index) => {
              const isRead = event.read_by?.some(r => r.user_email === user?.email);

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className={`border-2 ${getSeverityColor(event.severity)} ${isRead ? 'opacity-70' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {getSeverityIcon(event.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
                              {!isRead && (
                                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                              )}
                            </div>
                            <p className="text-gray-700 mb-3">{event.message}</p>
                            
                            <div className="flex flex-wrap gap-2 text-sm mb-3">
                              <Badge variant="outline" className="capitalize">
                                {event.source_module}
                              </Badge>
                              <Badge className={
                                event.severity === 'critical' ? 'bg-red-600 text-white' :
                                event.severity === 'warning' ? 'bg-amber-600 text-white' :
                                event.severity === 'success' ? 'bg-green-600 text-white' :
                                'bg-blue-600 text-white'
                              }>
                                {event.severity}
                              </Badge>
                              {event.linked_entity_name && (
                                <Badge variant="outline">
                                  🔗 {event.linked_entity_name}
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-gray-500">
                              {format(new Date(event.created_date), 'MMM d, yyyy h:mm a')} 
                              ({formatDistanceToNow(new Date(event.created_date), { addSuffix: true })})
                            </p>

                            {event.auto_action_triggered && (
                              <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded">
                                <p className="text-xs text-purple-800">
                                  <Sparkles className="w-3 h-3 inline mr-1" />
                                  Auto-action: {event.auto_action_type}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {event.action_url && (
                            <Link to={event.action_url}>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm('Delete this event?')) {
                                  deleteEventMutation.mutate(event.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}