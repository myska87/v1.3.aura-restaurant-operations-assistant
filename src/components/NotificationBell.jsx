import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, CheckCircle, Clock, Calendar, FileText, AlertCircle, Trophy, Megaphone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { createPageUrl } from '@/utils';

const NOTIFICATION_ICONS = {
  announcement: { icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-100' },
  task_reminder: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
  shift_reminder: { icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  sop_update: { icon: FileText, color: 'text-amber-600', bg: 'bg-amber-100' },
  form_due: { icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  manager_message: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
  achievement: { icon: Trophy, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  system_alert: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter(
      { user_email: user?.email },
      '-created_date',
      50
    ),
    enabled: !!user?.email,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Notification.update(id, {
      is_read: true,
      read_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      for (const notif of unread) {
        await base44.entities.Notification.update(notif.id, {
          is_read: true,
          read_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate({ id: notification.id });
    }
    
    if (notification.link_module) {
      window.location.href = createPageUrl(notification.link_module);
    }
  };

  return (
    <>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
          </div>
        )}
      </button>

      {/* Notification Drawer */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-screen w-full md:w-[450px] bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between bg-gradient-to-r from-[#014D40] to-emerald-600">
              <div>
                <h3 className="text-xl font-bold text-white">Notifications</h3>
                <p className="text-sm text-emerald-100">
                  {unreadCount} unread
                </p>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    Mark all read
                  </Button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <ScrollArea className="flex-1 p-4">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No notifications yet</p>
                  <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => {
                    const iconConfig = NOTIFICATION_ICONS[notif.type] || NOTIFICATION_ICONS.system_alert;
                    const Icon = iconConfig.icon;

                    return (
                      <Card
                        key={notif.id}
                        className={`border-l-4 cursor-pointer transition-all hover:shadow-md ${
                          !notif.is_read
                            ? 'border-l-[#014D40] bg-emerald-50/50 dark:bg-emerald-900/10'
                            : 'border-l-gray-300 bg-white dark:bg-gray-800'
                        }`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${iconConfig.bg} flex-shrink-0`}>
                              <Icon className={`w-5 h-5 ${iconConfig.color}`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className={`font-semibold text-sm ${!notif.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {notif.title}
                                </h4>
                                {!notif.is_read && (
                                  <div className="w-2 h-2 bg-[#014D40] rounded-full flex-shrink-0 mt-1" />
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                {notif.message}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                                </span>
                                
                                {notif.link_module && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-7 text-emerald-600 hover:text-emerald-700"
                                  >
                                    View <ArrowRight className="w-3 h-3 ml-1" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotificationMutation.mutate(notif.id);
                              }}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex-shrink-0"
                              title="Dismiss"
                            >
                              <X className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </>
  );
}