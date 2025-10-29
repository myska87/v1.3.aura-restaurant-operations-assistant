
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Clock, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";

export default function QuickClockOut({ shift, attendanceRecord, onSuccess }) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [location, setLocation] = useState(null);

  const getLocation = () => {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          name: 'Current Location',
        });
      },
      (error) => {
        console.error('Location error:', error);
        setLocation({ name: 'Location unavailable' });
      }
    );
  };

  // Simple celebration (no external library)
  const celebrateShiftComplete = () => {
    console.log('🎉 Shift completed successfully!');
  };

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const clockOutTime = new Date().toISOString();
      
      if (!attendanceRecord) throw new Error('No attendance record found');

      const clockInTime = parseISO(attendanceRecord.actual_clock_in);
      const totalHours = differenceInMinutes(new Date(), clockInTime) / 60;
      const overtimeHours = Math.max(0, totalHours - attendanceRecord.scheduled_hours);
      
      const scheduledEnd = parseISO(`${shift.shift_date}T${shift.end_time}:00`);
      const earlyDepartureMinutes = Math.max(0, differenceInMinutes(scheduledEnd, new Date()));

      const isOnTime = attendanceRecord.lateness_minutes <= 5 && earlyDepartureMinutes === 0;

      await base44.entities.AttendanceRecord.update(attendanceRecord.id, {
        actual_clock_out: clockOutTime,
        clock_out_location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name
        } : null,
        total_hours: parseFloat(totalHours.toFixed(2)),
        overtime_hours: parseFloat(overtimeHours.toFixed(2)),
        early_departure_minutes: earlyDepartureMinutes,
        status: 'pending'
      });

      await base44.entities.Shift.update(shift.id, {
        status: 'completed',
        clock_out_time: clockOutTime,
      });

      await base44.entities.ClockEvent.create({
        user_email: shift.staff_email,
        user_name: shift.staff_name,
        shift_id: shift.id,
        event_type: 'clock_out',
        timestamp: clockOutTime,
        location_lat: location?.latitude,
        location_lng: location?.longitude,
        location_name: location?.name || 'Unknown',
      });

      if (isOnTime) celebrateShiftComplete();
      setIsProcessing(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myShifts'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceRecord'] });
      if (onSuccess) onSuccess();
    },
    onError: () => {
      setIsProcessing(false);
    }
  });

  const handleClockOut = async () => {
    if (!location) {
      getLocation();
      setTimeout(() => {
        if (confirm('Ready to clock out?')) {
          clockOutMutation.mutate();
        }
      }, 1000);
    } else {
      if (confirm('Are you sure you want to clock out?')) {
        await clockOutMutation.mutateAsync();
      }
    }
  };

  const workingHours = attendanceRecord?.actual_clock_in 
    ? Math.floor(differenceInMinutes(new Date(), parseISO(attendanceRecord.actual_clock_in)) / 60)
    : 0;
  const workingMinutes = attendanceRecord?.actual_clock_in 
    ? differenceInMinutes(new Date(), parseISO(attendanceRecord.actual_clock_in)) % 60
    : 0;

  return (
    <Card className="border-none shadow-xl">
      <CardContent className="p-6">
        {/* Shift Info Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-gray-900">{shift.role}</h3>
            <Badge className="bg-green-100 text-green-800">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              Active Shift
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            {shift.start_time} - {shift.end_time}
          </p>
        </div>

        {/* Working Time Display */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-1">Working Time</p>
          <p className="text-4xl font-bold text-gray-900">
            {workingHours}h {workingMinutes}m
          </p>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">
                Started: {attendanceRecord?.actual_clock_in 
                  ? format(parseISO(attendanceRecord.actual_clock_in), 'h:mm a')
                  : 'N/A'}
              </span>
            </div>
            {attendanceRecord?.scheduled_hours && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-gray-700">
                  Target: {attendanceRecord.scheduled_hours.toFixed(1)}h
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Location Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-6">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">Location</span>
          </div>
          {location ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Captured
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={getLocation}
              className="text-xs"
            >
              Capture Location
            </Button>
          )}
        </div>

        {/* Clock Out Button */}
        <motion.div
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleClockOut}
            disabled={isProcessing}
            className="w-full h-20 text-xl font-bold shadow-lg relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #E0B037 0%, #f59e0b 100%)',
            }}
          >
            <div className="absolute inset-0 animate-pulse bg-white opacity-20" />
            <LogOut className="w-6 h-6 mr-3" />
            {isProcessing ? 'Clocking Out...' : 'Clock Out Now'}
          </Button>
        </motion.div>

        {/* Warning if no location */}
        {!location && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800">
              Location tracking helps verify your attendance. Please enable location before clocking out.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
