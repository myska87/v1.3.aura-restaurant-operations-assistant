import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, TrendingUp, CheckCircle, AlertCircle, Plus, Camera, FileText, BarChart3, Download, Eye, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

export default function QualityAuditHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('quick-check');
  const [showCheckDialog, setShowCheckDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [checkData, setCheckData] = useState({
    check_title: '',
    check_type: 'food_quality',
    area: 'kitchen',
    score: 5,
    photo_urls: [],
    comments: '',
    corrective_action_required: false,
    corrective_action: '',
  });

  const [auditData, setAuditData] = useState({
    audit_title: '',
    audit_type: 'internal',
    audit_date: format(new Date(), 'yyyy-MM-dd'),
    auditor_name: '',
    overall_score: 100,
    sections: [],
    strengths: '',
    weaknesses: '',
    corrective_actions: [],
    status: 'draft',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: qualityChecks = [] } = useQuery({
    queryKey: ['qualityChecks'],
    queryFn: () => base44.entities.QualityCheck.list('-created_date'),
  });

  const { data: auditReports = [] } = useQuery({
    queryKey: ['auditReports'],
    queryFn: () => base44.entities.AuditReport.list('-audit_date'),
  });

  const createCheckMutation = useMutation({
    mutationFn: (data) => base44.entities.QualityCheck.create({
      ...data,
      checked_by_email: user.email,
      checked_by_name: user.full_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityChecks'] });
      setShowCheckDialog(false);
      resetCheckForm();
      alert('✅ Quality check saved!');
    },
  });

  const createAuditMutation = useMutation({
    mutationFn: (data) => base44.entities.AuditReport.create({
      ...data,
      conducted_by_email: user.email,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditReports'] });
      setShowAuditDialog(false);
      resetAuditForm();
      alert('✅ Audit report created!');
    },
  });

  const resetCheckForm = () => {
    setCheckData({
      check_title: '',
      check_type: 'food_quality',
      area: 'kitchen',
      score: 5,
      photo_urls: [],
      comments: '',
      corrective_action_required: false,
      corrective_action: '',
    });
  };

  const resetAuditForm = () => {
    setAuditData({
      audit_title: '',
      audit_type: 'internal',
      audit_date: format(new Date(), 'yyyy-MM-dd'),
      auditor_name: '',
      overall_score: 100,
      sections: [],
      strengths: '',
      weaknesses: '',
      corrective_actions: [],
      status: 'draft',
    });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    const uploadedUrls = [];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    setCheckData(prev => ({
      ...prev,
      photo_urls: [...prev.photo_urls, ...uploadedUrls]
    }));
    setUploadingPhoto(false);
  };

  const handleCheckSubmit = (e) => {
    e.preventDefault();
    createCheckMutation.mutate(checkData);
  };

  const handleAuditSubmit = (e) => {
    e.preventDefault();
    createAuditMutation.mutate(auditData);
  };

  // Calculate statistics
  const avgScore = qualityChecks.length > 0
    ? qualityChecks.reduce((sum, c) => sum + c.score, 0) / qualityChecks.length
    : 0;

  const checksThisWeek = qualityChecks.filter(c => {
    const checkDate = new Date(c.created_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return checkDate >= weekAgo;
  });

  const scoreDistribution = [1, 2, 3, 4, 5].map(score => ({
    score: `${score} ⭐`,
    count: qualityChecks.filter(c => c.score === score).length,
  }));

  const trendData = qualityChecks
    .slice(0, 30)
    .reverse()
    .map((check, idx) => ({
      name: `Check ${idx + 1}`,
      score: check.score,
      date: format(new Date(check.created_date), 'MMM d'),
    }));

  const tabs = [
    { id: 'quick-check', label: '⚡ Quick Check', icon: Star },
    { id: 'audits', label: '📋 Audit Reports', icon: FileText },
    { id: 'analytics', label: '📊 Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl">
                  <Star className="w-8 h-8 text-white" />
                </div>
                Quality & Audit Hub
              </h1>
              <p className="text-gray-600 text-lg">
                Excellence through systematic quality checks and audits
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCheckDialog(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Quick Quality Check
              </Button>
              <Button
                onClick={() => setShowAuditDialog(true)}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                New Audit
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="border-none shadow-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <CardContent className="p-6">
                <Star className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-sm opacity-90">Average Score</p>
                <p className="text-4xl font-bold">{avgScore.toFixed(1)} ⭐</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <CheckCircle className="w-8 h-8 mb-2 text-green-600" />
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-4xl font-bold text-gray-900">{checksThisWeek.length}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <FileText className="w-8 h-8 mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Audits</p>
                <p className="text-4xl font-bold text-gray-900">{auditReports.length}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <AlertCircle className="w-8 h-8 mb-2 text-amber-600" />
                <p className="text-sm text-gray-600">Actions Needed</p>
                <p className="text-4xl font-bold text-gray-900">
                  {qualityChecks.filter(c => c.score < 3).length}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'border-b-2 border-emerald-600 text-emerald-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Quick Check Tab */}
        {activeTab === 'quick-check' && (
          <div className="space-y-4">
            {qualityChecks.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No quality checks yet</p>
                  <Button onClick={() => setShowCheckDialog(true)} className="bg-emerald-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Check
                  </Button>
                </CardContent>
              </Card>
            ) : (
              qualityChecks.map(check => (
                <Card key={check.id} className="shadow-md hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{check.check_title}</h3>
                        <div className="flex gap-2 mb-2">
                          <Badge className="bg-emerald-100 text-emerald-800">{check.check_type.replace('_', ' ')}</Badge>
                          <Badge variant="outline">{check.area}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${star <= check.score ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                            />
                          ))}
                          <span className="ml-2 font-bold text-gray-900">{check.score}/5</span>
                        </div>
                      </div>
                      <Badge className={check.score >= 4 ? 'bg-green-600' : check.score >= 3 ? 'bg-amber-600' : 'bg-red-600'}>
                        {check.status}
                      </Badge>
                    </div>

                    {check.comments && (
                      <p className="text-gray-700 mb-3">{check.comments}</p>
                    )}

                    {check.photo_urls && check.photo_urls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {check.photo_urls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-90"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    )}

                    {check.corrective_action && (
                      <div className="p-3 bg-amber-50 rounded border border-amber-200">
                        <p className="text-sm font-semibold text-amber-900">Corrective Action:</p>
                        <p className="text-sm text-amber-800">{check.corrective_action}</p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                      <span>By {check.checked_by_name}</span>
                      <span>{format(new Date(check.created_date), 'MMM d, yyyy • h:mm a')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Audits Tab */}
        {activeTab === 'audits' && (
          <div className="space-y-4">
            {auditReports.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No audit reports yet</p>
                  <Button onClick={() => setShowAuditDialog(true)} className="bg-amber-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Audit
                  </Button>
                </CardContent>
              </Card>
            ) : (
              auditReports.map(audit => (
                <Card key={audit.id} className="shadow-md">
                  <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl">{audit.audit_title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(audit.audit_date), 'MMMM d, yyyy')} • {audit.auditor_name}
                        </p>
                      </div>
                      <Badge className={
                        audit.overall_score >= 90 ? 'bg-green-600' :
                        audit.overall_score >= 70 ? 'bg-amber-600' : 'bg-red-600'
                      }>
                        {audit.overall_score}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {audit.strengths && (
                      <div className="mb-4">
                        <p className="font-semibold text-green-700 mb-2">✅ Strengths:</p>
                        <p className="text-gray-700">{audit.strengths}</p>
                      </div>
                    )}

                    {audit.weaknesses && (
                      <div className="mb-4">
                        <p className="font-semibold text-amber-700 mb-2">⚠️ Areas for Improvement:</p>
                        <p className="text-gray-700">{audit.weaknesses}</p>
                      </div>
                    )}

                    {audit.corrective_actions && audit.corrective_actions.length > 0 && (
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">📋 Corrective Actions:</p>
                        <div className="space-y-2">
                          {audit.corrective_actions.map((action, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                              <Badge className={
                                action.priority === 'critical' ? 'bg-red-600' :
                                action.priority === 'high' ? 'bg-orange-600' :
                                action.priority === 'medium' ? 'bg-amber-600' : 'bg-blue-600'
                              }>
                                {action.priority}
                              </Badge>
                              <div className="flex-1">
                                <p className="text-gray-900">{action.action}</p>
                                {action.assigned_to && (
                                  <p className="text-sm text-gray-600">Assigned to: {action.assigned_to}</p>
                                )}
                                {action.deadline && (
                                  <p className="text-sm text-gray-600">Due: {format(new Date(action.deadline), 'MMM d')}</p>
                                )}
                              </div>
                              <Badge variant="outline">
                                {action.status || 'pending'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Trend Chart */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Quality Score Trend (Last 30 Checks)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} name="Quality Score" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Score Distribution */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="score" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Check Dialog */}
        <Dialog open={showCheckDialog} onOpenChange={setShowCheckDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Star className="w-6 h-6 text-emerald-600" />
                Quick Quality Check
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCheckSubmit} className="space-y-6 mt-4">
              <div>
                <Label>What are you checking? *</Label>
                <Input
                  value={checkData.check_title}
                  onChange={(e) => setCheckData({ ...checkData, check_title: e.target.value })}
                  placeholder="e.g., Kitchen Cleanliness, Food Temperature"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Check Type</Label>
                  <Select value={checkData.check_type} onValueChange={(v) => setCheckData({ ...checkData, check_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food_quality">🍽️ Food Quality</SelectItem>
                      <SelectItem value="hygiene">🧼 Hygiene</SelectItem>
                      <SelectItem value="service">👥 Service</SelectItem>
                      <SelectItem value="equipment">🔧 Equipment</SelectItem>
                      <SelectItem value="presentation">✨ Presentation</SelectItem>
                      <SelectItem value="temperature">🌡️ Temperature</SelectItem>
                      <SelectItem value="cleanliness">🧹 Cleanliness</SelectItem>
                      <SelectItem value="safety">⚠️ Safety</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Area</Label>
                  <Select value={checkData.area} onValueChange={(v) => setCheckData({ ...checkData, area: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="front_of_house">Front of House</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="washroom">Washroom</SelectItem>
                      <SelectItem value="dining_area">Dining Area</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="preparation">Preparation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Quality Score (1-5 Stars) *</Label>
                <div className="flex items-center gap-4 mt-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCheckData({ ...checkData, score: star })}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${star <= checkData.score ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                  <span className="text-2xl font-bold ml-4">{checkData.score}/5</span>
                </div>
              </div>

              <div>
                <Label>Comments / Observations</Label>
                <Textarea
                  value={checkData.comments}
                  onChange={(e) => setCheckData({ ...checkData, comments: e.target.value })}
                  rows={4}
                  placeholder="Detailed observations..."
                />
              </div>

              <div>
                <Label>Photo Evidence</Label>
                <div className="flex gap-3 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('quality-photo-upload').click()}
                    disabled={uploadingPhoto}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploadingPhoto ? 'Uploading...' : 'Upload Photos'}
                  </Button>
                  <input
                    id="quality-photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {checkData.photo_urls.length > 0 && (
                    <span className="text-sm text-gray-600">{checkData.photo_urls.length} photo(s)</span>
                  )}
                </div>
                {checkData.photo_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {checkData.photo_urls.map((url, idx) => (
                      <img key={idx} src={url} alt={`Evidence ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>

              {checkData.score < 3 && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <Label className="font-semibold text-red-900 mb-2 block">⚠️ Corrective Action Required</Label>
                  <Textarea
                    value={checkData.corrective_action}
                    onChange={(e) => setCheckData({ 
                      ...checkData, 
                      corrective_action: e.target.value,
                      corrective_action_required: true 
                    })}
                    rows={3}
                    placeholder="What action was taken to fix this issue?"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCheckDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCheckMutation.isPending}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600"
                >
                  {createCheckMutation.isPending ? 'Saving...' : 'Save Quality Check'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Audit Dialog */}
        <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <FileText className="w-6 h-6 text-amber-600" />
                Create Audit Report
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAuditSubmit} className="space-y-6 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Audit Title *</Label>
                  <Input
                    value={auditData.audit_title}
                    onChange={(e) => setAuditData({ ...auditData, audit_title: e.target.value })}
                    placeholder="e.g., Monthly Kitchen Audit"
                    required
                  />
                </div>

                <div>
                  <Label>Audit Type</Label>
                  <Select value={auditData.audit_type} onValueChange={(v) => setAuditData({ ...auditData, audit_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                      <SelectItem value="eho">EHO Inspection</SelectItem>
                      <SelectItem value="self_assessment">Self Assessment</SelectItem>
                      <SelectItem value="surprise">Surprise Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Audit Date *</Label>
                  <Input
                    type="date"
                    value={auditData.audit_date}
                    onChange={(e) => setAuditData({ ...auditData, audit_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Auditor Name *</Label>
                  <Input
                    value={auditData.auditor_name}
                    onChange={(e) => setAuditData({ ...auditData, auditor_name: e.target.value })}
                    placeholder="Name of auditor"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Overall Score (0-100) *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={auditData.overall_score}
                  onChange={(e) => setAuditData({ ...auditData, overall_score: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div>
                <Label>Strengths</Label>
                <Textarea
                  value={auditData.strengths}
                  onChange={(e) => setAuditData({ ...auditData, strengths: e.target.value })}
                  rows={3}
                  placeholder="What's working well..."
                />
              </div>

              <div>
                <Label>Areas for Improvement</Label>
                <Textarea
                  value={auditData.weaknesses}
                  onChange={(e) => setAuditData({ ...auditData, weaknesses: e.target.value })}
                  rows={3}
                  placeholder="What needs attention..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAuditDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAuditMutation.isPending}
                  className="bg-gradient-to-r from-amber-600 to-orange-600"
                >
                  {createAuditMutation.isPending ? 'Creating...' : 'Create Audit Report'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}