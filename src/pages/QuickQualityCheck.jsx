
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  Camera,
  Send,
  Home,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickQualityCheck() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const templateId = urlParams.get('templateId');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: template } = useQuery({
    queryKey: ['qualityTemplate', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const templates = await base44.entities.QualityTemplate.list();
      return templates.find(t => t.id === templateId);
    },
    enabled: !!templateId,
  });

  const [formData, setFormData] = useState({
    check_title: '',
    category: 'food_quality',
    area: 'kitchen',
    score: 0,
    comments: '',
    photo_url: '',
  });

  // ✅ FIXED: Proper mutation with activity logging
  const submitCheckMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.QualityRecord.create(data);
    },
    onSuccess: async (savedRecord) => {
      queryClient.invalidateQueries({ queryKey: ['qualityRecords'] });
      
      // ✨ Log activity
      await base44.entities.ActivityLog.create({
        activity_type: 'quality_check',
        title: 'Quality Check Completed',
        description: `${savedRecord.check_title} - ${savedRecord.score}⭐`,
        user_email: user.email,
        user_name: user.full_name,
        icon: 'star',
        color: 'amber',
        related_entity: 'QualityRecord',
        related_entity_id: savedRecord.id,
        is_important: savedRecord.score < 3,
      });
      
      alert(`✅ Quality check recorded! Score: ${savedRecord.score}⭐`);
      navigate(createPageUrl('QualityDashboard'));
    },
    onError: (error) => {
      alert(`❌ Failed to submit: ${error.message}`);
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, photo_url: file_url }));
    } catch (error) {
      alert('Photo upload failed');
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.check_title || formData.score === 0) {
      alert('Please provide a title and score');
      return;
    }

    const checkData = {
      ...formData,
      checked_by_email: user.email,
      checked_by_name: user.full_name,
      template_id: templateId || null,
      corrective_action_required: formData.score < 3,
      status: formData.score < 3 ? 'needs_action' : 'recorded',
    };

    await submitCheckMutation.mutateAsync(checkData);
  };

  // Pre-fill from template if available
  useEffect(() => {
    if (template) {
      setFormData(prev => ({
        ...prev,
        check_title: template.template_name,
        category: template.category,
      }));
    }
  }, [template]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('QualityDashboard')}>
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

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">
            Quick Quality Check
          </h1>
          <p className="text-gray-600">Record a quality inspection or spot check</p>
          {template && (
            <Badge className="mt-2 bg-blue-100 text-blue-800">
              Using template: {template.template_name}
            </Badge>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Check Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>What are you checking? *</Label>
                <Input
                  value={formData.check_title}
                  onChange={(e) => setFormData({...formData, check_title: e.target.value})}
                  placeholder="e.g., Karak Chai Quality, Kitchen Cleanliness"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food_quality">Food Quality</SelectItem>
                      <SelectItem value="hygiene">Hygiene</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="temperature">Temperature</SelectItem>
                      <SelectItem value="taste">Taste</SelectItem>
                      <SelectItem value="cleanliness">Cleanliness</SelectItem>
                      <SelectItem value="staff_performance">Staff Performance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Area *</Label>
                  <Select
                    value={formData.area}
                    onValueChange={(value) => setFormData({...formData, area: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="front_of_house">Front of House</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="washroom">Washroom</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="dining_area">Dining Area</SelectItem>
                      <SelectItem value="preparation">Preparation</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Star Rating */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Rating *</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-4 py-4">
                {[1, 2, 3, 4, 5].map(score => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setFormData({...formData, score})}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      formData.score === score
                        ? 'bg-amber-500 border-amber-600 text-white scale-110 shadow-xl'
                        : 'bg-white border-gray-300 hover:border-amber-400 hover:scale-105'
                    }`}
                  >
                    <Star className={`w-10 h-10 ${formData.score === score ? 'fill-current' : ''}`} />
                    <span className="font-bold text-lg">{score}</span>
                    <span className="text-xs">
                      {score === 1 ? 'Poor' : score === 2 ? 'Below Avg' : score === 3 ? 'Average' : score === 4 ? 'Good' : 'Excellent'}
                    </span>
                  </button>
                ))}
              </div>
              {formData.score < 3 && formData.score > 0 && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg mt-4">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <p className="text-sm text-orange-800">
                    Low score - a corrective action task will be automatically created
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments & Photo */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Comments / Observations</Label>
                <Textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({...formData, comments: e.target.value})}
                  placeholder="Add any notes, observations, or details..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Photo Evidence (Optional)</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload').click()}
                    disabled={uploading}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : formData.photo_url ? 'Change Photo' : 'Add Photo'}
                  </Button>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {formData.photo_url && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Photo uploaded
                    </Badge>
                  )}
                </div>
                {formData.photo_url && (
                  <img
                    src={formData.photo_url}
                    alt="Quality check"
                    className="mt-3 w-full max-w-md h-64 object-cover rounded-lg border"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl('QualityDashboard'))}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitCheckMutation.isPending || formData.score === 0}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                >
                  {submitCheckMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Quality Check
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
