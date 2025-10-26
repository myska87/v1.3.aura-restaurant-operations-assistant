import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  Edit,
  ArrowLeft,
  Home,
  AlertTriangle,
  Save,
  X,
  Clock,
  CheckCircle,
  Wand2,
  Users,
  TrendingUp,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, parse, isSameDay } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Textarea } from "@/components/ui/textarea";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import { useUnifiedStaff } from "@/components/UnifiedStaffData";

// Helper function to get default department based on position
const getDefaultDepartment = (position) => {
  const departmentMap = {
    'chef': 'kitchen',
    'line_cook': 'kitchen',
    'sous_chef': 'kitchen',
    'dishwasher': 'kitchen',
    'server': 'front_of_house',
    'waiter': 'front_of_house',
    'host': 'front_of_house',
    'bartender': 'bar',
    'cleaner': 'cleaning',
    'maintenance': 'maintenance',
    'maintenance_worker': 'maintenance',
    'manager': 'management',
    'assistant_manager': 'management',
    'owner': 'management',
  };
  return departmentMap[position?.toLowerCase()] || 'front_of_house';
};

export default function SmartScheduler() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [generatingAI, setGeneratingAI] = useState(false);

  const [shiftForm, setShiftForm] = useState({
    staff_email: "",
    staff_name: "",
    role: "",
    department: "",
    shift_date: "",
    shift_type: "mid_shift",
    start_time: "09:00",
    end_time: "17:00",
    location: "",
    notes: "",
    status: "scheduled",
  });

  // Calculate the start of the current week (Monday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Use unified staff data
  const { staff: allStaff, isLoading: staffLoading } = useUnifiedStaff();

  // Fetch shifts for the current week
  const { data: shifts = [], refetch: refetchShifts } = useQuery({
    queryKey: ['weekShifts', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekEnd = addDays(weekStart, 6);
      const allShifts = await base44.entities.Shift.list();
      return allShifts.filter(shift => {
        const shiftDate = parseISO(shift.shift_date);
        return shiftDate >= weekStart && shiftDate <= weekEnd;
      });
    },
  });

  // Fetch availability data
  const { data: availabilities = [] } = useQuery({
    queryKey: ['availabilities', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekEnd = addDays(weekStart, 6);
      const allAvail = await base44.entities.Availability.list();
      return allAvail.filter(avail => {
        const availDate = parseISO(avail.date);
        return availDate >= weekStart && availDate <= weekEnd;
      });
    },
  });

  // Check for overlapping shifts
  const checkForOverlaps = (formData, editingShiftId = null) => {
    const newShiftDate = formData.shift_date;
    const newStartTime = formData.start_time;
    const newEndTime = formData.end_time;

    const newStart = parse(newStartTime, 'HH:mm', new Date());
    const newEnd = parse(newEndTime, 'HH:mm', new Date());

    const overlappingShifts = shifts.filter(shift => {
      if (editingShiftId && shift.id === editingShiftId) {
        return false;
      }

      if (shift.staff_email !== formData.staff_email || shift.shift_date !== newShiftDate) {
        return false;
      }

      const existingStart = parse(shift.start_time, 'HH:mm', new Date());
      const existingEnd = parse(shift.end_time, 'HH:mm', new Date());

      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });

    return overlappingShifts;
  };

  // Mutation for creating a new shift
  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekShifts'] });
      refetchShifts();
      resetForm();
      alert('✅ Shift created successfully!');
    },
    onError: (error) => {
      console.error('Error creating shift:', error);
      alert('❌ Failed to create shift. Please try again.');
    }
  });

  // Mutation for updating an existing shift
  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekShifts'] });
      refetchShifts();
      resetForm();
      alert('✅ Shift updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating shift:', error);
      alert('❌ Failed to update shift. Please try again.');
    }
  });

  // Mutation for deleting a shift
  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekShifts'] });
      refetchShifts();
      alert('✅ Shift deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting shift:', error);
      alert('❌ Failed to delete shift.');
    }
  });

  // Resets the shift form and closes dialog
  const resetForm = () => {
    setShowAddShiftDialog(false);
    setSelectedShift(null);
    setValidationError(null);
    setShiftForm({
      staff_email: "",
      staff_name: "",
      role: "",
      department: "",
      shift_date: "",
      shift_type: "mid_shift",
      start_time: "09:00",
      end_time: "17:00",
      location: "",
      notes: "",
      status: "scheduled",
    });
  };

  // Handles form submission with validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);
    
    // Validation 1: Required fields
    if (!shiftForm.staff_email || !shiftForm.role || !shiftForm.shift_date || !shiftForm.start_time || !shiftForm.end_time) {
      setValidationError("Please fill in all required fields (Staff, Role, Date, Start Time, End Time)");
      return;
    }

    // Validation 2: Time logic
    const startTime = parse(shiftForm.start_time, 'HH:mm', new Date());
    const endTime = parse(shiftForm.end_time, 'HH:mm', new Date());
    if (endTime <= startTime) {
      setValidationError("End time must be after start time");
      return;
    }

    // Validation 3: Check for overlapping shifts
    const overlaps = checkForOverlaps(shiftForm, selectedShift?.id);
    if (overlaps.length > 0) {
      const overlapDetails = overlaps.map(s => 
        `${s.start_time}-${s.end_time} (${s.role})`
      ).join(', ');
      setValidationError(`This staff member already has a shift on this date: ${overlapDetails}`);
      return;
    }

    // Get staff details
    const staffMember = allStaff.find(s => s.email === shiftForm.staff_email);
    const dataToSave = {
      ...shiftForm,
      staff_name: staffMember?.full_name || shiftForm.staff_name,
      department: shiftForm.department || getDefaultDepartment(shiftForm.role),
    };

    try {
      if (selectedShift) {
        await updateShiftMutation.mutateAsync({
          id: selectedShift.id,
          data: dataToSave
        });
      } else {
        await createShiftMutation.mutateAsync(dataToSave);
      }
    } catch (error) {
      setValidationError("Failed to save shift. Please try again.");
    }
  };

  // Pre-fills the form for editing
  const handleEditShift = (shift) => {
    setSelectedShift(shift);
    setValidationError(null);
    setShiftForm({
      staff_email: shift.staff_email,
      staff_name: shift.staff_name,
      role: shift.role,
      department: shift.department || getDefaultDepartment(shift.role),
      shift_date: shift.shift_date,
      shift_type: shift.shift_type,
      start_time: shift.start_time,
      end_time: shift.end_time,
      location: shift.location || "",
      notes: shift.notes || "",
      status: shift.status,
    });
    setShowAddShiftDialog(true);
  };

  // Handle staff selection with auto-fill
  const handleStaffChange = (email) => {
    const staff = allStaff.find(s => s.email === email);
    if (staff) {
      setShiftForm({
        ...shiftForm,
        staff_email: email,
        staff_name: staff.full_name,
        role: staff.position || '',
        department: staff.department || getDefaultDepartment(staff.position),
        start_time: staff.shift_start || shiftForm.start_time,
        end_time: staff.shift_end || shiftForm.end_time,
      });
    }
  };

  // Filters shifts for a specific day
  const getShiftsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(s => s.shift_date === dateStr);
  };

  // Delete shift with confirmation
  const handleDeleteShift = () => {
    if (!selectedShift) return;
    
    if (window.confirm(`Are you sure you want to delete this shift for ${selectedShift.staff_name}?`)) {
      deleteShiftMutation.mutate(selectedShift.id);
      resetForm();
    }
  };

  // ============ DRAG AND DROP LOGIC ============
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside valid area
    if (!destination) return;

    // Dropped in same place
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Find the shift being dragged
    const shiftId = draggableId;
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    // Extract new date from destination droppableId (format: "day-YYYY-MM-DD")
    const newDate = destination.droppableId.replace('day-', '');

    // Check if staff is available on new date
    const staffAvailability = availabilities.find(
      a => a.staff_email === shift.staff_email && a.date === newDate
    );

    if (staffAvailability && !staffAvailability.is_available) {
      alert(`⚠️ ${shift.staff_name} is not available on ${format(parseISO(newDate), 'MMM d')}`);
      return;
    }

    // Check for conflicts on new date
    const conflictCheck = checkForOverlaps({
      ...shift,
      shift_date: newDate,
    }, shift.id);

    if (conflictCheck.length > 0) {
      alert(`⚠️ ${shift.staff_name} already has a shift on ${format(parseISO(newDate), 'MMM d')}`);
      return;
    }

    // Update shift with new date
    try {
      await updateShiftMutation.mutateAsync({
        id: shift.id,
        data: {
          ...shift,
          shift_date: newDate,
        }
      });
      console.log(`✅ Moved ${shift.staff_name} to ${newDate}`);
    } catch (error) {
      console.error('Drag update failed:', error);
      alert('Failed to move shift');
    }
  };

  // ============ AI SUGGESTIONS ============
  const generateAISuggestions = async () => {
    setGeneratingAI(true);
    setShowAIDialog(true);

    try {
      // Calculate workload distribution
      const staffWorkload = {};
      allStaff.forEach(s => {
        staffWorkload[s.email] = shifts.filter(shift => shift.staff_email === s.email).length;
      });

      // Find understaffed days
      const understaffedDays = weekDays.filter(day => {
        const dayShifts = getShiftsForDay(day);
        return dayShifts.length < 3; // Less than 3 shifts = understaffed
      });

      // Find overworked staff
      const overworkedStaff = allStaff.filter(s => (staffWorkload[s.email] || 0) > 5);

      // Generate suggestions
      const suggestions = [];

      // Suggestion 1: Balance workload
      if (overworkedStaff.length > 0) {
        suggestions.push({
          type: 'warning',
          title: 'Workload Imbalance Detected',
          description: `${overworkedStaff.map(s => s.full_name).join(', ')} working ${overworkedStaff[0] ? staffWorkload[overworkedStaff[0].email] : 0}+ shifts this week`,
          action: 'Redistribute shifts to reduce burnout',
        });
      }

      // Suggestion 2: Understaffed days
      if (understaffedDays.length > 0) {
        suggestions.push({
          type: 'alert',
          title: 'Understaffed Days',
          description: `${understaffedDays.map(d => format(d, 'EEE MMM d')).join(', ')} need more coverage`,
          action: 'Add shifts for these days',
        });
      }

      // Suggestion 3: Skill matching
      const kitchenShifts = shifts.filter(s => s.department === 'kitchen');
      const kitchenStaff = allStaff.filter(s => s.department === 'kitchen');
      if (kitchenShifts.length > kitchenStaff.length * 3) {
        suggestions.push({
          type: 'info',
          title: 'Kitchen Staff Capacity',
          description: 'Kitchen shifts may exceed staff capacity',
          action: 'Consider cross-training or hiring',
        });
      }

      // Suggestion 4: Availability optimization
      const availableButNotScheduled = allStaff.filter(s => {
        const staffShifts = shifts.filter(shift => shift.staff_email === s.email);
        const staffAvails = availabilities.filter(a => a.staff_email === s.email && a.is_available);
        return staffAvails.length > staffShifts.length + 2;
      });

      if (availableButNotScheduled.length > 0) {
        suggestions.push({
          type: 'success',
          title: 'Underutilized Staff',
          description: `${availableButNotScheduled.map(s => s.full_name).join(', ')} available but not fully scheduled`,
          action: 'Add more shifts for these staff members',
        });
      }

      // Suggestion 5: Pattern detection
      const mondayShifts = getShiftsForDay(weekDays[0]);
      const fridayShifts = getShiftsForDay(weekDays[4]);
      if (fridayShifts.length < mondayShifts.length * 0.7) {
        suggestions.push({
          type: 'info',
          title: 'Weekend Staffing Pattern',
          description: 'Friday has significantly fewer shifts than Monday',
          action: 'Ensure adequate weekend coverage',
        });
      }

      setAiSuggestions(suggestions.length > 0 ? suggestions : [{
        type: 'success',
        title: 'Schedule Looks Good!',
        description: 'No major issues detected in current schedule',
        action: 'Keep up the good work',
      }]);

    } catch (error) {
      console.error('AI generation error:', error);
      setAiSuggestions([{
        type: 'warning',
        title: 'Analysis Error',
        description: 'Could not complete analysis',
        action: 'Try again later',
      }]);
    }

    setGeneratingAI(false);
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("StaffRota")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Rota
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600" />
              Smart Drag & Drop Scheduler
            </h1>
            <p className="text-gray-600">Drag shifts between days • AI-powered scheduling assistance</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={generateAISuggestions}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              AI Insights
            </Button>
            <Button 
              onClick={() => {
                setSelectedShift(null);
                setValidationError(null);
                setShowAddShiftDialog(true);
              }} 
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Shift
            </Button>
          </div>
        </div>

        {/* Week Navigation */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <h2 className="text-xl font-bold">
                  {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                </h2>
                <p className="text-sm text-gray-600">Week {format(weekStart, 'w')}</p>
              </div>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{shifts.length}</p>
                  <p className="text-xs text-gray-600">Total Shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{new Set(shifts.map(s => s.staff_email)).size}</p>
                  <p className="text-xs text-gray-600">Staff Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {Math.round(shifts.reduce((total, s) => {
                      const start = parse(s.start_time, 'HH:mm', new Date());
                      const end = parse(s.end_time, 'HH:mm', new Date());
                      return total + (end - start) / (1000 * 60 * 60);
                    }, 0))}h
                  </p>
                  <p className="text-xs text-gray-600">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">{availabilities.filter(a => a.is_available).length}</p>
                  <p className="text-xs text-gray-600">Available Slots</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Drag and Drop Weekly View */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {weekDays.map((day) => {
              const dayShifts = getShiftsForDay(day);
              const isToday = isSameDay(day, new Date());
              const dateStr = format(day, 'yyyy-MM-dd');

              return (
                <Droppable key={dateStr} droppableId={`day-${dateStr}`}>
                  {(provided, snapshot) => (
                    <Card 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`
                        ${isToday ? 'border-2 border-purple-500 shadow-lg' : ''}
                        ${snapshot.isDraggingOver ? 'bg-purple-50 border-purple-300' : ''}
                        transition-all duration-200
                      `}
                    >
                      <CardHeader className="p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-t-lg">
                        <CardTitle className="text-sm font-semibold text-gray-800 text-center">
                          {format(day, 'EEE')}
                          <br />
                          {format(day, 'MMM d')}
                          {isToday && <Badge className="ml-2 bg-purple-600 text-xs">Today</Badge>}
                        </CardTitle>
                        <p className="text-xs text-center text-gray-600 mt-1">
                          {dayShifts.length} {dayShifts.length === 1 ? 'shift' : 'shifts'}
                        </p>
                      </CardHeader>
                      <CardContent className="p-2 space-y-2 min-h-[200px]">
                        {dayShifts.length > 0 ? (
                          dayShifts.map((shift, index) => (
                            <Draggable key={shift.id} draggableId={shift.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`
                                    p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded border border-purple-200 
                                    cursor-move hover:shadow-md transition-all
                                    ${snapshot.isDragging ? 'shadow-lg opacity-80 rotate-2 scale-105' : ''}
                                  `}
                                  onClick={() => handleEditShift(shift)}
                                >
                                  <div className="flex items-start gap-2">
                                    {allStaff.find(s => s.email === shift.staff_email)?.photo_url ? (
                                      <img 
                                        src={allStaff.find(s => s.email === shift.staff_email).photo_url} 
                                        alt="" 
                                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {shift.staff_name?.charAt(0)?.toUpperCase() || '?'}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold truncate text-gray-900">{shift.staff_name}</p>
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0.5 mt-1">
                                        {shift.role}
                                      </Badge>
                                      <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {shift.start_time} - {shift.end_time}
                                      </p>
                                      {shift.status === 'completed' && (
                                        <Badge className="text-[10px] bg-green-100 text-green-800 mt-1">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Done
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 text-center py-8">
                            Drag shifts here
                          </p>
                        )}
                        {provided.placeholder}
                      </CardContent>
                    </Card>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>

        {/* Add/Edit Shift Dialog */}
        <Dialog open={showAddShiftDialog} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                {selectedShift ? (
                  <>
                    <Edit className="w-5 h-5 text-purple-600" />
                    Edit Shift
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-purple-600" />
                    Add New Shift
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {validationError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {validationError}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Staff Member Selection */}
                <div>
                  <Label htmlFor="staff_email">Staff Member *</Label>
                  <Select
                    value={shiftForm.staff_email}
                    onValueChange={handleStaffChange}
                  >
                    <SelectTrigger id="staff_email">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {staffLoading ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Loading staff...
                        </div>
                      ) : allStaff.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No staff members found
                        </div>
                      ) : (
                        allStaff
                          .filter(s => s.status === 'active' || !s.status)
                          .map((staff) => (
                            <SelectItem key={staff.email} value={staff.email}>
                              <div className="flex items-center gap-2">
                                {staff.photo_url ? (
                                  <img 
                                    src={staff.photo_url} 
                                    alt={staff.full_name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white text-xs font-bold">
                                    {staff.full_name?.charAt(0)?.toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-sm">{staff.full_name}</p>
                                  {staff.position && (
                                    <p className="text-xs text-gray-500 capitalize">
                                      {staff.position.replace(/_/g, ' ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Selection */}
                <div>
                  <Label htmlFor="role">Role/Position *</Label>
                  <Select 
                    value={shiftForm.role} 
                    onValueChange={(value) => {
                      setShiftForm({
                        ...shiftForm,
                        role: value,
                        department: getDefaultDepartment(value),
                      });
                    }}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chef">Chef</SelectItem>
                      <SelectItem value="sous_chef">Sous Chef</SelectItem>
                      <SelectItem value="line_cook">Line Cook</SelectItem>
                      <SelectItem value="dishwasher">Dishwasher</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="waiter">Waiter</SelectItem>
                      <SelectItem value="host">Host</SelectItem>
                      <SelectItem value="bartender">Bartender</SelectItem>
                      <SelectItem value="cleaner">Cleaner</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="assistant_manager">Assistant Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Department (Auto-filled) */}
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={shiftForm.department} 
                    onValueChange={(value) => setShiftForm({ ...shiftForm, department: value })}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="front_of_house">Front of House</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Shift Date */}
                <div>
                  <Label htmlFor="shift_date">Shift Date *</Label>
                  <Input
                    id="shift_date"
                    type="date"
                    value={shiftForm.shift_date}
                    onChange={(e) => setShiftForm({ ...shiftForm, shift_date: e.target.value })}
                    required
                  />
                </div>

                {/* Shift Type */}
                <div>
                  <Label htmlFor="shift_type">Shift Type</Label>
                  <Select 
                    value={shiftForm.shift_type} 
                    onValueChange={(value) => setShiftForm({ ...shiftForm, shift_type: value })}
                  >
                    <SelectTrigger id="shift_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening">Opening Shift</SelectItem>
                      <SelectItem value="mid_shift">Mid Shift</SelectItem>
                      <SelectItem value="closing">Closing Shift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Time */}
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={shiftForm.start_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                    required
                  />
                </div>

                {/* End Time */}
                <div>
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={shiftForm.end_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                    required
                  />
                </div>

                {/* Location */}
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={shiftForm.location}
                    onChange={(e) => setShiftForm({ ...shiftForm, location: e.target.value })}
                    placeholder="e.g., Main Restaurant"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={shiftForm.notes}
                  onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  placeholder="Any special instructions..."
                  rows={3}
                />
              </div>

              {/* Form Actions */}
              <DialogFooter className="flex justify-between items-center pt-4 border-t">
                <div>
                  {selectedShift && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDeleteShift}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Shift
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {selectedShift ? 'Update' : 'Create'} Shift
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* AI Insights Dialog */}
        <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-purple-600" />
                AI Schedule Insights
              </DialogTitle>
            </DialogHeader>

            {generatingAI ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Analyzing your schedule...</p>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {aiSuggestions.map((suggestion, index) => (
                  <Card 
                    key={index} 
                    className={`
                      ${suggestion.type === 'warning' ? 'border-yellow-300 bg-yellow-50' : ''}
                      ${suggestion.type === 'alert' ? 'border-red-300 bg-red-50' : ''}
                      ${suggestion.type === 'info' ? 'border-blue-300 bg-blue-50' : ''}
                      ${suggestion.type === 'success' ? 'border-green-300 bg-green-50' : ''}
                    `}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {suggestion.type === 'warning' && <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />}
                        {suggestion.type === 'alert' && <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />}
                        {suggestion.type === 'info' && <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />}
                        {suggestion.type === 'success' && <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />}
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">{suggestion.title}</h3>
                          <p className="text-sm text-gray-700 mb-2">{suggestion.description}</p>
                          <Badge variant="outline" className="text-xs">
                            💡 {suggestion.action}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setShowAIDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}