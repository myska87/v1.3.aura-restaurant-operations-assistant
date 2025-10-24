import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, AlertCircle } from "lucide-react";
import { format, isToday, isFuture, isPast, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MyShifts() {
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['myShifts', user?.email],
    queryFn: () => base44.entities.Shift.filter({ staff_email: user?.email }, '-shift_date'),
    enabled: !!user?.email,
  });

  const getShiftStatus = (shift) => {
    const shiftDate = parseISO(shift.shift_date);
    const now = new Date();

    if (shift.status === 'completed') return 'completed';
    if (shift.status === 'missed') return 'missed';
    if (shift.status === 'in_progress') return 'in_progress';
    
    if (isToday(shiftDate)) {
      const [hours, minutes] = shift.start_time.split(':');
      const shiftStart = new Date(shiftDate);
      shiftStart.setHours(parseInt(hours), parseInt(minutes));
      
      if (now >= shiftStart) return 'active';
      return 'upcoming';
    }
    
    if (isFuture(shiftDate)) return 'upcoming';
    if (isPast(shiftDate)) return 'missed';
    
    return 'scheduled';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'upcoming':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'missed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getShiftTypeColor = (shiftType) => {
    switch (shiftType) {
      case 'opening':
        return 'bg-amber-100 text-amber-800';
      case 'mid_shift':
        return 'bg-blue-100 text-blue-800';
      case 'closing':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredShifts = filterStatus === 'all' 
    ? shifts 
    : shifts.filter(shift => getShiftStatus(shift) === filterStatus);

  const upcomingShifts = shifts.filter(s => getShiftStatus(s) === 'upcoming' || getShiftStatus(s) === 'active');
  const activeShift = shifts.find(s => s.status === 'in_progress');

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Shifts</h1>
          <p className="text-gray-600">View and manage your work schedule</p>
        </div>

        {/* Active Shift Alert */}
        {activeShift && (
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none shadow-lg mb-6">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold mb-2">You're Currently Clocked In</h3>
                  <p className="text-blue-100">
                    {activeShift.role} • {activeShift.start_time} - {activeShift.end_time}
                  </p>
                  {activeShift.clock_in_time && (
                    <p className="text-sm text-blue-100 mt-1">
                      Clocked in at {format(new Date(activeShift.clock_in_time), 'h:mm a')}
                    </p>
                  )}
                </div>
                <Link to={createPageUrl('ClockInOut')}>
                  <Button className="bg-white text-blue-600 hover:bg-blue-50">
                    <Clock className="w-4 h-4 mr-2" />
                    Clock Out
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Shifts</p>
              <p className="text-2xl font-bold text-gray-900">{shifts.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Upcoming</p>
              <p className="text-2xl font-bold text-blue-600">{upcomingShifts.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {shifts.filter(s => s.status === 'completed').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Missed</p>
              <p className="text-2xl font-bold text-red-600">
                {shifts.filter(s => getShiftStatus(s) === 'missed').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'upcoming', 'active', 'in_progress', 'completed', 'missed'].map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className={filterStatus === status ? 'bg-blue-600' : ''}
            >
              {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </Button>
          ))}
        </div>

        {/* Shifts List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-200 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredShifts.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No shifts found</p>
              </CardContent>
            </Card>
          ) : (
            filteredShifts.map((shift) => {
              const status = getShiftStatus(shift);
              const isActiveNow = status === 'active' && !shift.clock_in_time;
              
              return (
                <Card key={shift.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-gray-900">{shift.role}</h3>
                          <Badge className={getStatusColor(status)}>
                            {status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getShiftTypeColor(shift.shift_type)}>
                            {shift.shift_type.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{format(parseISO(shift.shift_date), 'EEEE, MMMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{shift.start_time} - {shift.end_time}</span>
                          </div>
                          {shift.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{shift.location}</span>
                            </div>
                          )}
                          {shift.clock_in_time && (
                            <p className="text-green-600">
                              ✓ Clocked in: {format(new Date(shift.clock_in_time), 'h:mm a')}
                            </p>
                          )}
                          {shift.clock_out_time && (
                            <p className="text-blue-600">
                              ✓ Clocked out: {format(new Date(shift.clock_out_time), 'h:mm a')}
                            </p>
                          )}
                        </div>

                        {shift.notes && (
                          <p className="text-sm text-gray-600 mt-3 p-2 bg-gray-50 rounded">
                            {shift.notes}
                          </p>
                        )}
                      </div>

                      {isActiveNow && (
                        <Link to={createPageUrl('ClockInOut')}>
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Clock In Now
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}