
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Camera, Mic, ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickQualityCheck() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [checkTitle, setCheckTitle] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [score, setScore] = useState(0);
  const [comments, setComments] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [linkedEntityType, setLinkedEntityType] = useState("none");
  const [linkedEntityId, setLinkedEntityId] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch active shift
  const { data: activeShift } = useQuery({
    queryKey: ['activeShift', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const today = new Date().toISOString().split('T')[0];
      const shifts = await base44.entities.Shift.filter({
        staff_email: user.email,
        shift_date: today,
        status: 'in_progress'
      }, '-created_date', 1);
      return shifts[0] || null;
    },
    enabled: !!user?.email,
  });

  // ✅ ENHANCED: Add activity logging and preserve corrective task creation
  const submitCheckMutation = useMutation({
    mutationFn: async (data) => {
      const record = await base44.entities.QualityRecord.create(data);
      
      // Auto-create corrective task if score < 3 (preserving original functionality)
      if (data.score < 3) {
        const taskData = {
          task_name: `Quality Issue: ${data.check_title}`,
          description: `Quality check scored ${data.score}/5. ${data.comments || 'Needs immediate attention.'}`,
          category: 'cleaning',
          assigned_to: user.email,
          due_date: new Date().toISOString(),
          status: 'pending'
        };
        
        const task = await base44.entities.StaffTask.create(taskData);
        
        // Update quality record with task reference
        await base44.entities.QualityRecord.update(record.id, {
          corrective_action_required: true,
          corrective_task_id: task.id
        });
      }
      
      return record;
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
      alert(`❌ Error: ${error.message}`);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!checkTitle || !category || !area || score === 0) {
      alert('Please fill all required fields');
      return;
    }

    const data = {
      check_title: checkTitle,
      category,
      area,
      score,
      comments,
      photo_url: photoUrl,
      checked_by_email: user.email,
      checked_by_name: user.full_name,
      linked_entity_type: linkedEntityType,
      linked_entity_id: linkedEntityId || null,
      shift_id: activeShift?.id || null,
      status: score >= 3 ? 'recorded' : 'needs_action',
      priority: score < 3 ? 'high' : 'medium',
      corrective_action_required: score < 3
    };

    submitCheckMutation.mutate(data);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(result.file_url);
    } catch (error) {
      alert('Failed to upload photo');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link to={createPageUrl('QualityDashboard')}>
          <Button variant="outline" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Star className="w-7 h-7" />
              Quick Quality Check
            </CardTitle>
            <p className="text-emerald-50 text-sm">Rate quality in seconds - swipe and score!</p>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="checkTitle">What are you checking? *</Label>
                <Input
                  id="checkTitle"
                  value={checkTitle}
                  onChange={(e) => setCheckTitle(e.target.value)}
                  placeholder="e.g., 'Karak Chai Quality', 'Kitchen Cleanliness'"
                  className="mt-2"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select category" />
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
                  <Label htmlFor="area">Area *</Label>
                  <Select value={area} onValueChange={setArea} required>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select area" />
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

              <div>
                <Label>Quality Score * (Tap to Rate)</Label>
                <div className="flex gap-3 mt-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setScore(rating)}
                      className={`flex-1 h-20 rounded-xl border-2 transition-all ${
                        score === rating
                          ? rating < 3
                            ? 'bg-red-500 border-red-600 text-white scale-105 shadow-lg'
                            : rating === 3
                            ? 'bg-yellow-500 border-yellow-600 text-white scale-105 shadow-lg'
                            : 'bg-green-500 border-green-600 text-white scale-105 shadow-lg'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Star
                        className={`w-8 h-8 mx-auto ${
                          score === rating ? 'fill-current' : ''
                        }`}
                      />
                      <p className="mt-1 font-bold text-lg">{rating}</p>
                      <p className="text-xs">
                        {rating === 1 && 'Poor'}
                        {rating === 2 && 'Needs Work'}
                        {rating === 3 && 'Okay'}
                        {rating === 4 && 'Good'}
                        {rating === 5 && 'Excellent'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="comments">Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any observations or notes..."
                  className="mt-2 h-24"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="photo">Add Photo (Optional)</Label>
                  <div className="mt-2">
                    <label htmlFor="photoUpload" className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer transition-colors">
                      <Camera className="w-5 h-5 text-gray-600" />
                      <span className="text-sm text-gray-600">
                        {photoUrl ? 'Photo attached ✓' : 'Tap to upload photo'}
                      </span>
                      <input
                        id="photoUpload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="linkedEntity">Link to (Optional)</Label>
                  <Select value={linkedEntityType} onValueChange={setLinkedEntityType}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="checklist">Checklist</SelectItem>
                      <SelectItem value="sop">SOP</SelectItem>
                      <SelectItem value="menu_item">Menu Item</SelectItem>
                      <SelectItem value="hygiene_record">Hygiene Record</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {score < 3 && score > 0 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">AI Suggestion</p>
                      <p className="text-sm text-orange-800 mt-1">
                        Score below 3 detected. A corrective task will be automatically created
                        and assigned to you for follow-up.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitCheckMutation.isPending}
                className="w-full h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-lg font-bold shadow-lg hover:shadow-xl transition-all"
              >
                {submitCheckMutation.isPending ? (
                  'Submitting...'
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Submit Quality Check
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
