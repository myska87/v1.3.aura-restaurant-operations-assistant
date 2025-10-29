
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  X,
  CheckCircle,
  Mic,
  Clock, // Added Clock import
  AlertTriangle // Added AlertTriangle import
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SOPVoiceMode() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Get SOP ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const sopId = urlParams.get('id');

  const { data: sop, isLoading } = useQuery({
    queryKey: ['sop', sopId],
    queryFn: async () => {
      const sops = await base44.entities.SOPDocument.list();
      return sops.find(s => s.id === sopId);
    },
    enabled: !!sopId,
  });

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log('Voice command:', transcript);
        handleVoiceCommand(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      synthRef.current.cancel();
    };
  }, []);

  // Start/stop listening
  useEffect(() => {
    if (isPlaying && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.log('Recognition already started');
      }
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isPlaying]);

  const handleVoiceCommand = (command) => {
    if (command.includes('next') || command.includes('forward')) {
      handleNext();
    } else if (command.includes('back') || command.includes('previous')) {
      handlePrevious();
    } else if (command.includes('repeat')) {
      speakCurrentStep();
    } else if (command.includes('complete') || command.includes('done')) {
      handleComplete();
    } else if (command.includes('pause') || command.includes('stop')) {
      handlePause();
    } else if (command.includes('resume') || command.includes('continue') || command.includes('play')) {
      handlePlay();
    }
  };

  const speakText = (text) => {
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    synthRef.current.speak(utterance);
  };

  const speakCurrentStep = () => {
    if (!sop || !sop.steps || !sop.steps[currentStep]) return;
    
    const step = sop.steps[currentStep];
    const text = `Step ${step.step_number}. ${step.title}. ${step.description}. ${
      step.safety_notes ? `Safety note: ${step.safety_notes}` : ''
    }`;
    
    speakText(text);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsPaused(false);
    speakCurrentStep();
  };

  const handlePause = () => {
    setIsPaused(true);
    setIsPlaying(false);
    synthRef.current.cancel();
  };

  const handleNext = () => {
    if (!sop || !sop.steps) return;
    
    if (currentStep < sop.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      if (isPlaying) {
        setTimeout(() => speakCurrentStep(), 300);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (isPlaying) {
        setTimeout(() => speakCurrentStep(), 300);
      }
    }
  };

  const handleComplete = () => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentStep);
    setCompletedSteps(newCompleted);
    
    if (currentStep < sop.steps.length - 1) {
      handleNext();
    } else {
      speakText('All steps completed. Excellent work!');
      setIsPlaying(false);
    }
  };

  if (isLoading || !sop) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  const currentStepData = sop.steps?.[currentStep];
  const progress = sop.steps ? Math.round((completedSteps.size / sop.steps.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl(`SOPViewer?id=${sopId}`)}>
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <X className="w-6 h-6" />
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isListening && (
                <div className="flex gap-1">
                  <div className="w-1 h-8 bg-red-500 animate-pulse rounded" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-8 bg-red-500 animate-pulse rounded" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-8 bg-red-500 animate-pulse rounded" style={{ animationDelay: '300ms' }} />
                </div>
              )}
              <Mic className={`w-5 h-5 ${isListening ? 'text-red-500' : 'text-gray-500'}`} />
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-400">Progress</p>
              <p className="text-2xl font-bold">{progress}%</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 mb-8">
          <CardContent className="p-12">
            {/* Step Number */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 mb-6">
                {completedSteps.has(currentStep) ? (
                  <CheckCircle className="w-10 h-10 text-white" />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {currentStepData?.step_number || currentStep + 1}
                  </span>
                )}
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                {currentStepData?.title}
              </h2>
              
              <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto">
                {currentStepData?.description}
              </p>
            </div>

            {/* Additional Info */}
            {(currentStepData?.time_estimate_minutes || currentStepData?.role_responsible || currentStepData?.safety_notes) && (
              <div className="grid md:grid-cols-2 gap-6 mt-12">
                {currentStepData.time_estimate_minutes && (
                  <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
                    <p className="text-blue-300 text-sm mb-1 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> {/* Use Clock icon here */}
                      Time Estimate
                    </p>
                    <p className="text-2xl font-bold">{currentStepData.time_estimate_minutes} min</p>
                  </div>
                )}
                
                {currentStepData.role_responsible && (
                  <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/30">
                    <p className="text-purple-300 text-sm mb-1">Responsible</p>
                    <p className="text-2xl font-bold capitalize">{currentStepData.role_responsible}</p>
                  </div>
                )}
                
                {currentStepData.safety_notes && (
                  <div className="md:col-span-2 bg-amber-500/20 rounded-lg p-4 border border-amber-500/30">
                    <p className="text-amber-300 text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> {/* Use AlertTriangle icon here */}
                      Safety Note
                    </p>
                    <p className="text-lg text-amber-100">{currentStepData.safety_notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="space-y-6">
          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full border-white/20 hover:bg-white/10 disabled:opacity-30"
            >
              <SkipBack className="w-6 h-6" />
            </Button>

            {!isPlaying ? (
              <Button
                onClick={handlePlay}
                size="lg"
                className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                <Play className="w-8 h-8" />
              </Button>
            ) : (
              <Button
                onClick={handlePause}
                size="lg"
                className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Pause className="w-8 h-8" />
              </Button>
            )}

            <Button
              onClick={handleNext}
              disabled={!sop.steps || currentStep === sop.steps.length - 1}
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full border-white/20 hover:bg-white/10 disabled:opacity-30"
            >
              <SkipForward className="w-6 h-6" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={speakCurrentStep}
              variant="outline"
              className="border-white/20 hover:bg-white/10"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Repeat
            </Button>

            <Button
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700"
              disabled={completedSteps.has(currentStep)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
          </div>

          {/* Voice Commands Info */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Mic className="w-5 h-5 text-emerald-500" />
                Voice Commands
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-300">
                <div>"Next step"</div>
                <div>"Previous"</div>
                <div>"Repeat"</div>
                <div>"Mark complete"</div>
                <div>"Pause"</div>
                <div>"Resume"</div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Bar */}
          <div className="bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
