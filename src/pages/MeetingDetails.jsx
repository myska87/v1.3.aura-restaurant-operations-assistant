import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft,
  Home,
  Edit,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Download,
  Share2,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  User,
  Calendar,
  Tag,
  TrendingUp,
  AlertCircle,
  CheckSquare,
  Square,
  Loader2,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

export default function MeetingDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const meetingId = urlParams.get('id');

  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [showAddAttendeeDialog, setShowAddAttendeeDialog] = useState(false);
  const [showAddActionDialog, setShowAddActionDialog] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('');
  const [newActionDueDate, setNewActionDueDate] = useState('');
  const [newActionPriority, setNewActionPriority] = useState('medium');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      const meetings = await base44.entities.MeetingRecording.list();
      return meetings.find(m => m.id === meetingId);
    },
    enabled: !!meetingId,
  });

  const { data: attendees = [] } = useQuery({
    queryKey: ['meetingAttendees', meetingId],
    queryFn: () => base44.entities.MeetingAttendee.filter({ meeting_id: meetingId }),
    enabled: !!meetingId,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['meetingActions', meetingId],
    queryFn: () => base44.entities.MeetingAction.filter({ meeting_id: meetingId }),
    enabled: !!meetingId,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingRecording.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      setIsEditing(false);
    },
  });

  const addAttendeeMutation = useMutation({
    mutationFn: (attendeeData) => base44.entities.MeetingAttendee.create(attendeeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingAttendees', meetingId] });
      setShowAddAttendeeDialog(false);
      setSelectedAttendee('');
    },
  });

  const addActionMutation = useMutation({
    mutationFn: (actionData) => base44.entities.MeetingAction.create(actionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingActions', meetingId] });
      setShowAddActionDialog(false);
      setNewActionDescription('');
      setNewActionAssignee('');
      setNewActionDueDate('');
      setNewActionPriority('medium');
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingAction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingActions', meetingId] });
    },
  });

  const approveMeetingMutation = useMutation({
    mutationFn: () => base44.entities.MeetingRecording.update(meetingId, {
      status: 'approved',
      reviewed_by: user?.email,
      reviewed_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      alert('✅ Meeting notes approved!');
    },
  });

  const handleSaveEdits = async () => {
    const editHistory = meeting.edit_history || [];
    editHistory.push({
      edited_by: user?.email,
      edited_at: new Date().toISOString(),
      changes: 'Summary and title updated'
    });

    await updateMeetingMutation.mutateAsync({
      id: meetingId,
      data: {
        title: editedTitle,
        summary: editedSummary,
        edit_history: editHistory,
        version: (meeting.version || 1) + 1
      }
    });
  };

  const handleAddAttendee = async () => {
    if (!selectedAttendee) return;

    const staff = allStaff.find(s => s.email === selectedAttendee);
    if (!staff) return;

    await addAttendeeMutation.mutateAsync({
      meeting_id: meetingId,
      meeting_title: meeting.title,
      staff_id: staff.id,
      staff_email: staff.email,
      staff_name: staff.full_name,
      staff_role: staff.position,
      attendance_status: 'present',
      arrival_time: meeting.meeting_date,
    });
  };

  const handleAddAction = async () => {
    if (!newActionDescription) return;

    await addActionMutation.mutateAsync({
      meeting_id: meetingId,
      meeting_title: meeting.title,
      action_description: newActionDescription,
      action_type: 'task',
      assigned_to_email: newActionAssignee || null,
      assigned_to_name: allStaff.find(s => s.email === newActionAssignee)?.full_name || null,
      assigned_by: user?.email,
      due_date: newActionDueDate || null,
      priority: newActionPriority,
      status: 'pending',
      auto_created: false,
      verified_by_manager: true
    });
  };

  const toggleActionStatus = async (action) => {
    const newStatus = action.status === 'completed' ? 'pending' : 'completed';
    await updateActionMutation.mutateAsync({
      id: action.id,
      data: {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        completed_by: newStatus === 'completed' ? user?.email : null
      }
    });
  };

  const exportMeeting = () => {
    if (!meeting) return;

    const exportData = {
      title: meeting.title,
      date: format(new Date(meeting.meeting_date), 'PPP'),
      type: meeting.meeting_type,
      department: meeting.department,
      summary: meeting.summary,
      key_points: meeting.key_points,
      attendees: attendees.map(a => ({
        name: a.staff_name,
        role: a.staff_role,
        status: a.attendance_status
      })),
      actions: actions.map(a => ({
        description: a.action_description,
        assigned_to: a.assigned_to_name || 'Unassigned',
        due_date: a.due_date,
        status: a.status,
        priority: a.priority
      })),
      transcript: meeting.transcribed_text
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${meeting.title.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#014D40] mx-auto animate-spin mb-4" />
          <p className="text-gray-600">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Meeting Not Found</h2>
              <p className="text-gray-700 mb-6">This meeting doesn't exist or has been deleted.</p>
              <Link to={createPageUrl("MeetingDashboard")}>
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Meetings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pendingActions = actions.filter(a => a.status === 'pending').length;
  const completedActions = actions.filter(a => a.status === 'completed').length;
  const overdueActions = actions.filter(a => {
    if (a.status === 'completed' || !a.due_date) return false;
    return new Date(a.due_date) < new Date();
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <Link to={createPageUrl("MeetingDashboard")}>
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

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportMeeting}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            {meeting.status === 'pending_review' && (
              <Button
                onClick={() => approveMeetingMutation.mutate()}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Notes
              </Button>
            )}
          </div>
        </div>

        {/* Meeting Header Card */}
        <Card className="border-l-4 border-l-[#014D40]">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-2xl font-bold mb-2"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{meeting.title}</h1>
                )}
                
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(meeting.meeting_date), 'PPP')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(meeting.meeting_date), 'p')}
                  </div>
                  {meeting.audio_duration_seconds && (
                    <div className="flex items-center gap-1">
                      <Play className="w-4 h-4" />
                      {Math.floor(meeting.audio_duration_seconds / 60)} min
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {meeting.created_by_name}
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isEditing) {
                    handleSaveEdits();
                  } else {
                    setIsEditing(true);
                    setEditedTitle(meeting.title);
                    setEditedSummary(meeting.summary);
                  }
                }}
              >
                {isEditing ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Edit className="w-5 h-5" />}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className={`${
                meeting.status === 'approved' ? 'bg-green-100 text-green-800' :
                meeting.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                meeting.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {meeting.status.replace('_', ' ')}
              </Badge>

              <Badge variant="outline" className="capitalize">
                {meeting.meeting_type?.replace('_', ' ')}
              </Badge>

              {meeting.department && (
                <Badge variant="outline" className="capitalize">
                  {meeting.department.replace('_', ' ')}
                </Badge>
              )}

              {meeting.sentiment && (
                <Badge className={`${
                  meeting.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                  meeting.sentiment === 'concerned' ? 'bg-orange-100 text-orange-800' :
                  meeting.sentiment === 'urgent' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {meeting.sentiment}
                </Badge>
              )}
            </div>

            {meeting.description && (
              <p className="text-gray-700">{meeting.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Audio Player (if audio exists) */}
        {meeting.audio_url && !meeting.audio_deleted_at && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-[#014D40]" />
                Audio Recording
              </CardTitle>
            </CardHeader>
            <CardContent>
              <audio src={meeting.audio_url} controls className="w-full" />
            </CardContent>
          </Card>
        )}

        {/* Summary & Key Points */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#014D40]" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  rows={8}
                  className="w-full"
                />
              ) : meeting.summary ? (
                <p className="text-gray-700 whitespace-pre-wrap">{meeting.summary}</p>
              ) : (
                <p className="text-gray-500 italic">No summary generated yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#014D40]" />
                Key Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.key_points && meeting.key_points.length > 0 ? (
                <ul className="space-y-2">
                  {meeting.key_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No key points extracted</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Topics Discussed */}
        {meeting.topics_discussed && meeting.topics_discussed.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#014D40]" />
                Topics Discussed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {meeting.topics_discussed.map((topic, index) => (
                  <Badge key={index} variant="outline" className="capitalize">
                    {topic}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#014D40]" />
                Attendees ({attendees.length})
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddAttendeeDialog(true)}>
                <User className="w-4 h-4 mr-2" />
                Add Attendee
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {attendees.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-3">
                {attendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                        {attendee.staff_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{attendee.staff_name}</p>
                        <p className="text-xs text-gray-600 capitalize">{attendee.staff_role?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <Badge className={`${
                      attendee.attendance_status === 'present' ? 'bg-green-100 text-green-800' :
                      attendee.attendance_status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {attendee.attendance_status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No attendees added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#014D40]" />
                Action Items
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddActionDialog(true)}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Add Action
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Action Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{pendingActions}</p>
                <p className="text-xs text-gray-600">Pending</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-900">{completedActions}</p>
                <p className="text-xs text-green-700">Completed</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-900">{overdueActions}</p>
                <p className="text-xs text-red-700">Overdue</p>
              </div>
            </div>

            {/* Actions List */}
            {actions.length > 0 ? (
              <div className="space-y-3">
                {actions
                  .sort((a, b) => {
                    if (a.status === 'completed' && b.status !== 'completed') return 1;
                    if (a.status !== 'completed' && b.status === 'completed') return -1;
                    return 0;
                  })
                  .map((action) => {
                    const isOverdue = action.status !== 'completed' && action.due_date && new Date(action.due_date) < new Date();
                    
                    return (
                      <div
                        key={action.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          action.status === 'completed'
                            ? 'bg-green-50 border-green-200'
                            : isOverdue
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleActionStatus(action)}
                            className="mt-1"
                          >
                            {action.status === 'completed' ? (
                              <CheckSquare className="w-5 h-5 text-green-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400 hover:text-green-600" />
                            )}
                          </button>

                          <div className="flex-1">
                            <p className={`font-medium ${action.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {action.action_description}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {action.assigned_to_name && (
                                <Badge variant="outline" className="text-xs">
                                  <User className="w-3 h-3 mr-1" />
                                  {action.assigned_to_name}
                                </Badge>
                              )}
                              
                              {action.due_date && (
                                <Badge className={`text-xs ${
                                  isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {format(new Date(action.due_date), 'MMM d')}
                                </Badge>
                              )}

                              <Badge className={`text-xs ${
                                action.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                action.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {action.priority}
                              </Badge>

                              {action.auto_created && (
                                <Badge variant="outline" className="text-xs">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  AI Detected
                                </Badge>
                              )}
                            </div>

                            {action.completed_at && (
                              <p className="text-xs text-green-700 mt-2">
                                ✅ Completed {format(new Date(action.completed_at), 'PPp')}
                                {action.completed_by && ` by ${action.completed_by}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No action items yet</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setShowAddActionDialog(true)}>
                  Add First Action
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcript */}
        {meeting.transcribed_text && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#014D40]" />
                Full Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-6 rounded-lg max-h-96 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap">{meeting.transcribed_text}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Attendee Dialog */}
        <Dialog open={showAddAttendeeDialog} onOpenChange={setShowAddAttendeeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Attendee</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label>Select Staff Member</Label>
              <Select value={selectedAttendee} onValueChange={setSelectedAttendee}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose staff member" />
                </SelectTrigger>
                <SelectContent>
                  {allStaff
                    .filter(s => !attendees.find(a => a.staff_email === s.email))
                    .map(staff => (
                      <SelectItem key={staff.id} value={staff.email}>
                        {staff.full_name} ({staff.position})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddAttendeeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAttendee} disabled={!selectedAttendee}>
                Add Attendee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Action Dialog */}
        <Dialog open={showAddActionDialog} onOpenChange={setShowAddActionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Action Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Action Description *</Label>
                <Textarea
                  value={newActionDescription}
                  onChange={(e) => setNewActionDescription(e.target.value)}
                  placeholder="What needs to be done?"
                  rows={3}
                />
              </div>

              <div>
                <Label>Assign To</Label>
                <Select value={newActionAssignee} onValueChange={setNewActionAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Unassigned</SelectItem>
                    {allStaff.map(staff => (
                      <SelectItem key={staff.id} value={staff.email}>
                        {staff.full_name} ({staff.position})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newActionDueDate}
                    onChange={(e) => setNewActionDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select value={newActionPriority} onValueChange={setNewActionPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddActionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAction} disabled={!newActionDescription}>
                Add Action
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}