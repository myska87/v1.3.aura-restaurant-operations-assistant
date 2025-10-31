
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Save,
  Send,
  MessageCircle,
  Target,
  TrendingUp,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner"; // Assuming sonner is already installed and configured

export default function StartCoachingSession() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedStaff, setSelectedStaff] = useState("");
  const [sessionData, setSessionData] = useState({
    session_date: format(new Date(), 'yyyy-MM-dd'),
    period: `Week ${Math.ceil(new Date().getDate() / 7)} ${format(new Date(), 'MMM yyyy')}`,
    self_reflection: {
      what_went_well: '',
      challenges_faced: '',
      areas_for_improvement: '',
      support_needed: '',
    },
    manager_feedback: {
      strengths_observed: '',
      areas_to_develop: '',
      specific_examples: '',
      action_items: [],
    },
    goals_set: [],
    follow_up_date: '',
    overall_score: 5,
    session_notes: '',
    status: 'scheduled',
  });
  const [newActionItem, setNewActionItem] = useState('');
  const [newGoal, setNewGoal] = useState({ goal: '', deadline: '', measurement: '' });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  // Get all active staff members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['activeTeamMembers'],
    queryFn: () => base44.entities.TeamMember.filter({ status: 'active' }),
    enabled: isManager,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['activeUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: isManager,
  });

  // Merge team members with users for complete staff list
  const staffList = useMemo(() => {
    const staffMap = new Map();

    allUsers.forEach(u => {
      if (u.email !== user?.email && (u.position && u.position !== 'owner')) {
        staffMap.set(u.email, {
          email: u.email,
          name: u.full_name,
          position: u.position,
          department: u.department,
        });
      }
    });

    teamMembers.forEach(tm => {
      if (tm.staff_email !== user?.email) {
        staffMap.set(tm.staff_email, {
          email: tm.staff_email,
          name: tm.staff_name,
          position: tm.position,
          department: tm.department,
        });
      }
    });

    return Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers, allUsers, user]);


  const createSessionMutation = useMutation({
    mutationFn: async (data) => {
      const selectedStaffData = staffList.find(s => s.email === selectedStaff);

      if (!user || !user.email || !user.full_name) {
        throw new Error("Manager information not available.");
      }

      if (!selectedStaffData) {
        throw new Error("Selected staff member not found.");
      }

      return await base44.entities.CoachingSession.create({
        ...data,
        staff_email: selectedStaff,
        staff_name: selectedStaffData?.name || '',
        manager_email: user.email,
        manager_name: user.full_name,
      });
    },
    onSuccess: (createdSession) => {
      queryClient.invalidateQueries({ queryKey: ['coachingSessions'] });

      // Create notification for staff
      base44.entities.Notification.create({
        user_email: selectedStaff,
        user_name: staffList.find(s => s.email === selectedStaff)?.name,
        type: 'task_reminder',
        title: '🌟 New Coaching Session Completed',
        message: `Your manager ${user.full_name} has completed a coaching session with you. View your feedback and goals!`,
        link_module: 'MyCoaching',
        priority: 'high',
        sender_email: user.email,
        sender_name: user.full_name,
      });

      // Success animation
      toast.success('Session Saved Successfully! 🎉', {
        description: `Coaching session for ${staffList.find(s => s.email === selectedStaff)?.name} has been saved.`,
      });

      setTimeout(() => {
        navigate(createPageUrl('CoachingDashboard'));
      }, 1500);
    },
    onError: (error) => {
      toast.error('Failed to save session', {
        description: error.message,
      });
    },
  });

  const handleAddActionItem = () => {
    if (!newActionItem.trim()) return;

    setSessionData(prev => ({
      ...prev,
      manager_feedback: {
        ...prev.manager_feedback,
        action_items: [...prev.manager_feedback.action_items, newActionItem],
      },
    }));
    setNewActionItem('');
  };

  const handleAddGoal = () => {
    if (!newGoal.goal.trim()) return;

    setSessionData(prev => ({
      ...prev,
      goals_set: [...prev.goals_set, { ...newGoal, status: 'not_started' }],
    }));
    setNewGoal({ goal: '', deadline: '', measurement: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedStaff) {
      toast.error('Please select a staff member');
      return;
    }

    createSessionMutation.mutate({
      ...sessionData,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('CoachingDashboard')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Sparkles className="w-10 h-10 text-purple-600" />
            Start Coaching Session
          </h1>
          <p className="text-gray-600 text-lg">
            Build champions through meaningful conversations, not criticism.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Staff Selection */}
          <Card className="shadow-lg border-2 border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <CardTitle>Select Team Member</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-semibold mb-2 block">Staff Member *</Label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map(staff => (
                        <SelectItem key={staff.email} value={staff.email}>
                          {staff.name} - {staff.position || 'Staff'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-700 font-semibold mb-2 block">Session Date</Label>
                  <Input
                    type="date"
                    value={sessionData.session_date}
                    onChange={(e) => setSessionData({ ...sessionData, session_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-semibold mb-2 block">Period</Label>
                  <Input
                    value={sessionData.period}
                    onChange={(e) => setSessionData({ ...sessionData, period: e.target.value })}
                    placeholder="e.g., Week 1 Jan 2024"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-semibold mb-2 block">Follow-up Date</Label>
                  <Input
                    type="date"
                    value={sessionData.follow_up_date}
                    onChange={(e) => setSessionData({ ...sessionData, follow_up_date: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Self-Reflection Section */}
          <Card className="shadow-lg border-2 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Staff Self-Reflection
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="font-semibold mb-2 block">What went well this period? 🌟</Label>
                <Textarea
                  value={sessionData.self_reflection.what_went_well}
                  onChange={(e) => setSessionData({
                    ...sessionData,
                    self_reflection: { ...sessionData.self_reflection, what_went_well: e.target.value }
                  })}
                  rows={3}
                  placeholder="Achievements, successes, positive moments..."
                />
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Challenges faced 🤔</Label>
                <Textarea
                  value={sessionData.self_reflection.challenges_faced}
                  onChange={(e) => setSessionData({
                    ...sessionData,
                    self_reflection: { ...sessionData.self_reflection, challenges_faced: e.target.value }
                  })}
                  rows={3}
                  placeholder="Difficulties, obstacles, areas of struggle..."
                />
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Areas for improvement 📈</Label>
                <Textarea
                  value={sessionData.self_reflection.areas_for_improvement}
                  onChange={(e) => setSessionData({
                    ...sessionData,
                    self_reflection: { ...sessionData.self_reflection, areas_for_improvement: e.target.value }
                  })}
                  rows={3}
                  placeholder="Skills to develop, knowledge gaps..."
                />
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Support needed from manager 🤝</Label>
                <Textarea
                  value={sessionData.self_reflection.support_needed}
                  onChange={(e) => setSessionData({
                    ...sessionData,
                    self_reflection: { ...sessionData.self_reflection, support_needed: e.target.value }
                  })}
                  rows={3}
                  placeholder="Resources, training, guidance needed..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Manager Feedback */}
          <Card className="shadow-lg border-2 border-green-200">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Manager Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="font-semibold mb-2 block">Strengths Observed ✨</Label>
                <Textarea
                  value={sessionData.manager_feedback.strengths_observed}
                  onChange={(e) => setSessionData({
                    ...sessionData,
                    manager_feedback: { ...sessionData.manager_feedback, strengths_observed: e.target.value }
                  })}
                  rows={3}
                  placeholder="What they're doing exceptionally well..."
                  required
                />
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Areas to Develop 📚</Label>
                <Textarea
                  value={sessionData.manager_feedback.areas_to_develop}
                  onChange={(e) => setSessionData({
                    ...sessionData,
                    manager_feedback: { ...sessionData.manager_feedback, areas_to_develop: e.target.value }
                  })}
                  rows={3}
                  placeholder="Growth opportunities..."
                />
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Specific Examples 💡</Label>
                <Textarea
                  value={sessionData.manager_feedback.specific_examples}
                  onChange={(e) => setSessionData({
                    ...sessionData,
                    manager_feedback: { ...sessionData.manager_feedback, specific_examples: e.target.value }
                  })}
                  rows={3}
                  placeholder="Concrete examples of their performance..."
                />
              </div>

              {/* Action Items */}
              <div>
                <Label className="font-semibold mb-2 block">Action Items 📋</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newActionItem}
                    onChange={(e) => setNewActionItem(e.target.value)}
                    placeholder="Add action item..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddActionItem())}
                  />
                  <Button type="button" onClick={handleAddActionItem} variant="outline">
                    Add
                  </Button>
                </div>
                {sessionData.manager_feedback.action_items.length > 0 && (
                  <ul className="space-y-2">
                    {sessionData.manager_feedback.action_items.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="flex-1">{item}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSessionData({
                            ...sessionData,
                            manager_feedback: {
                              ...sessionData.manager_feedback,
                              action_items: sessionData.manager_feedback.action_items.filter((_, i) => i !== idx)
                            }
                          })}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Goals Setting */}
          <Card className="shadow-lg border-2 border-amber-200">
            <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Goals for Next Period
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-sm mb-1 block">Goal Description</Label>
                  <Input
                    value={newGoal.goal}
                    onChange={(e) => setNewGoal({ ...newGoal, goal: e.target.value })}
                    placeholder="e.g., Improve speed of service by 20%"
                  />
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Deadline</Label>
                  <Input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm mb-1 block">How to Measure Success</Label>
                <Input
                  value={newGoal.measurement}
                  onChange={(e) => setNewGoal({ ...newGoal, measurement: e.target.value })}
                  placeholder="e.g., Customer satisfaction score >4.5"
                />
              </div>
              <Button type="button" onClick={handleAddGoal} variant="outline" className="w-full">
                <Target className="w-4 h-4 mr-2" />
                Add Goal
              </Button>

              {sessionData.goals_set.length > 0 && (
                <div className="mt-4 space-y-3">
                  {sessionData.goals_set.map((goal, idx) => (
                    <Card key={idx} className="border border-amber-300 bg-amber-50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{goal.goal}</p>
                            {goal.deadline && (
                              <p className="text-sm text-gray-600">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Due: {format(new Date(goal.deadline), 'MMM d, yyyy')}
                              </p>
                            )}
                            {goal.measurement && (
                              <p className="text-sm text-gray-600">📊 {goal.measurement}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSessionData({
                              ...sessionData,
                              goals_set: sessionData.goals_set.filter((_, i) => i !== idx)
                            })}
                          >
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overall Assessment */}
          <Card className="shadow-lg border-2 border-indigo-200">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <CardTitle>Overall Assessment</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="font-semibold mb-2 block">Overall Performance Score (1-10)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={sessionData.overall_score}
                  onChange={(e) => setSessionData({ ...sessionData, overall_score: parseFloat(e.target.value) })}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {sessionData.overall_score >= 8 ? '🌟 Excellent' : sessionData.overall_score >= 6 ? '✅ Good' : sessionData.overall_score >= 4 ? '📈 Developing' : '🔧 Needs Support'}
                </p>
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Session Notes</Label>
                <Textarea
                  value={sessionData.session_notes}
                  onChange={(e) => setSessionData({ ...sessionData, session_notes: e.target.value })}
                  rows={4}
                  placeholder="Additional observations, context, or important points discussed..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl('CoachingDashboard'))}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createSessionMutation.isPending || !selectedStaff}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg px-8 py-6"
            >
              {createSessionMutation.isPending ? (
                'Saving...'
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Coaching Session
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
