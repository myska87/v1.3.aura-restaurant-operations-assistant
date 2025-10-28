import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  Eye,
  Check,
  Calendar,
  FileText,
  Star,
  Package,
  Clock,
  Shield,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, my_alerts, manager, system

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Fetch events for current user
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['userEvents', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      const allEvents = await base44.entities.Event.list('-created_date', 50);
      
      // Filter events for this user
      return allEvents.filter(event => {
        const isRecipient = event.recipient_emails?.includes(user.email);
        const isRoleMatch = event.recipient_roles?.includes(user.position) || event.recipient_roles?.includes('all');
        return isRecipient || isRoleMatch;
      });
    },
    enabled: !!user?.email,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mark as read mutation
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

      return await base44.entities.Event.update(eventId, {
        status: 'read',
        read_by: readBy
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] });
    },
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (eventId) => {
      return await base44.entities.Event.update(eventId, {
        status: 'acknowledged',
        acknowledged_by: user.email,
        acknowledged_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] });
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (eventId) => {
      return await base44.entities.Event.update(eventId, {
        status: 'dismissed',
        dismissed_by: user.email,
        dismissed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] });
    },
  });

  // Filter events
  const filteredEvents = events.filter(event => {
    if (filter === 'my_alerts') {
      return event.recipient_emails?.includes(user?.email);
    }
    if (filter === 'manager' && isManager) {
      return event.recipient_roles?.includes('manager') || event.severity === 'critical';
    }
    if (filter === 'system') {
      return event.source_module === 'system' || event.source_module === 'ai';
    }
    return true; // 'all'
  });

  const unreadCount = events.filter(e => {
    const isReadByMe = e.read_by?.some(r => r.user_email === user?.email);
    return !isReadByMe && e.status === 'unread';
  }).length;

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

  const getModuleIcon = (module) => {
    const icons = {
      rota: Calendar,
      sop: FileText,
      quality: Star,
      inventory: Package,
      hygiene: Shield,
      checklist: CheckCircle,
      ai: Sparkles,
      system: Info,
    };
    const Icon = icons[module] || Info;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-600 text-white text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Notification Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">Notifications</h3>
                  <button onClick={() => setIsOpen(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filter === 'all' ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                    }`}
                  >
                    All ({events.length})
                  </button>
                  <button
                    onClick={() => setFilter('my_alerts')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filter === 'my_alerts' ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                    }`}
                  >
                    Mine
                  </button>
                  {isManager && (
                    <button
                      onClick={() => setFilter('manager')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        filter === 'manager' ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                      }`}
                    >
                      Manager
                    </button>
                  )}
                  <button
                    onClick={() => setFilter('system')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filter === 'system' ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                    }`}
                  >
                    System
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-[500px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No notifications</p>
                    <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredEvents.map((event, index) => {
                      const isRead = event.read_by?.some(r => r.user_email === user?.email) || event.status !== 'unread';
                      
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-4 hover:bg-gray-50 transition-colors ${
                            isRead ? 'opacity-70' : ''
                          }`}
                        >
                          <div className={`border-l-4 pl-3 ${getSeverityColor(event.severity)}`}>
                            <div className="flex items-start gap-3 mb-2">
                              {getSeverityIcon(event.severity)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className={`font-semibold text-sm ${isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                                    {event.title}
                                  </h4>
                                  {!isRead && (
                                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700 mb-2">{event.message}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  {getModuleIcon(event.source_module)}
                                  <span className="capitalize">{event.source_module}</span>
                                  <span>•</span>
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDistanceToNow(new Date(event.created_date), { addSuffix: true })}</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-3">
                              {event.action_url && (
                                <Link to={event.action_url} onClick={() => setIsOpen(false)}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7"
                                    onClick={() => markReadMutation.mutate(event.id)}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                </Link>
                              )}
                              {!isRead && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => markReadMutation.mutate(event.id)}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Mark Read
                                </Button>
                              )}
                              {event.severity === 'critical' && event.status !== 'acknowledged' && (
                                <Button
                                  size="sm"
                                  className="text-xs h-7 bg-red-600 hover:bg-red-700"
                                  onClick={() => acknowledgeMutation.mutate(event.id)}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Acknowledge
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7"
                                onClick={() => dismissMutation.mutate(event.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {filteredEvents.length > 0 && (
                <div className="p-3 border-t bg-gray-50">
                  <Link to="/event-feed" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full text-emerald-600">
                      View All Events →
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}