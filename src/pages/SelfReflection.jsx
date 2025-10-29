import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send, ArrowLeft, Home, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SelfReflection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');

  const [reflection, setReflection] = useState({
    what_went_well: "",
    challenges_faced: "",
    areas_for_improvement: "",
    support_needed: "",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: session } = useQuery({
    queryKey: ['coachingSession', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const sessions = await base44.entities.CoachingSession.filter({ id: sessionId });
      return sessions[0];
    },
    enabled: !!sessionId,
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.CoachingSession.update(sessionId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachingSession'] });
      queryClient.invalidateQueries({ queryKey: ['myCoachingSessions'] });
      alert('✅ Self-reflection submitted successfully!');
      navigate(createPageUrl('MyCoaching'));
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!session) {
      alert('Session not found');
      return;
    }

    // Validate all fields are filled
    if (!reflection.what_went_well || !reflection.challenges_faced || 
        !reflection.areas_for_improvement || !reflection.support_needed) {
      alert('Please complete all reflection questions');
      return;
    }

    updateSessionMutation.mutate({
      ...session,
      self_reflection: reflection,
      status: 'manager_review_pending',
    });
  };

  if (!sessionId || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Session Selected</h2>
            <p className="text-gray-600 mb-6">Please select a coaching session to complete your reflection.</p>
            <Link to={createPageUrl('MyCoaching')}>
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to My Coaching
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status !== 'self_reflection_pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Already Completed</h2>
            <p className="text-gray-600 mb-6">You've already completed this reflection.</p>
            <Link to={createPageUrl('MyCoaching')}>
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to My Coaching
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("MyCoaching")}>
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

        {/* Header */}
        <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none mb-8">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">Self-Reflection</h1>
                <p className="text-purple-100">
                  {session.period} • {session.manager_name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reflection Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>✨ Take Time to Reflect</CardTitle>
              <p className="text-sm text-gray-600">
                This reflection helps you and your manager have meaningful coaching conversations.
                Be honest and thoughtful - there are no wrong answers.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question 1 */}
              <div className="space-y-2">
                <Label htmlFor="what_went_well" className="text-lg font-semibold text-gray-900">
                  1. What went well this period? 🌟
                </Label>
                <p className="text-sm text-gray-600">Think about your successes, what you're proud of, and positive moments.</p>
                <Textarea
                  id="what_went_well"
                  value={reflection.what_went_well}
                  onChange={(e) => setReflection({ ...reflection, what_went_well: e.target.value })}
                  rows={4}
                  placeholder="e.g., I handled a difficult customer situation really well, maintained excellent hygiene scores..."
                  className="text-base"
                  required
                />
              </div>

              {/* Question 2 */}
              <div className="space-y-2">
                <Label htmlFor="challenges_faced" className="text-lg font-semibold text-gray-900">
                  2. What challenges did you face? 🤔
                </Label>
                <p className="text-sm text-gray-600">What was difficult? What didn't go as planned?</p>
                <Textarea
                  id="challenges_faced"
                  value={reflection.challenges_faced}
                  onChange={(e) => setReflection({ ...reflection, challenges_faced: e.target.value })}
                  rows={4}
                  placeholder="e.g., Struggled with time management during busy shifts, found new equipment difficult to use..."
                  className="text-base"
                  required
                />
              </div>

              {/* Question 3 */}
              <div className="space-y-2">
                <Label htmlFor="areas_for_improvement" className="text-lg font-semibold text-gray-900">
                  3. What would you like to improve? 📈
                </Label>
                <p className="text-sm text-gray-600">What skills or areas do you want to develop?</p>
                <Textarea
                  id="areas_for_improvement"
                  value={reflection.areas_for_improvement}
                  onChange={(e) => setReflection({ ...reflection, areas_for_improvement: e.target.value })}
                  rows={4}
                  placeholder="e.g., Want to get faster at food prep, improve my customer service skills, learn how to train new staff..."
                  className="text-base"
                  required
                />
              </div>

              {/* Question 4 */}
              <div className="space-y-2">
                <Label htmlFor="support_needed" className="text-lg font-semibold text-gray-900">
                  4. What support do you need from your manager? 🤝
                </Label>
                <p className="text-sm text-gray-600">How can your manager help you succeed?</p>
                <Textarea
                  id="support_needed"
                  value={reflection.support_needed}
                  onChange={(e) => setReflection({ ...reflection, support_needed: e.target.value })}
                  rows={4}
                  placeholder="e.g., More training on the new system, help with prioritizing tasks, feedback on my performance..."
                  className="text-base"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Link to={createPageUrl('MyCoaching')}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={updateSessionMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {updateSessionMutation.isPending ? 'Submitting...' : 'Submit Reflection'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}