import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  FileAudio,
  Calendar,
  User,
  Clock,
  CheckCircle,
  Edit,
  Save,
  Download,
  Play,
  Pause,
  Volume2,
  Users,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MeetingDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const meetingId = urlParams.get('id');

  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef(null);

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meetingDetail', meetingId],
    queryFn: async () => {
      const meetings = await base44.entities.MeetingRecording.list();
      return meetings.find(m => m.id === meetingId);
    },
    enabled: !!meetingId,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['meetingActions', meetingId],
    queryFn: async () => {
      const allActions = await base44.entities.MeetingAction.list();
      return allActions.filter(a => a.meeting_id === meetingId);
    },
    enabled: !!meetingId,
  });

  const { data: attendees = [] } = useQuery({
    queryKey: ['meetingAttendees', meetingId],
    queryFn: async () => {
      const allAttendees = await base44.entities.MeetingAttendee.list();
      return allAttendees.filter(a => a.meeting_id === meetingId);
    },
    enabled: !!meetingId,
  });

  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingRecording.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingDetail', meetingId] });
      setIsEditingSummary(false);
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingAction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingActions', meetingId] });
    },
  });

  const handleSaveSummary = () => {
    updateMeetingMutation.mutate({
      id: meetingId,
      data: { summary: editedSummary }
    });
  };

  const handleApprove = () => {
    updateMeetingMutation.mutate({
      id: meetingId,
      data: { status: 'approved' }
    });
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      recording: { label: 'Recording', color: 'bg-red-100 text-red-800', icon: FileAudio },
      processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Clock },
      transcribing: { label: 'Transcribing', color: 'bg-purple-100 text-purple-800', icon: FileAudio },
      summarizing: { label: 'Summarizing', color: 'bg-indigo-100 text-indigo-800', icon: Sparkles },
      review_pending: { label: 'Ready for Review', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      archived: { label: 'Archived', color: 'bg-gray-100 text-gray-800', icon: FileAudio },
    };
    return statusMap[status] || statusMap.processing;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading meeting...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Meeting Not Found</h2>
              <p className="text-gray-600 mb-6">This meeting doesn't exist or has been deleted.</p>
              <Button onClick={() => navigate(createPageUrl('MeetingDashboard'))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Meetings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(meeting.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('MeetingDashboard'))}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Meetings
          </Button>

          {meeting.status === 'review_pending' && (
            <Button
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
              disabled={updateMeetingMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Meeting Notes
            </Button>
          )}
        </div>

        {/* Meeting Header */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#014D40] to-emerald-600 text-white">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{meeting.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-emerald-50">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(meeting.meeting_date), 'PPp')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {Math.floor((meeting.audio_duration || 0) / 60)}:{((meeting.audio_duration || 0) % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {meeting.created_by_name}
                  </div>
                </div>
              </div>
              <Badge className={statusInfo.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>
          
          {/* Audio Player */}
          {meeting.audio_url && (
            <CardContent className="p-6 bg-gray-50 border-b">
              <div className="flex items-center gap-4">
                <Button
                  onClick={toggleAudio}
                  variant="outline"
                  size="lg"
                  className="w-16 h-16 rounded-full"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </Button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="w-5 h-5 text-gray-600" />
                    <p className="font-semibold text-gray-900">Meeting Recording</p>
                  </div>
                  <audio
                    ref={audioRef}
                    src={meeting.audio_url}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full"
                    controls
                  />
                </div>
                <a href={meeting.audio_url} download target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </a>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Processing Progress */}
        {['processing', 'transcribing', 'summarizing'].includes(meeting.status) && (
          <Card className="border-2 border-blue-300 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                <div>
                  <p className="font-bold text-gray-900">Processing Meeting...</p>
                  <p className="text-sm text-gray-600">AI is analyzing the recording</p>
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#014D40] to-emerald-600 transition-all duration-500"
                  style={{ width: `${meeting.processing_progress || 0}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">{meeting.processing_progress || 0}% complete</p>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {meeting.summary && (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-600" />
                  AI Summary
                </CardTitle>
                {!isEditingSummary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditedSummary(meeting.summary);
                      setIsEditingSummary(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingSummary ? (
                <div className="space-y-4">
                  <Textarea
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    rows={8}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSummary} disabled={updateMeetingMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditingSummary(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{meeting.summary}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Key Topics */}
        {meeting.key_topics && meeting.key_topics.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Key Topics Discussed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {meeting.key_topics.map((topic, idx) => (
                  <Badge key={idx} variant="outline" className="text-sm capitalize">
                    {topic}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decisions Made */}
        {meeting.decisions_made && meeting.decisions_made.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Decisions Made</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {meeting.decisions_made.map((decision, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{decision}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Action Items */}
        {actions.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                Action Items ({actions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className={`p-4 rounded-lg border-2 ${
                      action.status === 'completed'
                        ? 'bg-green-50 border-green-300'
                        : action.status === 'in_progress'
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-1">
                          {action.action_description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <span>👤 {action.assigned_to_name}</span>
                          {action.due_date && (
                            <>
                              <span>•</span>
                              <span>📅 Due {format(new Date(action.due_date), 'MMM d')}</span>
                            </>
                          )}
                          {action.linked_module && action.linked_module !== 'none' && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="capitalize">{action.linked_module}</Badge>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge className={
                          action.priority === 'urgent' ? 'bg-red-600' :
                          action.priority === 'high' ? 'bg-orange-600' :
                          action.priority === 'medium' ? 'bg-yellow-600' : 'bg-gray-600'
                        }>
                          {action.priority}
                        </Badge>
                        <select
                          value={action.status}
                          onChange={(e) => updateActionMutation.mutate({
                            id: action.id,
                            data: { status: e.target.value }
                          })}
                          className="text-xs px-2 py-1 rounded border"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendees */}
        {attendees.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Attendees ({attendees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {attendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {attendee.staff_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{attendee.staff_name}</p>
                      <p className="text-sm text-gray-600 capitalize">{attendee.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Transcript */}
        {meeting.transcribed_text && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Full Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{meeting.transcribed_text}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}