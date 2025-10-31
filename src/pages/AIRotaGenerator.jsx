
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Brain,
  Hourglass,
  CheckSquare,
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
// AISchedulerEngine is no longer directly used in the new generation flow via LLM.
// import { AISchedulerEngine } from '../components/AISchedulerEngine'; 
import { useNavigate } from 'react-router-dom';

// Assuming createPageUrl is a utility function available globally or imported.
// If this function is not defined elsewhere, uncomment and adjust the mock below.
// For the purpose of this implementation, we'll assume it returns a valid URL string.
const createPageUrl = (pageName) => `/app/${pageName.toLowerCase().replace(/\s/g, '')}`;


export default function AIRotaGenerator() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // State for the new LLM-based generation flow
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false); // Used for both generation and saving
  const [previewShifts, setPreviewShifts] = useState([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const [showLLMGenerator, setShowLLMGenerator] = useState(false); // Controls the new LLM dialog
  const [currentGeneratedLog, setCurrentGeneratedLog] = useState(null); // Stores the AIScheduleLog entry after generation

  // Keeping some original state variables as they might be relevant for other parts of the UI
  // or if the component had a dual mode (old engine + new LLM).
  // For the LLM flow, `selectedWeek`, `department`, `maxHoursPerStaff` are implicitly handled by the prompt.
  const [selectedWeek, setSelectedWeek] = useState(
    format(addDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [department, setDepartment] = useState('all');
  const [maxHoursPerStaff, setMaxHoursPerStaff] = useState(40);
  // `generatedSchedule` and `isGenerating` from the old flow are superseded by `previewShifts` and `generating`.

  // --- Data Queries ---
  const { data: existingSchedules = [], isLoading: isLoadingExistingSchedules } = useQuery({
    queryKey: ['aiSchedules'],
    queryFn: () => base44.entities.AIScheduleLog.list('-created_date', 20),
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(), // Fetch all users
  });

  const { data: availabilities = [], isLoading: isLoadingAvailabilities } = useQuery({
    queryKey: ['staffAvailabilities'],
    queryFn: () => base44.entities.StaffAvailability.list(), // Fetch all staff availabilities
  });

  const { data: currentUser, isLoading: isLoadingCurrentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity, // User data typically doesn't change often
  });

  // --- Function to approve and save currently previewed shifts ---
  // This function now also updates the AIScheduleLog status and creates an ActivityLog entry.
  const approveAndSave = async () => {
    if (previewShifts.length === 0 || !currentGeneratedLog) {
      alert('⚠️ No shifts to save or no generated schedule log found.');
      return;
    }

    setGenerating(true); // Reusing generating state for saving process feedback

    try {
      // 1. Update the AIScheduleLog status to 'approved'
      await base44.entities.AIScheduleLog.update(currentGeneratedLog.id, {
        status: 'approved',
        approved_by: currentUser?.email,
        approved_by_name: currentUser?.full_name,
        approved_at: new Date().toISOString(),
      });

      // 2. Create the actual Shift entities
      for (const shift of previewShifts) {
        await base44.entities.Shift.create({
          staff_email: shift.staff_email,
          staff_name: shift.staff_name,
          role: shift.role,
          department: shift.department,
          shift_date: shift.shift_date,
          shift_type: shift.shift_type,
          start_time: shift.start_time,
          end_time: shift.end_time,
          status: 'scheduled',
          // Use the reasoning provided by LLM, or a generic AI-generated message
          notes: `AI Generated: ${shift.reasoning || 'No specific reasoning provided.'}`,
        });

        // 3. Notify the staff member about their new shift
        await base44.entities.Notification.create({
          user_email: shift.staff_email,
          user_name: shift.staff_name,
          type: 'shift_reminder',
          title: '📅 New Shift Scheduled',
          message: `You've been scheduled for ${shift.shift_type} shift on ${format(new Date(shift.shift_date), 'MMM d, yyyy')} from ${shift.start_time} to ${shift.end_time}.`,
          link_module: 'MyShifts',
          priority: 'normal',
        });
      }

      // 4. Create Activity Log
      await base44.entities.ActivityLog.create({
        activity_type: 'other',
        title: 'AI Schedule Approved & Published',
        description: `Approved and published ${previewShifts.length} shifts for ${format(new Date(currentGeneratedLog.week_start_date), 'MMM d')} - ${format(new Date(currentGeneratedLog.week_end_date), 'MMM d')} (Log ID: ${currentGeneratedLog.id})`,
        user_email: currentUser?.email,
        user_name: currentUser?.full_name,
        icon: 'calendar',
        color: 'purple',
      });

      alert(`✅ Successfully created ${previewShifts.length} shifts and notified relevant staff!`);
      
      // 5. Reset and close
      setPreviewShifts([]); // Clear preview after saving
      setAiPrompt(''); // Clear the prompt input
      setShowLLMGenerator(false); // Close the dialog
      setCurrentGeneratedLog(null); // Clear the reference to the log

      // 6. Invalidate queries and navigate
      queryClient.invalidateQueries(['aiSchedules']); // Invalidate logs (to show 'approved' status)
      queryClient.invalidateQueries(['shifts']); // Invalidate actual shifts data
      navigate(createPageUrl('StaffRota'));
      
    } catch (error) {
      console.error('Error saving shifts:', error);
      alert('❌ Failed to save shifts. Please try again. Error: ' + (error.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  // --- New LLM-based schedule generation function ---
  const generateSchedule = async () => {
    if (!aiPrompt.trim()) {
      alert('⚠️ Please describe what schedule you need');
      return;
    }

    setGenerating(true);
    setPreviewShifts([]); // Clear previous preview
    setCurrentGeneratedLog(null); // Clear previous log reference

    try {
      // Ensure user data and availability data are loaded before proceeding
      if (isLoadingUsers || isLoadingAvailabilities || isLoadingCurrentUser) {
        alert('Please wait for staff, availability, and user data to load.');
        return; // Exit if data is not ready
      }

      const staffData = users.map(u => ({
        email: u.email,
        name: u.full_name,
        position: u.position, // Assuming 'position' field exists on User entity
        department: u.department, // Assuming 'department' field exists on User entity
      }));

      const availabilityData = availabilities.map(a => ({
        staff_email: a.staff_email,
        date: a.date,
        is_available: a.is_available,
        preferred_shift_type: a.preferred_shift_type,
      }));

      // Construct the detailed prompt for the LLM
      const prompt = `You are an AI scheduling assistant for AURA Restaurant.

User request: "${aiPrompt}"

Available staff:
${staffData.map(s => `- ${s.name} (${s.position || 'Unknown Position'}, ${s.department || 'Unknown Department'})`).join('\n')}

Availability data:
${availabilityData.length > 0 ? availabilityData.slice(0, 20).map(a => `${a.staff_email}: ${a.date} - ${a.is_available ? 'Available' : 'Unavailable'}`).join('\n') : 'No specific availability constraints provided.'}

Generate a weekly schedule for the next 7 days from today (${format(new Date(), 'yyyy-MM-dd')}) that:
1. Assigns staff to appropriate shifts based on their position and department.
2. Respects availability preferences and unavailability records.
3. Balances workload (e.g., no one works more than 5 days, if possible, and distribute hours evenly).
4. Ensures proper coverage for all shifts based on typical restaurant operations.
5. Uses standard shift times: Opening (07:00-15:00), Mid (11:00-19:00), Closing (15:00-23:00).
6. Each shift object must include 'staff_email', 'staff_name', 'role', 'department', 'shift_date' (YYYY-MM-DD), 'shift_type' (e.g., Opening, Mid, Closing), 'start_time' (HH:MM), 'end_time' (HH:MM), and 'reasoning' (a brief explanation for the assignment).

Return a JSON object with a 'shifts' array containing shift objects, a 'schedule_summary' string, 'total_hours' number, and 'coverage_analysis' string.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
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
                  role: { type: 'string' }, // e.g., Chef, Server, Bartender
                  department: { type: 'string' }, // e.g., Kitchen, Front of House, Bar
                  shift_date: { type: 'string', format: 'date' }, // YYYY-MM-DD
                  shift_type: { type: 'string' }, // Opening, Mid, Closing, or Custom
                  start_time: { type: 'string', format: 'time' }, // HH:MM
                  end_time: { type: 'string', format: 'time' }, // HH:MM
                  reasoning: { type: 'string' }
                },
                required: ['staff_email', 'staff_name', 'role', 'department', 'shift_date', 'shift_type', 'start_time', 'end_time', 'reasoning']
              }
            },
            schedule_summary: { type: 'string' },
            total_hours: { type: 'number' },
            coverage_analysis: { type: 'string' }
          },
          required: ['shifts', 'schedule_summary']
        }
      });

      if (result && result.shifts && result.shifts.length > 0) {
        setPreviewShifts(result.shifts);
        
        // Save an AIScheduleLog entry for auditing and record-keeping
        const newScheduleLog = await base44.entities.AIScheduleLog.create({
          schedule_name: `AI Generated - ${format(new Date(), 'MMM d, yyyy')} (LLM)`,
          week_start_date: format(new Date(), 'yyyy-MM-dd'),
          week_end_date: format(addDays(new Date(), 6), 'yyyy-MM-dd'), // Next 7 days from today
          department: 'all', // The LLM typically generates for all relevant departments
          generated_shifts: result.shifts,
          algorithm_version: 'LLM-2.0', // Indicate this was generated by LLM
          input_parameters: { prompt: aiPrompt, users: staffData.length, availabilities: availabilityData.length },
          total_shifts: result.shifts?.length || 0,
          total_hours: result.total_hours || 0,
          status: autoApprove ? 'published' : 'preview', // If auto-approve, set status to published initially. Otherwise, preview.
          generated_by: currentUser.email,
          generated_by_name: currentUser.full_name,
        });
        setCurrentGeneratedLog(newScheduleLog); // Store the log for potential approval

        queryClient.invalidateQueries(['aiSchedules']); // Invalidate to display the new log entry

        alert(`✅ Generated ${result.shifts?.length || 0} shifts!\n\n${result.schedule_summary || 'No summary provided.'}`);
        
        if (autoApprove && result.shifts.length > 0) {
          // If auto-approve is checked, directly call approveAndSave.
          // In this scenario, currentGeneratedLog status was set to 'published' already.
          // approveAndSave will then update it to 'approved' and save shifts.
          // If the definition of autoApprove means direct publish WITHOUT an 'approved' state change,
          // this logic would need to be separated. For now, it means auto-triggering the approval process.
          await approveAndSave();
        }

      } else {
        alert('❌ The AI did not return any shifts. Please try a different prompt or check your prompt for clarity.');
      }
      
    } catch (error) {
      console.error('Error generating schedule:', error);
      alert('❌ Failed to generate schedule. Please try again. Error: ' + (error.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  // --- Original `handlePublish` for existing `AIScheduleLog` entries ---
  // This function is retained to allow publishing of schedules that were previously generated
  // and logged (e.g., from the older AISchedulerEngine or an LLM preview that wasn't auto-approved).
  const handlePublish = async (scheduleId) => {
    try {
      const schedule = await base44.entities.AIScheduleLog.update(scheduleId, {
        status: 'published',
        published_by: currentUser?.email, // Add published_by info
        published_by_name: currentUser?.full_name,
        published_at: new Date().toISOString(),
      });

      if (schedule.generated_shifts && schedule.generated_shifts.length > 0) {
        for (const shift of schedule.generated_shifts) {
          // Ensure shift has all required properties before creating.
          // Fallbacks for older log entries or varying LLM output schemas.
          await base44.entities.Shift.create({
            shift_date: shift.shift_date || shift.date, 
            staff_email: shift.staff_email,
            staff_name: shift.staff_name,
            role: shift.role,
            department: shift.department || 'General', // Provide a default if not present in old logs
            start_time: shift.start_time,
            end_time: shift.end_time,
            status: 'scheduled',
            shift_type: shift.shift_type || 'Custom', // Provide a default if not present
            notes: `AI Generated (Log ID: ${scheduleId}): ${shift.reasoning || 'No specific reasoning provided.'}`,
          });

          // Also notify staff for these published shifts
          await base44.entities.Notification.create({
            user_email: shift.staff_email,
            user_name: shift.staff_name,
            type: 'shift_reminder',
            title: '📅 Your Shift Schedule is Ready',
            message: `Your shifts for the week starting ${format(new Date(schedule.week_start_date), 'MMM d, yyyy')} have been published. Check the app for details.`,
            link_module: 'MyShifts',
            priority: 'normal',
          });
        }
        // Add activity log for manual publish
        await base44.entities.ActivityLog.create({
          activity_type: 'other',
          title: 'AI Schedule Manually Published',
          description: `Manually published ${schedule.generated_shifts.length} shifts for ${format(new Date(schedule.week_start_date), 'MMM d')} - ${format(new Date(schedule.week_end_date), 'MMM d')} (Log ID: ${schedule.id})`,
          user_email: currentUser?.email,
          user_name: currentUser?.full_name,
          icon: 'calendar',
          color: 'green',
        });
      } else {
        console.warn(`No shifts found in AIScheduleLog ${scheduleId} to publish.`);
        alert('This schedule log has no shifts to publish.');
      }

      queryClient.invalidateQueries(['aiSchedules']); // Invalidate to update the log status
      queryClient.invalidateQueries(['shifts']); // Invalidate actual shifts data
      alert('Schedule published successfully!');
      
    } catch (error) {
      console.error('Publish error:', error);
      alert('Failed to publish schedule. Please try again. Error: ' + (error.message || 'Unknown error'));
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

          {/* Button to open the new LLM-based generation dialog */}
          <Button
            onClick={() => setShowLLMGenerator(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Brain className="w-4 h-4 mr-2" />
            Generate with AI Prompt
          </Button>
        </div>

        {/* Info Cards */}
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

        {/* Recent AI-Generated Schedules Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent AI-Generated Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingExistingSchedules ? (
              <div className="text-center py-8 text-gray-500">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-gray-400" />
                <p>Loading recent schedules...</p>
              </div>
            ) : existingSchedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No schedules generated yet</p>
                <p className="text-sm mt-1">Click "Generate with AI Prompt" to create your first AI schedule</p>
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
                      {schedule.generated_by_name && (
                        <p className="text-xs text-gray-500 mt-1">
                            Generated by: {schedule.generated_by_name} on {format(new Date(schedule.created_date), 'PPP')}
                        </p>
                      )}
                      {(schedule.status === 'approved' || schedule.status === 'published') && schedule.published_by_name && (
                        <p className="text-xs text-gray-500 mt-1">
                            {schedule.status === 'approved' ? 'Approved' : 'Published'} by: {schedule.published_by_name || schedule.approved_by_name} on {format(new Date(schedule.published_at || schedule.approved_at), 'PPP')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        schedule.status === 'published' ? 'success' :
                        schedule.status === 'approved' ? 'default' : // Or a distinct variant for approved
                        schedule.status === 'preview' ? 'warning' : 'default'
                      }>
                        {schedule.status}
                      </Badge>
                      {schedule.status === 'preview' && (
                        <Button
                          onClick={() => handlePublish(schedule.id)}
                          size="sm"
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
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

        {/* --- New Dialog for LLM-based Generation --- */}
        <Dialog open={showLLMGenerator} onOpenChange={setShowLLMGenerator}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                Generate Schedule with AI Prompt
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="aiPrompt">What schedule do you need?</Label>
                <Input
                  id="aiPrompt"
                  placeholder="e.g., 'Generate a weekly schedule for next week, ensuring 2 chefs and 3 servers are on shift during peak hours, and keep staff hours balanced.'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={generating}
                />
                <p className="text-xs text-gray-500 mt-1">Be as descriptive as possible. The AI will consider available staff and their past availability.</p>
              </div>

              {/* Display loading state for auxiliary data (users, availabilities) */}
              {isLoadingUsers || isLoadingAvailabilities || isLoadingCurrentUser ? (
                 <Alert className="bg-blue-50 border-blue-200">
                   <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                   <AlertTitle>Loading Data</AlertTitle>
                   <AlertDescription>Fetching staff and availability data for the AI...</AlertDescription>
                 </Alert>
              ) : (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle>Data Used for AI Generation</AlertTitle>
                  <AlertDescription>
                    The AI will consider {users.length} staff members and {availabilities.length} availability entries.
                    Ensure this data is up-to-date in your system for best results.
                  </AlertDescription>
                </Alert>
              )}

              {/* Display a preview of generated shifts */}
              {previewShifts.length > 0 && (
                <div className="space-y-3 p-4 border rounded-md bg-gray-50 max-h-60 overflow-y-auto">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Hourglass className="w-5 h-5 text-purple-600" />
                    Generated Shift Preview ({previewShifts.length} shifts)
                  </h3>
                  {previewShifts.map((shift, index) => (
                    <div key={index} className="flex flex-col p-2 bg-white rounded-md shadow-sm text-sm">
                      <div className="font-medium text-gray-800">{shift.staff_name} ({shift.role})</div>
                      <div className="text-gray-600">
                        {format(new Date(shift.shift_date), 'EEE, MMM d')} | {shift.start_time} - {shift.end_time} ({shift.shift_type})
                      </div>
                      <div className="text-gray-500 text-xs italic">Reasoning: {shift.reasoning}</div>
                    </div>
                  ))}
                  <Alert className="bg-emerald-50 border-emerald-200">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <AlertDescription>
                      Review the generated shifts above. If satisfied, click "Approve and Save" to add them to your rota.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Auto-approve checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  disabled={generating}
                />
                <Label htmlFor="autoApprove" className="flex items-center gap-1.5 cursor-pointer">
                  <CheckSquare className="w-4 h-4" />
                  Auto-approve and publish shifts immediately (bypasses manual review)
                </Label>
              </div>

            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLLMGenerator(false)} disabled={generating}>
                Cancel
              </Button>
              {/* Only show "Approve and Save" if shifts are previewed and not currently generating */}
              {previewShifts.length > 0 && !generating && (
                <Button onClick={approveAndSave} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve and Save
                </Button>
              )}
              {/* Main "Generate" button */}
              <Button
                onClick={generateSchedule}
                disabled={generating || isLoadingUsers || isLoadingAvailabilities || isLoadingCurrentUser}
                className="bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Generate with AI
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
