import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function VoiceSearch({ onClose }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onresult = (event) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);

      if (event.results[current].isFinal) {
        handleVoiceCommand(transcriptText);
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognition) {
      setTranscript('');
      recognition.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const handleVoiceCommand = (command) => {
    const lowerCommand = command.toLowerCase();

    // Navigation commands
    const navMap = {
      'dashboard': 'Dashboard',
      'home': 'Dashboard',
      'tasks': 'MyTasks',
      'my tasks': 'MyTasks',
      'shifts': 'MyShifts',
      'my shifts': 'MyShifts',
      'clock in': 'ClockInOut',
      'clock out': 'ClockInOut',
      'attendance': 'ClockInOut',
      'team chat': 'TeamChat',
      'chat': 'TeamChat',
      'inventory': 'InventoryDashboard',
      'stock': 'InventoryDashboard',
      'menu': 'Menu',
      'quality': 'QualityDashboard',
      'sop': 'SOPDashboardHub',
      'procedures': 'SOPDashboardHub',
      'documents': 'DocumentsFormsHub',
      'forms': 'DocumentsFormsHub',
      'reports': 'Reports',
      'analytics': 'AnalyticsDashboard',
      'staff': 'StaffDashboard',
      'team': 'TeamDirectory',
      'hygiene': 'HygieneDashboard',
      'compliance': 'ComplianceCore',
      'settings': 'SettingsDashboard',
    };

    for (const [keyword, page] of Object.entries(navMap)) {
      if (lowerCommand.includes(keyword)) {
        navigate(createPageUrl(page));
        if (onClose) onClose();
        speak(`Opening ${keyword}`);
        return;
      }
    }

    speak("I didn't understand that command. Try saying 'go to dashboard' or 'open tasks'");
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  if (!isSupported) {
    return (
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-amber-800">
            Voice search is not supported in your browser. Try Chrome or Safari.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-purple-200">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="mb-4">
            <Button
              onClick={isListening ? stopListening : startListening}
              className={`w-20 h-20 rounded-full ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isListening ? (
                <MicOff className="w-10 h-10 text-white" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </Button>
          </div>

          <p className="text-sm font-semibold text-gray-900 mb-2">
            {isListening ? 'Listening...' : 'Tap to speak'}
          </p>

          {transcript && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
              <p className="text-sm text-gray-900">"{transcript}"</p>
            </div>
          )}

          <div className="mt-4 space-y-1">
            <p className="text-xs text-gray-600">Try saying:</p>
            <p className="text-xs text-purple-700 font-medium">"Go to dashboard"</p>
            <p className="text-xs text-purple-700 font-medium">"Open my tasks"</p>
            <p className="text-xs text-purple-700 font-medium">"Show inventory"</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}