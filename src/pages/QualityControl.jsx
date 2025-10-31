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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClipboardCheck, Plus, Camera, TrendingUp, Filter, Download, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function QualityControl() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [formData, setFormData] = useState({
    inspection_date: new Date().toISOString(),
    location: 'kitchen',
    category: 'hygiene',
    score: 100,
    notes: '',
    photo_urls: [],
    corrective_action: '',
    status: 'passed',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['qualityInspections'],
    queryFn: () => base44.entities.QualityInspection.list('-inspection_date'),
  });

  const createInspectionMutation = useMutation({
    mutationFn: (data) => base44.entities.QualityInspection.create({
      ...data,
      inspector_email: user.email,
      inspector_name: user.full_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityInspections'] });
      setShowDialog(false);
      resetForm();
      alert('✅ Inspection saved successfully!');
    },
  });

  const resetForm = () => {
    setFormData({
      inspection_date: new Date().toISOString(),
      location: 'kitchen',
      category: 'hygiene',
      score: 100,
      notes: '',
      photo_urls: [],
      corrective_action: '',
      status: 'passed',
    });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploadingPhoto(true);
    
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    
    setFormData(prev => ({
      ...prev,
      photo_urls: [...prev.photo_urls, ...urls]
    }));
    setUploadingPhoto(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createInspectionMutation.mutate(formData);
  };

  // Filter inspections
  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = searchTerm === '' || 
      inspection.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.inspector_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = filterLocation === 'all' || inspection.location === filterLocation;
    const matchesCategory = filterCategory === 'all' || inspection.category === filterCategory;
    
    return matchesSearch && matchesLocation && matchesCategory;
  });

  // Calculate statistics
  const weekStart = startOfWeek(new Date());
  const monthStart = startOfMonth(new Date());

  const weekInspections = inspections.filter(i => new Date(i.inspection_date) >= weekStart);
  const monthInspections = inspections.filter(i => new Date(i.inspection_date) >= monthStart);

  const weekAvg = weekInspections.length > 0
    ? weekInspections.reduce((sum, i) => sum + i.score, 0) / weekInspections.length
    : 0;

  const monthAvg = monthInspections.length > 0
    ? monthInspections.reduce((sum, i) => sum + i.score, 0) / monthInspections.length
    : 0;

  const failedInspections = inspections.filter(i => i.status === 'failed').length;
  const requiresAction = inspections.filter(i => i.status === 'requires_action').length;

  // Trend chart data
  const trendData = inspections
    .slice(0, 30)
    .reverse()
    .map((inspection, idx) => ({
      name: format(new Date(inspection.inspection_date), 'MMM d'),
      score: inspection.score,
    }));

  // Category breakdown
  const categoryData = ['hygiene', 'food_safety', 'cleanliness', 'equipment', 'temperature', 'staff_practices', 'general']
    .map(cat => ({
      category: cat.replace('_', ' '),
      count: inspections.filter(i => i.category === cat).length,
      avg: inspections.filter(i => i.category === cat).length > 0
        ? (inspections.filter(i => i.category === cat).reduce((sum, i) => sum + i.score, 0) / inspections.filter(i => i.category === cat).length).toFixed(1)
        : 0,
    }))
    .filter(d => d.count > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl">
                  <ClipboardCheck className="w-8 h-8 text-white" />
                </div>
                Quality Control & Inspections
              </h1>
              <p className="text-gray-600 text-lg">
                Fast, lightweight quality tracking and audit management
              </p>
            </div>
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Inspection
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <CardContent className="p-6">
                <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-sm opacity-90">Week Average</p>
                <p className="text-4xl font-bold">{weekAvg.toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <TrendingUp className="w-8 h-8 mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Month Average</p>
                <p className="text-4xl font-bold text-gray-900">{monthAvg.toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <CheckCircle className="w-8 h-8 mb-2 text-green-600" />
                <p className="text-sm text-gray-600">Total Inspections</p>
                <p className="text-4xl font-bold text-gray-900">{inspections.length}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <AlertTriangle className="w-8 h-8 mb-2 text-amber-600" />
                <p className="text-sm text-gray-600">Requires Action</p>
                <p className="text-4xl font-bold text-gray-900">{requiresAction + failedInspections}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inspections" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="inspections">📋 Inspections</TabsTrigger>
            <TabsTrigger value="trends">📊 Trends</TabsTrigger>
            <TabsTrigger value="actions">⚠️ Actions</TabsTrigger>
          </TabsList>

          {/* Inspections Tab */}
          <TabsContent value="inspections">
            
            {/* Filters */}
            <Card className="mb-6 shadow-md">
              <CardContent className="p-4">
                <div className="grid md:grid-cols-4 gap-4">
                  <Input
                    placeholder="🔍 Search inspections..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Select value={filterLocation} onValueChange={setFilterLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="front_of_house">Front of House</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="washroom">Washroom</SelectItem>
                      <SelectItem value="dining_area">Dining Area</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="hygiene">Hygiene</SelectItem>
                      <SelectItem value="food_safety">Food Safety</SelectItem>
                      <SelectItem value="cleanliness">Cleanliness</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="temperature">Temperature</SelectItem>
                      <SelectItem value="staff_practices">Staff Practices</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => {
                    setSearchTerm('');
                    setFilterLocation('all');
                    setFilterCategory('all');
                  }}>
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Inspections List */}
            <div className="space-y-4">
              {isLoading ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="animate-pulse">Loading inspections...</div>
                  </CardContent>
                </Card>
              ) : filteredInspections.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No inspections found</p>
                    <Button onClick={() => setShowDialog(true)} className="bg-emerald-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Inspection
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredInspections.map(inspection => (
                  <Card key={inspection.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {inspection.location.replace('_', ' ')} Inspection
                            </h3>
                            <Badge className={
                              inspection.status === 'passed' ? 'bg-green-600' :
                              inspection.status === 'requires_action' ? 'bg-amber-600' : 'bg-red-600'
                            }>
                              {inspection.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{inspection.category.replace('_', ' ')}</Badge>
                            <Badge variant="outline">
                              {format(new Date(inspection.inspection_date), 'MMM d, yyyy • h:mm a')}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600 mb-1">Score</div>
                          <div className={`text-4xl font-bold ${
                            inspection.score >= 90 ? 'text-green-600' :
                            inspection.score >= 70 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {inspection.score}%
                          </div>
                        </div>
                      </div>

                      {inspection.notes && (
                        <div className="mb-4 p-3 bg-gray-50 rounded">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Notes:</p>
                          <p className="text-gray-700">{inspection.notes}</p>
                        </div>
                      )}

                      {inspection.photo_urls && inspection.photo_urls.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Evidence:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {inspection.photo_urls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Evidence ${idx + 1}`}
                                className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-90"
                                onClick={() => window.open(url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {inspection.corrective_action && (
                        <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded">
                          <p className="text-sm font-semibold text-amber-900 mb-1">⚠️ Corrective Action:</p>
                          <p className="text-amber-800">{inspection.corrective_action}</p>
                          <Badge className="mt-2 bg-amber-600">
                            {inspection.corrective_action_status || 'pending'}
                          </Badge>
                        </div>
                      )}

                      <div className="mt-4 text-sm text-gray-500 border-t pt-3">
                        Inspector: {inspection.inspector_name}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <div className="space-y-6">
              
              {/* Trend Chart */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Quality Score Trend (Last 30 Inspections)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} name="Quality Score %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Performance by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avg" fill="#10b981" name="Average Score %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions">
            <div className="space-y-4">
              {inspections.filter(i => i.status === 'requires_action' || i.status === 'failed').length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No pending actions! Everything is in good shape! 🎉</p>
                  </CardContent>
                </Card>
              ) : (
                inspections
                  .filter(i => i.status === 'requires_action' || i.status === 'failed')
                  .map(inspection => (
                    <Card key={inspection.id} className="border-2 border-amber-300 shadow-md">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {inspection.location.replace('_', ' ')} - {inspection.category.replace('_', ' ')}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {format(new Date(inspection.inspection_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge className="bg-amber-600">Score: {inspection.score}%</Badge>
                        </div>

                        <div className="p-3 bg-amber-50 rounded mb-3">
                          <p className="text-sm font-semibold text-amber-900 mb-1">Required Action:</p>
                          <p className="text-amber-800">{inspection.corrective_action || 'Not specified'}</p>
                        </div>

                        <div className="flex justify-between items-center">
                          <Badge variant="outline">
                            {inspection.corrective_action_status || 'pending'}
                          </Badge>
                          <Button size="sm" variant="outline">
                            Mark as Completed
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Inspection Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-emerald-600" />
                New Quality Inspection
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Location *</Label>
                  <Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">🍳 Kitchen</SelectItem>
                      <SelectItem value="front_of_house">👥 Front of House</SelectItem>
                      <SelectItem value="bar">🍹 Bar</SelectItem>
                      <SelectItem value="storage">📦 Storage</SelectItem>
                      <SelectItem value="washroom">🚻 Washroom</SelectItem>
                      <SelectItem value="dining_area">🍽️ Dining Area</SelectItem>
                      <SelectItem value="preparation">🥘 Preparation</SelectItem>
                      <SelectItem value="delivery">🚚 Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hygiene">🧼 Hygiene</SelectItem>
                      <SelectItem value="food_safety">🍽️ Food Safety</SelectItem>
                      <SelectItem value="cleanliness">✨ Cleanliness</SelectItem>
                      <SelectItem value="equipment">🔧 Equipment</SelectItem>
                      <SelectItem value="temperature">🌡️ Temperature</SelectItem>
                      <SelectItem value="staff_practices">👨‍🍳 Staff Practices</SelectItem>
                      <SelectItem value="general">📋 General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Inspection Score (0-100) *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => {
                    const score = parseInt(e.target.value);
                    setFormData({ 
                      ...formData, 
                      score,
                      status: score >= 80 ? 'passed' : score >= 60 ? 'requires_action' : 'failed'
                    });
                  }}
                  required
                />
                <p className="text-sm mt-1 text-gray-600">
                  {formData.score >= 90 ? '🌟 Excellent' : formData.score >= 80 ? '✅ Good' : formData.score >= 60 ? '⚠️ Needs Attention' : '❌ Failed'}
                </p>
              </div>

              <div>
                <Label>Notes & Observations</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Detailed inspection notes..."
                />
              </div>

              <div>
                <Label>Photo Evidence</Label>
                <div className="flex gap-3 items-center mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('inspection-photo-upload').click()}
                    disabled={uploadingPhoto}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploadingPhoto ? 'Uploading...' : 'Upload Photos'}
                  </Button>
                  <input
                    id="inspection-photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {formData.photo_urls.length > 0 && (
                    <span className="text-sm text-gray-600">{formData.photo_urls.length} photo(s)</span>
                  )}
                </div>
                {formData.photo_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {formData.photo_urls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            photo_urls: prev.photo_urls.filter((_, i) => i !== idx)
                          }))}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formData.score < 80 && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                  <Label className="font-semibold text-amber-900 mb-2 block">⚠️ Corrective Action Required</Label>
                  <Textarea
                    value={formData.corrective_action}
                    onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
                    rows={3}
                    placeholder="What action needs to be taken to address this issue?"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createInspectionMutation.isPending}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600"
                >
                  {createInspectionMutation.isPending ? 'Saving...' : 'Save Inspection'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}