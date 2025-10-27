import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  Send,
  Loader2,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
  ArrowLeft,
  Home,
  RotateCcw,
  TrendingUp,
  Calendar,
  Users,
  Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import aiAssistant from '../components/AIManagerConsole';

export default function AIConsole() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hey! I'm AURA, your AI restaurant operations assistant.\n\nTry asking me:\n• 'Show today's hygiene score'\n• 'Schedule 3 chefs for Saturday'\n• 'Order milk from supplier A'\n• 'Send audit report to manager@example.com'\n\nHow can I help you today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setListening(false);
      };

      recognitionRef.current.onerror = () => {
        setListening(false);
      };

      recognitionRef.current.onend = () => {
        setListening(false);
      };
    }
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);

    try {
      // Process with AI
      const response = await aiAssistant.processCommand(userMessage, user);

      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        data: response.data,
        success: response.success,
        timestamp: new Date().toISOString()
      }]);

      // Speak response if enabled
      if (speechEnabled && response.success) {
        speak(response.message);
      }

    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "❌ Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input not supported in this browser');
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      // Remove markdown and formatting
      const cleanText = text.replace(/[*#_`]/g, '').replace(/\n+/g, '. ');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const quickCommands = [
    { icon: TrendingUp, label: "Hygiene Score", command: "Show today's hygiene score" },
    { icon: Calendar, label: "Today's Schedule", command: "Show today's schedule" },
    { icon: Users, label: "Staff Performance", command: "Show staff performance" },
    { icon: Package, label: "Check Alerts", command: "Check hygiene alerts" }
  ];

  const handleQuickCommand = (command) => {
    setInput(command);
  };

  const handleClearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared. How can I help you?",
      timestamp: new Date().toISOString()
    }]);
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("ManagerDashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Manager Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              Hey AURA - AI Manager Console
            </h1>
            <p className="text-gray-600">Voice & text commands for complete restaurant control</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSpeechEnabled(!speechEnabled)}
              title={speechEnabled ? "Disable voice responses" : "Enable voice responses"}
            >
              {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleClearChat}
              title="Clear chat"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Commands */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {quickCommands.map((cmd, index) => {
            const Icon = cmd.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-purple-50"
                onClick={() => handleQuickCommand(cmd.command)}
              >
                <Icon className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-medium">{cmd.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Chat Interface */}
        <Card className="bg-white shadow-xl border-none">
          <CardContent className="p-0">
            {/* Messages */}
            <div className="h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                        : msg.success === false
                        ? 'bg-red-50 text-red-900 border border-red-200'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                    <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-500'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-sm text-gray-600">AURA is thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4">
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleVoiceInput}
                  disabled={loading}
                  className={listening ? 'bg-red-100 border-red-300' : ''}
                >
                  <Mic className={`w-4 h-4 ${listening ? 'text-red-600 animate-pulse' : ''}`} />
                </Button>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a command or click the microphone..."
                  disabled={loading || listening}
                  className="flex-1"
                />

                <Button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>

              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge variant="outline" className="text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  AI Powered
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Voice Enabled
                </Badge>
                {listening && (
                  <Badge className="bg-red-100 text-red-800 text-xs animate-pulse">
                    🎤 Listening...
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="mt-6 bg-gradient-to-br from-purple-100 to-blue-100 border-none">
          <CardContent className="p-4">
            <p className="text-sm text-gray-700">
              <strong>💡 Pro Tip:</strong> AURA understands natural language. Try commands like:
              "Schedule Maria for Friday evening shift" or "How many staff are clocked in right now?"
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}