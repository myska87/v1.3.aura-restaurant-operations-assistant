
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO } from "date-fns";

// Helper function to get default department based on position
const getDefaultDepartment = (position) => {
  const departmentMap = {
    'chef': 'kitchen',
    'line_cook': 'kitchen',
    'server': 'front_of_house',
    'bartender': 'bar',
    'cleaner': 'cleaning',
    'maintenance': 'maintenance',
    'manager': 'management',
    'owner': 'management',
  };
  return departmentMap[position] || 'front_of_house'; // Default to front_of_house if position not found
};

export default function SmartScheduler() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date()); // Tracks current date for week navigation
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null); // Stores shift being edited
  const [shiftForm, setShiftForm] = useState({
    staff_email: "",
    staff_name: "",
    role: "",
    department: "",
    shift_date: "",
    shift_type: "mid_shift",
    start_time: "09:00", // Default start time
    end_time: "17:00",   // Default end time
    location: "",
    notes: "",           // New field for notes
    status: "scheduled",
  });

  // Calculate the start of the current week (Monday) and the days in the week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Fetch all team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  // Memoize and combine users and team members into a single staff list
  const allStaff = useMemo(() => {
    const staffMap = new Map();
    
    // Add all users
    users.forEach(user => {
      staffMap.set(user.email, {
        email: user.email,
        full_name: user.full_name,
        position: user.position,
        phone: user.phone,
      });
    });
    
    // Merge with team member data, preferring team member specific details if available
    teamMembers.forEach(member => {
      if (staffMap.has(member.staff_email)) {
        staffMap.set(member.staff_email, {
          ...staffMap.get(member.staff_email),
          position: member.position || staffMap.get(member.staff_email).position,
          department: member.department,
          photo_url: member.photo_url,
        });
      } else {
        // If a team member exists but not as a user, add them
        staffMap.set(member.staff_email, {
          email: member.staff_email,
          full_name: member.staff_name,
          position: member.position,
          department: member.department,
          photo_url: member.photo_url,
        });
      }
    });
    
    // Convert map values to array and sort by full name
    return Array.from(staffMap.values()).sort((a, b) => 
      (a.full_name || '').localeCompare(b.full_name || '')
    );
  }, [users, teamMembers]);

  // Fetch shifts for the current week
  const { data: shifts = [] } = useQuery({
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

  // Mutation for creating a new shift
  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekShifts'] }); // Invalidate shifts cache
      resetForm(); // Reset form and close dialog
    },
  });

  // Mutation for updating an existing shift
  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekShifts'] }); // Invalidate shifts cache
      resetForm(); // Reset form and close dialog
    },
  });

  // Mutation for deleting a shift
  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekShifts'] }); // Invalidate shifts cache
    },
  });

  // Resets the shift form to its initial state and closes the dialog
  const resetForm = () => {
    setShowAddShiftDialog(false);
    setSelectedShift(null);
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

  // Handles form submission for creating or updating a shift
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic form validation
    if (!shiftForm.staff_email || !shiftForm.role || !shiftForm.shift_date || !shiftForm.start_time || !shiftForm.end_time) {
      alert("Please fill in all required fields (Staff, Role, Date, Start Time, End Time).");
      return;
    }

    // Prepare data, ensuring staff name is accurate based on selected email
    const staffMember = allStaff.find(s => s.email === shiftForm.staff_email);
    const dataToSave = {
      ...shiftForm,
      staff_name: staffMember?.full_name || shiftForm.staff_name,
    };

    if (selectedShift) {
      // If a shift is selected, update it
      await updateShiftMutation.mutateAsync({
        id: selectedShift.id,
        data: dataToSave
      });
    } else {
      // Otherwise, create a new shift
      await createShiftMutation.mutateAsync(dataToSave);
    }
  };

  // Pre-fills the form with data of the shift to be edited and opens the dialog
  const handleEditShift = (shift) => {
    setSelectedShift(shift);
    setShiftForm({
      staff_email: shift.staff_email,
      staff_name: shift.staff_name,
      role: shift.role,
      department: shift.department || "",
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

  // Filters shifts to get only those scheduled for a specific day
  const getShiftsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(s => s.shift_date === dateStr);
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-600" />
              Smart Gantt Scheduler
            </h1>
            <p className="text-gray-600">Visual week planner with automatic task assignment</p>
          </div>
          {/* Button to add a new shift */}
          <Button onClick={() => setShowAddShiftDialog(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Shift
          </Button>
        </div>

        {/* Week Navigation Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              {/* Button to navigate to the previous week */}
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {/* Display current week range */}
              <h2 className="text-xl font-bold">
                {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </h2>
              {/* Button to navigate to the next week */}
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shift Grid for the Week */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <Card key={day.toISOString()} className={isToday ? 'border-2 border-purple-500 shadow-md' : ''}>
                <CardHeader className="p-3 bg-gray-100 rounded-t-lg">
                  <CardTitle className="text-sm font-semibold text-gray-800">
                    {format(day, 'EEE')}
                    <br />
                    {format(day, 'MMM d')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-2 min-h-[100px]">
                  {dayShifts.length > 0 ? (
                    dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="p-2 bg-purple-50 rounded border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors"
                        onClick={() => handleEditShift(shift)}
                      >
                        <p className="text-xs font-semibold truncate text-gray-900">{shift.staff_name}</p>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0.5 mt-1">{shift.role}</Badge>
                        <p className="text-xs text-gray-600 mt-1">
                          {shift.start_time} - {shift.end_time}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">No shifts</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add/Edit Shift Dialog */}
        <Dialog open={showAddShiftDialog} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedShift ? 'Edit Shift' : 'Add New Shift'}</DialogTitle>
            </DialogHeader>
            {/* Shift form */}
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Staff Member Selection */}
                <div>
                  <Label htmlFor="staff_email">Staff Member *</Label>
                  <Select 
                    value={shiftForm.staff_email} 
                    onValueChange={(value) => {
                      const staff = allStaff.find(s => s.email === value);
                      setShiftForm({
                        ...shiftForm,
                        staff_email: value,
                        staff_name: staff?.full_name || "",
                        role: staff?.position || shiftForm.role,
                        department: getDefaultDepartment(staff?.position || shiftForm.role),
                      });
                    }}
                  >
                    <SelectTrigger id="staff_email">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {allStaff.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          <p>No staff members found</p>
                        </div>
                      ) : (
                        allStaff.map((staff) => (
                          <SelectItem key={staff.email} value={staff.email}>
                            <div className="flex items-center gap-2">
                              {staff.photo_url ? (
                                <img src={staff.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                  {staff.full_name?.charAt(0)?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-medium">{staff.full_name}</span>
                                <span className="text-xs text-gray-500 ml-2">{staff.position}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role/Position Selection */}
                <div>
                  <Label htmlFor="role">Role/Position *</Label>
                  <Select 
                    value={shiftForm.role} 
                    onValueChange={(value) => {
                      setShiftForm({
                        ...shiftForm,
                        role: value,
                        department: getDefaultDepartment(value), // Update department based on selected role
                      });
                    }}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chef">Chef</SelectItem>
                      <SelectItem value="line_cook">Line Cook</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="bartender">Bartender</SelectItem>
                      <SelectItem value="cleaner">Cleaner</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Shift Date Input */}
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

                {/* Shift Type Selection */}
                <div>
                  <Label htmlFor="shift_type">Shift Type</Label>
                  <Select 
                    id="shift_type"
                    value={shiftForm.shift_type} 
                    onValueChange={(value) => setShiftForm({ ...shiftForm, shift_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening">Opening</SelectItem>
                      <SelectItem value="mid_shift">Mid Shift</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Time Input */}
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

                {/* End Time Input */}
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
              </div>

              {/* Notes Input */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={shiftForm.notes}
                  onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  placeholder="Any special instructions..."
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                {selectedShift && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this shift? This action cannot be undone.')) {
                        deleteShiftMutation.mutate(selectedShift.id);
                        resetForm();
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  {selectedShift ? 'Update' : 'Create'} Shift
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
