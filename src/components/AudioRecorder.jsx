/**
 * AURA Audio Recorder Component
 * Real-time audio recording with waveform visualization
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Play, Pause, Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AudioRecorder({ onRecordingComplete, onUploadComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Start visualization
      visualize();
      
      // Setup media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        stream.getTracks().forEach(track => track.stop());
        
        if (onRecordingComplete) {
          onRecordingComplete(blob, recordingTime);
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
      cancelAnimationFrame(animationRef.current);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        clearInterval(timerRef.current);
      }
      setIsPaused(!isPaused);
    }
  };

  const visualize = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;
    
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyserRef.current.getByteTimeDomainData(dataArray);
      
      canvasCtx.fillStyle = 'rgb(248, 250, 252)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#10B981';
      canvasCtx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };
    
    draw();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file');
      return;
    }
    
    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }
    
    setUploading(true);
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (onUploadComplete) {
        onUploadComplete(file_url, file.name);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardContent className="p-6 space-y-4">
        {/* Waveform Canvas */}
        <div className="bg-gray-50 rounded-lg p-4">
          <canvas
            ref={canvasRef}
            width={600}
            height={100}
            className="w-full h-24"
          />
        </div>

        {/* Recording Timer */}
        {isRecording && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-2xl font-mono font-bold text-gray-900">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              {formatTime(recordingTime)}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {!isRecording && !audioURL && (
            <>
              <Button
                onClick={startRecording}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
                size="lg"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="audio-upload"
                  disabled={uploading}
                />
                <Button
                  onClick={() => document.getElementById('audio-upload').click()}
                  variant="outline"
                  size="lg"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Audio
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {isRecording && (
            <>
              <Button
                onClick={pauseRecording}
                variant="outline"
                size="lg"
              >
                {isPaused ? (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                )}
              </Button>

              <Button
                onClick={stopRecording}
                className="bg-gray-900 hover:bg-gray-800"
                size="lg"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop
              </Button>
            </>
          )}

          {audioURL && !isRecording && (
            <div className="flex gap-3">
              <audio src={audioURL} controls className="w-full max-w-md" />
              <Button
                onClick={() => {
                  setAudioURL(null);
                  setRecordingTime(0);
                }}
                variant="outline"
              >
                New Recording
              </Button>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="text-center text-sm text-gray-600">
          {!isRecording && !audioURL && (
            <p>📝 Tip: Speak clearly and minimize background noise for best transcription results</p>
          )}
          {isRecording && (
            <p className="text-red-600 font-medium">🎙️ Recording in progress...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}