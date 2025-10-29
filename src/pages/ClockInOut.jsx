import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, AlertCircle, CheckCircle, Home, Calendar } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClockInOut() {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get today's shifts
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { data: myShifts = [], refetch: refetchShifts } = useQuery({
    queryKey: ['myShifts', user?.email, todayStr],
    queryFn: async () => {
      if (!user?.email) return [];
      const allShifts = await base44.entities.Shift.filter({
        staff_email: user.email,
        shift_date: todayStr
      });
      return allShifts;
    },
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  // Get today's attendance records
  const { data: attendanceRecords = [], refetch: refetchAttendance } = useQuery({
    queryKey: ['attendanceRecords', user?.email, todayStr],
    queryFn: async () => {
      if (!user?.email) return [];
      const records = await base44.entities.AttendanceRecord.filter({
        staff_email: user.email,
        shift_date: todayStr
      });
      return records;
    },
    enabled: !!user?.email,
  });

  const activeShift = myShifts.find(s => s.status === 'in_progress');
  const scheduledShift = myShifts.find(s => s.status === 'scheduled');
  const todayAttendance = attendanceRecords[0];

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            name: 'Current Location'
          });
        },
        (error) => {
          console.log('Location access denied or error:', error);
        }
      );
    }
  }, []);

  // Clock In Mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const shiftToClockIn = scheduledShift;
      if (!shiftToClockIn) throw new Error('No scheduled shift found for today.');
      if (!user) throw new Error('User not authenticated.');

      const clockInTime = new Date();
      const scheduledStart = new Date(`${shiftToClockIn.shift_date}T${shiftToClockIn.start_time}`);
      const latenessMinutes = Math.max(0, differenceInMinutes(clockInTime, scheduledStart));
      const status = latenessMinutes > 15 ? 'late' : 'on_time';

      const scheduledHours = parseFloat(((new Date(`${shiftToClockIn.shift_date}T${shiftToClockIn.end_time}`).getTime() - new Date(`${shiftToClockIn.shift_date}T${shiftToClockIn.start_time}`).getTime()) / 3600000).toFixed(2));

      if (todayAttendance) {
        await base44.entities.AttendanceRecord.update(todayAttendance.id, {
          actual_clock_in: clockInTime.toISOString(),
          clock_in_location: location,
          status: status,
          lateness_minutes: latenessMinutes,
          reminder_sent_clock_in: false,
        });
      } else {
        await base44.entities.AttendanceRecord.create({
          staff_email: user.email,
          staff_name: user.full_name,
          shift_id: shiftToClockIn.id,
          shift_date: shiftToClockIn.shift_date,
          scheduled_start: shiftToClockIn.start_time,
          scheduled_end: shiftToClockIn.end_time,
          actual_clock_in: clockInTime.toISOString(),
          clock_in_location: location,
          status: status,
          lateness_minutes: latenessMinutes,
          scheduled_hours: scheduledHours,
        });
      }

      await base44.entities.Shift.update(shiftToClockIn.id, {
        status: 'in_progress',
        clock_in_time: clockInTime.toISOString(),
      });

      await base44.entities.ActivityLog.create({
        activity_type: 'clock_in',
        title: 'Clocked In',
        description: `${user.full_name} started their ${shiftToClockIn.role} shift`,
        user_email: user.email,
        user_name: user.full_name,
        icon: 'clock',
        color: 'green',
        related_entity: 'Shift',
        related_entity_id: shiftToClockIn.id,
      });

      return { success: true, message: 'Clocked in successfully!' };
    },
    onSuccess: () => {
      refetchShifts();
      refetchAttendance();
      queryClient.invalidateQueries({ queryKey: ['managerAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
      alert('✅ Clocked In Successfully!\n\nYour attendance has been recorded.');
    },
    onError: (error) => {
      console.error('Clock in error:', error);
      alert(`❌ Clock in failed: ${error.message}. Please try again or contact your manager.`);
    }
  });

  // Clock Out Mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error('No active shift to clock out from.');
      if (!user) throw new Error('User not authenticated.');
      if (!todayAttendance || !todayAttendance.actual_clock_in) throw new Error('No clock-in record found for this shift.');

      const clockOutTime = new Date();
      const clockInTime = new Date(todayAttendance.actual_clock_in);
      const totalHours = parseFloat(((clockOutTime.getTime() - clockInTime.getTime()) / 3600000).toFixed(2));
      const scheduledHours = parseFloat(((new Date(`${activeShift.shift_date}T${activeShift.end_time}`).getTime() - new Date(`${activeShift.shift_date}T${activeShift.start_time}`).getTime()) / 3600000).toFixed(2));
      const overtimeHours = Math.max(0, totalHours - scheduledHours);
      
      const scheduledEnd = new Date(`${activeShift.shift_date}T${activeShift.end_time}`);
      const earlyDepartureMinutes = Math.max(0, differenceInMinutes(scheduledEnd, clockOutTime));

      await base44.entities.AttendanceRecord.update(todayAttendance.id, {
        actual_clock_out: clockOutTime.toISOString(),
        clock_out_location: location,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        early_departure_minutes: earlyDepartureMinutes,
        status: 'completed'
      });

      await base44.entities.Shift.update(activeShift.id, {
        status: 'completed',
        clock_out_time: clockOutTime.toISOString(),
      });

      await base44.entities.ActivityLog.create({
        activity_type: 'clock_out',
        title: 'Clocked Out',
        description: `${user.full_name} ended their ${activeShift.role} shift - ${totalHours}h worked`,
        user_email: user.email,
        user_name: user.full_name,
        icon: 'clock',
        color: 'blue',
        related_entity: 'Shift',
        related_entity_id: activeShift.id,
        metadata: {
          total_hours: totalHours,
          overtime_hours: overtimeHours,
        },
      });

      return {
        success: true,
        hoursWorked: totalHours.toFixed(2),
        overtime: overtimeHours.toFixed(2)
      };
    },
    onSuccess: (data) => {
      refetchShifts();
      refetchAttendance();
      queryClient.invalidateQueries({ queryKey: ['managerAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
      alert(`✅ Clocked Out Successfully!\n\nHours Worked: ${data.hoursWorked}h\nOvertime: ${data.overtime}h\n\nThank you for your work today!`);
    },
    onError: (error) => {
      console.error('Clock out error:', error);
      alert(`❌ Clock out failed: ${error.message}. Please try again or contact your manager.`);
    }
  });

  const getWorkingTime = () => {
    if (!activeShift?.clock_in_time) return '0:00:00';

    const clockIn = new Date(activeShift.clock_in_time);
    const diff = currentTime.getTime() - clockIn.getTime();

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('MyShifts')}>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
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

        <Card className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
          <CardContent className="p-8 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-5xl font-bold mb-2">
              {format(currentTime, 'HH:mm:ss')}
            </h1>
            <p className="text-lg opacity-90">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </p>
          </CardContent>
        </Card>

        {activeShift && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Card className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      <p className="font-semibold text-lg">Currently Working</p>
                    </div>
                    <p className="text-emerald-50 mb-2">
                      {activeShift.role} • {activeShift.shift_type} shift
                    </p>
                    <p className="text-2xl font-bold">
                      ⏱ {getWorkingTime()}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => clockOutMutation.mutate()}
                    disabled={clockOutMutation.isPending}
                    className="bg-white text-emerald-700 hover:bg-emerald-50"
                  >
                    {clockOutMutation.isPending ? 'Clocking Out...' : 'Clock Out'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!activeShift && scheduledShift && (
          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ready to Start Your Shift?
              </h2>
              <p className="text-gray-600 mb-2">
                {scheduledShift.role} • {scheduledShift.start_time} - {scheduledShift.end_time}
              </p>
              {location && (
                <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mb-6">
                  <MapPin className="w-4 h-4" />
                  Location detected
                </p>
              )}
              <Button
                size="lg"
                onClick={() => clockInMutation.mutate()}
                disabled={clockInMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
              >
                {clockInMutation.isPending ? 'Clocking In...' : 'Clock In Now'}
              </Button>
            </CardContent>
          </Card>
        )}

        {!activeShift && !scheduledShift && (
          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No Shift Scheduled Today
              </h2>
              <p className="text-gray-600 mb-6">
                You don't have any shifts scheduled for today.
              </p>
              <Link to={createPageUrl('MyShifts')}>
                <Button>
                  <Calendar className="w-4 h-4 mr-2" />
                  View My Shifts
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {todayAttendance && (
          <Card>
            <CardHeader>
              <CardTitle>Today's Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Clock In:</span>
                  <span className="font-semibold">
                    {todayAttendance.actual_clock_in
                      ? format(new Date(todayAttendance.actual_clock_in), 'HH:mm:ss')
                      : 'Not clocked in'}
                  </span>
                </div>
                {todayAttendance.actual_clock_out && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Clock Out:</span>
                      <span className="font-semibold">
                        {format(new Date(todayAttendance.actual_clock_out), 'HH:mm:ss')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-gray-600">Total Hours:</span>
                      <span className="font-bold text-lg text-blue-600">
                        {todayAttendance.total_hours?.toFixed(2)}h
                      </span>
                    </div>
                    {todayAttendance.overtime_hours > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Overtime:</span>
                        <span className="font-bold text-amber-600">
                          {todayAttendance.overtime_hours?.toFixed(2)}h
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={
                    todayAttendance.status === 'on_time' ? 'bg-green-100 text-green-800' :
                    todayAttendance.status === 'late' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {todayAttendance.status?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}