import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Home, Loader2, CheckCircle, Sparkles, Zap } from 'lucide-react';
import AudioRecorder from '../components/AudioRecorder';
import TranscriptionProcessor from '../components/TranscriptionProcessor';
import LiveMeetingRecorder from '../components/LiveMeetingRecorder';
import { AuraSectionHeader } from '../components/AuraDesignSystem';

export default function RecordMeeting() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingType, setMeetingType] = useState('daily_briefing');
  const [department, setDepartment] = useState('all');
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [recordingMode, setRecordingMode] = useState('live'); // 'live' or 'upload'
  const [liveMeetingId, setLiveMeetingId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createMeetingMutation = useMutation({
    mutationFn: (meetingData) => base44.entities.MeetingRecording.create(meetingData),
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      return meeting;
    },
  });

  const handleStartLiveMeeting = async () => {
    if (!meetingTitle) {
      alert('Please enter a meeting title');
      return;
    }

    try {
      // Create meeting record for live session
      const meeting = await createMeetingMutation.mutateAsync({
        title: meetingTitle || 'Live Team Meeting',
        description,
        meeting_type: meetingType,
        department,
        meeting_date: new Date().toISOString(),
        created_by: user?.email,
        created_by_name: user?.full_name,
        status: 'recording',
        processing_progress: 0
      });

      setLiveMeetingId(meeting.id);
    } catch (error) {
      console.error('Error creating live meeting:', error);
      alert('Failed to start live meeting. Please try again.');
    }
  };

  const handleLiveMeetingEnd = (meetingId) => {
    // Navigate to meeting details
    navigate(createPageUrl(`MeetingDetails?id=${meetingId}`));
  };

  const handleRecordingComplete = async (audioBlob, duration) => {
    if (!meetingTitle) {
      alert('Please enter a meeting title');
      return;
    }

    setProcessing(true);
    setProgress(5);
    setCurrentStep('Creating meeting record...');

    try {
      // Create meeting record
      const meeting = await createMeetingMutation.mutateAsync({
        title: meetingTitle || 'Team Meeting',
        description,
        meeting_type: meetingType,
        department,
        meeting_date: new Date().toISOString(),
        created_by: user?.email,
        created_by_name: user?.full_name,
        status: 'processing',
        processing_progress: 5,
        audio_duration_seconds: duration
      });

      setProgress(10);
      setCurrentStep('Uploading audio...');

      // Process audio (transcribe, summarize, extract actions)
      await TranscriptionProcessor.processAudio(audioBlob, meeting.id);

      setProgress(100);
      setCurrentStep('Complete!');

      // Navigate to meeting details
      setTimeout(() => {
        navigate(createPageUrl(`MeetingDetails?id=${meeting.id}`));
      }, 1000);

    } catch (error) {
      console.error('Error processing meeting:', error);
      alert('Failed to process meeting. Please try again.');
      setProcessing(false);
    }
  };

  const handleUploadComplete = async (audioUrl, fileName) => {
    if (!meetingTitle) {
      setMeetingTitle(fileName.replace(/\.[^/.]+$/, '')); // Remove extension
    }

    setProcessing(true);
    setProgress(5);
    setCurrentStep('Creating meeting record...');

    try {
      const meeting = await createMeetingMutation.mutateAsync({
        title: meetingTitle || fileName.replace(/\.[^/.]+$/, ''),
        description,
        meeting_type: meetingType,
        department,
        meeting_date: new Date().toISOString(),
        created_by: user?.email,
        created_by_name: user?.full_name,
        status: 'processing',
        processing_progress: 5,
        audio_url: audioUrl
      });

      setProgress(10);
      setCurrentStep('Transcribing audio...');

      await TranscriptionProcessor.processAudio(audioUrl, meeting.id);

      setProgress(100);
      setCurrentStep('Complete!');

      setTimeout(() => {
        navigate(createPageUrl(`MeetingDetails?id=${meeting.id}`));
      }, 1000);

    } catch (error) {
      console.error('Error processing meeting:', error);
      alert('Failed to process meeting. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex gap-3 mb-6">
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

        <AuraSectionHeader
          title="Record Meeting"
          subtitle="Real-time AI transcription or upload audio for processing"
        />

        {!liveMeetingId ? (
          <>
            {/* Meeting Details Form */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Meeting Title *</Label>
                  <Input
                    id="title"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="e.g., Monday Team Briefing"
                    disabled={processing}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Meeting Type</Label>
                    <Select value={meetingType} onValueChange={setMeetingType} disabled={processing}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily_briefing">Daily Briefing</SelectItem>
                        <SelectItem value="shift_handover">Shift Handover</SelectItem>
                        <SelectItem value="safety_meeting">Safety Meeting</SelectItem>
                        <SelectItem value="performance_review">Performance Review</SelectItem>
                        <SelectItem value="planning">Planning Session</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select value={department} onValueChange={setDepartment} disabled={processing}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="kitchen">Kitchen</SelectItem>
                        <SelectItem value="front_of_house">Front of House</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add any additional context about this meeting..."
                    rows={3}
                    disabled={processing}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recording Mode Selection */}
            {!processing && (
              <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <CardContent className="p-6">
                  <Tabs value={recordingMode} onValueChange={setRecordingMode} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="live" className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Live Recording</span>
                        <Badge className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                          NEW
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="upload" className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Upload Audio
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="live">
                      <div className="text-center space-y-4">
                        <div className="bg-white p-6 rounded-lg mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            🎙️ Real-Time AI Transcription
                          </h3>
                          <p className="text-gray-600 text-sm mb-4">
                            AI listens live and automatically:
                          </p>
                          <ul className="text-left text-sm text-gray-700 space-y-2 max-w-md mx-auto">
                            <li>✨ Transcribes speech in real-time</li>
                            <li>🎯 Detects action items automatically</li>
                            <li>👥 Identifies different speakers</li>
                            <li>📊 Creates rolling summaries every 30 seconds</li>
                            <li>🔗 Links actions to modules (Tasks, Hygiene, etc.)</li>
                          </ul>
                        </div>
                        <Button
                          onClick={handleStartLiveMeeting}
                          size="lg"
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-6 text-lg"
                          disabled={!meetingTitle}
                        >
                          <Sparkles className="w-6 h-6 mr-3" />
                          Start Live Meeting
                        </Button>
                        {!meetingTitle && (
                          <p className="text-sm text-red-600">Please enter a meeting title first</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="upload">
                      <AudioRecorder
                        onRecordingComplete={handleRecordingComplete}
                        onUploadComplete={handleUploadComplete}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          // Live Meeting Interface
          <LiveMeetingRecorder
            meetingId={liveMeetingId}
            onMeetingEnd={handleLiveMeetingEnd}
          />
        )}

        {/* Processing Status */}
        {processing && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                {progress < 100 ? (
                  <>
                    <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
                    <h3 className="text-lg font-semibold text-blue-900">Processing Meeting...</h3>
                    <p className="text-blue-700">{currentStep}</p>
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-blue-600 font-medium">{progress}%</p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                    <h3 className="text-lg font-semibold text-green-900">Processing Complete!</h3>
                    <p className="text-green-700">Redirecting to meeting details...</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="p-6">
            <h4 className="font-semibold text-purple-900 mb-3">💡 Tips for Best Results</h4>
            <ul className="space-y-2 text-sm text-purple-800">
              <li>• <strong>Live Mode:</strong> Speak clearly and pause between topics for better segmentation</li>
              <li>• Mention names when assigning tasks ("John, please...") </li>
              <li>• State deadlines explicitly ("by Friday", "next week")</li>
              <li>• Use keywords like "order", "clean", "check", "train" for automatic action detection</li>
              <li>• Keep meetings focused - shorter meetings = better transcription accuracy</li>
              <li>• Review detected actions before ending the meeting</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}