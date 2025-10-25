import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Home,
  Mail,
  Phone,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  FileText,
  CheckCircle,
  AlertCircle,
  Users,
  Target,
  MessageCircle,
  Edit,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function StaffProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const staffEmail = urlParams.get('staff_email');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch staff member details
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const staffMember = teamMembers.find(m => m.staff_email === staffEmail);

  // Fetch all related data
  const { data: coachingSessions = [] } = useQuery({
    queryKey: ['coachingSessions', staffEmail],
    queryFn: () => base44.entities.CoachingSession.filter({ staff_email: staffEmail }, '-session_date'),
    enabled: !!staffEmail,
  });

  const { data: trainingRecords = [] } = useQuery({
    queryKey: ['trainingRecords', staffEmail],
    queryFn: () => base44.entities.TrainingRecord.filter({ staff_email: staffEmail }),
    enabled: !!staffEmail,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates', staffEmail],
    queryFn: () => base44.entities.Certificate.filter({ staff_email: staffEmail }),
    enabled: !!staffEmail,
  });

  const { data: staffDocuments = [] } = useQuery({
    queryKey: ['staffDocuments', staffEmail],
    queryFn: () => base44.entities.StaffDocument.filter({ staff_email: staffEmail }),
    enabled: !!staffEmail,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', staffEmail],
    queryFn: () => base44.entities.Shift.filter({ staff_email: staffEmail }, '-shift_date'),
    enabled: !!staffEmail,
  });

  const { data: clockEvents = [] } = useQuery({
    queryKey: ['clockEvents', staffEmail],
    queryFn: () => base44.entities.ClockEvent.filter({ user_email: staffEmail }, '-timestamp'),
    enabled: !!staffEmail,
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ['rewards', staffEmail],
    queryFn: () => base44.entities.StaffReward.filter({ staff_email: staffEmail }, '-awarded_date'),
    enabled: !!staffEmail,
  });

  const { data: performanceReviews = [] } = useQuery({
    queryKey: ['performanceReviews', staffEmail],
    queryFn: () => base44.entities.PerformanceReview.filter({ staff_email: staffEmail }, '-review_date'),
    enabled: !!staffEmail,
  });

  if (!staffMember) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Staff Member Not Found</h3>
            <p className="text-red-700 mb-4">The requested staff profile could not be found.</p>
            <Link to={createPageUrl("ManagerDashboard")}>
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Manager Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate stats
  const totalPoints = rewards.reduce((sum, r) => sum + (r.points_earned || 0), 0);
  const trainingCompleted = trainingRecords.filter(t => t.status === 'completed').length;
  const trainingProgress = trainingRecords.length > 0 
    ? Math.round((trainingCompleted / trainingRecords.length) * 100) 
    : 0;
  const completedShifts = shifts.filter(s => s.status === 'completed').length;
  const latestReview = performanceReviews[0];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      case 'probation': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("ManagerDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Manager Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-lg mb-6">
            <CardContent className="p-8">
              <div className="flex flex-wrap items-start gap-6">
                <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-6xl font-bold border-4 border-white/30">
                  {staffMember.staff_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-2">{staffMember.staff_name}</h1>
                  <p className="text-xl text-blue-100 mb-3 capitalize">
                    {staffMember.position?.replace('_', ' ')} • {staffMember.department?.replace('_', ' ')}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={`${getStatusColor(staffMember.status)} text-sm`}>
                      {staffMember.status}
                    </Badge>
                    {staffMember.probation_end_date && (
                      <Badge className="bg-blue-100 text-blue-800 text-sm">
                        Probation until {format(new Date(staffMember.probation_end_date), 'MMM d, yyyy')}
                      </Badge>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    {staffMember.staff_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{staffMember.staff_email}</span>
                      </div>
                    )}
                    {staffMember.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{staffMember.phone}</span>
                      </div>
                    )}
                    {staffMember.hire_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Hired: {format(new Date(staffMember.hire_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {staffMember.shift_start && staffMember.shift_end && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Shift: {staffMember.shift_start} - {staffMember.shift_end}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                    onClick={() => navigate(createPageUrl(`ManagerDashboard`))}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Link to={createPageUrl(`StartCoachingSession?staff_email=${staffEmail}`)}>
                    <Button className="bg-white text-blue-600 hover:bg-blue-50">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Start Coaching
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Award className="w-8 h-8 text-yellow-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalPoints}</p>
                <p className="text-sm text-gray-600">Performance Points</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{trainingProgress}%</p>
                <p className="text-sm text-gray-600">Training Complete</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{completedShifts}</p>
                <p className="text-sm text-gray-600">Completed Shifts</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{coachingSessions.length}</p>
                <p className="text-sm text-gray-600">Coaching Sessions</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {staffMember.emergency_contact && (
                    <div>
                      <p className="text-gray-500 text-xs">Emergency Contact</p>
                      <p className="font-medium text-gray-900">{staffMember.emergency_contact}</p>
                    </div>
                  )}
                  {staffMember.manager_email && (
                    <div>
                      <p className="text-gray-500 text-xs">Reports To</p>
                      <p className="font-medium text-gray-900">{staffMember.manager_email}</p>
                    </div>
                  )}
                  {staffMember.notes && (
                    <div>
                      <p className="text-gray-500 text-xs">Notes</p>
                      <p className="text-gray-700">{staffMember.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Latest Performance Review */}
            {latestReview && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Latest Performance Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Overall Score</span>
                      <span className="text-2xl font-bold text-green-600">
                        {latestReview.overall_score}/10
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Punctuality</span>
                          <span>{latestReview.punctuality_score}/10</span>
                        </div>
                        <Progress value={(latestReview.punctuality_score / 10) * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Customer Service</span>
                          <span>{latestReview.customer_service_score}/10</span>
                        </div>
                        <Progress value={(latestReview.customer_service_score / 10) * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Teamwork</span>
                          <span>{latestReview.teamwork_score}/10</span>
                        </div>
                        <Progress value={(latestReview.teamwork_score / 10) * 100} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      Reviewed: {format(new Date(latestReview.review_date), 'PPP')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Documents ({staffDocuments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {staffDocuments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No documents uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {staffDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm capitalize">
                            {doc.document_type.replace('_', ' ')}
                          </p>
                          {doc.expiry_date && (
                            <p className="text-xs text-gray-600">
                              Expires: {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        <Badge className={
                          doc.status === 'verified' ? 'bg-green-100 text-green-800' :
                          doc.status === 'expired' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {doc.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Training Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Training Progress ({trainingCompleted}/{trainingRecords.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trainingRecords.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No training assigned</p>
                ) : (
                  <div className="space-y-3">
                    {trainingRecords.slice(0, 5).map(training => (
                      <div key={training.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{training.module_title}</p>
                          {training.quiz_score !== undefined && (
                            <p className="text-xs text-gray-600">Score: {training.quiz_score}%</p>
                          )}
                        </div>
                        <Badge className={
                          training.status === 'completed' ? 'bg-green-100 text-green-800' :
                          training.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          training.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {training.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Certificates & Badges */}
            {certificates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-600" />
                    Certificates & Achievements ({certificates.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {certificates.map(cert => (
                      <div key={cert.id} className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{cert.title}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {format(new Date(cert.issued_date), 'MMM d, yyyy')}
                            </p>
                            {cert.points_awarded > 0 && (
                              <Badge className="bg-green-100 text-green-800 mt-1 text-xs">
                                +{cert.points_awarded} points
                              </Badge>
                            )}
                          </div>
                          {cert.certificate_url && (
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Coaching Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  Recent Coaching Sessions ({coachingSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {coachingSessions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No coaching sessions yet</p>
                ) : (
                  <div className="space-y-3">
                    {coachingSessions.slice(0, 5).map(session => (
                      <div key={session.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium text-sm">{session.period}</p>
                          <Badge className={
                            session.status === 'completed' ? 'bg-green-100 text-green-800' :
                            session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {session.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {format(new Date(session.session_date), 'MMM d, yyyy')}
                        </p>
                        {session.overall_score && (
                          <p className="text-xs text-green-600 mt-1">
                            Score: {session.overall_score}/10
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Rewards */}
            {rewards.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    Recent Rewards ({rewards.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rewards.slice(0, 5).map(reward => (
                      <div key={reward.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-start gap-2">
                          {reward.badge_icon && (
                            <span className="text-2xl">{reward.badge_icon}</span>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{reward.badge_name || reward.reason}</p>
                            {reward.points_earned > 0 && (
                              <Badge className="bg-green-100 text-green-800 mt-1 text-xs">
                                +{reward.points_earned} points
                              </Badge>
                            )}
                            <p className="text-xs text-gray-600 mt-1">
                              {format(new Date(reward.awarded_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}