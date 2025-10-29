
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Clock, TrendingUp, AlertTriangle, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

// New imports for the dialog and form components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

export default function StaffRota() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  // Combine users and team members
  const allStaff = useMemo(() => {
    const staffMap = new Map();
    
    // Process users first
    allUsers.forEach(user => {
      // Ensure user.full_name is not null/undefined, fallback to first/last name
      const fullName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
      staffMap.set(user.email, {
        email: user.email,
        full_name: fullName,
        position: user.position,
        phone: user.phone,
        photo_url: user.photo_url, // Add photo_url from user if available
      });
    });
    
    // Then process team members, potentially enriching or adding new entries
    teamMembers.forEach(member => {
      if (staffMap.has(member.staff_email)) {
        // If user already exists, enrich with team member data, preferring team member data
        const existingStaff = staffMap.get(member.staff_email);
        staffMap.set(member.staff_email, {
          ...existingStaff,
          full_name: member.staff_name || existingStaff.full_name,
          position: member.position || existingStaff.position,
          department: member.department || existingStaff.department,
          photo_url: member.photo_url || existingStaff.photo_url,
        });
      } else {
        // If team member doesn't have a corresponding user entry, create one
        staffMap.set(member.staff_email, {
          email: member.staff_email,
          full_name: member.staff_name,
          position: member.position,
          department: member.department,
          photo_url: member.photo_url,
        });
      }
    });
    
    return Array.from(staffMap.values()).sort((a, b) => 
      (a.full_name || '').localeCompare(b.full_name || '')
    );
  }, [allUsers, teamMembers]);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.position === 'manager' || user?.position === 'owner';
  const hasManagementAccess = isAdmin || isManager;

  // State for the shift creation dialog
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    staff_email: "",
    staff_name: "",
    role: "", // Position/Role of the staff member assigned to the shift
    date: format(new Date(), 'yyyy-MM-dd'), // Default to today's date
    start_time: "09:00",
    end_time: "17:00",
    notes: "",
  });

  const handleShiftFormChange = (e) => {
    const { id, value } = e.target;
    setShiftForm(prev => ({ ...prev, [id]: value }));
  };

  const handleShiftSubmit = (e) => {
    e.preventDefault();
    console.log("Submitting shift:", shiftForm);
    // Here, you would typically call an API to create the shift
    // e.g., await base44.entities.Shift.create(shiftForm);
    setIsShiftDialogOpen(false);
    // Optionally, reset form after submission
    setShiftForm({
      staff_email: "",
      staff_name: "",
      role: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: "09:00",
      end_time: "17:00",
      notes: "",
    });
    // Add success/error handling (e.g., toast notification)
  };

  const rotaModules = [
    {
      title: "My Shifts",
      description: "View your upcoming shifts and clock in/out",
      icon: Calendar,
      url: createPageUrl("MyShifts"),
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      accessLevel: "all", // Everyone can access
    },
    {
      title: "Clock In/Out",
      description: "Track your working hours and attendance",
      icon: Clock,
      url: createPageUrl("ClockInOut"),
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      accessLevel: "all",
    },
    {
      title: "🤖 Smart Gantt Scheduler",
      description: "Visual week planner with auto task assignment",
      icon: Calendar,
      url: createPageUrl("SmartScheduler"),
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
      accessLevel: "management", // Admin/Manager only
    },
    {
      title: "Weekly Rota Schedule",
      description: "Create and manage weekly staff schedules",
      icon: Calendar,
      url: createPageUrl("WeeklyRotaSchedule"),
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      accessLevel: "management", // Admin/Manager only
    },
    {
      title: "Attendance Reports",
      description: "View attendance statistics and patterns",
      icon: TrendingUp,
      url: createPageUrl("Reports"),
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
      accessLevel: "management",
    },
  ];

  // Filter modules based on access level
  const accessibleModules = rotaModules.filter(module => 
    module.accessLevel === "all" || (module.accessLevel === "management" && hasManagementAccess)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Shift & Rota Management
            </h1>
            <p className="text-lg text-gray-600">
              {hasManagementAccess 
                ? "Manage schedules, track attendance, and optimize staffing"
                : "View your shifts, clock in/out, and manage your availability"
              }
            </p>
          </div>
          {hasManagementAccess && (
            <Button onClick={() => setIsShiftDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create New Shift
            </Button>
          )}
        </div>

        {/* Access Level Indicator */}
        {!hasManagementAccess && (
          <Card className="bg-blue-50 border-blue-200 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  <strong>Staff Member View:</strong> You can view your own shifts and availability. 
                  Contact your manager for schedule changes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accessibleModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link to={module.url}>
                  <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative h-full">
                    <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <CardContent className="p-6">
                      <div className={`p-4 ${module.bgColor} rounded-xl group-hover:scale-110 transition-transform duration-300 mb-4 inline-block`}>
                        <Icon className={`w-8 h-8 ${module.iconColor}`} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {module.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* SHIFT CREATION DIALOG */}
      {hasManagementAccess && (
        <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Shift</DialogTitle>
              <DialogDescription>
                Assign a shift to a staff member. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleShiftSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="staff_member_select">Staff Member *</Label>
                <Select 
                  value={shiftForm.staff_email} 
                  onValueChange={(value) => {
                    const staff = allStaff.find(s => s.email === value);
                    setShiftForm({
                      ...shiftForm,
                      staff_email: value,
                      staff_name: staff?.full_name || "",
                      role: staff?.position || "", // Set role from staff's position
                    });
                  }}
                >
                  <SelectTrigger id="staff_member_select">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {allStaff.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        <p>No staff members found</p>
                        <p className="text-xs mt-1">Add staff members via Manager Dashboard</p>
                      </div>
                    ) : (
                      allStaff.map((staff) => (
                        <SelectItem key={staff.email} value={staff.email}>
                          <div className="flex items-center gap-2">
                            {staff.photo_url ? (
                              <img src={staff.photo_url} alt={`${staff.full_name}'s photo`} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                {staff.full_name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{staff.full_name}</p>
                              {staff.position && <p className="text-xs text-gray-500">{staff.position}</p>}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {allStaff.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ No staff members available. Please add staff first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={shiftForm.date} 
                    onChange={handleShiftFormChange} 
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role (assigned)</Label>
                  <Input 
                    id="role" 
                    type="text" 
                    value={shiftForm.role} 
                    onChange={handleShiftFormChange} 
                    placeholder="e.g., Bartender"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input 
                    id="start_time" 
                    type="time" 
                    value={shiftForm.start_time} 
                    onChange={handleShiftFormChange} 
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input 
                    id="end_time" 
                    type="time" 
                    value={shiftForm.end_time} 
                    onChange={handleShiftFormChange} 
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  value={shiftForm.notes} 
                  onChange={handleShiftFormChange} 
                  placeholder="e.g., Training required, cover lunch break" 
                />
              </div>

              <DialogFooter>
                <Button type="submit">Create Shift</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
