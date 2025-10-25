
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, MapPin, AlertCircle, ArrowLeft, Home, CheckCircle, Calendar, TrendingUp } from "lucide-react";
import { format, differenceInMinutes, differenceInHours, parseISO, addMinutes, subMinutes } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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

  // Fetch today's shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ['myShifts', user?.email],
    queryFn: async () => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      return await base44.entities.Shift.filter({
        staff_email: user?.email,
        shift_date: todayStr
      });
    },
    enabled: !!user?.email,
  });

  // Fetch attendance record for active shift
  const activeShift = shifts.find(s => s.status === 'in_progress');
  const nextShift = shifts.find(s => s.status === 'scheduled');
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

  // Simple celebration animation (no external library needed)
  const celebrateShiftComplete = () => {
    // Show success message or trigger a visual effect
    console.log('🎉 Shift completed on time!');
  };

  // Clock In Mutation
  const clockInMutation = useMutation({
    mutationFn: async ({ location: loc }) => {
      const clockInTime = new Date().toISOString();
      
      // Calculate lateness
      const scheduledStart = parseISO(`${nextShift.shift_date}T${nextShift.start_time}:00`);
      const latenessMinutes = Math.max(0, differenceInMinutes(new Date(), scheduledStart));
      
      const status = latenessMinutes > 5 ? 'late' : 'on_time';

      // Create or update attendance record
      if (attendanceRecord) {
        await base44.entities.AttendanceRecord.update(attendanceRecord.id, {
          actual_clock_in: clockInTime,
          clock_in_location: loc ? {
            latitude: loc.latitude,
            longitude: loc.longitude,
            name: loc.name || 'Current Location'
          } : null,
          lateness_minutes: latenessMinutes,
          status: status
        });
      } else {
        // Create new attendance record
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
          clock_in_location: loc ? {
            latitude: loc.latitude,
            longitude: loc.longitude,
            name: loc.name || 'Current Location'
          } : null,
          lateness_minutes: latenessMinutes,
          status: status
        });
      }

      // Update shift status
      await base44.entities.Shift.update(nextShift.id, {
        status: 'in_progress',
        clock_in_time: clockInTime,
      });

      // Create clock event for historical tracking
      await base44.entities.ClockEvent.create({
        user_email: user.email,
        user_name: user.full_name,
        shift_id: nextShift.id,
        event_type: 'clock_in',
        timestamp: clockInTime,
        location_lat: loc?.latitude,
        location_lng: loc?.longitude,
        location_name: loc?.name || 'Unknown',
      });

      // Trigger task generation on clock-in
      try {
        const { TaskAutomationEngine } = await import('../components/TaskAutomationEngine');
        await TaskAutomationEngine.generateTasksForShift(nextShift.id);
      } catch (error) {
        console.log('Task automation not available:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myShifts'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceRecord'] });
      queryClient.invalidateQueries({ queryKey: ['checklistExecutions'] });
      alert('✅ Clocked in successfully!');
    },
    onError: (error) => {
      console.error('Clock in mutation error:', error);
      // setIsProcessing(false) is handled by performClockIn's finally
    }
  });

  // Clock Out Mutation
  const clockOutMutation = useMutation({
    mutationFn: async ({ location: loc }) => {
      const clockOutTime = new Date().toISOString();
      
      if (!attendanceRecord) {
        throw new Error('No attendance record found');
      }

      // Calculate total hours and overtime
      const clockInTime = parseISO(attendanceRecord.actual_clock_in);
      const totalHours = differenceInMinutes(new Date(), clockInTime) / 60;
      const overtimeHours = Math.max(0, totalHours - attendanceRecord.scheduled_hours);
      
      // Calculate early departure
      const scheduledEnd = parseISO(`${activeShift.shift_date}T${activeShift.end_time}:00`);
      const earlyDepartureMinutes = Math.max(0, differenceInMinutes(scheduledEnd, new Date()));

      // Check if shift completed on time
      const isOnTime = attendanceRecord.lateness_minutes <= 5 && earlyDepartureMinutes === 0;

      // Update attendance record
      await base44.entities.AttendanceRecord.update(attendanceRecord.id, {
        actual_clock_out: clockOutTime,
        clock_out_location: loc ? {
          latitude: loc.latitude,
          longitude: loc.longitude,
          name: loc.name || 'Current Location'
        } : null,
        total_hours: parseFloat(totalHours.toFixed(2)),
        overtime_hours: parseFloat(overtimeHours.toFixed(2)),
        early_departure_minutes: earlyDepartureMinutes,
        status: 'pending' // Pending manager verification
      });

      // Update shift
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
        location_lat: loc?.latitude,
        location_lng: loc?.longitude,
        location_name: loc?.name || 'Unknown',
      });

      // Celebrate if on time!
      if (isOnTime) {
        celebrateShiftComplete();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myShifts'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceRecord'] });
      alert('✅ Clocked out successfully!');
    },
    onError: (error) => {
      console.error('Clock out mutation error:', error);
      // setIsProcessing(false) is handled by performClockOut's finally
    }
  });

  const performClockIn = async (loc) => {
    setIsProcessing(true);
    try {
      await clockInMutation.mutateAsync({ location: loc });
    } catch (error) {
      console.error('Clock in error:', error);
      alert('Failed to clock in: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const performClockOut = async (loc) => {
    setIsProcessing(true);
    try {
      await clockOutMutation.mutateAsync({ location: loc });
    } catch (error) {
      console.error('Clock out error:', error);
      alert('Failed to clock out: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockIn = async () => {
    if (isProcessing) return;
    
    if (!nextShift) {
      alert('No scheduled shift found for today');
      return;
    }

    if (!canClockIn) {
      alert('You can only clock in 15 minutes before or after your shift start time');
      return;
    }

    // Get location if not already captured
    if (!location) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            name: 'Current Location',
          };
          setLocation(loc); // Update state for UI
          setGettingLocation(false);
          
          // Now clock in with location
          await performClockIn(loc);
        },
        (error) => {
          console.error('Error getting location:', error);
          setGettingLocation(false);
          
          // Clock in without location
          if (confirm('Unable to get location. Clock in without location tracking?')) {
            performClockIn(null); // Use performClockIn, not async
          }
        }
      );
    } else {
      // Already have location
      await performClockIn(location);
    }
  };

  const handleClockOut = async () => {
    if (isProcessing) return;
    
    if (!activeShift) {
      alert('No active shift to clock out from');
      return;
    }

    if (!canClockOut) {
      alert('You can only clock out during or after your shift');
      return;
    }

    if (!confirm('Are you sure you want to clock out?')) {
      return;
    }

    // Get location if not already captured
    if (!location) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            name: 'Current Location',
          };
          setLocation(loc); // Update state for UI
          setGettingLocation(false);
          
          // Now clock out with location
          await performClockOut(loc);
        },
        (error) => {
          console.error('Error getting location:', error);
          setGettingLocation(false);
          
          // Clock out without location
          if (confirm('Unable to get location. Clock out without location tracking?')) {
            performClockOut(null); // Use performClockOut, not async
          }
        }
      );
    } else {
      // Already have location
      await performClockOut(location);
    }
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check clock in/out window
  useEffect(() => {
    if (!currentShift) {
      setCanClockIn(false);
      setCanClockOut(false);
      return;
    }

    const now = new Date();
    const shiftDate = parseISO(currentShift.shift_date);
    const [startHour, startMin] = currentShift.start_time.split(':').map(Number);
    const [endHour, endMin] = currentShift.end_time.split(':').map(Number);
    
    const scheduledStart = new Date(shiftDate);
    scheduledStart.setHours(startHour, startMin, 0);
    
    const scheduledEnd = new Date(shiftDate);
    scheduledEnd.setHours(endHour, endMin, 0);

    // Can clock in: 15 minutes before to 15 minutes after scheduled start
    const clockInStart = subMinutes(scheduledStart, 15);
    const clockInEnd = addMinutes(scheduledStart, 15);
    
    const isInClockInWindow = now >= clockInStart && now <= clockInEnd;
    const isActiveShift = currentShift.status === 'in_progress';

    setCanClockIn(isInClockInWindow && !isActiveShift);
    setCanClockOut(isActiveShift);

    // Calculate time until shift
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
      (error) => {
        console.error('Error getting location:', error);
        setLocation({ name: 'Location unavailable' });
        setGettingLocation(false);
      }
    );
  };
  
  const getShiftDuration = () => {
    if (!activeShift?.clock_in_time || !attendanceRecord?.actual_clock_in) return null;
    
    const start = parseISO(attendanceRecord.actual_clock_in);
    const now = new Date();
    const hours = differenceInHours(now, start);
    const minutes = differenceInMinutes(now, start) % 60;
    
    return { hours, minutes };
  };

  const duration = getShiftDuration();

  const getStatusBadge = () => {
    if (!attendanceRecord) return null;

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
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("StaffRota")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shift & Rota
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

        {/* Current Time Display */}
        <Card className="bg-white border-none shadow-lg mb-8" style={{borderLeft: '4px solid #014D40'}}>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-gray-600 mb-2">Current Time</p>
            <motion.h2 
              className="text-6xl font-bold mb-4"
              style={{color: '#014D40'}}
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

        {/* Time Until Shift Alert */}
        {timeUntilShift !== null && timeUntilShift <= 15 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-2 mb-6" style={{borderColor: '#E0B037', backgroundColor: '#fffbeb'}}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5" style={{color: '#E0B037'}} />
                  <div>
                    <p className="font-semibold" style={{color: '#014D40'}}>
                      ⏰ Your shift starts in {timeUntilShift} minute{timeUntilShift !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-gray-700">You can now clock in!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Active Shift Info */}
        {activeShift && (
          <Card className="bg-gradient-to-r border-none shadow-lg mb-8" style={{background: 'linear-gradient(135deg, #014D40 0%, #10b981 100%)'}}>
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
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                  <Badge className="bg-white" style={{color: '#014D40'}}>
                    Shift Active
                  </Badge>
                </div>
              </div>

              {duration && (
                <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
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

        {/* Next Shift Info */}
        {!activeShift && nextShift && (
          <Card className="bg-white border-none shadow-lg mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">📋 Your Next Shift</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{nextShift.role}</p>
                  <p className="text-gray-600">{nextShift.start_time} - {nextShift.end_time}</p>
                  {nextShift.location && (
                    <p className="text-sm text-gray-500 mt-1">📍 {nextShift.location}</p>
                  )}
                </div>
                <Badge className="bg-gray-100 text-gray-800">Scheduled</Badge>
              </div>
              
              {!canClockIn && timeUntilShift > 15 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⏰ Clock-in opens 15 minutes before your shift ({timeUntilShift} minutes to go)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Location Info */}
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
                  {gettingLocation ? 'Getting Location...' : 'Capture Location'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clock In/Out Button */}
        <div className="flex justify-center">
          {activeShift ? (
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="w-full max-w-md"
            >
              <Button
                onClick={handleClockOut}
                disabled={!canClockOut || isProcessing}
                className="w-full h-32 text-2xl font-bold shadow-2xl disabled:opacity-50 relative overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, #E0B037 0%, #f59e0b 100%)',
                  border: canClockOut ? '3px solid #dc2626' : 'none'
                }}
              >
                {canClockOut && (
                  <div className="absolute inset-0 animate-pulse bg-white opacity-20" />
                )}
                <div className="flex items-center justify-center gap-4">
                  <LogOut className="w-8 h-8" />
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {isProcessing ? 'Clocking Out...' : 'Clock Out'}
                    </p>
                    {duration && (
                      <p className="text-sm opacity-90 mt-1">
                        Total: {duration.hours}h {duration.minutes}m
                      </p>
                    )}
                  </div>
                </div>
                {canClockOut && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
                )}
              </Button>
              
              {/* Quick Clock Out Info */}
              <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700">Started at</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {attendanceRecord?.actual_clock_in 
                      ? format(parseISO(attendanceRecord.actual_clock_in), 'h:mm a')
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700">Location</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {location ? '✓ Captured' : '⚠️ Required'}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : nextShift ? (
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="w-full max-w-md"
            >
              <Button
                onClick={handleClockIn}
                disabled={!canClockIn || isProcessing || (!location && gettingLocation)}
                className="w-full h-32 text-2xl font-bold shadow-2xl disabled:opacity-50 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #014D40 0%, #10b981 100%)',
                  border: canClockIn ? '3px solid #E0B037' : 'none',
                  animation: canClockIn ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                }}
              >
                {canClockIn && (
                  <div className="absolute inset-0 animate-ping bg-white opacity-20" />
                )}
                <LogIn className="w-8 h-8 mr-3" />
                {isProcessing ? 'Clocking In...' : 'Clock In'}
              </Button>
              {!canClockIn && (
                <p className="text-center text-sm text-gray-600 mt-4">
                  {timeUntilShift !== null && timeUntilShift > 15 
                    ? `Clock-in opens in ${timeUntilShift - 15} minutes`
                    : 'Clock-in window closed or not yet active'}
                </p>
              )}
            </motion.div>
          ) : (
            <Card className="bg-amber-50 border-amber-200 w-full max-w-md">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                <p className="text-gray-900 font-medium">No Scheduled Shift Today</p>
                <p className="text-sm text-gray-600 mt-2">
                  You don't have any shifts scheduled for today
                </p>
                <Link to={createPageUrl("MyShifts")}>
                  <Button variant="outline" className="mt-4">
                    <Calendar className="w-4 h-4 mr-2" />
                    View My Schedule
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Attendance Stats (if available) */}
        {attendanceRecord && (
          <Card className="mt-8 bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{color: '#014D40'}} />
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
                {attendanceRecord.overtime_hours > 0 && (
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Overtime</p>
                    <p className="text-xl font-bold text-gray-900">
                      {attendanceRecord.overtime_hours.toFixed(1)}h
                    </p>
                  </div>
                )}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-sm font-bold text-gray-900 capitalize">
                    {attendanceRecord.status.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Important Notes */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{color: '#014D40'}} />
              Important Notes
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span style={{color: '#014D40'}}>•</span>
                <span>Clock in within 15 minutes of your shift start time</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{color: '#014D40'}}>•</span>
                <span>Location tracking helps verify your attendance</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{color: '#014D40'}}>•</span>
                <span>Always clock out at the end of your shift</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{color: '#014D40'}}>•</span>
                <span>Tasks are automatically assigned when you clock in</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{color: '#014D40'}}>•</span>
                <span>Late clock-ins are flagged for manager review</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
