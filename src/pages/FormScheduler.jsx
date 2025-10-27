import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  FileText,
  Filter,
  ArrowLeft,
  Home,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function FormSchedulerPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("daily");
  const [positionFilter, setPositionFilter] = useState("all");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: myAssignments = [] } = useQuery({
    queryKey: ['myFormAssignments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const assignments = await base44.entities.FormAssignmentMetadata.list('-assigned_at');
      return assignments.filter(a => a.assigned_to_email === user.email);
    },
    enabled: !!user?.email,
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['allFormAssignments'],
    queryFn: () => base44.entities.FormAssignmentMetadata.list('-assigned_at'),
    enabled: isManager,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['formTemplates'],
    queryFn: () => base44.entities.FormTemplate.filter({ is_active: true, status: 'active' }),
  });

  const assignments = isManager ? allAssignments : myAssignments;

  const filterByFrequency = (frequency) => {
    return assignments.filter(a => {
      const template = templates.find(t => t.id === a.form_id);
      return template?.frequency === frequency;
    });
  };

  const getStatusColor = (assignment) => {
    if (assignment.completion_status === 'completed') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (assignment.completion_status === 'overdue') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (assignment.completion_status === 'in_progress') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (assignment) => {
    if (assignment.completion_status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (assignment.completion_status === 'overdue') {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
    if (assignment.completion_status === 'in_progress') {
      return <PlayCircle className="w-5 h-5 text-blue-600" />;
    }
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      haccp: "🛡️",
      workflow: "⚙️",
      equipment: "🔧",
      pest: "🐜",
      sops: "📋",
      training: "🎓",
      suppliers: "🚚",
      allergens: "⚠️",
      chemicals: "🧪",
      waste: "♻️",
    };
    return icons[category] || "📄";
  };

  const renderAssignmentCard = (assignment) => {
    const template = templates.find(t => t.id === assignment.form_id);
    const dueDate = new Date(assignment.due_date);
    const isOverdue = dueDate < new Date() && assignment.completion_status !== 'completed';

    return (
      <motion.div
        key={assignment.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={`border-l-4 ${isOverdue ? 'border-l-red-500' : 'border-l-[#014D40]'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(assignment)}
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {template && getCategoryIcon(template.category)}
                    {assignment.form_name}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className={getStatusColor(assignment)}>
                      {assignment.completion_status?.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="outline">
                      {assignment.assigned_position}
                    </Badge>
                    {assignment.linked_shift_id && (
                      <Badge variant="outline" className="bg-blue-50">
                        Shift Linked
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Due: {format(dueDate, 'PPp')}
                </span>
                {isOverdue && (
                  <span className="text-red-600 font-semibold">
                    Overdue by {formatDistanceToNow(dueDate)}
                  </span>
                )}
              </div>

              {assignment.completion_status !== 'completed' ? (
                <Button
                  onClick={() => navigate(createPageUrl(`FillForm?assignment=${assignment.id}`))}
                  className="w-full bg-[#014D40] hover:bg-[#013830]"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {assignment.completion_status === 'in_progress' ? 'Continue' : 'Start'} Form
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    Completed {assignment.completed_at && formatDistanceToNow(new Date(assignment.completed_at), { addSuffix: true })}
                  </div>
                  <Button
                    onClick={() => navigate(createPageUrl(`ViewFormResponse?response=${assignment.form_response_id}`))}
                    variant="outline"
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Submission
                  </Button>
                </div>
              )}

              {isManager && (
                <div className="text-xs text-gray-600 border-t pt-2">
                  Assigned to: {assignment.assigned_to_name} ({assignment.assigned_to_email})
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderTabContent = (frequency) => {
    const filtered = filterByFrequency(frequency);

    if (filtered.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No {frequency} forms assigned</p>
          </CardContent>
        </Card>
      );
    }

    const pending = filtered.filter(a => a.completion_status === 'pending' || a.completion_status === 'in_progress');
    const overdue = filtered.filter(a => a.completion_status === 'overdue');
    const completed = filtered.filter(a => a.completion_status === 'completed');

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{pending.length}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-4 text-center">
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-900">{overdue.length}</p>
              <p className="text-sm text-gray-600">Overdue</p>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-900">{completed.length}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Forms (Priority) */}
        {overdue.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Overdue - Urgent Action Required
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {overdue.map(renderAssignmentCard)}
            </div>
          </div>
        )}

        {/* Pending Forms */}
        {pending.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Pending Forms
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {pending.map(renderAssignmentCard)}
            </div>
          </div>
        )}

        {/* Completed Forms */}
        {completed.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Completed
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {completed.map(renderAssignmentCard)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📅 Form Schedule</h1>
          <p className="text-gray-600">Auto-scheduled food safety & compliance forms</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-3xl mb-8">
            <TabsTrigger value="daily">📅 Daily</TabsTrigger>
            <TabsTrigger value="weekly">📆 Weekly</TabsTrigger>
            <TabsTrigger value="monthly">🗓️ Monthly</TabsTrigger>
            <TabsTrigger value="six_monthly">🧾 6-Monthly</TabsTrigger>
            <TabsTrigger value="yearly">🏛️ Yearly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">{renderTabContent('daily')}</TabsContent>
          <TabsContent value="weekly">{renderTabContent('weekly')}</TabsContent>
          <TabsContent value="monthly">{renderTabContent('monthly')}</TabsContent>
          <TabsContent value="six_monthly">{renderTabContent('six_monthly')}</TabsContent>
          <TabsContent value="yearly">{renderTabContent('yearly')}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}