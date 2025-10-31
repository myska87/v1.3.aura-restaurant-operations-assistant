import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Plus, Camera, TrendingUp, AlertCircle, Download, Search, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
    category: 'food_safety',
    score: 100,
    notes: '',
    photo_urls: [],
    corrective_action_required: false,
    corrective_action: '',
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
    mutationFn: (data) => {
      const rating = 
        data.score >= 90 ? 'excellent' :
        data.score >= 75 ? 'good' :
        data.score >= 60 ? 'satisfactory' :
        data.score >= 40 ? 'needs_improvement' : 'poor';

      return base44.entities.QualityInspection.create({
        ...data,
        inspector_email: user.email,
        inspector_name: user.full_name,
        rating,
        status: data.score < 60 ? 'open' : 'closed',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityInspections'] });
      setShowDialog(false);
      resetForm();
      alert('✅ Inspection recorded successfully!');
    },
  });

  const resetForm = () => {
    setFormData({
      inspection_date: new Date().toISOString(),
      location: 'kitchen',
      category: 'food_safety',
      score: 100,
      notes: '',
      photo_urls: [],
      corrective_action_required: false,
      corrective_action: '',
    });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    const urls = [];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }

    setFormData(prev => ({ ...prev, photo_urls: [...prev.photo_urls, ...urls] }));
    setUploadingPhoto(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createInspectionMutation.mutate(formData);
  };

  // Calculate stats
  const avgScore = inspections.length > 0
    ? inspections.reduce((sum, i) => sum + i.score, 0) / inspections.length
    : 0;

  const thisWeek = inspections.filter(i => {
    const inspDate = new Date(i.inspection_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return inspDate >= weekAgo;
  });

  const needsAction = inspections.filter(i => i.status === 'open' || i.score < 60).length;

  // Filter inspections
  const filteredInspections = inspections.filter(i => {
    const matchesSearch = !searchTerm || 
      i.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.inspector_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = filterLocation === 'all' || i.location === filterLocation;
    const matchesCategory = filterCategory === 'all' || i.category === filterCategory;
    return matchesSearch && matchesLocation && matchesCategory;
  });

  // Trend data
  const trendData = inspections.slice(0, 30).reverse().map((insp, idx) => ({
    name: format(new Date(insp.inspection_date), 'MMM d'),
    score: insp.score,
  }));

  // Score distribution
  const scoreRanges = [
    { range: '90-100', count: inspections.filter(i => i.score >= 90).length, color: '#10b981' },
    { range: '75-89', count: inspections.filter(i => i.score >= 75 && i.score < 90).length, color: '#3b82f6' },
    { range: '60-74', count: inspections.filter(i => i.score >= 60 && i.score < 75).length, color: '#f59e0b' },
    { range: '<60', count: inspections.filter(i => i.score < 60).length, color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                Quality Control & Audits
              </h1>
              <p className="text-gray-600 text-lg">
                Fast, lightweight quality inspection management
              </p>
            </div>
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Inspection
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-sm opacity-90">Average Score</p>
                <p className="text-4xl font-bold">{avgScore.toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <CheckCircle className="w-8 h-8 mb-2 text-green-600" />
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-4xl font-bold text-gray-900">{thisWeek.length}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <AlertCircle className="w-8 h-8 mb-2 text-amber-600" />
                <p className="text-sm text-gray-600">Needs Action</p>
                <p className="text-4xl font-bold text-gray-900">{needsAction}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <CheckCircle className="w-8 h-8 mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Total Inspections</p>
                <p className="text-4xl font-bold text-gray-900">{inspections.length}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search notes or inspector..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="front_of_house">Front of House</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="food_safety">Food Safety</SelectItem>
                  <SelectItem value="hygiene">Hygiene</SelectItem>
                  <SelectItem value="cleanliness">Cleanliness</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || filterLocation !== 'all' || filterCategory !== 'all') && (
                <Button variant="outline" onClick={() => {
                  setSearchTerm('');
                  setFilterLocation('all');
                  setFilterCategory('all');
                }}>
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Quality Trend (Last 30)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={scoreRanges}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Inspections List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-pulse">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Loading inspections...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredInspections.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No inspections found</p>
              <Button onClick={() => setShowDialog(true)} className="bg-green-600">
                <Plus className="w-4 h-4 mr-2" />
                Create First Inspection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInspections.map(inspection => (
              <Card key={inspection.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={
                          inspection.score >= 90 ? 'bg-green-600' :
                          inspection.score >= 75 ? 'bg-blue-600' :
                          inspection.score >= 60 ? 'bg-amber-600' : 'bg-red-600'
                        }>
                          {inspection.rating}
                        </Badge>
                        <Badge variant="outline">{inspection.location.replace('_', ' ')}</Badge>
                        <Badge variant="outline">{inspection.category.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {format(new Date(inspection.inspection_date), 'MMMM d, yyyy • h:mm a')}
                      </p>
                      <p className="text-sm text-gray-600">Inspector: {inspection.inspector_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">Score</div>
                      <div className={`text-5xl font-bold ${
                        inspection.score >= 90 ? 'text-green-600' :
                        inspection.score >= 75 ? 'text-blue-600' :
                        inspection.score >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {inspection.score}
                      </div>
                    </div>
                  </div>

                  {inspection.notes && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Notes:</p>
                      <p className="text-gray-700">{inspection.notes}</p>
                    </div>
                  )}

                  {inspection.photo_urls && inspection.photo_urls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
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
                  )}

                  {inspection.corrective_action && (
                    <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                      <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ Corrective Action:</p>
                      <p className="text-amber-800">{inspection.corrective_action}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Inspection Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                New Quality Inspection
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Inspection Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={format(new Date(formData.inspection_date), "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setFormData({ ...formData, inspection_date: new Date(e.target.value).toISOString() })}
                    required
                  />
                </div>

                <div>
                  <Label>Location *</Label>
                  <Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">🍳 Kitchen</SelectItem>
                      <SelectItem value="front_of_house">🏪 Front of House</SelectItem>
                      <SelectItem value="bar">🍷 Bar</SelectItem>
                      <SelectItem value="storage">📦 Storage</SelectItem>
                      <SelectItem value="washroom">🚻 Washroom</SelectItem>
                      <SelectItem value="dining_area">🍽️ Dining Area</SelectItem>
                      <SelectItem value="delivery_area">🚚 Delivery Area</SelectItem>
                      <SelectItem value="preparation_area">👨‍🍳 Preparation Area</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food_safety">🥗 Food Safety</SelectItem>
                      <SelectItem value="hygiene">🧼 Hygiene</SelectItem>
                      <SelectItem value="cleanliness">✨ Cleanliness</SelectItem>
                      <SelectItem value="equipment">🔧 Equipment</SelectItem>
                      <SelectItem value="temperature">🌡️ Temperature</SelectItem>
                      <SelectItem value="staff_practices">👥 Staff Practices</SelectItem>
                      <SelectItem value="documentation">📄 Documentation</SelectItem>
                      <SelectItem value="overall">📊 Overall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Score (0-100) *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.score}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      score: parseInt(e.target.value),
                      corrective_action_required: parseInt(e.target.value) < 60
                    })}
                    required
                    className="text-2xl font-bold"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.score >= 90 ? '🌟 Excellent' :
                     formData.score >= 75 ? '✅ Good' :
                     formData.score >= 60 ? '📈 Satisfactory' : '⚠️ Needs Improvement'}
                  </p>
                </div>
              </div>

              <div>
                <Label>Inspection Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Detailed observations, findings, measurements..."
                />
              </div>

              <div>
                <Label>Evidence Photos</Label>
                <div className="flex gap-3 items-center mb-3">
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
                  {formData.photo_urls.length > 0 && (
                    <span className="text-sm text-gray-600">{formData.photo_urls.length} photo(s)</span>
                  )}
                </div>
                {formData.photo_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {formData.photo_urls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-24 object-cover rounded" />
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

              {formData.score < 60 && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <Label className="font-semibold text-red-900 mb-2 block">⚠️ Corrective Action Required</Label>
                  <Textarea
                    value={formData.corrective_action}
                    onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
                    rows={3}
                    placeholder="What action needs to be taken to fix this issue?"
                    required={formData.score < 60}
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
                  className="bg-gradient-to-r from-green-600 to-emerald-600"
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