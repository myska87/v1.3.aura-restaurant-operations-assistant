import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar, Users, Clock, CheckCircle, Loader2, Send, Edit } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { toast } from 'sonner';

export default function AIScheduler() {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['activeStaff'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.position && u.position !== 'owner');
    },
  });

  const createShiftsMutation = useMutation({
    mutationFn: async (shifts) => {
      for (const shift of shifts) {
        await base44.entities.Shift.create(shift);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('✅ Shifts published successfully!');
      setPreview(null);
      setPrompt('');
    },
  });

  const saveScheduleHistoryMutation = useMutation({
    mutationFn: (data) => base44.entities.ScheduleHistory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleHistory'] });
    },
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe your scheduling needs');
      return;
    }

    setGenerating(true);

    try {
      const aiPrompt = `You are an AI scheduling assistant for a restaurant.

User Request: ${prompt}

Week Start: ${weekStart}
Available Staff: ${staff.map(s => `${s.full_name} (${s.position})`).join(', ')}

Generate a weekly schedule with shifts for each day.
Each shift should include:
- staff_email
- staff_name
- role (position)
- date (YYYY-MM-DD)
- shift_type (opening, mid_shift, or closing)
- start_time (HH:mm format)
- end_time (HH:mm format)

Consider:
- Balance workload across staff
- Match roles to positions
- Standard shift times: Opening 6:00-14:00, Mid 12:00-20:00, Closing 17:00-01:00
- Don't overwork anyone (max 40 hours/week)

Return array of shift objects.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            shifts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  staff_email: { type: 'string' },
                  staff_name: { type: 'string' },
                  role: { type: 'string' },
                  date: { type: 'string' },
                  shift_type: { type: 'string' },
                  start_time: { type: 'string' },
                  end_time: { type: 'string' }
                }
              }
            },
            summary: { type: 'string' }
          }
        }
      });

      setPreview(result);
      toast.success('✅ Schedule generated! Review below.');
      
    } catch (error) {
      console.error('Error generating schedule:', error);
      toast.error('Failed to generate schedule');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!preview || !preview.shifts) return;

    const shiftsToCreate = preview.shifts.map(s => ({
      staff_email: s.staff_email,
      staff_name: s.staff_name,
      role: s.role,
      shift_date: s.date,
      shift_type: s.shift_type,
      start_time: s.start_time,
      end_time: s.end_time,
      status: 'scheduled',
      notes: `AI Generated - ${format(new Date(), 'MMM d, yyyy')}`,
    }));

    // Save to history
    await saveScheduleHistoryMutation.mutateAsync({
      schedule_name: `AI Schedule - ${format(new Date(weekStart), 'MMM d, yyyy')}`,
      week_start: weekStart,
      week_end: format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd'),
      ai_prompt: prompt,
      generated_shifts: preview.shifts,
      total_shifts: preview.shifts.length,
      total_hours: preview.shifts.reduce((sum, s) => {
        const start = new Date(`2000-01-01T${s.start_time}`);
        const end = new Date(`2000-01-01T${s.end_time}`);
        return sum + (end - start) / (1000 * 60 * 60);
      }, 0),
      status: 'approved',
      approved_by: user.email,
      approved_at: new Date().toISOString(),
      created_by: user.email,
      created_by_name: user.full_name,
    });

    // Create shifts
    await createShiftsMutation.mutateAsync(shiftsToCreate);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            AI Schedule Assistant
          </h1>
          <p className="text-gray-600 text-lg">
            Describe your staffing needs and let AI create the perfect schedule
          </p>
        </div>

        {/* AI Input Card */}
        <Card className="mb-6 shadow-xl border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Tell AI What You Need
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Week Starting:
              </label>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="p-2 border rounded w-full"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Describe Your Schedule Needs:
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder="Example: Generate schedule for next 7 days. Need 1 chef for opening shift, 2 line cooks for mid-shift, 1 server for closing every day. Weekends need extra bartender."
                className="text-base"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex-1"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    AI is generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Schedule
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                💡 <strong>Pro Tip:</strong> Be specific about roles, shift times, and days. 
                AI will automatically balance workload and match staff to their positions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {preview && (
          <Card className="shadow-xl border-2 border-green-200">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  Generated Schedule Preview
                </CardTitle>
                <Badge className="bg-white text-green-700">
                  {preview.shifts?.length || 0} shifts
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {preview.summary && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-semibold text-green-900 mb-2">📋 Summary:</p>
                  <p className="text-green-800">{preview.summary}</p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                {preview.shifts && preview.shifts.length > 0 ? (
                  <div className="grid gap-3">
                    {preview.shifts.map((shift, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{shift.staff_name}</p>
                            <p className="text-sm text-gray-600">{shift.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="font-semibold">{format(new Date(shift.date), 'MMM d')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Shift</p>
                            <p className="font-semibold">{shift.shift_type.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Time</p>
                            <p className="font-semibold">{shift.start_time} - {shift.end_time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No shifts generated</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setPreview(null)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={createShiftsMutation.isPending}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {createShiftsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Publish Schedule
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}