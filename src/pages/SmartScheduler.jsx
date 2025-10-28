
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
  Users,
} from "lucide-react";
import { format, startOfWeek, addDays, subWeeks, parseISO, parse, isSameDay, addWeeks } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Textarea } from "@/components/ui/textarea";

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Generate time options in 10-minute intervals
 */
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      times.push(`${hourStr}:${minuteStr}`);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

/**
 * Get default department based on position
 */
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

/**
 * Calculate shift duration in hours
 */
const calculateShiftDuration = (startTime, endTime) => {
  const start = parse(startTime, 'HH:mm', new Date());
  const end = parse(endTime, 'HH:mm', new Date());
  const diffMinutes = (end - start) / (1000 * 60);
  return (diffMinutes / 60).toFixed(1);
};

/**
 * Check if two time ranges overlap
 */
const doTimesOverlap = (start1, end1, start2, end2) => {
  const s1 = parse(start1, 'HH:mm', new Date());
  const e1 = parse(end1, 'HH:mm', new Date());
  const s2 = parse(start2, 'HH:mm', new Date());
  const e2 = parse(end2, 'HH:mm', new Date());
  
  return (s1 >= s2 && s1 < e2) || (e1 > s2 && e1 <= e2) || (s1 <= s2 && e1 >= e2);
};


export default function SmartScheduler() {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    // Calculate the start of the current week (Monday)
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  });
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftFormData, setShiftFormData] = useState({
    staff_email: "",
    shift_date: "",
    shift_type: "mid_shift",
    start_time: "09:00",
    end_time: "17:00",
    role: "",
    department: "",
    location: "",
    notes: "",
    status: "scheduled",
  });
  const [validationError, setValidationError] = useState(null);

  // Fetch all users for dropdown
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  // Filter active staff members
  const staffMembers = useMemo(() => allUsers.filter(u => 
    u.status === 'active' || !u.status
  ), [allUsers]);

  // Calculate the start of the selected week (Monday)
  const weekStart = parseISO(selectedWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch shifts for the selected week
  const { data: shifts = [], refetch: refetchShifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['weeklyShifts', selectedWeek],
    queryFn: async () => {
      const weekEnd = addDays(weekStart, 6);
      const allShifts = await base44.entities.Shift.list();
      return allShifts.filter(shift => {
        const shiftDate = parseISO(shift.shift_date);
        // Compare dates without time to ensure all shifts for the day are included
        return shiftDate >= weekStart && shiftDate <= weekEnd;
      });
    },
  });

  // Group shifts by day for easy rendering
  const groupedShifts = useMemo(() => {
    return shifts.reduce((acc, shift) => {
      const dateStr = format(parseISO(shift.shift_date), 'yyyy-MM-dd');
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(shift);
      return acc;
    }, {});
  }, [shifts]);

  // Check for overlapping shifts
  const checkForOverlaps = (formData, editingShiftId = null) => {
    const newShiftDate = formData.shift_date;
    const newStartTime = formData.start_time;
    const newEndTime = formData.end_time;

    const overlappingShifts = shifts.filter(shift => {
      if (editingShiftId && shift.id === editingShiftId) {
        return false;
      }

      if (shift.staff_email !== formData.staff_email || shift.shift_date !== newShiftDate) {
        return false;
      }

      return doTimesOverlap(newStartTime, newEndTime, shift.start_time, shift.end_time);
    });

    return overlappingShifts;
  };

  // Mutation for creating a new shift
  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      alert('✅ Shift created successfully!');
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating shift:', error);
      setValidationError("Failed to create shift. Please try again.");
    }
  });

  // Mutation for updating an existing shift
  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      alert('✅ Shift updated successfully!');
      resetForm();
    },
    onError: (error) => {
      console.error('Error updating shift:', error);
      setValidationError("Failed to update shift. Please try again.");
    }
  });

  // Mutation for deleting a shift
  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      alert('✅ Shift deleted successfully!');
      resetForm();
    },
    onError: (error) => {
      console.error('Error deleting shift:', error);
      setValidationError("Failed to delete shift. Please try again.");
    }
  });

  // Resets the shift form and closes dialog
  const resetForm = () => {
    setShowShiftForm(false);
    setEditingShift(null);
    setValidationError(null);
    setShiftFormData({
      staff_email: "",
      shift_date: "",
      shift_type: "mid_shift",
      start_time: "09:00",
      end_time: "17:00",
      role: "",
      department: "",
      location: "",
      notes: "",
      status: "scheduled",
    });
  };

  // Handles form submission with validation
  const handleSubmitShift = async (e) => {
    e.preventDefault();
    setValidationError(null);
    
    // Validation 1: Required fields
    if (!shiftFormData.staff_email || !shiftFormData.role || !shiftFormData.shift_date || !shiftFormData.start_time || !shiftFormData.end_time) {
      setValidationError("Please fill in all required fields (Staff, Role, Date, Start Time, End Time)");
      return;
    }

    // Validation 2: Time logic
    const startTime = parse(shiftFormData.start_time, 'HH:mm', new Date());
    const endTime = parse(shiftFormData.end_time, 'HH:mm', new Date());
    if (endTime <= startTime) {
      setValidationError("End time must be after start time");
      return;
    }

    // Validation 3: Check for overlapping shifts
    const overlaps = checkForOverlaps(shiftFormData, editingShift?.id);
    if (overlaps.length > 0) {
      const overlapDetails = overlaps.map(s => 
        `${s.start_time}-${s.end_time} (${s.role})`
      ).join(', ');
      setValidationError(`This staff member already has a shift on this date: ${overlapDetails}`);
      return;
    }

    const selectedUser = staffMembers.find(u => u.email === shiftFormData.staff_email);
    
    if (!selectedUser) {
      setValidationError('Please select a valid staff member');
      return;
    }

    const dataToSave = {
      ...shiftFormData,
      staff_name: selectedUser.full_name,
      role: shiftFormData.role || selectedUser.position || 'staff',
      department: shiftFormData.department || selectedUser.department || getDefaultDepartment(shiftFormData.role),
    };

    try {
      if (editingShift) {
        await updateShiftMutation.mutateAsync({ id: editingShift.id, data: dataToSave });
      } else {
        await createShiftMutation.mutateAsync(dataToSave);
      }
    } catch (error) {
      console.error('Error saving shift:', error);
      setValidationError("Failed to save shift. Please try again.");
    }
  };

  // Pre-fills the form for editing
  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setValidationError(null);
    setShiftFormData({
      staff_email: shift.staff_email,
      shift_date: shift.shift_date,
      shift_type: shift.shift_type,
      start_time: shift.start_time,
      end_time: shift.end_time,
      role: shift.role,
      department: shift.department || getDefaultDepartment(shift.role),
      location: shift.location || "",
      notes: shift.notes || "",
      status: shift.status,
    });
    setShowShiftForm(true);
  };

  // Delete shift with confirmation
  const handleDeleteShift = async () => {
    if (!editingShift) return;
    
    if (window.confirm(`Are you sure you want to delete this shift for ${editingShift.staff_name}?`)) {
      try {
        await deleteShiftMutation.mutateAsync(editingShift.id);
      } catch (error) {
        console.error('Error deleting shift:', error);
        setValidationError('Failed to delete shift.');
      }
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
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

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Sparkles className="w-6 md:w-8 h-6 md:h-8 text-purple-600" />
              Weekly Shift Scheduler
            </h1>
            <p className="text-sm md:text-base text-gray-600">View and manage shifts for the week.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => {
                setEditingShift(null);
                setValidationError(null);
                setShiftFormData({ // Pre-fill with current selected week's start date
                  staff_email: "",
                  shift_date: format(weekStart, 'yyyy-MM-dd'), 
                  shift_type: "mid_shift",
                  start_time: "09:00",
                  end_time: "17:00",
                  role: "",
                  department: "",
                  location: "",
                  notes: "",
                  status: "scheduled",
                });
                setShowShiftForm(true);
              }} 
              className="bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Shift
            </Button>
          </div>
        </div>

        {/* Week Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => {
                  const prev = subWeeks(parseISO(selectedWeek), 1);
                  setSelectedWeek(format(prev, 'yyyy-MM-dd'));
                }}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous Week
              </Button>

              <div className="text-center">
                <p className="font-semibold text-gray-900">
                  Week of {format(weekStart, 'MMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
                </p>
              </div>

              <Button
                onClick={() => {
                  const next = addWeeks(parseISO(selectedWeek), 1);
                  setSelectedWeek(format(next, 'yyyy-MM-dd'));
                }}
                variant="outline"
                size="sm"
              >
                Next Week
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Calendar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {shiftsLoading || usersLoading ? (
            <div className="lg:col-span-7 py-12 text-center text-gray-500">Loading shifts...</div>
          ) : (
            weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayShifts = groupedShifts[dateStr] || [];
              const isToday = isSameDay(day, new Date());
              
              return (
                <Card key={dateStr} className={`${
                  isToday ? 'border-2 border-purple-500 shadow-lg' : ''
                }`}>
                  <CardHeader className="p-3 pb-2 bg-gradient-to-br from-purple-50 to-blue-50 rounded-t-lg">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">{format(day, 'EEE')}</p>
                      <p className="text-lg font-bold text-gray-900">{format(day, 'd')}</p>
                      {isToday && (
                        <Badge className="ml-2 bg-purple-600 text-xs">Today</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 space-y-1 min-h-[150px]">
                    {dayShifts.length > 0 ? (
                      dayShifts.map((shift) => (
                        <div
                          key={shift.id}
                          onClick={() => handleEditShift(shift)}
                          className="p-2 bg-purple-50 rounded text-xs cursor-pointer hover:bg-purple-100 transition-colors border border-purple-200"
                        >
                          <div className="flex items-center gap-1">
                            {staffMembers.find(s => s.email === shift.staff_email)?.photo_url ? (
                              <img 
                                src={staffMembers.find(s => s.email === shift.staff_email).photo_url} 
                                alt="" 
                                className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {shift.staff_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                            <p className="font-medium text-gray-900 truncate">
                              {shift.staff_name}
                            </p>
                          </div>
                          <p className="text-gray-600 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {shift.start_time} - {shift.end_time}
                          </p>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0.5 mt-1">
                            {shift.role || shift.shift_type}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-4">No shifts</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Shift Form Dialog */}
        <Dialog open={showShiftForm} onOpenChange={(open) => {
          if (!open) resetForm();
          setShowShiftForm(open);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                {editingShift ? (
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

            <form onSubmit={handleSubmitShift} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Staff Member Selection */}
                <div>
                  <Label htmlFor="staff_email">Staff Member *</Label>
                  <Select
                    value={shiftFormData.staff_email}
                    onValueChange={(value) => {
                      const user = staffMembers.find(u => u.email === value);
                      setShiftFormData({
                        ...shiftFormData,
                        staff_email: value,
                        // Pre-fill role and department if available from user profile, otherwise use current form values
                        role: user?.position || shiftFormData.role,
                        department: user?.department || getDefaultDepartment(user?.position || shiftFormData.role),
                      });
                    }}
                  >
                    <SelectTrigger id="staff_email">
                      <SelectValue placeholder="Select staff..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {usersLoading ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Loading staff...
                        </div>
                      ) : staffMembers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No active staff members found
                        </div>
                      ) : (
                        staffMembers.map((user) => (
                          <SelectItem key={user.email} value={user.email}>
                            <div className="flex items-center gap-2">
                              {user.photo_url ? (
                                <img 
                                  src={user.photo_url} 
                                  alt={user.full_name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white text-xs font-bold">
                                  {user.full_name?.charAt(0)?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{user.full_name}</p>
                                {user.position && (
                                  <p className="text-xs text-gray-500 capitalize">
                                    {user.position.replace(/_/g, ' ')}
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
                    value={shiftFormData.role} 
                    onValueChange={(value) => {
                      setShiftFormData({
                        ...shiftFormData,
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
                    value={shiftFormData.department} 
                    onValueChange={(value) => setShiftFormData({ ...shiftFormData, department: value })}
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
                    value={shiftFormData.shift_date}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, shift_date: e.target.value })}
                    required
                  />
                </div>

                {/* Shift Type */}
                <div>
                  <Label htmlFor="shift_type">Shift Type</Label>
                  <Select 
                    value={shiftFormData.shift_type} 
                    onValueChange={(value) => setShiftFormData({ ...shiftFormData, shift_type: value })}
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

                {/* Start Time - 10-MINUTE INTERVALS */}
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Select
                    value={shiftFormData.start_time}
                    onValueChange={(value) => setShiftFormData({ ...shiftFormData, start_time: value })}
                  >
                    <SelectTrigger id="start_time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {TIME_OPTIONS.map(time => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* End Time - 10-MINUTE INTERVALS */}
                <div>
                  <Label htmlFor="end_time">End Time *</Label>
                  <Select
                    value={shiftFormData.end_time}
                    onValueChange={(value) => setShiftFormData({ ...shiftFormData, end_time: value })}
                  >
                    <SelectTrigger id="end_time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {TIME_OPTIONS.map(time => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={shiftFormData.location}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, location: e.target.value })}
                    placeholder="e.g., Main Restaurant"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={shiftFormData.notes}
                  onChange={(e) => setShiftFormData({ ...shiftFormData, notes: e.target.value })}
                  placeholder="Any special instructions..."
                  rows={3}
                />
              </div>

              {/* Form Actions */}
              <DialogFooter className="flex justify-between items-center pt-4 border-t">
                <div>
                  {editingShift && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDeleteShift}
                      disabled={deleteShiftMutation.isPending}
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
                    {editingShift ? 'Update' : 'Create'} Shift
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
