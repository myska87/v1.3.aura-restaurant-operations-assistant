import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Mic,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  Home,
  ArrowLeft,
  Play,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { AuraSectionHeader, AuraStatCard, AuraActionButton } from '../components/AuraDesignSystem';

export default function MeetingDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.MeetingRecording.list('-meeting_date', 50),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['meetingActions'],
    queryFn: () => base44.entities.MeetingAction.list('-created_date', 100),
  });

  // Calculate stats
  const recentMeetings = meetings.filter(m => {
    const age = (new Date() - new Date(m.meeting_date)) / (1000 * 60 * 60 * 24);
    return age <= 7;
  });

  const pendingReview = meetings.filter(m => m.status === 'pending_review').length;
  const processingMeetings = meetings.filter(m => 
    ['recording', 'processing', 'transcribing', 'summarizing'].includes(m.status)
  ).length;

  const totalActions = actions.length;
  const completedActions = actions.filter(a => a.status === 'completed').length;
  const overdueActions = actions.filter(a => {
    if (a.status === 'completed' || !a.due_date) return false;
    return new Date(a.due_date) < new Date();
  }).length;

  const actionCompletionRate = totalActions > 0 
    ? Math.round((completedActions / totalActions) * 100) 
    : 0;

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-700 mb-6">
                Meeting AI is only accessible to managers and owners.
              </p>
              <Link to={createPageUrl("Dashboard")}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("ManagerDashboard")}>
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

        <AuraSectionHeader
          icon={Sparkles}
          title="AURA MeetingAI"
          subtitle="AI-powered meeting transcription, summaries, and action tracking"
          action={
            <Link to={createPageUrl("RecordMeeting")}>
              <AuraActionButton
                label="Record Meeting"
                icon={Mic}
                color="primary"
                size="lg"
              />
            </Link>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AuraStatCard
            title="This Week"
            value={recentMeetings.length}
            subtitle="Meetings recorded"
            icon={FileText}
            color="blue"
          />

          <AuraStatCard
            title="Pending Review"
            value={pendingReview}
            subtitle="Need approval"
            icon={Clock}
            color="orange"
            onClick={() => {/* Filter to pending */}}
          />

          <AuraStatCard
            title="Processing"
            value={processingMeetings}
            subtitle="AI working"
            icon={Sparkles}
            color="purple"
          />

          <AuraStatCard
            title="Action Completion"
            value={`${actionCompletionRate}%`}
            subtitle={`${completedActions}/${totalActions} actions`}
            icon={CheckCircle}
            color="green"
            trend={{
              positive: actionCompletionRate >= 80,
              value: `${overdueActions} overdue`
            }}
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Link to={createPageUrl("RecordMeeting")}>
                <Button className="w-full h-24 bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700">
                  <div className="text-center">
                    <Mic className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-bold">Start Recording</p>
                  </div>
                </Button>
              </Link>

              <Link to={createPageUrl("MeetingInsights")}>
                <Button variant="outline" className="w-full h-24">
                  <div className="text-center">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                    <p className="font-bold">View Insights</p>
                  </div>
                </Button>
              </Link>

              <Button variant="outline" className="w-full h-24">
                <div className="text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="font-bold">Team Attendance</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Meetings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-[#014D40] border-t-transparent rounded-full mx-auto" />
                <p className="text-gray-600 mt-4">Loading meetings...</p>
              </div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-12">
                <Mic className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Meetings Yet</h3>
                <p className="text-gray-600 mb-6">Start recording your first team meeting</p>
                <Link to={createPageUrl("RecordMeeting")}>
                  <Button className="bg-[#014D40]">
                    <Mic className="w-4 h-4 mr-2" />
                    Record First Meeting
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.slice(0, 10).map((meeting) => (
                  <Link key={meeting.id} to={createPageUrl(`MeetingDetails?id=${meeting.id}`)}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{meeting.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {format(new Date(meeting.meeting_date), 'PPp')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge className={`text-xs ${
                                meeting.status === 'approved' ? 'bg-green-100 text-green-800' :
                                meeting.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                                meeting.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {meeting.status.replace('_', ' ')}
                              </Badge>
                              {meeting.department && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {meeting.department.replace('_', ' ')}
                                </Badge>
                              )}
                              {meeting.action_items && meeting.action_items.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {meeting.action_items.length} actions
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Actions Alert */}
        {overdueActions > 0 && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h4 className="font-semibold text-red-900">Overdue Actions</h4>
                  <p className="text-sm text-red-700">
                    {overdueActions} action item{overdueActions > 1 ? 's' : ''} from meetings {overdueActions > 1 ? 'are' : 'is'} overdue
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}