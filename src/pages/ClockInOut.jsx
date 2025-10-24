
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, MapPin, AlertCircle, ArrowLeft, Home } from "lucide-react";
import { format, differenceInMinutes, differenceInHours } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom"; // Added Link import

// Assuming createPageUrl is a utility function available in the project.
// In a Base44 application, this might also be handled by base44.pages.PageName.url()
// or a custom utility. We're importing based on the outline's usage.
import { createPageUrl } from "@/lib/utils"; 

export default function ClockInOut() {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['myShifts', user?.email],
    queryFn: () => base44.entities.Shift.filter({
      staff_email: user?.email,
      shift_date: format(new Date(), 'yyyy-MM-dd')
    }),
    enabled: !!user?.email,
  });

  const activeShift = shifts.find(s => s.status === 'in_progress');
  const nextShift = shifts.find(s => s.status === 'scheduled');

  const clockInMutation = useMutation({
    mutationFn: async (shiftId) => {
      const clockInTime = new Date().toISOString();
      
      // Create clock event
      await base44.entities.ClockEvent.create({
        user_email: user.email,
        user_name: user.full_name,
        shift_id: shiftId,
        event_type: 'clock_in',
        timestamp: clockInTime,
        location_lat: location?.latitude,
        location_lng: location?.longitude,
        location_name: location?.name || 'Unknown',
      });

      // Update shift
      return base44.entities.Shift.update(shiftId, {
        status: 'in_progress',
        clock_in_time: clockInTime,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myShifts'] });
      queryClient.invalidateQueries({ queryKey: ['checklistExecutions'] });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (shiftId) => {
      const clockOutTime = new Date().toISOString();
      
      // Create clock event
      await base44.entities.ClockEvent.create({
        user_email: user.email,
        user_name: user.full_name,
        shift_id: shiftId,
        event_type: 'clock_out',
        timestamp: clockOutTime,
        location_lat: location?.latitude,
        location_lng: location?.longitude,
        location_name: location?.name || 'Unknown',
      });

      // Update shift
      return base44.entities.Shift.update(shiftId, {
        status: 'completed',
        clock_out_time: clockOutTime,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myShifts'] });
    },
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const handleClockIn = async () => {
    if (!nextShift) {
      alert('No scheduled shift found for today');
      return;
    }

    if (!location) {
      getLocation();
      return;
    }

    await clockInMutation.mutateAsync(nextShift.id);
  };

  const handleClockOut = async () => {
    if (!activeShift) {
      alert('No active shift to clock out from');
      return;
    }

    if (!location) {
      getLocation();
      return;
    }

    if (confirm('Are you sure you want to clock out?')) {
      await clockOutMutation.mutateAsync(activeShift.id);
    }
  };

  const getShiftDuration = () => {
    if (!activeShift?.clock_in_time) return null;
    
    const start = new Date(activeShift.clock_in_time);
    const now = new Date();
    const hours = differenceInHours(now, start);
    const minutes = differenceInMinutes(now, start) % 60;
    
    return { hours, minutes };
  };

  const duration = getShiftDuration();

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clock In / Out</h1>
          <p className="text-gray-600">Track your shift hours automatically</p>
        </div>

        {/* Current Time Display */}
        <Card className="bg-white border-none shadow-lg mb-8">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-gray-600 mb-2">Current Time</p>
            <motion.h2 
              className="text-6xl font-bold text-gray-900 mb-4"
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

        {/* Active Shift Info */}
        {activeShift && (
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none shadow-lg mb-8">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{activeShift.role}</h3>
                  <p className="text-blue-100">
                    {activeShift.start_time} - {activeShift.end_time}
                  </p>
                </div>
                <Badge className="bg-white text-blue-600">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
                  Active
                </Badge>
              </div>

              {duration && (
                <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm text-blue-100 mb-1">Shift Duration</p>
                  <p className="text-3xl font-bold">
                    {duration.hours}h {duration.minutes}m
                  </p>
                  <p className="text-sm text-blue-100 mt-2">
                    Clocked in at {format(new Date(activeShift.clock_in_time), 'h:mm a')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Next Shift Info */}
        {!activeShift && nextShift && (
          <Card className="bg-white border-none shadow-lg mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Next Shift</h3>
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
                  <p className="font-medium text-gray-900">Location</p>
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
                disabled={clockOutMutation.isPending}
                className="w-full h-32 text-2xl font-bold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-2xl"
              >
                <LogOut className="w-8 h-8 mr-3" />
                {clockOutMutation.isPending ? 'Clocking Out...' : 'Clock Out'}
              </Button>
            </motion.div>
          ) : nextShift ? (
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="w-full max-w-md"
            >
              <Button
                onClick={handleClockIn}
                disabled={clockInMutation.isPending || (!location && !gettingLocation)}
                className="w-full h-32 text-2xl font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-2xl"
              >
                <LogIn className="w-8 h-8 mr-3" />
                {clockInMutation.isPending ? 'Clocking In...' : 'Clock In'}
              </Button>
            </motion.div>
          ) : (
            <Card className="bg-amber-50 border-amber-200 w-full max-w-md">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                <p className="text-gray-900 font-medium">No Scheduled Shift</p>
                <p className="text-sm text-gray-600 mt-2">
                  You don't have any shifts scheduled for today
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Important Notes */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Important Notes:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Clock in within 15 minutes of your shift start time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Location tracking helps verify your attendance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Make sure to clock out at the end of your shift</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Checklists are automatically assigned when you clock in</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
