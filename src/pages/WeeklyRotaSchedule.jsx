
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Copy, Printer, ArrowLeft, Home } from "lucide-react";
import { format, startOfWeek, addDays, getWeek, isSameDay, parseISO, addWeeks, subWeeks } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const POSITIONS = [
  { name: "Manager", color: "bg-pink-100", textColor: "text-pink-900" },
  { name: "Chef", color: "bg-amber-100", textColor: "text-amber-900" },
  { name: "Barista", color: "bg-green-100", textColor: "text-green-900" },
  { name: "Front of House", color: "bg-blue-100", textColor: "text-blue-900" },
  { name: "Server", color: "bg-purple-100", textColor: "text-purple-900" },
  { name: "Line Cook", color: "bg-orange-100", textColor: "text-orange-900" },
  { name: "Bartender", color: "bg-indigo-100", textColor: "text-indigo-900" },
  { name: "Cleaner", color: "bg-gray-100", textColor: "text-gray-900" },
];

export default function WeeklyRotaSchedule() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const weekNumber = getWeek(currentWeekStart);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['weeklyShifts', format(currentWeekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekEnd = addDays(currentWeekStart, 6);
      const allShifts = await base44.entities.Shift.list();
      
      return allShifts.filter(shift => {
        const shiftDate = parseISO(shift.shift_date);
        return shiftDate >= currentWeekStart && shiftDate <= weekEnd;
      });
    },
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  // Combine users and team members for complete staff list
  const allStaff = React.useMemo(() => {
    const staffMap = new Map();
    
    allUsers.forEach(user => {
      staffMap.set(user.email, {
        email: user.email,
        full_name: user.full_name,
        position: user.position,
      });
    });
    
    teamMembers.forEach(member => {
      if (staffMap.has(member.staff_email)) {
        staffMap.set(member.staff_email, {
          ...staffMap.get(member.staff_email),
          position: member.position || staffMap.get(member.staff_email).position,
        });
      }
    });
    
    return Array.from(staffMap.values());
  }, [allUsers, teamMembers]);

  const getShiftsByPositionAndDate = (position, date) => {
    return shifts.filter(shift => {
      // The 'user' variable was previously defined here but not used in the filter logic.
      // const user = users.find(u => u.email === shift.staff_email);
      return (
        shift.role === position &&
        isSameDay(parseISO(shift.shift_date), date)
      );
    });
  };

  const calculateDailyHours = (date) => {
    const dayShifts = shifts.filter(shift => isSameDay(parseISO(shift.shift_date), date));
    let totalMinutes = 0;

    dayShifts.forEach(shift => {
      const [startHour, startMin] = shift.start_time.split(':').map(Number);
      const [endHour, endMin] = shift.end_time.split(':').map(Number);
      const minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      totalMinutes += minutes;
    });

    return (totalMinutes / 60).toFixed(1);
  };

  const calculatePositionHours = (position) => {
    const positionShifts = shifts.filter(shift => shift.role === position);
    let totalMinutes = 0;

    positionShifts.forEach(shift => {
      const [startHour, startMin] = shift.start_time.split(':').map(Number);
      const [endHour, endMin] = shift.end_time.split(':').map(Number);
      const minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      totalMinutes += minutes;
    });

    return (totalMinutes / 60).toFixed(1);
  };

  const getTotalWeeklyHours = () => {
    let totalMinutes = 0;
    shifts.forEach(shift => {
      const [startHour, startMin] = shift.start_time.split(':').map(Number);
      const [endHour, endMin] = shift.end_time.split(':').map(Number);
      const minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      totalMinutes += minutes;
    });
    return (totalMinutes / 60).toFixed(1);
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handlePrint = () => {
    window.print();
  };

  const positionsWithShifts = POSITIONS.filter(pos => 
    shifts.some(shift => shift.role === pos.name)
  );

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        {/* Navigation Buttons */}
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

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Week {weekNumber}</h1>
              <p className="text-sm text-gray-600">
                {format(currentWeekStart, 'dd MMM')} - {format(addDays(currentWeekStart, 6), 'dd MMM yyyy')}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" size="sm">
              + Position
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Draft
          </Badge>
        </div>

        {/* Gantt Chart */}
        <Card className="bg-white border-none shadow-lg overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-8 border-b border-gray-200">
              <div className="p-4 font-semibold text-gray-700 bg-gray-50 border-r border-gray-200">
                Position
              </div>
              {weekDates.map((date, index) => (
                <div 
                  key={index}
                  className="p-4 text-center border-r border-gray-200 bg-gray-50"
                >
                  <div className="font-semibold text-gray-900">
                    {format(date, 'dd EEE')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {format(date, 'MMM')}
                  </div>
                </div>
              ))}
            </div>

            {/* Position Rows */}
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-pulse">Loading schedule...</div>
              </div>
            ) : positionsWithShifts.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No shifts scheduled for this week
              </div>
            ) : (
              positionsWithShifts.map((position, posIndex) => (
                <div 
                  key={posIndex}
                  className={`grid grid-cols-8 border-b border-gray-200 ${position.color}`}
                >
                  {/* Position Label */}
                  <div className={`p-4 font-medium ${position.textColor} border-r border-gray-200 flex items-center`}>
                    <input type="checkbox" className="mr-3" />
                    {position.name}
                  </div>

                  {/* Days */}
                  {weekDates.map((date, dayIndex) => {
                    const dayShifts = getShiftsByPositionAndDate(position.name, date);
                    
                    return (
                      <div 
                        key={dayIndex}
                        className="p-2 border-r border-gray-200 min-h-[80px] relative"
                      >
                        {dayShifts.map((shift, shiftIndex) => (
                          <div
                            key={shiftIndex}
                            className="bg-white rounded-lg shadow-sm p-2 mb-2 border-l-4 border-blue-500 hover:shadow-md transition-shadow cursor-pointer"
                          >
                            <div className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                                {shift.staff_name?.charAt(0) || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">
                                  {shift.staff_name || shift.staff_email}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {shift.start_time} - {shift.end_time}
                                </p>
                                {shift.status === 'in_progress' && (
                                  <Badge className="bg-green-100 text-green-800 text-[10px] mt-1">
                                    Active
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Weekly Hours Breakdown */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {/* Daily Totals */}
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Daily Totals</h3>
              <div className="space-y-2">
                {weekDates.map((date, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-700">{format(date, 'EEEE')}</span>
                    <span className="font-semibold text-gray-900">{calculateDailyHours(date)} hrs</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Position Totals */}
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Position Totals</h3>
              <div className="space-y-2">
                {positionsWithShifts.map((position, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${position.color.replace('100', '500')}`} />
                      <span className="text-sm text-gray-700">{position.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{calculatePositionHours(position.name)} hrs</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 pt-4 border-t-2 border-gray-300">
                  <span className="text-sm font-semibold text-gray-900">Total Weekly Hours</span>
                  <span className="text-lg font-bold text-green-600">{getTotalWeeklyHours()} hrs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
