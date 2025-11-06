import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Briefcase,
  CheckCircle,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, isPast, isToday, isFuture, startOfDay } from 'date-fns';

export default function MyShifts() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['myShifts', user?.email],
    queryFn: () => base44.entities.Shift.filter({
      staff_email: user?.email,
    }, 'shift_date'),
    enabled: !!user?.email,
  });

  const today = startOfDay(new Date());
  
  const upcomingShifts = shifts.filter(s => 
    isFuture(new Date(s.shift_date)) || isToday(new Date(s.shift_date))
  );
  
  const pastShifts = shifts.filter(s => 
    isPast(new Date(s.shift_date)) && !isToday(new Date(s.shift_date))
  );

  const activeShift = shifts.find(s => s.status === 'in_progress');
  const todayShift = shifts.find(s => isToday(new Date(s.shift_date)));

  const getStatusBadge = (shift) => {
    if (shift.status === 'completed') {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (shift.status === 'in_progress') {
      return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
    }
    if (shift.status === 'missed') {
      return <Badge className="bg-red-100 text-red-800">Missed</Badge>;
    }
    if (isToday(new Date(shift.shift_date))) {
      return <Badge className="bg-amber-100 text-amber-800">Today</Badge>;
    }
    return <Badge variant="outline">Scheduled</Badge>;
  };

  const ShiftCard = ({ shift }) => (
    <Card className="bg-white hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              shift.status === 'completed' ? 'bg-green-100' :
              shift.status === 'in_progress' ? 'bg-blue-100' :
              isToday(new Date(shift.shift_date)) ? 'bg-amber-100' :
              'bg-gray-100'
            }`}>
              <Calendar className={`w-6 h-6 ${
                shift.status === 'completed' ? 'text-green-600' :
                shift.status === 'in_progress' ? 'text-blue-600' :
                isToday(new Date(shift.shift_date)) ? 'text-amber-600' :
                'text-gray-600'
              }`} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{format(new Date(shift.shift_date), 'EEEE, MMMM d')}</h3>
              <p className="text-sm text-gray-600">{shift.start_time} - {shift.end_time}</p>
            </div>
          </div>
          {getStatusBadge(shift)}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Briefcase className="w-4 h-4 text-gray-500" />
            <span className="capitalize">{shift.role?.replace('_', ' ')}</span>
          </div>
          {shift.department && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="capitalize">{shift.department?.replace('_', ' ')}</span>
            </div>
          )}
          {shift.location && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{shift.location}</span>
            </div>
          )}
        </div>

        {shift.clock_in_time && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 mb-2">Clock Times:</p>
            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-gray-600">In: {format(new Date(shift.clock_in_time), 'h:mm a')}</p>
              </div>
              {shift.clock_out_time && (
                <div>
                  <p className="text-gray-600">Out: {format(new Date(shift.clock_out_time), 'h:mm a')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {shift.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 mb-1">Notes:</p>
            <p className="text-sm text-gray-700">{shift.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Shifts</h1>
          <p className="text-gray-600">View your shift schedule and attendance</p>
        </div>

        {/* Active Shift Banner */}
        {activeShift && (
          <Card className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold text-lg">Currently Clocked In</span>
                  </div>
                  <p className="text-emerald-50">
                    {activeShift.role} • {activeShift.start_time} - {activeShift.end_time}
                  </p>
                </div>
                <Link to={createPageUrl('ClockInOut')}>
                  <Button variant="secondary" size="lg">
                    Clock Out
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Shift (if not clocked in) */}
        {!activeShift && todayShift && todayShift.status !== 'completed' && (
          <Card className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold text-lg">Your Shift Today</span>
                  </div>
                  <p className="text-blue-50">
                    {todayShift.role} • {todayShift.start_time} - {todayShift.end_time}
                  </p>
                </div>
                <Link to={createPageUrl('ClockInOut')}>
                  <Button variant="secondary" size="lg">
                    Clock In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No shifts scheduled</h3>
              <p className="text-gray-600">Check back later or contact your manager</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Shifts */}
            {upcomingShifts.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Upcoming Shifts ({upcomingShifts.length})
                </h2>
                <div className="space-y-4">
                  {upcomingShifts.map(shift => <ShiftCard key={shift.id} shift={shift} />)}
                </div>
              </div>
            )}

            {/* Past Shifts */}
            {pastShifts.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Past Shifts ({pastShifts.length})
                </h2>
                <div className="space-y-4">
                  {pastShifts.slice(0, 10).map(shift => <ShiftCard key={shift.id} shift={shift} />)}
                </div>
                {pastShifts.length > 10 && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    + {pastShifts.length - 10} more past shifts
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}