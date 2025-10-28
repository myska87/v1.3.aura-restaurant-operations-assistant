import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Send,
  Mic,
  Home,
  Download,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Target,
  Star,
  Package,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function AuraIntelligence() {
  const queryClient = useQueryClient();
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Fetch AI predictions
  const { data: predictions = [] } = useQuery({
    queryKey: ['aiPredictions'],
    queryFn: () => base44.entities.AIPrediction.list('-prediction_date', 20),
    enabled: isManager,
  });

  // Fetch AI audit logs
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['aiAuditLogs'],
    queryFn: () => base44.entities.AIAuditLog.list('-created_date', 50),
    enabled: isManager,
  });

  const recentPredictions = predictions.slice(0, 5);
  const criticalPredictions = predictions.filter(p => p.severity === 'high' || p.severity === 'critical');

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    // Add user message to history
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Get context data for AI
      const [tasks, quality, attendance, insights] = await Promise.all([
        base44.entities.OperationTask.list('-created_date', 50),
        base44.entities.QualityRecord.list('-created_date', 30),
        base44.entities.AttendanceRecord.list('-shift_date', 30),
        base44.entities.AnalyticsInsight.list('-insight_date', 5),
      ]);

      const context = `
Restaurant Operations Context:
- Total Tasks: ${tasks.length}, Completed: ${tasks.filter(t => t.status === 'completed').length}
- Quality Average: ${quality.length > 0 ? (quality.reduce((sum, q) => sum + q.score, 0) / quality.length).toFixed(1) : 'N/A'}
- Recent Insights: ${insights.map(i => i.title).join(', ')}

User Question: ${userMessage}

Provide a helpful, concise answer based on the data above.
      `;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: context,
      });

      // Add AI response to history
      setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);

      // Log AI interaction
      await base44.entities.AIAuditLog.create({
        ai_function: 'chat',
        input_prompt: userMessage,
        output_summary: aiResponse.substring(0, 200),
        full_response: { response: aiResponse },
        confidence_score: 0.8,
        module_origin: 'ai_dashboard',
        user_email: user.email,
        user_name: user.full_name,
        processing_time_ms: 0,
      });

    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Sorry, I encountered an error. Please try again.' 
      }]);
    }

    setChatLoading(false);
  };

  const quickQuestions = [
    "What's today's operational score?",
    "Show me quality trends",
    "Any predicted risks this week?",
    "Top performing staff members?",
  ];

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">AURA Intelligence is only accessible to Managers and Administrators.</p>
              <Link to={createPageUrl('Dashboard')}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent">
                AURA Intelligence
              </h1>
              <p className="text-gray-600">AI-powered predictions & insights for your restaurant</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Predictions Count */}
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-10 h-10 text-purple-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-gray-900">{predictions.length}</p>
              <p className="text-sm text-gray-600">Active Predictions</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-red-900">{criticalPredictions.length}</p>
              <p className="text-sm text-gray-600">High Priority</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Brain className="w-10 h-10 text-blue-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-blue-900">{auditLogs.length}</p>
              <p className="text-sm text-gray-600">AI Interactions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Predictions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                AI Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPredictions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No predictions yet</p>
                  </div>
                ) : (
                  recentPredictions.map((pred, index) => (
                    <motion.div
                      key={pred.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className={`p-4 rounded-lg border-2 ${
                        pred.severity === 'critical' ? 'bg-red-50 border-red-200' :
                        pred.severity === 'high' ? 'bg-amber-50 border-amber-200' :
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            pred.severity === 'critical' ? 'bg-red-100' :
                            pred.severity === 'high' ? 'bg-amber-100' :
                            'bg-blue-100'
                          }`}>
                            {pred.prediction_type === 'stock_shortage' ? <Package className="w-5 h-5" /> :
                             pred.prediction_type === 'quality_decline' ? <Star className="w-5 h-5" /> :
                             pred.prediction_type === 'staff_burnout' ? <Users className="w-5 h-5" /> :
                             <Target className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-sm capitalize">
                                {pred.prediction_type.replace(/_/g, ' ')}
                              </h4>
                              <Badge className="text-xs">
                                {Math.round(pred.confidence_level * 100)}% confident
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{pred.prediction_summary}</p>
                            {pred.recommended_actions && pred.recommended_actions.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <p className="font-semibold mb-1">Recommended:</p>
                                <ul className="space-y-0.5">
                                  {pred.recommended_actions.map((action, i) => (
                                    <li key={i}>• {action}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Chat */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Ask AURA AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex flex-col">
                {/* Chat History */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-3 p-2">
                  {chatHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-4">Ask me anything about your restaurant operations</p>
                      <div className="space-y-2">
                        {quickQuestions.map((q, i) => (
                          <Button
                            key={i}
                            size="sm"
                            variant="outline"
                            onClick={() => setChatInput(q)}
                            className="w-full text-xs"
                          >
                            {q}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask AURA anything..."
                    disabled={chatLoading}
                  />
                  <Button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              AI Interaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No AI interactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="capitalize text-xs">{log.ai_function}</Badge>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(log.confidence_score * 100)}% confidence
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">{log.input_prompt}</p>
                        <p className="text-xs text-gray-700">{log.output_summary}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{log.user_name} • {format(new Date(log.created_date), 'MMM d, h:mm a')}</span>
                      {log.was_helpful !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {log.was_helpful ? '👍 Helpful' : '👎 Not helpful'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}