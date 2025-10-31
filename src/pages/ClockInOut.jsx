import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, MapPin, Calendar, User, TrendingUp, AlertCircle, LogOut, LogIn, ArrowLeft, Home, Trophy } from "lucide-react";
import { format, formatDistanceToNow, differenceInMinutes, differenceInHours, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClockInOut() {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Get today's shift
  const { data: todayShifts = [] } = useQuery({
    queryKey: ['todayShifts', user?.email, todayStr],
    queryFn: () => base44.entities.Shift.filter({
      staff_email: user?.email,
      shift_date: todayStr,
    }),
    enabled: !!user?.email,
  });

  // Get recent clock events
  const { data: recentClockEvents = [] } = useQuery({
    queryKey: ['recentClockEvents', user?.email],
    queryFn: () => base44.entities.ClockEvent.filter(
      { user_email: user?.email },
      '-timestamp',
      10
    ),
    enabled: !!user?.email,
  });

  // Get attendance records
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendanceRecords', user?.email],
    queryFn: () => base44.entities.AttendanceRecord.filter(
      { staff_email: user?.email },
      '-shift_date',
      20
    ),
    enabled: !!user?.email,
  });

  // Find active shift
  const activeShift = todayShifts.find(s => s.status === 'in_progress');
  const todayShift = todayShifts.find(s => s.shift_date === todayStr) || todayShifts[0];

  // Auto-close abandoned shifts (older than 12 hours)
  useEffect(() => {
    const checkAbandonedShifts = async () => {
      if (!user?.email) return;

      const allInProgressShifts = await base44.entities.Shift.filter({
        staff_email: user.email,
        status: 'in_progress',
      });

      for (const shift of allInProgressShifts) {
        if (shift.clock_in_time) {
          const hoursSinceClockIn = differenceInHours(new Date(), parseISO(shift.clock_in_time));
          
          if (hoursSinceClockIn >= 12) {
            // Auto clock out
            const autoClockOutTime = new Date(parseISO(shift.clock_in_time).getTime() + (12 * 60 * 60 * 1000));
            
            await base44.entities.Shift.update(shift.id, {
              status: 'completed',
              clock_out_time: autoClockOutTime.toISOString(),
            });

            // Create clock out event
            await base44.entities.ClockEvent.create({
              user_email: user.email,
              user_name: user.full_name,
              shift_id: shift.id,
              event_type: 'clock_out',
              timestamp: autoClockOutTime.toISOString(),
              notes: 'Auto-closed after 12 hours',
            });

            // Update attendance record
            const totalHours = 12;
            await updateAttendanceRecord(shift, autoClockOutTime.toISOString(), totalHours, true);

            queryClient.invalidateQueries({ queryKey: ['todayShifts'] });
          }
        }
      }
    };

    checkAbandonedShifts();
  }, [user?.email]);

  const updateAttendanceRecord = async (shift, clockOutTime, totalHours, isAutoClose = false) => {
    const scheduledStart = `${shift.shift_date}T${shift.start_time}:00`;
    const scheduledEnd = `${shift.shift_date}T${shift.end_time}:00`;
    const scheduledHours = differenceInMinutes(parseISO(scheduledEnd), parseISO(scheduledStart)) / 60;

    const clockInTime = parseISO(shift.clock_in_time);
    const clockOutTimeDate = parseISO(clockOutTime);
    const latenessMinutes = Math.max(0, differenceInMinutes(clockInTime, parseISO(scheduledStart)));
    const earlyDepartureMinutes = clockOutTime ? Math.max(0, differenceInMinutes(parseISO(scheduledEnd), clockOutTimeDate)) : 0;

    let status = 'on_time';
    if (latenessMinutes > 5) status = 'late';
    if (isAutoClose) status = 'missing_clock_out';

    const existingRecord = attendanceRecords.find(r => r.shift_id === shift.id);

    const recordData = {
      staff_email: user.email,
      staff_name: user.full_name,
      shift_id: shift.id,
      shift_date: shift.shift_date,
      scheduled_start: shift.start_time,
      scheduled_end: shift.end_time,
      actual_clock_in: shift.clock_in_time,
      actual_clock_out: clockOutTime,
      total_hours: totalHours,
      scheduled_hours: scheduledHours,
      overtime_hours: Math.max(0, totalHours - scheduledHours),
      status: status,
      lateness_minutes: latenessMinutes,
      early_departure_minutes: earlyDepartureMinutes,
      notes: isAutoClose ? 'Auto-closed after 12 hours' : '',
    };

    if (existingRecord) {
      await base44.entities.AttendanceRecord.update(existingRecord.id, recordData);
    } else {
      await base44.entities.AttendanceRecord.create(recordData);
    }
  };

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!todayShift) {
        throw new Error('No shift scheduled for today. Please contact your manager.');
      }

      if (activeShift) {
        throw new Error('You are already clocked in!');
      }

      const now = new Date().toISOString();

      // Update shift status
      await base44.entities.Shift.update(todayShift.id, {
        status: 'in_progress',
        clock_in_time: now,
      });

      // Create clock event
      await base44.entities.ClockEvent.create({
        user_email: user.email,
        user_name: user.full_name,
        shift_id: todayShift.id,
        event_type: 'clock_in',
        timestamp: now,
        location_lat: location?.latitude,
        location_lng: location?.longitude,
        location_name: location?.name || 'Unknown',
      });

      // Create attendance record
      await base44.entities.AttendanceRecord.create({
        staff_email: user.email,
        staff_name: user.full_name,
        shift_id: todayShift.id,
        shift_date: todayShift.shift_date,
        scheduled_start: todayShift.start_time,
        scheduled_end: todayShift.end_time,
        actual_clock_in: now,
        status: 'pending',
      });

      // Create notification
      await base44.entities.Notification.create({
        user_email: user.email,
        user_name: user.full_name,
        type: 'system_alert',
        title: '✅ Clocked In Successfully',
        message: `You clocked in at ${format(new Date(), 'h:mm a')} for your ${todayShift.role} shift.`,
        link_module: 'MyShifts',
        priority: 'low',
        sender_name: 'AURA System',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayShifts'] });
      queryClient.invalidateQueries({ queryKey: ['recentClockEvents'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setIsProcessing(false);
    },
    onError: (error) => {
      alert(error.message);
      setIsProcessing(false);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeShift) {
        throw new Error('You are not clocked in!');
      }

      const now = new Date().toISOString();
      const clockInTime = parseISO(activeShift.clock_in_time);
      const clockOutTime = new Date();
      const totalHours = differenceInMinutes(clockOutTime, clockInTime) / 60;

      // Update shift status
      await base44.entities.Shift.update(activeShift.id, {
        status: 'completed',
        clock_out_time: now,
      });

      // Create clock event
      await base44.entities.ClockEvent.create({
        user_email: user.email,
        user_name: user.full_name,
        shift_id: activeShift.id,
        event_type: 'clock_out',
        timestamp: now,
        location_lat: location?.latitude,
        location_lng: location?.longitude,
        location_name: location?.name || 'Unknown',
      });

      // Update attendance record
      await updateAttendanceRecord(activeShift, now, totalHours);

      // Create notification
      await base44.entities.Notification.create({
        user_email: user.email,
        user_name: user.full_name,
        type: 'system_alert',
        title: '👋 Clocked Out Successfully',
        message: `You worked ${totalHours.toFixed(2)} hours today. Great job!`,
        link_module: 'MyAttendance',
        priority: 'low',
        sender_name: 'AURA System',
      });

      // Check for perfect attendance achievement
      const thisWeekRecords = attendanceRecords.filter(r => {
        const recordDate = parseISO(r.shift_date);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return recordDate >= weekStart;
      });

      if (thisWeekRecords.length >= 5 && thisWeekRecords.every(r => r.status === 'on_time')) {
        await base44.entities.Notification.create({
          user_email: user.email,
          user_name: user.full_name,
          type: 'achievement',
          title: '🏆 Perfect Attendance This Week!',
          message: 'You showed up on time every single day. Keep up the amazing work!',
          link_module: 'MyAttendance',
          priority: 'high',
          sender_name: 'AURA System',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayShifts'] });
      queryClient.invalidateQueries({ queryKey: ['recentClockEvents'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setIsProcessing(false);
    },
    onError: (error) => {
      alert(error.message);
      setIsProcessing(false);
    },
  });

  const handleClockIn = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    clockInMutation.mutate();
  };

  const handleClockOut = () => {
    if (isProcessing) return;
    if (!confirm('Are you sure you want to clock out?')) {
      return;
    }
    setIsProcessing(true);
    clockOutMutation.mutate();
  };

  // Get location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            name: 'Current Location',
          });
        },
        (error) => {
          console.log('Location not available:', error);
        }
      );
    }
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getShiftStatus = () => {
    if (!todayShift) return { text: 'No shift scheduled', color: 'text-gray-500' };
    if (activeShift) return { text: 'Currently Working', color: 'text-green-600' };
    if (todayShift.status === 'completed') return { text: 'Shift Completed', color: 'text-blue-600' };
    return { text: 'Not Clocked In', color: 'text-amber-600' };
  };

  const status = getShiftStatus();

  // Calculate time worked
  const getTimeWorked = () => {
    if (!activeShift?.clock_in_time) return null;
    const clockIn = parseISO(activeShift.clock_in_time);
    const minutes = differenceInMinutes(currentTime, clockIn);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return { hours, minutes: mins, total: (minutes / 60).toFixed(2) };
  };

  const timeWorked = getTimeWorked();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('MyShifts')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              My Shifts
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Current Time Display */}
        <Card className="bg-gradient-to-r from-[#014D40] to-emerald-600 text-white border-none shadow-2xl mb-6">
          <CardContent className="p-8 text-center">
            <div className="text-6xl font-bold mb-2 tabular-nums">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <p className="text-emerald-100 text-lg">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </p>
            {location && (
              <p className="text-emerald-200 text-sm mt-2 flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" />
                Location Detected
              </p>
            )}
          </CardContent>
        </Card>

        {/* Shift Status */}
        {todayShift && (
          <Card className="mb-6 border-2 border-blue-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Today's Shift</h3>
                    <Badge className={`${status.color} bg-opacity-20`}>
                      {status.text}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-gray-700">
                    <p className="font-medium">{todayShift.role || 'Staff'}</p>
                    <p className="text-sm">
                      Scheduled: {todayShift.start_time} - {todayShift.end_time}
                    </p>
                    {activeShift?.clock_in_time && (
                      <p className="text-sm text-green-600 font-semibold">
                        Clocked In: {format(parseISO(activeShift.clock_in_time), 'h:mm a')}
                      </p>
                    )}
                  </div>
                </div>

                {timeWorked && (
                  <div className="text-center bg-green-50 rounded-xl p-4 border-2 border-green-300">
                    <p className="text-sm text-green-700 font-semibold mb-1">Time Worked</p>
                    <p className="text-3xl font-bold text-green-900">
                      {timeWorked.hours}h {timeWorked.minutes}m
                    </p>
                    <p className="text-xs text-green-600 mt-1">{timeWorked.total} hours</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clock In/Out Buttons */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-none shadow-xl">
            <CardContent className="p-8 text-center">
              <LogIn className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Clock In</h3>
              <Button
                onClick={handleClockIn}
                disabled={!todayShift || !!activeShift || isProcessing || todayShift?.status === 'completed'}
                className="w-full py-6 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  'Processing...'
                ) : activeShift ? (
                  '✅ Already Clocked In'
                ) : !todayShift ? (
                  '❌ No Shift Today'
                ) : todayShift.status === 'completed' ? (
                  '✅ Shift Completed'
                ) : (
                  'Start My Shift'
                )}
              </Button>
              {!todayShift && (
                <p className="text-sm text-gray-500 mt-3">
                  You don't have a shift scheduled for today
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl">
            <CardContent className="p-8 text-center">
              <LogOut className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Clock Out</h3>
              <Button
                onClick={handleClockOut}
                disabled={!activeShift || isProcessing}
                className="w-full py-6 text-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : !activeShift ? '❌ Not Clocked In' : 'End My Shift'}
              </Button>
              {timeWorked && (
                <p className="text-sm text-gray-600 mt-3">
                  You've worked {timeWorked.hours}h {timeWorked.minutes}m so far
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Clock Events */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Recent Clock History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentClockEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No clock events yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentClockEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-4">
                      {event.event_type === 'clock_in' ? (
                        <div className="p-2 bg-green-100 rounded-lg">
                          <LogIn className="w-5 h-5 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-red-100 rounded-lg">
                          <LogOut className="w-5 h-5 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {event.event_type === 'clock_in' ? 'Clocked In' : 'Clocked Out'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(event.timestamp), 'MMM d, yyyy • h:mm a')}
                        </p>
                        {event.notes && (
                          <p className="text-xs text-amber-600 mt-1">{event.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(parseISO(event.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* This Week Summary */}
        {attendanceRecords.length > 0 && (
          <Card className="mt-6 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                This Week Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-semibold mb-1">Shifts Worked</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {attendanceRecords.filter(r => r.actual_clock_in).length}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700 font-semibold mb-1">Total Hours</p>
                  <p className="text-3xl font-bold text-green-900">
                    {attendanceRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0).toFixed(1)}h
                  </p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-700 font-semibold mb-1">On Time</p>
                  <p className="text-3xl font-bold text-amber-900">
                    {attendanceRecords.filter(r => r.status === 'on_time').length}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-700 font-semibold mb-1">Overtime</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {attendanceRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0).toFixed(1)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}