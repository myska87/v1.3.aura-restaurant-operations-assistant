import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Lightbulb,
  Send,
  Home,
  ArrowLeft,
  CheckCircle,
  ThumbsUp,
  MessageCircle,
  Sparkles,
  Plus,
  Camera,
  X,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function FeatureIdeas() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    problem_solved: '',
    use_case: '',
    priority_for_user: 'would_help',
    screenshot_urls: [],
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['featureIdeas'],
    queryFn: () => base44.entities.FeatureIdea.list('-created_date', 100),
  });

  const submitIdeaMutation = useMutation({
    mutationFn: (data) => base44.entities.FeatureIdea.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureIdeas'] });
      setShowDialog(false);
      setFormData({
        title: '',
        description: '',
        category: 'other',
        problem_solved: '',
        use_case: '',
        priority_for_user: 'would_help',
        screenshot_urls: [],
      });
    },
  });

  const voteIdeaMutation = useMutation({
    mutationFn: async (idea) => {
      const hasVoted = idea.voted_by?.includes(user.email) || false;
      const newVotedBy = hasVoted
        ? idea.voted_by.filter(email => email !== user.email)
        : [...(idea.voted_by || []), user.email];
      
      return await base44.entities.FeatureIdea.update(idea.id, {
        votes: hasVoted ? idea.votes - 1 : idea.votes + 1,
        voted_by: newVotedBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureIdeas'] });
    },
  });

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        screenshot_urls: [...prev.screenshot_urls, file_url]
      }));
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploading(false);
  };

  const removeScreenshot = (index) => {
    setFormData(prev => ({
      ...prev,
      screenshot_urls: prev.screenshot_urls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in title and description');
      return;
    }

    await submitIdeaMutation.mutateAsync({
      ...formData,
      submitter_email: user.email,
      submitter_name: user.full_name,
      status: 'submitted',
      votes: 1,
      voted_by: [user.email],
    });
  };

  const filteredIdeas = ideas.filter(idea => {
    const matchesCategory = filterCategory === 'all' || idea.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || idea.status === filterStatus;
    return matchesCategory && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      submitted: 'bg-gray-100 text-gray-800 border-gray-200',
      under_review: 'bg-blue-100 text-blue-800 border-blue-200',
      planned: 'bg-purple-100 text-purple-800 border-purple-200',
      in_development: 'bg-amber-100 text-amber-800 border-amber-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      declined: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || colors.submitted;
  };

  const hasVoted = (idea) => {
    return idea.voted_by?.includes(user?.email) || false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Title */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Lightbulb className="w-10 h-10 text-amber-600" />
              <h1 className="text-4xl font-bold text-gray-900">Feature Ideas</h1>
            </div>
            <p className="text-gray-600 text-lg">Share your ideas to make AURA even better!</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" />
            Submit Idea
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Your ideas matter!</h3>
                <p className="text-sm text-amber-800">
                  Vote on ideas you want, and help us prioritize what to build next. Most voted ideas get built first!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="forms">Forms</SelectItem>
                  <SelectItem value="shifts">Shifts</SelectItem>
                  <SelectItem value="tasks">Tasks</SelectItem>
                  <SelectItem value="menu">Menu</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="ai">AI Features</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_development">In Development</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Ideas List */}
        <div className="space-y-4">
          {filteredIdeas.map((idea, index) => (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Vote Button */}
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant={hasVoted(idea) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => voteIdeaMutation.mutate(idea)}
                        className={hasVoted(idea) ? 'bg-amber-600 hover:bg-amber-700' : ''}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-bold text-gray-700">{idea.votes}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{idea.title}</h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={getStatusColor(idea.status)}>
                            {idea.status.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="outline">{idea.category}</Badge>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3 leading-relaxed">{idea.description}</p>

                      {idea.problem_solved && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-semibold text-blue-900 mb-1">Problem Solved:</p>
                          <p className="text-sm text-blue-800">{idea.problem_solved}</p>
                        </div>
                      )}

                      {idea.admin_response && (
                        <div className="mb-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                          <p className="text-sm font-semibold text-green-900 mb-1">🎯 Team Response:</p>
                          <p className="text-sm text-green-800">{idea.admin_response}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>By {idea.submitter_name}</span>
                        <span>•</span>
                        <span>{format(new Date(idea.created_date), 'MMM d, yyyy')}</span>
                        {idea.planned_for_version && (
                          <>
                            <span>•</span>
                            <Badge className="bg-purple-100 text-purple-800">
                              v{idea.planned_for_version}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredIdeas.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No ideas found. Be the first to submit one!</p>
            </CardContent>
          </Card>
        )}

        {/* Submit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit Feature Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Idea Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Add voice notes to shift handovers"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forms">Forms</SelectItem>
                      <SelectItem value="shifts">Shifts</SelectItem>
                      <SelectItem value="tasks">Tasks</SelectItem>
                      <SelectItem value="menu">Menu</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="reports">Reports</SelectItem>
                      <SelectItem value="automation">Automation</SelectItem>
                      <SelectItem value="ai">AI Features</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">How important is this to you? *</Label>
                  <Select
                    value={formData.priority_for_user}
                    onValueChange={(value) => setFormData({...formData, priority_for_user: value})}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nice_to_have">Nice to Have</SelectItem>
                      <SelectItem value="would_help">Would Help</SelectItem>
                      <SelectItem value="very_important">Very Important</SelectItem>
                      <SelectItem value="critical">Critical Need</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your idea in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="problem">What problem does this solve?</Label>
                <Textarea
                  id="problem"
                  placeholder="Tell us what challenge this would address..."
                  value={formData.problem_solved}
                  onChange={(e) => setFormData({...formData, problem_solved: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="usecase">Real-world use case</Label>
                <Textarea
                  id="usecase"
                  placeholder="Example: During busy lunch rush, we need to..."
                  value={formData.use_case}
                  onChange={(e) => setFormData({...formData, use_case: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label>Reference Images (optional)</Label>
                <div className="mt-2 space-y-3">
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" asChild disabled={uploading}>
                      <div>
                        <Camera className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Add Image'}
                      </div>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                  </label>

                  {formData.screenshot_urls.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {formData.screenshot_urls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt="Reference"
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removeScreenshot(index)}
                            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitIdeaMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {submitIdeaMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Idea
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}