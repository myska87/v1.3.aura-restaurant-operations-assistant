
/**
 * AURA Live Meeting Recorder
 * Real-time transcription with speaker identification & action detection
 */

import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Mic,
  MicOff,
  Square,
  Users,
  CheckSquare,
  Sparkles,
  Volume2,
  User,
  Clock,
  FileText,
  AlertCircle,
  TrendingUp,
  Loader2
} from 'lucide-react';

export default function LiveMeetingRecorder({ meetingId, onMeetingEnd }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [detectedActions, setDetectedActions] = useState([]);
  const [currentSummary, setCurrentSummary] = useState('');
  const [speakerLabels, setSpeakerLabels] = useState({
    'Speaker_01': 'Manager',
    'Speaker_02': 'Chef',
    'Speaker_03': 'FOH Staff',
  });
  const [processing, setProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const summaryTimerRef = useRef(null);
  const transcriptEndRef = useRef(null);

  // Initialize audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send chunk for real-time transcription
          processAudioChunk(event.data);
        }
      };

      // Start recording with 5-second chunks for real-time processing
      mediaRecorder.start(5000);
      setIsRecording(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start rolling summary timer (every 30 seconds)
      summaryTimerRef.current = setInterval(() => {
        generateRollingSummary();
      }, 30000);

      console.log('[LiveRecorder] Recording started');
    } catch (error) {
      console.error('[LiveRecorder] Error starting recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      clearInterval(timerRef.current);
      clearInterval(summaryTimerRef.current);
      
      setIsRecording(false);
      setProcessing(true);

      // Generate final summary and save
      await finalizeMeeting();
    }
  };

  // Process audio chunk for real-time transcription
  const processAudioChunk = async (audioBlob) => {
    try {
      // Simulate real-time transcription (in production, integrate with Speech-to-Text API)
      // For now, we'll simulate with AI
      const response = await simulateTranscription(audioBlob);
      
      if (response.segments && response.segments.length > 0) {
        setTranscript(prev => [...prev, ...response.segments]);
        
        // Detect actions in new segments
        response.segments.forEach(segment => {
          detectActions(segment.text, segment.speaker_id);
        });
      }
    } catch (error) {
      console.error('[LiveRecorder] Transcription error:', error);
    }
  };

  // Simulate transcription (replace with real API in production)
  const simulateTranscription = async (audioBlob) => {
    // In production, send to Whisper API or similar
    // For demo, we'll return mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockSegments = [
          {
            speaker_id: 'Speaker_01',
            speaker_name: speakerLabels['Speaker_01'],
            text: 'We need to order more milk from supplier A.',
            start_time: duration,
            end_time: duration + 3,
            timestamp: new Date().toISOString()
          }
        ];
        resolve({ segments: mockSegments });
      }, 2000);
    });
  };

  // Detect actionable patterns in speech
  const detectActions = (text, speakerId) => {
    const lowerText = text.toLowerCase();
    const patterns = [
      {
        regex: /order\s+([a-z\s]+?)(?:\s+from\s+([a-z\s]+))?(?:\.|$)/i,
        type: 'purchase_order',
        module: 'Inventory',
        priority: 'medium'
      },
      {
        regex: /clean\s+([a-z\s]+?)(?:\.|$)/i,
        type: 'cleaning_task',
        module: 'Hygiene',
        priority: 'high'
      },
      {
        regex: /check\s+([a-z\s]+?)\s+temp(?:erature)?(?:\.|$)/i,
        type: 'temperature_check',
        module: 'LeafeCore',
        priority: 'high'
      },
      {
        regex: /call\s+([a-z\s]+?)(?:\s+for\s+([a-z\s]+))?(?:\.|$)/i,
        type: 'phone_call',
        module: 'Tasks',
        priority: 'medium'
      },
      {
        regex: /train\s+([a-z\s]+?)\s+on\s+([a-z\s]+?)(?:\.|$)/i,
        type: 'training',
        module: 'WorkforceCore',
        priority: 'low'
      },
      {
        regex: /fix\s+([a-z\s]+?)(?:\.|$)/i,
        type: 'maintenance',
        module: 'Maintenance',
        priority: 'high'
      },
      {
        regex: /schedule\s+([a-z\s]+?)(?:\s+for\s+([a-z\s]+))?(?:\.|$)/i,
        type: 'scheduling',
        module: 'Shifts',
        priority: 'medium'
      }
    ];

    patterns.forEach(pattern => {
      const match = text.match(pattern.regex);
      if (match) {
        const action = {
          id: `action-${Date.now()}-${Math.random()}`,
          description: text,
          type: pattern.type,
          module: pattern.module,
          priority: pattern.priority,
          detected_at: new Date().toISOString(),
          speaker_id: speakerId,
          speaker_name: speakerLabels[speakerId] || speakerId,
          assigned_to: null,
          status: 'detected'
        };

        setDetectedActions(prev => {
          // Avoid duplicates
          if (prev.find(a => a.description === text)) {
            return prev;
          }
          return [...prev, action];
        });

        console.log('[ActionEngine] Detected action:', action);
      }
    });
  };

  // Generate rolling summary every 30 seconds
  const generateRollingSummary = async () => {
    if (transcript.length === 0) return;

    try {
      const recentTranscript = transcript.slice(-20); // Last 20 segments
      const text = recentTranscript.map(s => `${s.speaker_name}: ${s.text}`).join('\n');

      // Use AI to summarize
      const summary = await base44.integrations.Core.InvokeLLM({
        prompt: `Summarize these meeting discussion points in 2-3 bullet points:\n\n${text}`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_points: { type: "array", items: { type: "string" } },
            topics: { type: "array", items: { type: "string" } }
          }
        }
      });

      setCurrentSummary(summary.summary);
      
      console.log('[LiveRecorder] Rolling summary generated:', summary);
    } catch (error) {
      console.error('[LiveRecorder] Summary generation error:', error);
    }
  };

  // Finalize meeting and save all data
  const finalizeMeeting = async () => {
    try {
      // Generate final comprehensive summary
      const fullText = transcript.map(s => `${s.speaker_name}: ${s.text}`).join('\n');

      const finalSummary = await base44.integrations.Core.InvokeLLM({
        prompt: `
Generate a comprehensive meeting summary from this transcript:

${fullText}

Provide:
1. Overall summary (2-3 paragraphs)
2. Key discussion points (5-7 bullets)
3. Decisions made
4. Topics discussed (categories: hygiene, hr, shift, supplies, menu, safety, training, compliance, other)
5. Overall sentiment (positive/neutral/concerned/urgent)
`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_points: { type: "array", items: { type: "string" } },
            decisions: { type: "array", items: { type: "string" } },
            topics: { type: "array", items: { type: "string" } },
            sentiment: { type: "string", enum: ["positive", "neutral", "concerned", "urgent"] }
          }
        }
      });

      // Upload audio file
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioBlob });

      // Update meeting record
      await base44.entities.MeetingRecording.update(meetingId, {
        audio_url: file_url,
        audio_duration_seconds: duration,
        transcribed_text: fullText,
        speaker_segments: transcript,
        summary: finalSummary.summary,
        key_points: finalSummary.key_points,
        topics_discussed: finalSummary.topics,
        sentiment: finalSummary.sentiment,
        status: 'pending_review',
        processing_progress: 100
      });

      // Create action items
      for (const action of detectedActions) {
        if (action.status === 'detected') {
          await base44.entities.MeetingAction.create({
            meeting_id: meetingId,
            action_description: action.description,
            action_type: action.type,
            assigned_to_email: action.assigned_to,
            priority: action.priority,
            status: 'pending',
            auto_created: true,
            confidence_score: 85,
            verified_by_manager: false
          });
        }
      }

      setProcessing(false);
      
      if (onMeetingEnd) {
        onMeetingEnd(meetingId);
      }

      alert('✅ Meeting saved successfully!');
    } catch (error) {
      console.error('[LiveRecorder] Finalization error:', error);
      alert('❌ Error saving meeting. Please try again.');
      setProcessing(false);
    }
  };

  // Update speaker label
  const updateSpeakerLabel = (speakerId, newLabel) => {
    setSpeakerLabels(prev => ({
      ...prev,
      [speakerId]: newLabel
    }));

    // Update all transcript segments with this speaker
    setTranscript(prev => prev.map(segment => 
      segment.speaker_id === speakerId 
        ? { ...segment, speaker_name: newLabel }
        : segment
    ));
  };

  // Assign action to staff member
  const assignAction = async (actionId, staffEmail) => {
    setDetectedActions(prev => prev.map(action =>
      action.id === actionId
        ? { ...action, assigned_to: staffEmail, status: 'assigned' }
        : action
    ));
  };

  // Remove detected action
  const removeAction = (actionId) => {
    setDetectedActions(prev => prev.filter(a => a.id !== actionId));
  };

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isRecording ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-red-600">LIVE</span>
                  </div>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Ready to Record
                </>
              )}
            </CardTitle>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg font-mono">
                <Clock className="w-4 h-4 mr-2" />
                {formatDuration(duration)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-8 py-6 text-lg"
              >
                <Mic className="w-6 h-6 mr-3" />
                Start Live Recording
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setIsPaused(!isPaused)}
                  variant="outline"
                  size="lg"
                >
                  {isPaused ? <Mic className="w-5 h-5 mr-2" /> : <MicOff className="w-5 h-5 mr-2" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-700"
                  size="lg"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Square className="w-5 h-5 mr-2" />
                      End Meeting
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {isRecording && (
            <div className="mt-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Volume2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">Audio Level</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse" style={{ width: '70%' }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isRecording && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Live Transcript */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#014D40]" />
                Live Transcript
                <Badge variant="outline">{transcript.length} segments</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 h-[500px] overflow-y-auto space-y-3">
                {transcript.length === 0 ? (
                  <div className="text-center py-12">
                    <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Waiting for speech...</p>
                  </div>
                ) : (
                  <>
                    {transcript.map((segment, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Select
                            value={segment.speaker_id}
                            onValueChange={(value) => updateSpeakerLabel(segment.speaker_id, value)}
                          >
                            <SelectTrigger className="w-40 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Manager">Manager</SelectItem>
                              <SelectItem value="Chef">Chef</SelectItem>
                              <SelectItem value="FOH Staff">FOH Staff</SelectItem>
                              <SelectItem value="Server">Server</SelectItem>
                              <SelectItem value="Bartender">Bartender</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant="outline" className="text-xs">
                            {segment.start_time}s
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-900">{segment.text}</p>
                      </div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detected Actions */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#014D40]" />
                Detected Actions
                <Badge className="bg-purple-100 text-purple-800">
                  {detectedActions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 h-[500px] overflow-y-auto">
                {detectedActions.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">AI will detect actions automatically</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Try: "Order milk", "Clean fryer", "Check fridge temp"
                    </p>
                  </div>
                ) : (
                  detectedActions.map(action => (
                    <div
                      key={action.id}
                      className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={`${
                          action.priority === 'high' ? 'bg-red-100 text-red-800' :
                          action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {action.priority}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeAction(action.id)}
                        >
                          ×
                        </Button>
                      </div>

                      <p className="text-sm font-medium text-gray-900 mb-2">
                        {action.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {action.module}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {action.type.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <User className="w-3 h-3 mr-1" />
                          {action.speaker_name}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value) => assignAction(action.id, value)}
                          value={action.assigned_to || ''}
                        >
                          <SelectTrigger className="flex-1 h-8 text-xs">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chef@restaurant.com">Chef</SelectItem>
                            <SelectItem value="manager@restaurant.com">Manager</SelectItem>
                            <SelectItem value="foh@restaurant.com">FOH Staff</SelectItem>
                          </SelectContent>
                        </Select>
                        {action.status === 'assigned' && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckSquare className="w-3 h-3 mr-1" />
                            Assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rolling Summary */}
      {isRecording && currentSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#014D40]" />
              Current Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg">
              <p className="text-gray-800">{currentSummary}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
