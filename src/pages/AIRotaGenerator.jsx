import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { AISchedulerEngine } from '../components/AISchedulerEngine';

export default function AIRotaGenerator() {
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(
    format(addDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [department, setDepartment] = useState('all');
  const [maxHoursPerStaff, setMaxHoursPerStaff] = useState(40);
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const queryClient = useQueryClient();

  const { data: existingSchedules = [] } = useQuery({
    queryKey: ['aiSchedules'],
    queryFn: () => base44.entities.AIScheduleLog.list('-created_date', 20),
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const user = await base44.auth.me();
      
      const scheduler = new AISchedulerEngine({
        max_hours_per_staff: maxHoursPerStaff,
        min_rest_hours: 11,
      });

      const result = await scheduler.generateSchedule({
        week_start_date: selectedWeek,
        department,
        required_roles: {
          chef: 2,
          server: 3,
          bartender: 1,
        },
      });

      const scheduleData = {
        schedule_name: `AI Generated - ${format(new Date(selectedWeek), 'MMM d, yyyy')}`,
        week_start_date: selectedWeek,
        week_end_date: format(addDays(new Date(selectedWeek), 6), 'yyyy-MM-dd'),
        department,
        generated_shifts: result.generated_shifts,
        total_shifts: result.total_shifts,
        total_hours: result.total_hours,
        conflicts_detected: result.conflicts_detected,
        processing_time_ms: result.processing_time_ms,
        optimization_score: result.optimization_score,
        generated_by: user.email,
        generated_by_name: user.full_name,
        status: 'preview',
        weights_used: {
          role_match: 40,
          availability: 30,
          performance_score: 20,
          overtime_penalty: 10,
        },
      };

      const saved = await base44.entities.AIScheduleLog.create(scheduleData);
      setGeneratedSchedule(saved);
      
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate schedule. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async (scheduleId) => {
    try {
      const schedule = await base44.entities.AIScheduleLog.update(scheduleId, {
        status: 'published',
        published_at: new Date().toISOString(),
      });

      for (const shift of schedule.generated_shifts) {
        await base44.entities.Shift.create({
          shift_date: shift.date,
          staff_email: shift.staff_email,
          staff_name: shift.staff_name,
          role: shift.role,
          start_time: shift.start_time,
          end_time: shift.end_time,
          status: 'scheduled',
        });
      }

      await base44.integrations.Core.SendEmail({
        to: shift.staff_email,
        subject: 'Your Shift Schedule is Ready',
        body: `Your shifts for the week have been published. Check the app for details.`,
      });

      queryClient.invalidateQueries(['aiSchedules']);
      alert('Schedule published successfully!');
      setGeneratedSchedule(null);
      setShowGenerator(false);
      
    } catch (error) {
      console.error('Publish error:', error);
      alert('Failed to publish schedule');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-600" />
              AI Rota Generator
            </h1>
            <p className="text-gray-600 mt-1">
              Automatically generate optimized staff schedules
            </p>
          </div>

          <Button
            onClick={() => setShowGenerator(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Next Week
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Optimization Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">92%</div>
              <p className="text-xs text-gray-500 mt-1">vs manual scheduling</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Time Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">4.5h</div>
              <p className="text-xs text-gray-500 mt-1">per week on average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Schedules Generated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{existingSchedules.length}</div>
              <p className="text-xs text-gray-500 mt-1">total schedules</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent AI-Generated Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            {existingSchedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No schedules generated yet</p>
                <p className="text-sm mt-1">Click "Generate Next Week" to create your first AI schedule</p>
              </div>
            ) : (
              <div className="space-y-3">
                {existingSchedules.map(schedule => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">{schedule.schedule_name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(schedule.week_start_date), 'MMM d')} - {format(new Date(schedule.week_end_date), 'MMM d')}
                        </span>
                        <span>{schedule.total_shifts} shifts</span>
                        <span>{schedule.total_hours}h total</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        schedule.status === 'published' ? 'success' :
                        schedule.status === 'preview' ? 'warning' : 'default'
                      }>
                        {schedule.status}
                      </Badge>
                      {schedule.status === 'preview' && (
                        <Button
                          onClick={() => handlePublish(schedule.id)}
                          size="sm"
                        >
                          Publish
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Generate AI Schedule
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Week Starting</Label>
                <Input
                  type="date"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                />
              </div>

              <div>
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="front_of_house">Front of House</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Max Hours Per Staff</Label>
                <Input
                  type="number"
                  value={maxHoursPerStaff}
                  onChange={(e) => setMaxHoursPerStaff(Number(e.target.value))}
                />
              </div>

              <Alert>
                <TrendingUp className="w-4 h-4" />
                <AlertDescription>
                  AI will generate an optimized schedule considering staff availability,
                  role requirements, and performance data.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerator(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Schedule
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