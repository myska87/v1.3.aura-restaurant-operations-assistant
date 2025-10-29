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
  AlertTriangle,
  Camera,
  Send,
  Home,
  ArrowLeft,
  CheckCircle,
  Clock,
  Wrench,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function BugReport() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    severity: 'medium',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    screenshot_urls: [],
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: myBugs = [], isLoading } = useQuery({
    queryKey: ['myBugReports', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.BugReport.filter({ reporter_email: user.email }, '-created_date', 20);
    },
    enabled: !!user?.email,
  });

  const submitBugMutation = useMutation({
    mutationFn: (data) => base44.entities.BugReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBugReports'] });
      setShowSuccess(true);
      setFormData({
        title: '',
        description: '',
        category: 'other',
        severity: 'medium',
        steps_to_reproduce: '',
        expected_behavior: '',
        actual_behavior: '',
        screenshot_urls: [],
      });
      setTimeout(() => setShowSuccess(false), 5000);
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
      alert('Failed to upload screenshot');
    }
    setUploading(false);
  };

  const removeScreenshot = (index) => {
    setFormData(prev => ({
      ...prev,
      screenshot_urls: prev.screenshot_urls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in title and description');
      return;
    }

    const browserInfo = `${navigator.userAgent}`;
    const deviceType = /mobile/i.test(navigator.userAgent) ? 'Mobile' : 
                      /tablet/i.test(navigator.userAgent) ? 'Tablet' : 'Desktop';

    await submitBugMutation.mutateAsync({
      ...formData,
      reporter_email: user.email,
      reporter_name: user.full_name,
      browser: browserInfo,
      device: deviceType,
      status: 'submitted',
    });
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[severity] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      submitted: 'bg-gray-100 text-gray-800 border-gray-200',
      investigating: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
      fixed: 'bg-green-100 text-green-800 border-green-200',
      wont_fix: 'bg-gray-100 text-gray-800 border-gray-200',
      duplicate: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || colors.submitted;
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-10 h-10 text-red-600" />
            <h1 className="text-4xl font-bold text-gray-900">Report a Bug</h1>
          </div>
          <p className="text-gray-600 text-lg">Found something not working? Let us know and we'll fix it!</p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="mb-6 bg-green-50 border-green-200">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Bug Report Submitted!</p>
                  <p className="text-sm text-green-700">Thank you! We'll investigate and fix this soon.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Report Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Bug Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="title">Bug Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Clock In button not working"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
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
                          <SelectItem value="shifts">Shifts & Rota</SelectItem>
                          <SelectItem value="tasks">Tasks</SelectItem>
                          <SelectItem value="menu">Menu</SelectItem>
                          <SelectItem value="inventory">Inventory</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                          <SelectItem value="reports">Reports</SelectItem>
                          <SelectItem value="ui">User Interface</SelectItem>
                          <SelectItem value="performance">Performance/Speed</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="severity">Severity *</Label>
                      <Select
                        value={formData.severity}
                        onValueChange={(value) => setFormData({...formData, severity: value})}
                      >
                        <SelectTrigger id="severity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low - Minor issue</SelectItem>
                          <SelectItem value="medium">Medium - Annoying but workable</SelectItem>
                          <SelectItem value="high">High - Major problem</SelectItem>
                          <SelectItem value="critical">Critical - App unusable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the bug in detail..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="steps">Steps to Reproduce</Label>
                    <Textarea
                      id="steps"
                      placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
                      value={formData.steps_to_reproduce}
                      onChange={(e) => setFormData({...formData, steps_to_reproduce: e.target.value})}
                      rows={4}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expected">Expected Behavior</Label>
                      <Textarea
                        id="expected"
                        placeholder="What should happen?"
                        value={formData.expected_behavior}
                        onChange={(e) => setFormData({...formData, expected_behavior: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="actual">Actual Behavior</Label>
                      <Textarea
                        id="actual"
                        placeholder="What actually happens?"
                        value={formData.actual_behavior}
                        onChange={(e) => setFormData({...formData, actual_behavior: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Screenshots (optional but helpful)</Label>
                    <div className="mt-2 space-y-3">
                      <label className="cursor-pointer">
                        <Button type="button" variant="outline" asChild disabled={uploading}>
                          <div>
                            <Camera className="w-4 h-4 mr-2" />
                            {uploading ? 'Uploading...' : 'Add Screenshot'}
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
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {formData.screenshot_urls.map((url, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt="Screenshot"
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

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={submitBugMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {submitBugMutation.isPending ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Bug Report
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* My Bug Reports */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Bug Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : myBugs.length === 0 ? (
                  <p className="text-sm text-gray-500">No bugs reported yet</p>
                ) : (
                  <div className="space-y-3">
                    {myBugs.map((bug) => (
                      <div key={bug.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-sm leading-tight">{bug.title}</h4>
                          <Badge className={getSeverityColor(bug.severity)}>
                            {bug.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(bug.status)}>
                            {bug.status.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(new Date(bug.created_date), 'MMM d')}
                          </span>
                        </div>
                        {bug.admin_notes && (
                          <p className="text-xs text-blue-600 mt-2 italic">
                            Admin: {bug.admin_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help Box */}
            <Card className="mt-6 bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Wrench className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Quick Tips</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Be specific about what happened</li>
                      <li>• Screenshots help us fix faster</li>
                      <li>• Include steps to reproduce</li>
                      <li>• Check your reports above for updates</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}