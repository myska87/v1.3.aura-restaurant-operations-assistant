import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Package, 
  Users, 
  BookOpen, 
  Star, 
  FileText,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const hubCards = [
  {
    title: 'Operations',
    description: 'Tasks, checklists, and daily operations',
    icon: Target,
    url: createPageUrl('OperationsDashboard'),
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Inventory',
    description: 'Stock, suppliers, and menu costing',
    icon: Package,
    url: createPageUrl('InventoryDashboard'),
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Staff',
    description: 'Team, scheduling, and development',
    icon: Users,
    url: createPageUrl('StaffDashboard'),
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    title: 'SOPs & Training',
    description: 'Procedures and training materials',
    icon: BookOpen,
    url: createPageUrl('SOPsDashboard'),
    color: 'from-indigo-500 to-purple-600',
    bgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    title: 'Quality & Hygiene',
    description: 'Quality control and compliance',
    icon: Star,
    url: createPageUrl('QualityDashboardHub'),
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    title: 'Documents',
    description: 'Policies, forms, and compliance',
    icon: FileText,
    url: createPageUrl('DocumentsDashboard'),
    color: 'from-gray-500 to-slate-600',
    bgColor: 'bg-gray-50',
    iconColor: 'text-gray-600',
  },
];

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch quick stats with error handling
  const { data: tasks = [] } = useQuery({
    queryKey: ['myTasks'],
    queryFn: async () => {
      try {
        if (!user?.email) return [];
        const allTasks = await base44.entities.OperationTask.list('-due_date', 50);
        return allTasks.filter(t => 
          t.assigned_to === user.email && 
          ['pending', 'in_progress'].includes(t.status)
        ).slice(0, 10);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['myUpcomingShifts'],
    queryFn: async () => {
      try {
        if (!user?.email) return [];
        const allShifts = await base44.entities.Shift.list('-shift_date', 50);
        return allShifts.filter(s => 
          s.staff_email === user.email && 
          ['scheduled', 'in_progress'].includes(s.status)
        ).slice(0, 5);
      } catch (error) {
        console.error('Error fetching shifts:', error);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['unreadEvents'],
    queryFn: async () => {
      try {
        if (!user?.email) return [];
        const allEvents = await base44.entities.Event.list('-created_date', 50);
        return allEvents.filter(e => 
          (e.recipient_emails?.includes(user.email) || 
           e.recipient_roles?.includes(user.position) ||
           e.recipient_roles?.includes('all')) &&
          e.status === 'unread'
        ).slice(0, 5);
      } catch (error) {
        console.error('Error fetching events:', error);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Your restaurant operations command center
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">My Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Upcoming Shifts</p>
                  <p className="text-3xl font-bold text-gray-900">{shifts.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Notifications</p>
                  <p className="text-3xl font-bold text-gray-900">{events.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Hubs */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Operations Hubs</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hubCards.map((hub, index) => {
              const Icon = hub.icon;
              return (
                <motion.div
                  key={hub.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Link to={hub.url}>
                    <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative h-full">
                      <div className={`absolute inset-0 bg-gradient-to-br ${hub.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                      
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-4 ${hub.bgColor} rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className={`w-8 h-8 ${hub.iconColor}`} />
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" />
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:bg-gradient-to-r group-hover:from-emerald-600 group-hover:to-teal-600 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                          {hub.title}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {hub.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}