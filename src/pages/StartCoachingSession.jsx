import React, { useState } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Home, Calendar as CalendarIcon, Upload, Save, Send } from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function StartCoachingSession() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingFile, setUploadingFile] = useState(false);

  const [formData, setFormData] = useState({
    staff_email: "",
    session_date: new Date(),
    period: "",
    self_reflection: {
      what_went_well: "",
      challenges_faced: "",
      areas_for_improvement: "",
      support_needed: "",
    },
    manager_feedback: {
      strengths_observed: "",
      areas_to_develop: "",
      specific_examples: "",
      action_items: [],
    },
    goals_set: [],
    follow_up_date: null,
    attachments: [],
    overall_score: 5,
    session_notes: "",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.list(),
  });

  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.CoachingSession.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachingSessions'] });
      navigate(createPageUrl("CoachingDashboard"));
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, file_url]
      }));
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    }
    setUploadingFile(false);
  };

  const addActionItem = () => {
    setFormData(prev => ({
      ...prev,
      manager_feedback: {
        ...prev.manager_feedback,
        action_items: [...prev.manager_feedback.action_items, ""]
      }
    }));
  };

  const updateActionItem = (index, value) => {
    const updated = [...formData.manager_feedback.action_items];
    updated[index] = value;
    setFormData(prev => ({
      ...prev,
      manager_feedback: {
        ...prev.manager_feedback,
        action_items: updated
      }
    }));
  };

  const addGoal = () => {
    setFormData(prev => ({
      ...prev,
      goals_set: [...prev.goals_set, { goal: "", deadline: "", measurement: "", status: "not_started" }]
    }));
  };

  const updateGoal = (index, field, value) => {
    const updated = [...formData.goals_set];
    updated[index][field] = value;
    setFormData(prev => ({
      ...prev,
      goals_set: updated
    }));
  };

  const handleSaveDraft = async () => {
    const selectedStaff = allStaff.find(s => s.email === formData.staff_email);
    if (!selectedStaff) {
      alert("Please select a staff member");
      return;
    }

    await createSessionMutation.mutateAsync({
      ...formData,
      staff_name: selectedStaff.full_name,
      manager_email: user?.email,
      manager_name: user?.full_name,
      status: "scheduled",
      session_date: format(formData.session_date, 'yyyy-MM-dd'),
      follow_up_date: formData.follow_up_date ? format(formData.follow_up_date, 'yyyy-MM-dd') : null,
    });
  };

  const handleComplete = async () => {
    const selectedStaff = allStaff.find(s => s.email === formData.staff_email);
    if (!selectedStaff) {
      alert("Please select a staff member");
      return;
    }

    if (!formData.period || !formData.follow_up_date) {
      alert("Please fill in all required fields");
      return;
    }

    await createSessionMutation.mutateAsync({
      ...formData,
      staff_name: selectedStaff.full_name,
      manager_email: user?.email,
      manager_name: user?.full_name,
      status: "self_reflection_pending",
      session_date: format(formData.session_date, 'yyyy-MM-dd'),
      follow_up_date: format(formData.follow_up_date, 'yyyy-MM-dd'),
    });
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("CoachingDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Start New Coaching Session</h1>
          <p className="text-gray-600">Create a meaningful coaching conversation</p>
        </div>

        {/* Motivational Quote */}
        <Card className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-none shadow-lg mb-8">
          <CardContent className="p-6 text-center">
            <p className="text-xl font-semibold">"Coaching builds champions, not critics."</p>
          </CardContent>
        </Card>

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="staff">Staff Member *</Label>
                <Select
                  value={formData.staff_email}
                  onValueChange={(value) => setFormData({ ...formData, staff_email: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {allStaff.filter(s => s.position !== 'owner').map(staff => (
                      <SelectItem key={staff.email} value={staff.email}>
                        {staff.full_name} - {staff.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Session Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(formData.session_date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.session_date}
                        onSelect={(date) => setFormData({ ...formData, session_date: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="period">Period *</Label>
                  <Input
                    id="period"
                    placeholder="e.g., Week 1 Jan 2024, Q1 2024"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Self-Reflection Section */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle>Section 1: Staff Self-Reflection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>What went well this period?</Label>
                <Textarea
                  rows={3}
                  value={formData.self_reflection.what_went_well}
                  onChange={(e) => setFormData({
                    ...formData,
                    self_reflection: { ...formData.self_reflection, what_went_well: e.target.value }
                  })}
                  placeholder="Achievements, successes, positive moments..."
                />
              </div>

              <div>
                <Label>Challenges faced?</Label>
                <Textarea
                  rows={3}
                  value={formData.self_reflection.challenges_faced}
                  onChange={(e) => setFormData({
                    ...formData,
                    self_reflection: { ...formData.self_reflection, challenges_faced: e.target.value }
                  })}
                  placeholder="Difficulties, obstacles, areas of struggle..."
                />
              </div>

              <div>
                <Label>Areas for improvement?</Label>
                <Textarea
                  rows={3}
                  value={formData.self_reflection.areas_for_improvement}
                  onChange={(e) => setFormData({
                    ...formData,
                    self_reflection: { ...formData.self_reflection, areas_for_improvement: e.target.value }
                  })}
                  placeholder="Skills to develop, behaviors to change..."
                />
              </div>

              <div>
                <Label>What support do you need?</Label>
                <Textarea
                  rows={3}
                  value={formData.self_reflection.support_needed}
                  onChange={(e) => setFormData({
                    ...formData,
                    self_reflection: { ...formData.self_reflection, support_needed: e.target.value }
                  })}
                  placeholder="Resources, training, guidance needed..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Manager Feedback Section */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle>Section 2: Manager Coaching</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Observed Strengths</Label>
                <Textarea
                  rows={3}
                  value={formData.manager_feedback.strengths_observed}
                  onChange={(e) => setFormData({
                    ...formData,
                    manager_feedback: { ...formData.manager_feedback, strengths_observed: e.target.value }
                  })}
                  placeholder="Positive behaviors, skills demonstrated..."
                />
              </div>

              <div>
                <Label>Areas to Develop</Label>
                <Textarea
                  rows={3}
                  value={formData.manager_feedback.areas_to_develop}
                  onChange={(e) => setFormData({
                    ...formData,
                    manager_feedback: { ...formData.manager_feedback, areas_to_develop: e.target.value }
                  })}
                  placeholder="Skills to work on, growth opportunities..."
                />
              </div>

              <div>
                <Label>Specific Examples</Label>
                <Textarea
                  rows={3}
                  value={formData.manager_feedback.specific_examples}
                  onChange={(e) => setFormData({
                    ...formData,
                    manager_feedback: { ...formData.manager_feedback, specific_examples: e.target.value }
                  })}
                  placeholder="Concrete examples of performance..."
                />
              </div>

              <div>
                <Label>Action Items</Label>
                {formData.manager_feedback.action_items.map((item, index) => (
                  <Input
                    key={index}
                    value={item}
                    onChange={(e) => updateActionItem(index, e.target.value)}
                    placeholder={`Action item ${index + 1}`}
                    className="mb-2"
                  />
                ))}
                <Button type="button" variant="outline" onClick={addActionItem} className="w-full">
                  + Add Action Item
                </Button>
              </div>

              <div>
                <Label>Overall Score (0-10)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.overall_score}
                  onChange={(e) => setFormData({ ...formData, overall_score: parseInt(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Plan Section */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle>Section 3: Action Plan & Goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Goals for Next Period</Label>
                {formData.goals_set.map((goal, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <Input
                      value={goal.goal}
                      onChange={(e) => updateGoal(index, 'goal', e.target.value)}
                      placeholder="Goal description"
                      className="mb-2"
                    />
                    <div className="grid md:grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={goal.deadline}
                        onChange={(e) => updateGoal(index, 'deadline', e.target.value)}
                        placeholder="Deadline"
                      />
                      <Input
                        value={goal.measurement}
                        onChange={(e) => updateGoal(index, 'measurement', e.target.value)}
                        placeholder="How to measure success"
                      />
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addGoal} className="w-full">
                  + Add Goal
                </Button>
              </div>

              <div>
                <Label>Follow-Up Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {formData.follow_up_date ? format(formData.follow_up_date, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.follow_up_date}
                      onSelect={(date) => setFormData({ ...formData, follow_up_date: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Attachments</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload').click()}
                    disabled={uploadingFile}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingFile ? 'Uploading...' : 'Attach File'}
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {formData.attachments.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {formData.attachments.length} file(s) attached
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label>Session Notes</Label>
                <Textarea
                  rows={3}
                  value={formData.session_notes}
                  onChange={(e) => setFormData({ ...formData, session_notes: e.target.value })}
                  placeholder="Additional notes from this session..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => navigate(createPageUrl("CoachingDashboard"))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSaveDraft} disabled={createSessionMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button onClick={handleComplete} disabled={createSessionMutation.isPending} className="bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4 mr-2" />
                Complete Session
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}