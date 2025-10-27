/**
 * AURA Audio Recorder Component
 * Real-time meeting recording with waveform visualization
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Play, Pause, Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AudioRecorder({ onRecordingComplete, meetingId = null }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [waveformData, setWaveformData] = useState(Array(50).fill(0));

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      // Setup audio visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      visualize();

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        chunksRef.current = [];
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('⚠️ Could not access microphone. Please check permissions.');
    }
  };

  const visualize = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const draw = () => {
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Sample 50 points for waveform
      const samples = [];
      const step = Math.floor(dataArray.length / 50);
      for (let i = 0; i < 50; i++) {
        samples.push(dataArray[i * step] / 255);
      }
      
      setWaveformData(samples);
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  const handleUploadAudio = async () => {
    if (!audioBlob) return;

    setUploading(true);

    try {
      // Convert blob to file
      const file = new File([audioBlob], `meeting_${Date.now()}.webm`, {
        type: 'audio/webm'
      });

      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      console.log('[AudioRecorder] Uploaded audio:', file_url);

      // Call parent callback
      if (onRecordingComplete) {
        await onRecordingComplete({
          audio_url: file_url,
          audio_duration: recordingTime,
        });
      }

      // Reset
      setAudioBlob(null);
      setRecordingTime(0);
      setWaveformData(Array(50).fill(0));

    } catch (error) {
      console.error('[AudioRecorder] Upload error:', error);
      alert('❌ Failed to upload audio. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Estimate duration (not perfect, but good enough)
      const audio = new Audio(URL.createObjectURL(file));
      audio.onloadedmetadata = async () => {
        await onRecordingComplete({
          audio_url: file_url,
          audio_duration: Math.floor(audio.duration),
        });
        setUploading(false);
      };

    } catch (error) {
      console.error('[AudioRecorder] File upload error:', error);
      alert('❌ Failed to upload file. Please try again.');
      setUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-white border-none shadow-lg">
      <CardContent className="p-6">
        {/* Waveform Visualization */}
        {isRecording && (
          <div className="mb-6">
            <div className="flex items-end justify-center gap-1 h-24">
              {waveformData.map((height, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-t from-[#014D40] to-emerald-500 rounded-full transition-all duration-100"
                  style={{
                    width: '6px',
                    height: `${Math.max(4, height * 100)}%`,
                    opacity: isRecording && !isPaused ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recording Timer */}
        {(isRecording || audioBlob) && (
          <div className="text-center mb-4">
            <p className="text-3xl font-bold text-gray-900">
              {formatTime(recordingTime)}
            </p>
            {isRecording && (
              <p className="text-sm text-gray-600 mt-1">
                {isPaused ? '⏸️ Paused' : '🔴 Recording...'}
              </p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {!isRecording && !audioBlob && (
            <>
              <Button
                onClick={startRecording}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                size="lg"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>

              <label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  as="span"
                  variant="outline"
                  size="lg"
                  disabled={uploading}
                  className="cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 mr-2" />
                  )}
                  Upload Audio File
                </Button>
              </label>
            </>
          )}

          {isRecording && (
            <>
              {!isPaused ? (
                <Button
                  onClick={pauseRecording}
                  variant="outline"
                  size="lg"
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={resumeRecording}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Resume
                </Button>
              )}

              <Button
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop & Save
              </Button>
            </>
          )}

          {audioBlob && !isRecording && (
            <Button
              onClick={handleUploadAudio}
              disabled={uploading}
              className="bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700 text-white"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
          )}
        </div>

        {/* Instructions */}
        {!isRecording && !audioBlob && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Click "Start Recording" to record a live meeting, or upload a pre-recorded audio file.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Supported formats: MP3, WAV, M4A, WEBM, OGG
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}