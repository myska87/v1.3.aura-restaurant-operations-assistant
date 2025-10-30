import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Send,
  Sparkles,
  ArrowLeft,
  Home,
  BookOpen,
  Heart,
  Lightbulb,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const SUGGESTED_QUESTIONS = [
  "Explain our value of Heritage",
  "How do I handle a difficult guest?",
  "What makes Karak Chai special?",
  "How can I create Craving Fans?",
  "What are our quality standards?",
  "How do I deal with a complaint?",
];

export default function TrainingMentor() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Welcome! I'm your AI Training Mentor. 🌟

I'm here to help you understand Chai Patta's culture, values, and operations. Ask me anything about:

• Our mission and core values
• How to handle customer situations
• Product knowledge and recipes
• Team culture and expectations
• SOPs and procedures

What would you like to learn today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: cultureContent = [] } = useQuery({
    queryKey: ['cultureContent'],
    queryFn: () => base44.entities.CultureContent.list(),
  });

  const { data: sops = [] } = useQuery({
    queryKey: ['sops'],
    queryFn: () => base44.entities.SOPDocument.list(),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context from culture content and SOPs
      const cultureContext = cultureContent.map(c => `${c.title}: ${c.content}`).join('\n\n');
      const sopContext = sops.slice(0, 3).map(s => `SOP: ${s.title}\n${s.description || ''}`).join('\n\n');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a friendly AI mentor for Chai Patta restaurant staff. Your role is to help team members understand the culture, values, and operations.

CHAI PATTA CORE PHILOSOPHY:
"We don't create customers — we create Craving Fans"

CORE VALUES:
🌿 Warmth - Every interaction radiates genuine care
💪 Discipline - Excellence through consistency
🧭 Heritage - Honoring authentic traditions
🚀 Growth - Continuous learning and development
💚 Respect - Valuing every person and contribution

CULTURE CONTEXT:
${cultureContext}

PROCEDURES:
${sopContext}

USER QUESTION: ${input}

Provide a helpful, warm, and actionable response. Use emojis appropriately. Keep it conversational and motivating. 
If the question relates to SOPs or specific procedures, mention that they can find detailed SOPs in the SOP Dashboard.
If it's about values, tie it back to creating "Craving Fans".

Be brief (2-3 paragraphs max) but impactful.`
      });

      const assistantMessage = {
        role: 'assistant',
        content: typeof response === 'string' ? response : response.text || 'I apologize, I could not generate a response.'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI mentor error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, I encountered an error. Please try again or contact your manager for assistance.'
      }]);
    }

    setIsLoading(false);
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('TrainingAcademy')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Training Academy
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none shadow-xl mb-6">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-yellow-300" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">AI Training Mentor</h1>
                <p className="text-purple-100">
                  Ask me anything about Chai Patta's culture, values, and operations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Heart className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">24/7</p>
                  <p className="text-xs text-gray-600">Always Available</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{cultureContent.length + sops.length}</p>
                  <p className="text-xs text-gray-600">Knowledge Sources</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{messages.length - 1}</p>
                  <p className="text-xs text-gray-600">Questions Answered</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">💡 Quick Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickQuestion(q)}
                  className="bg-purple-50 hover:bg-purple-100"
                >
                  {q}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardContent className="p-0">
            <div className="h-[500px] overflow-y-auto p-6 bg-gradient-to-b from-white to-gray-50">
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                        : 'bg-white border border-gray-200 shadow-sm'
                    } rounded-2xl p-4`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-600">AI Mentor</span>
                        </div>
                      )}
                      <ReactMarkdown className="text-sm prose prose-sm max-w-none">
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
                        <span className="text-sm text-gray-600">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t p-4 bg-white">
              <div className="flex gap-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about Chai Patta's culture, values, or procedures..."
                  rows={2}
                  className="flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-6"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}