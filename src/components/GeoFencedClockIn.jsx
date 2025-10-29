import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Geo-Fenced Clock In Component
 * Validates location before allowing clock in/out
 */

// Restaurant location (configure this)
const RESTAURANT_LOCATION = {
  latitude: 51.5074, // London coordinates as example
  longitude: -0.1278,
  radius: 100 // meters
};

export default function GeoFencedClockIn({ shift, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isWithinRange, setIsWithinRange] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      onError?.('Geolocation is not supported by your device');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        setLocation(userLocation);

        // Calculate distance
        const dist = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          RESTAURANT_LOCATION.latitude,
          RESTAURANT_LOCATION.longitude
        );

        setDistance(Math.round(dist));
        setIsWithinRange(dist <= RESTAURANT_LOCATION.radius);
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLoading(false);
        onError?.('Unable to get your location. Please enable location services.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleClockIn = async () => {
    if (!isWithinRange) {
      onError?.('You must be within 100m of the restaurant to clock in');
      return;
    }

    setLoading(true);

    try {
      // Update shift
      await base44.entities.Shift.update(shift.id, {
        status: 'in_progress',
        clock_in_time: new Date().toISOString()
      });

      // Create clock event
      await base44.entities.ClockEvent.create({
        user_email: shift.staff_email,
        user_name: shift.staff_name,
        shift_id: shift.id,
        event_type: 'clock_in',
        timestamp: new Date().toISOString(),
        location_lat: location.latitude,
        location_lng: location.longitude,
        location_name: 'Restaurant Premises'
      });

      // Create/update attendance record
      const existingAttendance = await base44.entities.AttendanceRecord.filter({
        shift_id: shift.id
      });

      if (existingAttendance.length > 0) {
        await base44.entities.AttendanceRecord.update(existingAttendance[0].id, {
          actual_clock_in: new Date().toISOString(),
          clock_in_location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            distance_from_venue: distance
          },
          status: 'on_time'
        });
      } else {
        await base44.entities.AttendanceRecord.create({
          staff_email: shift.staff_email,
          staff_name: shift.staff_name,
          shift_id: shift.id,
          shift_date: shift.shift_date,
          scheduled_start: shift.start_time,
          scheduled_end: shift.end_time,
          actual_clock_in: new Date().toISOString(),
          clock_in_location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            distance_from_venue: distance
          },
          status: 'on_time'
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error('Clock in error:', error);
      onError?.('Failed to clock in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !location) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Getting your location...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Location Status */}
          <div className="flex items-start gap-3">
            <MapPin className={`w-6 h-6 ${isWithinRange ? 'text-green-600' : 'text-red-600'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-gray-900">Location Verification</p>
                {isWithinRange ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Within Range
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Out of Range
                  </Badge>
                )}
              </div>
              
              {distance !== null && (
                <p className="text-sm text-gray-600">
                  You are <strong>{distance}m</strong> from the restaurant
                  {!isWithinRange && ` (must be within ${RESTAURANT_LOCATION.radius}m)`}
                </p>
              )}

              {location && (
                <p className="text-xs text-gray-500 mt-1">
                  Accuracy: ±{Math.round(location.accuracy)}m
                </p>
              )}
            </div>
          </div>

          {/* Clock In Button */}
          <Button
            onClick={handleClockIn}
            disabled={!isWithinRange || loading}
            className={`w-full ${
              isWithinRange
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Clocking In...' : 'Clock In'}
          </Button>

          {!isWithinRange && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Please move closer to the restaurant to clock in
              </p>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={loading}
            className="w-full"
          >
            Refresh Location
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}