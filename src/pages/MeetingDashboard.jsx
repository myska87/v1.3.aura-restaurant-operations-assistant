
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mic,
  FileAudio,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Eye,
  MoreVertical,
  Download,
  Trash2,
  Edit,
  Sparkles,
  Calendar,
  Home,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AudioRecorder from '../components/AudioRecorder';
import MeetingTranscriptionProcessor from '../components/MeetingTranscriptionProcessor';
import { AuraSectionHeader, AuraStatCard, AuraStatusBadge, AuraEmptyState } from '../components/AuraDesignSystem';

export default function MeetingDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showRecorderDialog, setShowRecorderDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetingRecordings'],
    queryFn: () => base44.entities.MeetingRecording.list('-meeting_date'),
    refetchInterval: 10000, // Refresh every 10 seconds for processing updates
  });

  const { data: allActions = [] } = useQuery({
    queryKey: ['meetingActions'],
    queryFn: () => base44.entities.MeetingAction.list('-created_date', 100),
  });

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData) => {
      return await base44.entities.MeetingRecording.create(meetingData);
    },
    onSuccess: async () => { // Modified: newMeeting parameter removed
      queryClient.invalidateQueries({ queryKey: ['meetingRecordings'] }); // Updated query key
      // Processing initiation is moved to handleRecordingComplete, so dialog closing is handled there too.
    },
  });

  const handleRecordingComplete = async ({ audio_url, audio_duration }) => {
    try {
      const meetingData = {
        title: `Team Meeting - ${format(new Date(), 'MMM d, yyyy h:mm a')}`,
        meeting_type: 'team_briefing',
        audio_url,
        audio_duration,
        meeting_date: new Date().toISOString(),
        created_by: user?.email,
        created_by_name: user?.full_name,
        status: 'processing',
        processing_progress: 0,
        department: user?.department || 'general'
      };

      const newMeeting = await createMeetingMutation.mutateAsync(meetingData); // Modified: Store the result

      // Start processing immediately
      await MeetingTranscriptionProcessor.processMeeting(newMeeting.id);
      
      // Stay on dashboard after upload
      setShowRecorderDialog(false);
      
    } catch (error) {
      console.error('Recording error:', error);
      alert('❌ Failed to save recording. Please try again.');
    }
  };

  // Filter meetings
  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || m.meeting_type === filterType;
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Stats
  const totalMeetings = meetings.length;
  const processingMeetings = meetings.filter(m => 
    ['processing', 'transcribing', 'summarizing'].includes(m.status)
  ).length;
  const reviewPending = meetings.filter(m => m.status === 'review_pending').length;
  const totalActions = allActions.length;
  const pendingActions = allActions.filter(a => a.status === 'pending').length;

  const getStatusInfo = (status) => {
    const statusMap = {
      recording: { label: 'Recording', color: 'bg-red-100 text-red-800', icon: Mic },
      processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Clock },
      transcribing: { label: 'Transcribing', color: 'bg-purple-100 text-purple-800', icon: FileAudio },
      summarizing: { label: 'Summarizing', color: 'bg-indigo-100 text-indigo-800', icon: Sparkles },
      review_pending: { label: 'Ready for Review', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      archived: { label: 'Archived', color: 'bg-gray-100 text-gray-800', icon: FileAudio },
    };
    return statusMap[status] || statusMap.processing;
  };

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <Card className="max-w-2xl mx-auto bg-red-50 border-red-200">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-700 mb-6">
              Meeting recording is only available to managers and owners.
            </p>
            <Link to={createPageUrl('Dashboard')}>
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // FIX: Safe rendering for meeting records
  const renderMeetingCard = (meeting) => {
    const statusInfo = getStatusInfo(meeting.status);
    const StatusIcon = statusInfo.icon;
    const actionCount = allActions.filter(a => a.meeting_id === meeting.id).length;

    // Safe date formatting
    const safeFormatDate = (date) => {
      if (!date) return 'N/A';
      try {
        return format(new Date(date), 'PPp');
      } catch (error) {
        return 'Invalid Date';
      }
    };

    return (
      <Card 
        key={meeting.id} 
        className="bg-white border-none shadow-sm hover:shadow-lg transition-all cursor-pointer"
        onClick={() => navigate(createPageUrl(`MeetingDetail?id=${meeting.id}`))}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-[#014D40] to-emerald-600 rounded-lg">
                  <FileAudio className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{meeting.title || 'Untitled Meeting'}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{safeFormatDate(meeting.meeting_date)}</span>
                    <span>•</span>
                    <span>{Math.floor((meeting.audio_duration || 0) / 60)}:{((meeting.audio_duration || 0) % 60).toString().padStart(2, '0')}</span>
                    {meeting.department && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{meeting.department}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {meeting.summary && (
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                  {meeting.summary}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusInfo.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.label}
                </Badge>

                {meeting.processing_progress > 0 && meeting.processing_progress < 100 && (
                  <Badge variant="outline" className="text-blue-700">
                    {meeting.processing_progress}% processed
                  </Badge>
                )}

                {meeting.key_topics && Array.isArray(meeting.key_topics) && meeting.key_topics.length > 0 && (
                  meeting.key_topics.slice(0, 3).map((topic, i) => (
                    <Badge key={i} variant="outline" className="text-gray-700 capitalize">
                      {topic}
                    </Badge>
                  ))
                )}

                {actionCount > 0 && (
                  <Badge className="bg-purple-100 text-purple-800">
                    {actionCount} action{actionCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            <Button variant="ghost" size="icon">
              <Eye className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress bar for processing */}
          {meeting.processing_progress > 0 && meeting.processing_progress < 100 && (
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#014D40] to-emerald-600 transition-all duration-300"
                  style={{ width: `${meeting.processing_progress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <AuraSectionHeader
            icon={Sparkles}
            title="🎙️ AURA Meeting Intelligence"
            subtitle="Record, transcribe, and extract actions automatically"
            action={
              <Button
                onClick={() => setShowRecorderDialog(true)}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
              >
                <Mic className="w-5 h-5 mr-2" />
                Record Meeting
              </Button>
            }
          />
        </div>

        {/* Quick Start Card */}
        {isManager && (
          <Card className="shadow-lg border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">✨ AI Meeting Assistant</h3>
                  <p className="text-gray-600">
                    Record meetings and get instant AI summaries with action items
                  </p>
                </div>
                <Button
                  onClick={() => setShowRecorderDialog(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  size="lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <AuraStatCard
            title="Total Meetings"
            value={totalMeetings}
            icon={FileAudio}
            color="teal"
            subtitle="All time"
          />
          <AuraStatCard
            title="Processing"
            value={processingMeetings}
            icon={Clock}
            color="blue"
            subtitle="In progress"
          />
          <AuraStatCard
            title="Ready for Review"
            value={reviewPending}
            icon={AlertCircle}
            color="orange"
            subtitle="Needs approval"
          />
          <AuraStatCard
            title="Action Items"
            value={totalActions}
            icon={CheckCircle}
            color="purple"
            subtitle={`${pendingActions} pending`}
          />
          <AuraStatCard
            title="Avg Duration"
            value={meetings.length > 0 
              ? `${Math.round(meetings.reduce((sum, m) => sum + (m.audio_duration || 0), 0) / meetings.length / 60)}m`
              : '0m'
            }
            icon={TrendingUp}
            color="green"
            subtitle="Per meeting"
          />
        </div>

        {/* Filters */}
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search meetings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Meeting Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="team_briefing">Team Briefing</SelectItem>
                  <SelectItem value="shift_handover">Shift Handover</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="compliance_review">Compliance Review</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="review_pending">Ready for Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Meetings List - FIXED */}
        <div className="space-y-4">
          {isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Loading meetings...</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && filteredMeetings.length === 0 && (
            <AuraEmptyState
              icon={FileAudio}
              title="No meetings found"
              message={searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? "Try adjusting your filters"
                : "Record your first meeting to get started"
              }
              action={
                <Button onClick={() => setShowRecorderDialog(true)} className="bg-[#014D40]">
                  <Plus className="w-4 h-4 mr-2" />
                  Record Meeting
                </Button>
              }
            />
          )}

          {!isLoading && filteredMeetings.map((meeting) => renderMeetingCard(meeting))}
        </div>
      </div>

      {/* Recording Dialog */}
      <Dialog open={showRecorderDialog} onOpenChange={setShowRecorderDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-6 h-6 text-red-600" />
              Record Meeting
            </DialogTitle>
          </DialogHeader>
          <AudioRecorder onRecordingComplete={handleRecordingComplete} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
