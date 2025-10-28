import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  Camera,
  Home,
  Save,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function QualityFormExecution() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const templateId = urlParams.get('templateId');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: template, isLoading } = useQuery({
    queryKey: ['qualityTemplate', templateId],
    queryFn: async () => {
      const templates = await base44.entities.QualityTemplate.list();
      return templates.find(t => t.id === templateId);
    },
    enabled: !!templateId,
  });

  const [checkResults, setCheckResults] = useState({});
  const [globalComments, setGlobalComments] = useState("");

  const submitExecutionMutation = useMutation({
    mutationFn: async (records) => {
      // Create individual quality records for each check item
      const createdRecords = [];
      for (const record of records) {
        const created = await base44.entities.QualityRecord.create(record);
        createdRecords.push(created);
      }
      return createdRecords;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['qualityRecords'] });
      
      // Log activity
      await base44.entities.ActivityLog.create({
        activity_type: 'quality_check',
        title: 'Quality Template Completed',
        description: `${template.template_name} - ${Object.keys(checkResults).length} checks`,
        user_email: user.email,
        user_name: user.full_name,
        icon: 'star',
        color: 'amber',
        related_entity: 'QualityTemplate',
        related_entity_id: template.id,
      });
      
      alert('✅ Quality checks submitted successfully!');
      navigate(createPageUrl('QualityDashboard'));
    },
  });

  const handleScoreChange = (itemId, score) => {
    setCheckResults(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        score,
      }
    }));
  };

  const handleCommentChange = (itemId, comment) => {
    setCheckResults(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        comment,
      }
    }));
  };

  const handlePhotoUpload = async (itemId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCheckResults(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          photo_url: file_url,
        }
      }));
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    const items = template?.check_items || [];
    const records = [];

    for (const item of items) {
      const result = checkResults[item.item_id] || {};
      
      if (!result.score) {
        alert(`Please score: ${item.title}`);
        return;
      }

      records.push({
        check_title: item.title,
        category: item.category,
        area: item.area,
        score: result.score,
        comments: result.comment || globalComments,
        photo_url: result.photo_url,
        checked_by_email: user.email,
        checked_by_name: user.full_name,
        template_id: template.id,
        corrective_action_required: result.score < (item.min_score || 3),
        status: result.score < 3 ? 'needs_action' : 'recorded',
      });
    }

    await submitExecutionMutation.mutateAsync(records);
  };

  if (isLoading || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const completedChecks = Object.values(checkResults).filter(r => r.score).length;
  const totalChecks = template.check_items?.length || 0;
  const completionPercentage = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('QualityTemplates')}>
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
        <Card className="mb-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  {template.icon} {template.template_name}
                </h1>
                <p className="text-emerald-50">{template.description}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{completedChecks}/{totalChecks}</p>
                <p className="text-sm text-emerald-50">Completed</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check Items */}
        <div className="space-y-4 mb-6">
          {template.check_items?.map((item, index) => {
            const result = checkResults[item.item_id] || {};
            
            return (
              <motion.div
                key={item.item_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={result.score ? 'border-green-200 bg-green-50/50' : ''}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">#{index + 1}</span>
                        <span>{item.title}</span>
                      </div>
                      {item.requires_photo && (
                        <Badge variant="outline" className="text-xs">
                          Photo Required
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Star Rating */}
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Rate Quality (1-5)</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(score => (
                          <button
                            key={score}
                            onClick={() => handleScoreChange(item.item_id, score)}
                            className={`w-12 h-12 rounded-lg border-2 transition-all ${
                              result.score === score
                                ? 'bg-amber-500 border-amber-600 text-white scale-110 shadow-lg'
                                : 'bg-white border-gray-300 hover:border-amber-400 hover:scale-105'
                            }`}
                          >
                            <Star className={`w-6 h-6 mx-auto ${result.score === score ? 'fill-current' : ''}`} />
                            <p className="text-xs font-bold mt-1">{score}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <Textarea
                        value={result.comment || ''}
                        onChange={(e) => handleCommentChange(item.item_id, e.target.value)}
                        placeholder="Optional notes..."
                        rows={2}
                      />
                    </div>

                    {/* Photo Upload */}
                    {item.requires_photo && (
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`photo-${item.item_id}`).click()}
                          disabled={uploading}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {result.photo_url ? 'Change Photo' : 'Add Photo'}
                        </Button>
                        <input
                          id={`photo-${item.item_id}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(item.item_id, e)}
                          className="hidden"
                        />
                        {result.photo_url && (
                          <img
                            src={result.photo_url}
                            alt="Evidence"
                            className="mt-2 w-32 h-32 object-cover rounded-lg"
                          />
                        )}
                      </div>
                    )}

                    {/* Warning for low scores */}
                    {result.score && result.score < (item.min_score || 3) && (
                      <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <p className="text-sm text-orange-800">
                          Score below minimum - corrective action will be required
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Global Comments */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Overall Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={globalComments}
              onChange={(e) => setGlobalComments(e.target.value)}
              placeholder="Add any overall observations or notes..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completedChecks}/{totalChecks} checks completed
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={completedChecks === 0 || submitExecutionMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
              >
                {submitExecutionMutation.isPending ? (
                  'Submitting...'
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Submit Quality Check
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}