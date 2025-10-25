import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
  ArrowLeft,
  Home,
  Eye,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function DailyChecklists() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['dailyChecklists', selectedDate, user?.email],
    queryFn: async () => {
      const allChecklists = await base44.entities.DailyChecklist.filter({
        checklist_date: selectedDate
      }, '-created_date');

      if (isManager) {
        return allChecklists;
      }

      // Filter for current user
      return allChecklists.filter(c => 
        c.assigned_staff?.some(s => s.staff_email === user?.email)
      );
    },
    enabled: !!user?.email,
  });

  // Stats
  const totalChecklists = checklists.length;
  const completedChecklists = checklists.filter(c => c.status === 'completed' || c.status === 'verified').length;
  const pendingChecklists = checklists.filter(c => c.status === 'pending' || c.status === 'in_progress').length;
  const verifiedChecklists = checklists.filter(c => c.status === 'verified').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    return type === 'opening' 
      ? 'from-emerald-500 to-green-600' 
      : 'from-blue-500 to-indigo-600';
  };

  const getTypeIcon = (type) => {
    return type === 'opening' ? Sun : Moon;
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          {isManager && (
            <>
              <Link to={createPageUrl("ChecklistBuilder")}>
                <Button variant="outline" size="sm">
                  Build Templates
                </Button>
              </Link>
              <Link to={createPageUrl("ChecklistReview")}>
                <Button variant="outline" size="sm">
                  Review Queue
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            Daily Checklists
          </h1>
          <p className="text-lg text-gray-600">
            Opening & closing tasks for {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Date Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label className="font-semibold text-gray-700">Select Date:</Label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <Button 
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                variant="outline"
                size="sm"
              >
                Today
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{totalChecklists}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Checklists</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{pendingChecklists}</p>
                  <p className="text-sm text-gray-600 mt-1">Pending</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{completedChecklists}</p>
                  <p className="text-sm text-gray-600 mt-1">Completed</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{verifiedChecklists}</p>
                  <p className="text-sm text-gray-600 mt-1">Verified</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Checklists Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading checklists...</p>
          </div>
        ) : checklists.length === 0 ? (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Checklists for This Date</h3>
              <p className="text-gray-600">
                Checklists are auto-generated based on shift schedules
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checklists.map((checklist, index) => {
              const TypeIcon = getTypeIcon(checklist.checklist_type);
              const progress = checklist.completion_percentage || 0;

              return (
                <motion.div
                  key={checklist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all overflow-hidden">
                    {/* Header with Gradient */}
                    <div className={`p-6 bg-gradient-to-br ${getTypeColor(checklist.checklist_type)} text-white`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg">
                            <TypeIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg capitalize">
                              {checklist.checklist_type}
                            </h3>
                            <p className="text-sm opacity-90 capitalize">
                              {checklist.department.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(checklist.status)}>
                          {checklist.status}
                        </Badge>
                      </div>

                      {/* Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-2 opacity-90">
                          <span>Progress</span>
                          <span className="font-semibold">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-white/20" />
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="p-6">
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            {checklist.completed_tasks || 0} / {checklist.total_tasks || 0} tasks
                          </span>
                        </div>

                        {checklist.assigned_staff && checklist.assigned_staff.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>{checklist.assigned_staff[0].staff_name}</span>
                          </div>
                        )}

                        {checklist.completed_time && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>
                              Completed: {format(new Date(checklist.completed_time), 'h:mm a')}
                            </span>
                          </div>
                        )}

                        {checklist.verified_by_name && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>Verified by {checklist.verified_by_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {(checklist.status === 'pending' || checklist.status === 'in_progress') && (
                          <Button
                            onClick={() => navigate(createPageUrl(`ActiveChecklist?id=${checklist.id}`))}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                          >
                            {checklist.status === 'in_progress' ? 'Continue' : 'Start'}
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => navigate(createPageUrl(`ActiveChecklist?id=${checklist.id}&view=true`))}
                          variant="outline"
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}