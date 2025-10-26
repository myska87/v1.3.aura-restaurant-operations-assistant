
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, MapPin, AlertCircle, ArrowLeft, Home, TrendingUp } from "lucide-react";
import { format, differenceInMinutes, differenceInHours, parseISO, addMinutes, subMinutes } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClockInOut() {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get today's shifts
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const { data: shifts = [], refetch: refetchShifts } = useQuery({
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
  });

  const activeShift = shifts.find(s => s.status === 'in_progress');
  const nextShift = !activeShift ? shifts.find(s => s.status === 'scheduled') : null;
  const currentShift = activeShift || nextShift;

  // Get attendance record
  const { data: attendanceRecord, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendanceRecord', currentShift?.id],
    queryFn: async () => {
      if (!currentShift?.id) return null;
      const records = await base44.entities.AttendanceRecord.filter({
        shift_id: currentShift.id
      });
      return records[0] || null;
    },
    enabled: !!currentShift?.id,
  });

  // Clock In Mutation with Intelligent Alert System
  const clockInMutation = useMutation({
    mutationFn: async (locationData) => {
      if (!nextShift || !user) {
        throw new Error('No shift or user found');
      }

      const clockInTime = new Date().toISOString();
      const scheduledStart = parseISO(`${nextShift.shift_date}T${nextShift.start_time}:00`);
      const actualClockIn = new Date();
      
      // Calculate difference in minutes
      const minutesDifference = differenceInMinutes(actualClockIn, scheduledStart);
      const isLate = minutesDifference > 0;
      const isEarly = minutesDifference < -15; // More than 15 min early
      const isVeryLate = minutesDifference > 15; // More than 15 min late
      
      const latenessMinutes = Math.max(0, minutesDifference);
      const status = minutesDifference > 5 ? 'late' : 'on_time';

      // Calculate scheduled hours
      const [startHour, startMin] = nextShift.start_time.split(':').map(Number);
      const [endHour, endMin] = nextShift.end_time.split(':').map(Number);
      const scheduledHours = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60;

      // Update or create attendance record
      if (attendanceRecord) {
        await base44.entities.AttendanceRecord.update(attendanceRecord.id, {
          actual_clock_in: clockInTime,
          clock_in_location: locationData,
          lateness_minutes: latenessMinutes,
          status: status
        });
      } else {
        await base44.entities.AttendanceRecord.create({
          staff_email: user.email,
          staff_name: user.full_name,
          shift_id: nextShift.id,
          shift_date: nextShift.shift_date,
          scheduled_start: nextShift.start_time,
          scheduled_end: nextShift.end_time,
          scheduled_hours: scheduledHours,
          actual_clock_in: clockInTime,
          clock_in_location: locationData,
          lateness_minutes: latenessMinutes,
          status: status
        });
      }

      // Update shift status
      await base44.entities.Shift.update(nextShift.id, {
        status: 'in_progress',
        clock_in_time: clockInTime,
      });

      // Create clock event
      await base44.entities.ClockEvent.create({
        user_email: user.email,
        user_name: user.full_name,
        shift_id: nextShift.id,
        event_type: 'clock_in',
        timestamp: clockInTime,
        location_lat: locationData?.latitude,
        location_lng: locationData?.longitude,
        location_name: locationData?.name || 'Unknown',
      });

      // 🧠 INTELLIGENT ALERT SYSTEM
      // Create manager alert if staff is late OR too early
      if (isLate || isEarly) {
        let alertType, severity, message;

        if (isVeryLate) {
          alertType = 'very_late';
          severity = 'urgent';
          message = `⚠️ ${user.full_name} clocked in ${minutesDifference} minutes LATE for their ${nextShift.role} shift. Immediate attention required!`;
        } else if (isLate) {
          alertType = 'late_clock_in';
          severity = 'warning';
          message = `${user.full_name} clocked in ${minutesDifference} minutes late for their ${nextShift.role} shift.`;
        } else if (isEarly) {
          alertType = 'early_clock_in';
          severity = 'info';
          message = `${user.full_name} clocked in ${Math.abs(minutesDifference)} minutes early for their ${nextShift.role} shift.`;
        }

        // Create alert for manager
        const alert = await base44.entities.ManagerAlert.create({
          alert_type: alertType,
          severity: severity,
          staff_email: user.email,
          staff_name: user.full_name,
          shift_id: nextShift.id,
          shift_date: nextShift.shift_date,
          scheduled_time: nextShift.start_time,
          actual_time: clockInTime,
          minutes_difference: minutesDifference,
          message: message,
          location: locationData,
          status: 'unread'
        });

        // 📧 AUTO-NOTIFY MANAGER FOR SERIOUS LATENESS (>15 min)
        if (isVeryLate && nextShift.manager_email) {
          try {
            await base44.integrations.Core.SendEmail({
              from_name: 'AURA Attendance System',
              to: nextShift.manager_email,
              subject: `🚨 URGENT: ${user.full_name} - Late Clock In Alert`,
              body: `
                <h2>Urgent Attendance Alert</h2>
                <p><strong>${user.full_name}</strong> has clocked in <strong>${minutesDifference} minutes LATE</strong> for their shift.</p>
                
                <h3>Shift Details:</h3>
                <ul>
                  <li><strong>Role:</strong> ${nextShift.role}</li>
                  <li><strong>Scheduled Start:</strong> ${nextShift.start_time}</li>
                  <li><strong>Actual Clock In:</strong> ${format(actualClockIn, 'HH:mm')}</li>
                  <li><strong>Date:</strong> ${format(new Date(nextShift.shift_date), 'MMM d, yyyy')}</li>
                  <li><strong>Location:</strong> ${locationData?.name || 'Unknown'}</li>
                </ul>
                
                <p>Please review this attendance issue in the Manager Dashboard.</p>
                
                <p style="color: #666; font-size: 12px;">This is an automated alert from AURA Restaurant Operations System.</p>
              `
            });

            // Mark alert as notified
            await base44.entities.ManagerAlert.update(alert.id, {
              auto_notified: true,
              notification_sent_at: new Date().toISOString()
            });
          } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
          }
        }
      }
    },
    onSuccess: () => {
      refetchShifts();
      refetchAttendance();
      queryClient.invalidateQueries({ queryKey: ['managerAlerts'] });
      setIsProcessing(false);
      alert('✅ Successfully clocked in!');
    },
    onError: (error) => {
      console.error('Clock in error:', error);
      setIsProcessing(false);
      alert('❌ Failed to clock in. Please try again.');
    }
  });

  // Clock Out Mutation
  const clockOutMutation = useMutation({
    mutationFn: async (locationData) => {
      if (!activeShift || !attendanceRecord || !user) {
        throw new Error('No active shift or attendance record found');
      }

      const clockOutTime = new Date().toISOString();
      const clockInTime = parseISO(attendanceRecord.actual_clock_in);
      const totalHours = differenceInMinutes(new Date(), clockInTime) / 60;
      const overtimeHours = Math.max(0, totalHours - attendanceRecord.scheduled_hours);
      
      const scheduledEnd = parseISO(`${activeShift.shift_date}T${activeShift.end_time}:00`);
      const actualClockOut = new Date();
      const earlyDepartureMinutes = Math.max(0, differenceInMinutes(scheduledEnd, actualClockOut));

      // Update attendance record
      await base44.entities.AttendanceRecord.update(attendanceRecord.id, {
        actual_clock_out: clockOutTime,
        clock_out_location: locationData,
        total_hours: parseFloat(totalHours.toFixed(2)),
        overtime_hours: parseFloat(overtimeHours.toFixed(2)),
        early_departure_minutes: earlyDepartureMinutes,
        status: 'pending'
      });

      // Update shift status
      await base44.entities.Shift.update(activeShift.id, {
        status: 'completed',
        clock_out_time: clockOutTime,
      });

      // Create clock event
      await base44.entities.ClockEvent.create({
        user_email: user.email,
        user_name: user.full_name,
        shift_id: activeShift.id,
        event_type: 'clock_out',
        timestamp: clockOutTime,
        location_lat: locationData?.latitude,
        location_lng: locationData?.longitude,
        location_name: locationData?.name || 'Unknown',
      });

      // Alert manager if staff left significantly early (>30 min before shift end)
      if (earlyDepartureMinutes > 30 && activeShift.manager_email) {
        await base44.entities.ManagerAlert.create({
          alert_type: 'early_departure',
          severity: 'warning',
          staff_email: user.email,
          staff_name: user.full_name,
          shift_id: activeShift.id,
          shift_date: activeShift.shift_date,
          scheduled_time: activeShift.end_time,
          actual_time: clockOutTime,
          minutes_difference: -earlyDepartureMinutes, // Store as negative for early departure
          message: `${user.full_name} clocked out ${earlyDepartureMinutes} minutes EARLY from their ${activeShift.role} shift.`,
          location: locationData,
          status: 'unread'
        });
      }
    },
    onSuccess: () => {
      refetchShifts();
      refetchAttendance();
      queryClient.invalidateQueries({ queryKey: ['managerAlerts'] });
      setIsProcessing(false);
      alert('✅ Successfully clocked out!');
    },
    onError: (error) => {
      console.error('Clock out error:', error);
      setIsProcessing(false);
      alert('❌ Failed to clock out. Please try again.');
    }
  });

  // Handle Clock In
  const handleClockIn = async () => {
    if (isProcessing) return;
    if (!nextShift) {
      alert('❌ No scheduled shift found for today');
      return;
    }
    if (activeShift) {
      alert('❌ You are already clocked in');
      return;
    }

    setIsProcessing(true);

    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            name: 'Current Location',
          };
          setLocation(loc);
          clockInMutation.mutate(loc);
        },
        () => {
          if (window.confirm('Unable to get location. Clock in without location?')) {
            clockInMutation.mutate(null);
          } else {
            setIsProcessing(false);
          }
        }
      );
    } else {
      if (window.confirm('Geolocation not supported. Clock in without location?')) {
        clockInMutation.mutate(null);
      } else {
        setIsProcessing(false);
      }
    }
  };

  // Handle Clock Out
  const handleClockOut = async () => {
    if (isProcessing) return;
    if (!activeShift) {
      alert('❌ No active shift found');
      return;
    }
    if (!attendanceRecord) {
      alert('❌ No attendance record found');
      return;
    }

    if (!window.confirm('Are you sure you want to clock out?')) {
      return;
    }

    setIsProcessing(true);

    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            name: 'Current Location',
          };
          clockOutMutation.mutate(loc);
        },
        () => {
          if (window.confirm('Unable to get location. Clock out without location?')) {
            clockOutMutation.mutate(null);
          } else {
            setIsProcessing(false);
          }
        }
      );
    } else {
      if (window.confirm('Geolocation not supported. Clock out without location?')) {
        clockOutMutation.mutate(null);
      } else {
        setIsProcessing(false);
      }
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          name: 'Current Location',
        });
        setGettingLocation(false);
      },
      () => {
        setLocation({ name: 'Location unavailable' });
        setGettingLocation(false);
      }
    );
  };

  const getShiftDuration = () => {
    if (!activeShift || !attendanceRecord?.actual_clock_in) {
      return null;
    }
    
    const start = parseISO(attendanceRecord.actual_clock_in);
    const now = new Date();
    const hours = differenceInHours(now, start);
    const minutes = differenceInMinutes(now, start) % 60;
    
    return { hours, minutes };
  };

  const duration = getShiftDuration();

  // Check if can clock in/out
  const canClockIn = nextShift && !activeShift && !isProcessing;
  const canClockOut = activeShift && attendanceRecord && !isProcessing;

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("StaffRota")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⏰ Clock In / Out</h1>
          <p className="text-gray-600">Track your shift hours automatically</p>
        </div>

        {/* Current Time Display */}
        <Card className="bg-white border-none shadow-lg mb-8">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-gray-600 mb-2">Current Time</p>
            <motion.h2 
              className="text-6xl font-bold mb-4 text-[#014D40]"
              key={currentTime.toISOString()}
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {format(currentTime, 'HH:mm:ss')}
            </motion.h2>
            <p className="text-lg text-gray-600">{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
          </CardContent>
        </Card>

        {/* Active Shift Display */}
        {activeShift && (
          <Card className="bg-gradient-to-r from-[#014D40] to-emerald-600 border-none shadow-lg mb-8">
            <CardContent className="p-6 text-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold">{activeShift.role}</h3>
                    <Badge className="bg-white text-[#014D40]">Shift Active</Badge>
                  </div>
                  <p className="text-blue-100">
                    {activeShift.start_time} - {activeShift.end_time}
                  </p>
                </div>
              </div>

              {duration && (
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-sm text-blue-100 mb-1">Working Time</p>
                  <p className="text-4xl font-bold">
                    {duration.hours}h {duration.minutes}m
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-blue-100">
                      ✅ Clocked in: {attendanceRecord?.actual_clock_in ? format(parseISO(attendanceRecord.actual_clock_in), 'h:mm a') : 'N/A'}
                    </p>
                    {attendanceRecord?.scheduled_hours && (
                      <p className="text-sm text-blue-100">
                        📅 Scheduled: {attendanceRecord.scheduled_hours.toFixed(1)}h
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Next Shift Display */}
        {!activeShift && nextShift && (
          <Card className="bg-white border-none shadow-lg mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">📋 Your Next Shift</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{nextShift.role}</p>
                  <p className="text-gray-600">{nextShift.start_time} - {nextShift.end_time}</p>
                </div>
                <Badge className="bg-gray-100 text-gray-800">Scheduled</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Tracking */}
        <Card className="bg-white border-none shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Location Tracking</p>
                  <p className="text-sm text-gray-600">
                    {location ? location.name : 'Location not captured'}
                  </p>
                </div>
              </div>
              {!location && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={getLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? 'Getting...' : 'Capture Location'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clock In/Out Buttons */}
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
          {/* Clock In Button */}
          <div>
            <motion.div
              whileTap={{ scale: canClockIn ? 0.95 : 1 }}
              className="w-full"
            >
              <Button
                onClick={handleClockIn}
                disabled={!canClockIn}
                className={`w-full h-32 text-xl font-bold shadow-2xl relative overflow-hidden transition-all ${
                  canClockIn
                    ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-4 border-green-400 animate-pulse'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {canClockIn && (
                  <div className="absolute inset-0 animate-ping bg-white opacity-20" />
                )}
                <div className="flex flex-col items-center justify-center gap-2 relative z-10">
                  <LogIn className="w-10 h-10" />
                  <span>{isProcessing ? 'Processing...' : 'Clock In'}</span>
                  {activeShift && (
                    <span className="text-xs opacity-75">Already Clocked In</span>
                  )}
                </div>
              </Button>
            </motion.div>
            
            <div className="mt-3 text-center">
              {canClockIn && (
                <p className="text-green-600 font-semibold text-sm animate-bounce">
                  ✅ Ready to Clock In!
                </p>
              )}
              {!nextShift && !activeShift && (
                <p className="text-gray-500 text-sm">No shift scheduled</p>
              )}
              {activeShift && (
                <p className="text-gray-500 text-sm">Already on shift</p>
              )}
            </div>
          </div>

          {/* Clock Out Button */}
          <div>
            <motion.div
              whileTap={{ scale: canClockOut ? 0.95 : 1 }}
              className="w-full"
            >
              <Button
                onClick={handleClockOut}
                disabled={!canClockOut}
                className={`w-full h-32 text-xl font-bold shadow-2xl relative overflow-hidden transition-all ${
                  canClockOut
                    ? 'bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 border-4 border-orange-400 animate-pulse'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {canClockOut && (
                  <div className="absolute inset-0 animate-pulse bg-white opacity-20" />
                )}
                <div className="flex flex-col items-center justify-center gap-2 relative z-10">
                  <LogOut className="w-10 h-10" />
                  <span>{isProcessing ? 'Processing...' : 'Clock Out'}</span>
                  {duration && activeShift && (
                    <span className="text-sm opacity-90">
                      {duration.hours}h {duration.minutes}m worked
                    </span>
                  )}
                  {!activeShift && (
                    <span className="text-xs opacity-75">Not Clocked In</span>
                  )}
                </div>
              </Button>
            </motion.div>

            <div className="mt-3 text-center">
              {canClockOut && (
                <p className="text-orange-600 font-semibold text-sm animate-bounce">
                  ✅ Ready to Clock Out!
                </p>
              )}
              {!activeShift && (
                <p className="text-gray-500 text-sm">No active shift</p>
              )}
            </div>
          </div>
        </div>

        {/* No Shift Alert */}
        {!nextShift && !activeShift && (
          <Card className="bg-amber-50 border-amber-200 max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
              <p className="text-gray-900 font-medium">No Scheduled Shift Today</p>
              <Link to={createPageUrl("MyShifts")}>
                <Button variant="outline" className="mt-4">
                  View Schedule
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Today's Attendance */}
        {attendanceRecord && (
          <Card className="mt-8 bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#014D40]" />
                Today&apos;s Attendance
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Scheduled</p>
                  <p className="text-xl font-bold text-gray-900">
                    {attendanceRecord.scheduled_hours?.toFixed(1)}h
                  </p>
                </div>
                {attendanceRecord.total_hours && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Worked</p>
                    <p className="text-xl font-bold text-gray-900">
                      {attendanceRecord.total_hours.toFixed(1)}h
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
