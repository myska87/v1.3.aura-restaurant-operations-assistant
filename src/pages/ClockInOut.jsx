
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, MapPin, AlertCircle, ArrowLeft, Home, CheckCircle, Calendar, TrendingUp } from "lucide-react";
import { format, differenceInMinutes, differenceInHours, parseISO, addMinutes, subMinutes } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClockInOut() {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [canClockIn, setCanClockIn] = useState(false);
  const [canClockOut, setCanClockOut] = useState(false);
  const [timeUntilShift, setTimeUntilShift] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const { data: shifts = [] } = useQuery({
    queryKey: ['myShifts', user?.email, todayStr],
    queryFn: async () => {
      return await base44.entities.Shift.filter({
        staff_email: user?.email,
        shift_date: todayStr
      });
    },
    enabled: !!user?.email,
  });

  const activeShift = shifts.find(s => s.status === 'in_progress');
  const nextShift = !activeShift ? shifts.find(s => s.status === 'scheduled') : undefined;
  const currentShift = activeShift || nextShift;

  const { data: attendanceRecord } = useQuery({
    queryKey: ['attendanceRecord', currentShift?.id],
    queryFn: async () => {
      const records = await base44.entities.AttendanceRecord.filter({
        shift_id: currentShift.id
      });
      return records[0];
    },
    enabled: !!currentShift?.id,
  });

  const clockInMutation = useMutation({
    mutationFn: async (locationData) => {
      const clockInTime = new Date().toISOString();
      const scheduledStart = parseISO(`${nextShift.shift_date}T${nextShift.start_time}:00`);
      const latenessMinutes = Math.max(0, differenceInMinutes(new Date(), scheduledStart));
      const status = latenessMinutes > 5 ? 'late' : 'on_time';

      if (attendanceRecord) {
        await base44.entities.AttendanceRecord.update(attendanceRecord.id, {
          actual_clock_in: clockInTime,
          clock_in_location: locationData ? {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            name: locationData.name || 'Current Location'
          } : null,
          lateness_minutes: latenessMinutes,
          status: status
        });
      } else {
        const [startHour, startMin] = nextShift.start_time.split(':').map(Number);
        const [endHour, endMin] = nextShift.end_time.split(':').map(Number);
        const scheduledHours = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60;

        await base44.entities.AttendanceRecord.create({
          staff_email: user.email,
          staff_name: user.full_name,
          shift_id: nextShift.id,
          shift_date: nextShift.shift_date,
          scheduled_start: nextShift.start_time,
          scheduled_end: nextShift.end_time,
          scheduled_hours: scheduledHours,
          actual_clock_in: clockInTime,
          clock_in_location: locationData ? {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            name: locationData.name || 'Current Location'
          } : null,
          lateness_minutes: latenessMinutes,
          status: status
        });
      }

      await base44.entities.Shift.update(nextShift.id, {
        status: 'in_progress',
        clock_in_time: clockInTime,
      });

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myShifts'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceRecord'] });
      alert('✅ Clocked in successfully!');
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Clock in error:', error);
      alert('❌ Failed to clock in');
      setIsProcessing(false);
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: async (locationData) => {
      const clockOutTime = new Date().toISOString();
      
      if (!attendanceRecord) {
        throw new Error('No attendance record found');
      }

      const clockInTime = parseISO(attendanceRecord.actual_clock_in);
      const totalHours = differenceInMinutes(new Date(), clockInTime) / 60;
      const overtimeHours = Math.max(0, totalHours - attendanceRecord.scheduled_hours);
      const scheduledEnd = parseISO(`${activeShift.shift_date}T${activeShift.end_time}:00`);
      const earlyDepartureMinutes = Math.max(0, differenceInMinutes(scheduledEnd, new Date()));

      await base44.entities.AttendanceRecord.update(attendanceRecord.id, {
        actual_clock_out: clockOutTime,
        clock_out_location: locationData ? {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          name: locationData.name || 'Current Location'
        } : null,
        total_hours: parseFloat(totalHours.toFixed(2)),
        overtime_hours: parseFloat(overtimeHours.toFixed(2)),
        early_departure_minutes: earlyDepartureMinutes,
        status: 'pending'
      });

      await base44.entities.Shift.update(activeShift.id, {
        status: 'completed',
        clock_out_time: clockOutTime,
      });

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myShifts'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceRecord'] });
      alert('✅ Clocked out successfully!');
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Clock out error:', error);
      alert('❌ Failed to clock out');
      setIsProcessing(false);
    }
  });

  const handleClockIn = () => {
    if (isProcessing || !nextShift || !canClockIn) {
      return;
    }

    setIsProcessing(true);

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

  const handleClockOut = () => {
    if (isProcessing || !activeShift || !canClockOut) {
      return;
    }

    if (!window.confirm('Are you sure you want to clock out?')) {
      return;
    }

    setIsProcessing(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            name: 'Current Location',
          };
          setLocation(loc);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentShift) {
      setCanClockIn(false);
      setCanClockOut(false);
      return;
    }

    const now = new Date();
    const shiftDate = parseISO(currentShift.shift_date);
    const [startHour, startMin] = currentShift.start_time.split(':').map(Number);
    
    const scheduledStart = new Date(shiftDate);
    scheduledStart.setHours(startHour, startMin, 0);
    
    const clockInStart = subMinutes(scheduledStart, 15);
    const clockInEnd = addMinutes(scheduledStart, 15);
    
    const isInClockInWindow = now >= clockInStart && now <= clockInEnd;
    const isActiveShift = currentShift.status === 'in_progress';

    setCanClockIn(isInClockInWindow && !isActiveShift);
    setCanClockOut(isActiveShift);

    if (!isActiveShift && scheduledStart > now) {
      const minutesUntil = differenceInMinutes(scheduledStart, now);
      setTimeUntilShift(minutesUntil);
    } else {
      setTimeUntilShift(null);
    }
  }, [currentTime, currentShift]);

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
    if (!activeShift?.clock_in_time || !attendanceRecord?.actual_clock_in) {
      return null;
    }
    
    const start = parseISO(attendanceRecord.actual_clock_in);
    const now = new Date();
    const hours = differenceInHours(now, start);
    const minutes = differenceInMinutes(now, start) % 60;
    
    return { hours, minutes };
  };

  const duration = getShiftDuration();

  const getStatusBadge = () => {
    if (!attendanceRecord) {
      return null;
    }

    if (attendanceRecord.status === 'on_time') {
      return <Badge className="bg-green-100 text-green-800">✅ On Time</Badge>;
    } else if (attendanceRecord.status === 'late') {
      return <Badge className="bg-red-100 text-red-800">⚠️ Late ({attendanceRecord.lateness_minutes} min)</Badge>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
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

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⏰ Clock In / Out</h1>
          <p className="text-gray-600">Track your shift hours automatically</p>
        </div>

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

        {timeUntilShift !== null && timeUntilShift <= 15 && (
          <Card className="border-2 border-yellow-300 bg-yellow-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-gray-900">
                    ⏰ Your shift starts in {timeUntilShift} minute{timeUntilShift !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-gray-700">You can now clock in!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeShift && (
          <Card className="bg-gradient-to-r from-[#014D40] to-emerald-600 border-none shadow-lg mb-8">
            <CardContent className="p-6 text-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold">{activeShift.role}</h3>
                    {getStatusBadge()}
                  </div>
                  <p className="text-blue-100">
                    {activeShift.start_time} - {activeShift.end_time}
                  </p>
                </div>
                <Badge className="bg-white text-[#014D40]">Shift Active</Badge>
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

        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          <motion.div whileTap={{ scale: canClockIn && !isProcessing ? 0.95 : 1 }}>
            <Button
              onClick={handleClockIn}
              disabled={!canClockIn || isProcessing || activeShift !== null}
              className={`w-full h-32 text-xl font-bold shadow-2xl ${
                canClockIn && !activeShift && !isProcessing
                  ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <LogIn className="w-10 h-10" />
                <span>{isProcessing ? 'Processing...' : 'Clock In'}</span>
              </div>
            </Button>
            <div className="mt-3 text-center">
              {!activeShift && nextShift && canClockIn && (
                <p className="text-green-600 font-semibold text-sm">
                  ✅ Ready to Clock In!
                </p>
              )}
            </div>
          </motion.div>

          <motion.div whileTap={{ scale: canClockOut && !isProcessing ? 0.95 : 1 }}>
            <Button
              onClick={handleClockOut}
              disabled={!canClockOut || isProcessing || !activeShift}
              className={`w-full h-32 text-xl font-bold shadow-2xl ${
                canClockOut && activeShift && !isProcessing
                  ? 'bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <LogOut className="w-10 h-10" />
                <span>{isProcessing ? 'Processing...' : 'Clock Out'}</span>
              </div>
            </Button>
            <div className="mt-3 text-center">
              {activeShift && canClockOut && (
                <p className="text-orange-600 font-semibold text-sm">
                  ✅ Ready to Clock Out!
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {!nextShift && !activeShift && (
          <Card className="bg-amber-50 border-amber-200 max-w-md mx-auto mt-6">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
              <p className="text-gray-900 font-medium">No Scheduled Shift Today</p>
              <Link to={createPageUrl("MyShifts")}>
                <Button variant="outline" className="mt-4">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Schedule
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {attendanceRecord && (
          <Card className="mt-8 bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#014D40]" />
                Today's Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
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

        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#014D40]" />
              Important Notes
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-[#014D40]">•</span>
                <span>Clock in within 15 minutes of your shift start time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#014D40]">•</span>
                <span>Always clock out at the end of your shift</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
