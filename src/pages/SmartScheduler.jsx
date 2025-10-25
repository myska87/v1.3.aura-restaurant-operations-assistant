
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  ArrowLeft,
  Home,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Mail,
  Copy,
  Users,
  TrendingUp,
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, getWeek, parseISO, isSameDay } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const POSITIONS = [
  { name: "Manager", color: "bg-red-100", darkColor: "bg-red-500", textColor: "text-red-900" },
  { name: "Chef", color: "bg-orange-100", darkColor: "bg-orange-500", textColor: "text-orange-900" },
  { name: "Barista", color: "bg-green-100", darkColor: "bg-green-500", textColor: "text-green-900" },
  { name: "Front of House", color: "bg-blue-100", darkColor: "bg-blue-500", textColor: "text-blue-900" },
  { name: "Server", color: "bg-purple-100", darkColor: "bg-purple-500", textColor: "text-purple-900" },
  { name: "Line Cook", color: "bg-amber-100", darkColor: "bg-amber-500", textColor: "text-amber-900" },
  { name: "Bartender", color: "bg-indigo-100", darkColor: "bg-indigo-500", textColor: "text-indigo-900" },
  { name: "Cleaner", color: "bg-gray-100", darkColor: "bg-gray-500", textColor: "text-gray-900" },
];

// Helper map for position colors for badges
const positionColors = POSITIONS.reduce((acc, pos) => {
  acc[pos.name] = pos.darkColor; 
  return acc;
}, {});

function ShiftCard({ shift, position, onEdit, onDelete, onGenerateTasks, onPreviewTasks }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={`${position.darkColor} text-white rounded-lg shadow-md p-3 cursor-move hover:shadow-lg transition-all`}>
          {/* Updated Staff Name and Role Display */}
          <div className="flex-1 min-w-0 bg-white p-2 rounded-md mb-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="font-bold text-xs text-gray-900 truncate">
                {shift.staff_name || 'Unknown'}
              </p>
              <Badge className={positionColors[shift.role] || 'bg-gray-100 text-gray-800'}>
                {shift.role ? shift.role.replace(/_/g, ' ') : 'Unknown'}
              </Badge>
            </div>
          </div>
          {/* End Updated Staff Name and Role Display */}

          <p className="text-xs font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {shift.start_time} - {shift.end_time}
          </p>
          {shift.auto_generated_tasks ? (
            <Badge className="bg-white/30 text-white text-[10px] mt-2">
              <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
              Tasks Ready
            </Badge>
          ) : (
            <Badge className="bg-yellow-400 text-yellow-900 text-[10px] mt-2">
              <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
              No Tasks
            </Badge>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" side="top">
        <div className="space-y-3">
          <div>
            <h3 className="font-bold text-lg">{shift.staff_name}</h3>
            <p className="text-sm text-gray-600">{shift.role}</p>
          </div>
          <div className="space-y-2 border-t pt-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{shift.start_time} - {shift.end_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{format(parseISO(shift.shift_date), 'EEEE, MMMM d')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="truncate">{shift.staff_email}</span>
            </div>
            {shift.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>{shift.location}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            {!shift.auto_generated_tasks && (
              <Button onClick={onGenerateTasks} size="sm" className="flex-1 bg-green-600">
                <Zap className="w-3 h-3 mr-1" />
                Generate
              </Button>
            )}
            <Button onClick={onPreviewTasks} size="sm" variant="outline" className="flex-1">
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={onEdit} size="sm" variant="outline" className="flex-1">
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button onClick={onDelete} size="sm" variant="outline" className="flex-1 text-red-600">
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Add this helper function after imports and before the component
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const displayTime = `${hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
      times.push({ value: timeString, label: displayTime });
    }
  }
  return times;
};

export default function SmartScheduler() {
  const queryClient = useQueryClient();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showTaskPreview, setShowTaskPreview] = useState(false);
  const [previewShift, setPreviewShift] = useState(null);

  const [shiftForm, setShiftForm] = useState({
    staff_email: "",
    staff_name: "",
    role: "",
    department: "",
    shift_date: "",
    shift_type: "mid_shift",
    start_time: "",
    end_time: "",
    status: "scheduled",
    location: "",
  });

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const weekNumber = getWeek(currentWeekStart);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

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

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: responsibilities = [] } = useQuery({
    queryKey: ['responsibilities'],
    queryFn: () => base44.entities.RoleResponsibility.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['autoGeneratedTasks'],
    queryFn: () => base44.entities.AutoGeneratedTask.list(),
  });

  const getDefaultDepartment = (position) => {
    const deptMap = {
      'chef': 'kitchen',
      'line cook': 'kitchen',
      'server': 'front_of_house',
      'bartender': 'bar',
      'manager': 'management',
      'cleaner': 'cleaning',
      'barista': 'bar',
      'front of house': 'front_of_house',
    };
    return deptMap[position?.toLowerCase()] || 'general';
  };

  const getShiftsByPositionAndDate = (position, date) => {
    return shifts.filter(shift => {
      return shift.role === position && isSameDay(parseISO(shift.shift_date), date);
    });
  };

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      queryClient.invalidateQueries({ queryKey: ['autoGeneratedTasks'] }); // Invalidate tasks as they might be affected by shift updates
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      queryClient.invalidateQueries({ queryKey: ['autoGeneratedTasks'] });
      resetForm();
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      queryClient.invalidateQueries({ queryKey: ['autoGeneratedTasks'] });
    },
  });

  const copyWeekMutation = useMutation({
    mutationFn: async () => {
      const nextWeekStart = addWeeks(currentWeekStart, 1);
      const copiedShifts = [];

      for (const shift of shifts) {
        // Calculate the day difference from week start
        const shiftDate = parseISO(shift.shift_date);
        const dayDiff = Math.floor((shiftDate.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24));
        
        // Create new shift for next week
        const newShiftDate = format(addDays(nextWeekStart, dayDiff), 'yyyy-MM-dd');
        
        const newShift = {
          staff_email: shift.staff_email,
          staff_name: shift.staff_name,
          role: shift.role,
          department: shift.department,
          shift_date: newShiftDate,
          shift_type: shift.shift_type,
          start_time: shift.start_time,
          end_time: shift.end_time,
          location: shift.location,
          status: 'scheduled',
          auto_generated_tasks: false,
        };

        const created = await base44.entities.Shift.create(newShift);
        copiedShifts.push(created);
      }

      return copiedShifts;
    },
    onSuccess: (copiedShifts) => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      
      // Ask if user wants to generate tasks for copied shifts
      if (confirm(`✅ ${copiedShifts.length} shifts copied to next week!\n\nWould you like to auto-generate tasks for these shifts?`)) {
        // Move to next week view
        setCurrentWeekStart(addWeeks(currentWeekStart, 1));
        
        // Generate tasks for all copied shifts
        setTimeout(async () => {
          let tasksGenerated = 0;
          let messages = [];
          for (const shift of copiedShifts) {
            try {
              const result = await generateTasksMutation.mutateAsync(shift);
              tasksGenerated += result.tasksCreated;
              if (result.message && !messages.includes(result.message)) { // Collect unique messages
                messages.push(result.message);
              }
            } catch (error) {
              console.error('Error generating tasks:', error);
              messages.push(`Error generating tasks for ${shift.staff_name}: ${error.message}`);
            }
          }
          alert(`✅ Tasks generated for ${tasksGenerated} shifts! Summary:\n\n${messages.join('\n')}`);
        }, 500);
      } else {
        // Just move to next week view
        setCurrentWeekStart(addWeeks(currentWeekStart, 1));
      }
    },
    onError: (error) => {
      alert('❌ Error copying week: ' + error.message);
    }
  });

  const clearWeekMutation = useMutation({
    mutationFn: async () => {
        const weekEnd = addDays(currentWeekStart, 6);
        const shiftsToDelete = shifts.filter(shift => {
            const shiftDate = parseISO(shift.shift_date);
            return shiftDate >= currentWeekStart && shiftDate <= weekEnd;
        });

        if (shiftsToDelete.length === 0) {
            return { deletedCount: 0, message: "No shifts found to clear for this week." };
        }

        // Delete associated tasks first
        const taskDeletionPromises = [];
        for (const shift of shiftsToDelete) {
            const shiftTasks = tasks.filter(t => t.shift_id === shift.id);
            for (const task of shiftTasks) {
                taskDeletionPromises.push(base44.entities.AutoGeneratedTask.delete(task.id));
            }
        }
        await Promise.all(taskDeletionPromises);

        // Then delete the shifts
        const shiftDeletionPromises = shiftsToDelete.map(shift =>
            base44.entities.Shift.delete(shift.id)
        );
        await Promise.all(shiftDeletionPromises);

        return { deletedCount: shiftsToDelete.length, message: `${shiftsToDelete.length} shifts and their tasks cleared successfully!` };
    },
    onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
        queryClient.invalidateQueries({ queryKey: ['autoGeneratedTasks'] });
        alert(`✅ ${result.message}`);
    },
    onError: (error) => {
        alert('❌ Error clearing shifts: ' + error.message);
    }
  });

  const generateTasksMutation = useMutation({
    mutationFn: async (shift) => {
      // Find role responsibilities
      const roleResponsibilities = responsibilities.find(
        r => r.position === shift.role && r.is_active && r.auto_assign_enabled
      );

      const tasksToCreate = [];
      const shiftDate = shift.shift_date;

      // If no responsibilities found, show friendly message but don't error
      if (!roleResponsibilities) {
        console.log(`No responsibilities configured for role: ${shift.role}`);
        
        // Mark shift as having tasks generated (even if empty) to prevent repeated attempts
        await base44.entities.Shift.update(shift.id, {
          auto_generated_tasks: true,
          tasks_generated_at: new Date().toISOString(),
        });
        
        return { 
          tasksCreated: 0,
          message: `No task templates configured for ${shift.role} role. Please set up responsibilities in Restaurant Routines.`
        };
      }

      // Generate daily tasks
      if (roleResponsibilities.daily_tasks && roleResponsibilities.daily_tasks.length > 0) {
        roleResponsibilities.daily_tasks.forEach((task) => {
          const dueTime = calculateDueTime(shift.end_time, task.estimated_minutes || 30);
          tasksToCreate.push({
            task_name: task.task_name || task,
            description: task.description || "",
            assigned_to_email: shift.staff_email,
            assigned_to_name: shift.staff_name,
            role: shift.role,
            department: shift.department || roleResponsibilities.department,
            shift_id: shift.id,
            shift_date: shiftDate,
            linked_responsibility_id: roleResponsibilities.id,
            priority: task.priority || "medium",
            estimated_minutes: task.estimated_minutes || 30,
            due_time: dueTime,
            status: "pending",
            created_automatically: true,
            task_type: "daily",
          });
        });
      }

      // Create tasks if any exist
      if (tasksToCreate.length > 0) {
        await base44.entities.AutoGeneratedTask.bulkCreate(tasksToCreate);
      }
      
      // Mark shift as having tasks generated
      await base44.entities.Shift.update(shift.id, {
        auto_generated_tasks: true,
        tasks_generated_at: new Date().toISOString(),
      });

      return { 
        tasksCreated: tasksToCreate.length,
        message: tasksToCreate.length > 0 
          ? `Generated ${tasksToCreate.length} tasks successfully!`
          : `No tasks to generate for ${shift.role} role.`
      };
    },
    onSuccess: (result, shift) => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      queryClient.invalidateQueries({ queryKey: ['autoGeneratedTasks'] });
      
      // Show result message
      if (result.tasksCreated === 0) {
        alert(`ℹ️ ${result.message}`);
      } else {
        alert(`✅ ${result.message}`);
      }
    },
    onError: (error, shift) => {
      console.error("Error generating tasks:", error);
      alert(`❌ Error generating tasks for ${shift.staff_name || shift.role}: ${error.message}`);
    }
  });

  const calculateDueTime = (shiftEndTime, minutesBefore) => {
    const [hours, minutes] = shiftEndTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes - minutesBefore;
    const dueHours = Math.floor(totalMinutes / 60);
    const dueMinutes = totalMinutes % 60;
    // Ensure hours and minutes are within valid range (0-23 for hours, 0-59 for minutes)
    const normalizedDueHours = (dueHours + 24) % 24; // Handle negative hours
    const normalizedDueMinutes = (dueMinutes + 60) % 60; // Handle negative minutes
    return `${String(normalizedDueHours).padStart(2, '0')}:${String(normalizedDueMinutes).padStart(2, '0')}`;
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const [sourcePosition, sourceDate] = source.droppableId.split('|');
    const [destPosition, destDate] = destination.droppableId.split('|');

    const shiftToMove = shifts.find(s => s.id === draggableId);
    if (!shiftToMove) return;

    const confirmMsg = `Move ${shiftToMove.staff_name}'s shift?\nFrom: ${sourcePosition} on ${format(parseISO(sourceDate), 'MMM d')}\nTo: ${destPosition} on ${format(parseISO(destDate), 'MMM d')}`;
    
    if (!confirm(confirmMsg)) return;

    try {
      await updateShiftMutation.mutateAsync({
        id: draggableId,
        data: {
          shift_date: destDate,
          role: destPosition,
          department: getDefaultDepartment(destPosition),
        }
      });

      // If the shift previously had tasks, ask to regenerate or clear them
      if (shiftToMove.auto_generated_tasks) {
        if (confirm('Shift moved. Do you want to regenerate tasks for its new date/role?')) {
          const oldTasks = tasks.filter(t => t.shift_id === draggableId);
          for (const task of oldTasks) {
            await base44.entities.AutoGeneratedTask.delete(task.id);
          }
          await generateTasksMutation.mutateAsync({ ...shiftToMove, id: draggableId, shift_date: destDate, role: destPosition });
        } else {
          // If not regenerating, mark auto_generated_tasks as false for the updated shift
          await updateShiftMutation.mutateAsync({
            id: draggableId,
            data: { auto_generated_tasks: false }
          });
          const oldTasks = tasks.filter(t => t.shift_id === draggableId);
          for (const task of oldTasks) {
            await base44.entities.AutoGeneratedTask.delete(task.id);
          }
          alert('Shift moved. Existing tasks cleared. Remember to generate new tasks if needed.');
        }
      }

      alert('✅ Shift moved successfully!');
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

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
      start_time: "",
      end_time: "",
      status: "scheduled",
      location: "",
    });
  };

  const handleSaveShift = async () => {
    if (!shiftForm.staff_email || !shiftForm.role || !shiftForm.shift_date || !shiftForm.start_time || !shiftForm.end_time) {
      alert("Please fill all required fields");
      return;
    }

    const staffMember = users.find(u => u.email === shiftForm.staff_email);
    const data = {
      ...shiftForm,
      staff_name: staffMember?.full_name || shiftForm.staff_name,
      status: "scheduled",
      auto_generated_tasks: false,
      location: shiftForm.location,
    };

    if (selectedShift) {
      await updateShiftMutation.mutateAsync({ id: selectedShift.id, data });
      alert('Shift updated successfully!');
    } else {
      const newShift = await createShiftMutation.mutateAsync(data);
      const hasResp = responsibilities.some(r => r.position === data.role && r.is_active && r.auto_assign_enabled);
      if (hasResp && confirm("Auto-generate tasks for this new shift?")) {
        await generateTasksMutation.mutateAsync(newShift);
      } else {
        alert('Shift created successfully!');
      }
    }
    resetForm();
  };

  const handleGenerateTasks = async (shift) => {
    if (shift.auto_generated_tasks) {
      if (confirm("Tasks have already been generated for this shift. Do you want to delete existing tasks and regenerate them?")) {
        const existingTasks = tasks.filter(t => t.shift_id === shift.id);
        for (const task of existingTasks) {
          await base44.entities.AutoGeneratedTask.delete(task.id);
        }
        await generateTasksMutation.mutateAsync(shift);
      }
    } else {
      await generateTasksMutation.mutateAsync(shift);
    }
  };

  const handleEditShift = (shift) => {
    setSelectedShift(shift);
    setShiftForm({
      staff_email: shift.staff_email,
      staff_name: shift.staff_name,
      role: shift.role,
      department: shift.department,
      shift_date: shift.shift_date,
      shift_type: shift.shift_type,
      start_time: shift.start_time,
      end_time: shift.end_time,
      status: shift.status,
      location: shift.location || "",
    });
    setShowAddShiftDialog(true);
  };

  const handleDeleteShift = async (shiftId) => {
    if (confirm("Delete this shift and all associated tasks? This action cannot be undone.")) {
      const shiftTasks = tasks.filter(t => t.shift_id === shiftId);
      for (const task of shiftTasks) {
        await base44.entities.AutoGeneratedTask.delete(task.id);
      }
      await deleteShiftMutation.mutateAsync(shiftId);
      alert('Shift and tasks deleted successfully!');
    }
  };

  const positionsWithShifts = POSITIONS.filter(pos => shifts.some(s => s.role === pos.name));
  const displayPositions = positionsWithShifts.length > 0 ? positionsWithShifts : POSITIONS;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
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

        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🤖 Smart Scheduler
              </h1>
              <p className="text-gray-600">Drag & drop shifts between days and positions</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (shifts.length === 0) {
                    alert('⚠️ No shifts to copy! Add shifts first.');
                    return;
                  }
                  if (confirm(`Copy all ${shifts.length} shifts from this week to next week?`)) {
                    copyWeekMutation.mutate();
                  }
                }}
                variant="outline"
                className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                disabled={copyWeekMutation.isPending || shifts.length === 0}
              >
                <Copy className="w-4 h-4 mr-2" />
                {copyWeekMutation.isPending ? 'Copying...' : 'Copy Week →'}
              </Button>
              <Button 
                onClick={() => {
                  if (shifts.length === 0) {
                    alert('⚠️ No shifts to clear for this week.');
                    return;
                  }
                  if (confirm(`Are you sure you want to delete all ${shifts.length} shifts for this week AND all their associated tasks? This action cannot be undone.`)) {
                    clearWeekMutation.mutate();
                  }
                }}
                variant="destructive"
                className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                disabled={clearWeekMutation.isPending || shifts.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {clearWeekMutation.isPending ? 'Clearing...' : 'Clear Week'}
              </Button>
              <Button onClick={() => setShowAddShiftDialog(true)} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Shift
              </Button>
            </div>
          </div>

          {/* Week Navigation */}
          <Card className="bg-gradient-to-r from-blue-50 to-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div className="text-center">
                    <h2 className="text-xl font-bold">Week {weekNumber}</h2>
                    <p className="text-sm text-gray-600">
                      {format(currentWeekStart, 'dd MMM')} - {format(addDays(currentWeekStart, 6), 'dd MMM')}
                    </p>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                    Today
                  </Button>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{shifts.length}</p>
                    <p className="text-xs text-gray-600">Total Shifts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {shifts.filter(s => s.auto_generated_tasks).length}
                    </p>
                    <p className="text-xs text-gray-600">With Tasks</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gantt Chart */}
        <Card className="bg-white shadow-lg">
          <CardContent className="p-0">
            {/* Header */}
            <div className="grid grid-cols-8 border-b-2 bg-slate-800">
              <div className="p-4 font-bold text-white border-r border-gray-600">Position</div>
              {weekDates.map((date, index) => {
                const isToday = isSameDay(date, new Date());
                return (
                  <div key={index} className={`p-4 text-center border-r border-gray-600 ${isToday ? 'bg-yellow-400' : ''}`}>
                    <div className={`font-bold ${isToday ? 'text-slate-900' : 'text-white'}`}>
                      {format(date, 'EEE')}
                    </div>
                    <div className={`text-xs mt-1 ${isToday ? 'text-slate-700' : 'text-gray-300'}`}>
                      {format(date, 'dd MMM')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Body with Drag & Drop */}
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                {displayPositions.map((position, posIndex) => {
                  const hasShifts = shifts.some(s => s.role === position.name);
                  
                  return (
                    <div key={posIndex} className={`grid grid-cols-8 border-b ${hasShifts ? position.color : 'bg-white'}`}>
                      {/* Position Label */}
                      <div className="p-4 border-r flex items-center gap-3">
                        <div className={`w-1 h-12 rounded ${position.darkColor}`} />
                        <div>
                          <p className={`font-bold ${position.textColor}`}>{position.name}</p>
                          <p className="text-xs text-gray-600">
                            {shifts.filter(s => s.role === position.name).length} shift(s)
                          </p>
                        </div>
                      </div>

                      {/* Day Cells */}
                      {weekDates.map((date, dayIndex) => {
                        const dayShifts = getShiftsByPositionAndDate(position.name, date);
                        const isToday = isSameDay(date, new Date());
                        const droppableId = `${position.name}|${format(date, 'yyyy-MM-dd')}`;
                        
                        return (
                          <Droppable key={dayIndex} droppableId={droppableId}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`p-2 border-r min-h-[100px] transition-colors ${
                                  snapshot.isDraggingOver ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                                } ${isToday ? 'bg-yellow-50/50' : ''}`}
                              >
                                {dayShifts.length === 0 ? (
                                  <div className="flex items-center justify-center h-full text-xs text-gray-400">
                                    {snapshot.isDraggingOver && <span className="text-blue-600 font-semibold">Drop Here</span>}
                                  </div>
                                ) : (
                                  dayShifts.map((shift, shiftIndex) => (
                                    <Draggable key={shift.id} draggableId={shift.id} index={shiftIndex}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`mb-2 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                                        >
                                          <ShiftCard
                                            shift={shift}
                                            position={position}
                                            onEdit={() => handleEditShift(shift)}
                                            onDelete={() => handleDeleteShift(shift.id)}
                                            onGenerateTasks={() => handleGenerateTasks(shift)}
                                            onPreviewTasks={() => {
                                              setPreviewShift(shift);
                                              setShowTaskPreview(true);
                                            }}
                                          />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))
                                )}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        );
                      })}
                    </div>
                  );
                })}
              </DragDropContext>
            )}
          </CardContent>
        </Card>

        {/* Week Summary Section */}
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">📊 Week Summary</h2>
          
          {/* Overview Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            {/* Total Hours */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 opacity-80" />
                  <Badge className="bg-white/20 text-white border-none">Week {weekNumber}</Badge>
                </div>
                <p className="text-3xl font-bold mb-1">
                  {shifts.reduce((total, shift) => {
                    const [startH, startM] = shift.start_time.split(':').map(Number);
                    const [endH, endM] = shift.end_time.split(':').map(Number);
                    const hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
                    return total + hours;
                  }, 0).toFixed(1)}h
                </p>
                <p className="text-sm text-blue-100">Total Weekly Hours</p>
              </CardContent>
            </Card>

            {/* Total Shifts */}
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-8 h-8 opacity-80" />
                  <Badge className="bg-white/20 text-white border-none">Active</Badge>
                </div>
                <p className="text-3xl font-bold mb-1">{shifts.length}</p>
                <p className="text-sm text-green-100">Total Shifts Scheduled</p>
              </CardContent>
            </Card>

            {/* Unique Staff */}
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 opacity-80" />
                  <Badge className="bg-white/20 text-white border-none">Team</Badge>
                </div>
                <p className="text-3xl font-bold mb-1">
                  {new Set(shifts.map(s => s.staff_email)).size}
                </p>
                <p className="text-sm text-purple-100">Staff Members Working</p>
              </CardContent>
            </Card>

            {/* Tasks Status */}
            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-8 h-8 opacity-80" />
                  <Badge className="bg-white/20 text-white border-none">Auto</Badge>
                </div>
                <p className="text-3xl font-bold mb-1">
                  {shifts.filter(s => s.auto_generated_tasks).length}/{shifts.length}
                </p>
                <p className="text-sm text-amber-100">Shifts with Tasks</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Hours by Position */}
            <Card className="bg-white border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Hours by Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {POSITIONS.filter(pos => shifts.some(s => s.role === pos.name)).map((position) => {
                    const positionShifts = shifts.filter(s => s.role === position.name);
                    const totalHours = positionShifts.reduce((total, shift) => {
                      const [startH, startM] = shift.start_time.split(':').map(Number);
                      const [endH, endM] = shift.end_time.split(':').map(Number);
                      const hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
                      return total + hours;
                    }, 0);

                    const totalShiftsInWeek = shifts.length;
                    const percentage = totalShiftsInWeek > 0 
                      ? (positionShifts.length / totalShiftsInWeek) * 100 
                      : 0;

                    return (
                      <div key={position.name} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${position.darkColor}`} />
                            <span className="font-medium text-gray-900">{position.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600">{positionShifts.length} shifts</span>
                            <span className="font-bold text-gray-900">{totalHours.toFixed(1)}h</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`${position.darkColor} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Daily Breakdown */}
            <Card className="bg-white border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Daily Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weekDates.map((date, index) => {
                    const dayShifts = shifts.filter(s => isSameDay(parseISO(s.shift_date), date));
                    const totalHours = dayShifts.reduce((total, shift) => {
                      const [startH, startM] = shift.start_time.split(':').map(Number);
                      const [endH, endM] = shift.end_time.split(':').map(Number);
                      const hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
                      return total + hours;
                    }, 0);

                    const isToday = isSameDay(date, new Date());

                    // Calculate max hours for scaling the progress bar
                    const maxHours = Math.max(...weekDates.map(d => {
                      const ds = shifts.filter(s => isSameDay(parseISO(s.shift_date), d));
                      return ds.reduce((t, s) => {
                        const [startH, startM] = s.start_time.split(':').map(Number);
                        const [endH, endM] = s.end_time.split(':').map(Number);
                        return t + ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
                      }, 0);
                    }));
                    const percentage = maxHours > 0 ? (totalHours / maxHours) * 100 : 0;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className={`font-medium ${isToday ? 'text-yellow-600' : 'text-gray-900'}`}>
                            {isToday && '👉 '}{format(date, 'EEEE')}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600">{dayShifts.length} shifts</span>
                            <span className="font-bold text-gray-900">{totalHours.toFixed(1)}h</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`${isToday ? 'bg-yellow-500' : 'bg-green-500'} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff Utilization */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Staff Utilization This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left p-3 font-semibold text-gray-900">Staff Member</th>
                      <th className="text-center p-3 font-semibold text-gray-900">Role</th>
                      <th className="text-center p-3 font-semibold text-gray-900">Shifts</th>
                      <th className="text-center p-3 font-semibold text-gray-900">Total Hours</th>
                      <th className="text-center p-3 font-semibold text-gray-900">Avg per Shift</th>
                      <th className="text-center p-3 font-semibold text-gray-900">Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(
                      shifts.reduce((acc, shift) => {
                        if (!acc[shift.staff_email]) {
                          acc[shift.staff_email] = {
                            name: shift.staff_name,
                            email: shift.staff_email,
                            role: shift.role,
                            shifts: [],
                          };
                        }
                        acc[shift.staff_email].shifts.push(shift);
                        return acc;
                      }, {})
                    ).map(([email, data]) => {
                      const totalHours = data.shifts.reduce((total, shift) => {
                        const [startH, startM] = shift.start_time.split(':').map(Number);
                        const [endH, endM] = shift.end_time.split(':').map(Number);
                        const hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
                        return total + hours;
                      }, 0);

                      const avgHours = totalHours / data.shifts.length;
                      const shiftsWithTasks = data.shifts.filter(s => s.auto_generated_tasks).length;

                      return (
                        <tr key={email} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-gray-900">{data.name}</p>
                              <p className="text-xs text-gray-500">{email}</p>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className="bg-gray-100 text-gray-800">
                              {data.role}
                            </Badge>
                          </td>
                          <td className="p-3 text-center font-semibold">{data.shifts.length}</td>
                          <td className="p-3 text-center font-bold text-blue-600">{totalHours.toFixed(1)}h</td>
                          <td className="p-3 text-center text-gray-600">{avgHours.toFixed(1)}h</td>
                          <td className="p-3 text-center">
                            {shiftsWithTasks === data.shifts.length ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {shiftsWithTasks}/{data.shifts.length}
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {shiftsWithTasks}/{data.shifts.length}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Coverage Alerts */}
          {shifts.length > 0 && (
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 mb-2">📋 Coverage Insights</h3>
                    <div className="space-y-2 text-sm text-amber-800">
                      <p>• <strong>{shifts.filter(s => !s.auto_generated_tasks).length}</strong> shifts need task generation</p>
                      <p>• <strong>{weekDates.filter(date => !shifts.some(s => isSameDay(parseISO(s.shift_date), date))).length}</strong> days have no shifts scheduled</p>
                      <p>• <strong>{POSITIONS.filter(pos => !shifts.some(s => s.role === pos.name)).length}</strong> positions not covered this week</p>
                      <p>• Average shift length: <strong>
                        {(shifts.reduce((total, shift) => {
                          const [startH, startM] = shift.start_time.split(':').map(Number);
                          const [endH, endM] = shift.end_time.split(':').map(Number);
                          return total + ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
                        }, 0) / (shifts.length || 1)).toFixed(1)}h
                      </strong></p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Legend */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-6 flex-wrap">
              <p className="font-semibold text-gray-900">Position Colors:</p>
              {POSITIONS.map((pos, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${pos.darkColor}`} />
                  <span className="text-sm text-gray-700">{pos.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Shift Dialog */}
      <Dialog open={showAddShiftDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedShift ? 'Edit Shift' : 'Add New Shift'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Staff Member *</Label>
                <Select 
                  value={shiftForm.staff_email} 
                  onValueChange={(value) => {
                    const staff = users.find(u => u.email === value);
                    setShiftForm({
                      ...shiftForm,
                      staff_email: value,
                      staff_name: staff?.full_name || "",
                      role: staff?.position || "",
                      department: getDefaultDepartment(staff?.position),
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.email} value={u.email}>
                        {u.full_name} ({u.position})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Role/Position *</Label>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => (
                      <SelectItem key={pos.name} value={pos.name}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={shiftForm.shift_date}
                  onChange={(e) => setShiftForm({ ...shiftForm, shift_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Shift Type</Label>
                <Select value={shiftForm.shift_type} onValueChange={(value) => setShiftForm({ ...shiftForm, shift_type: value })}>
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

              <div>
                <Label>Start Time *</Label>
                <Select 
                  value={shiftForm.start_time} 
                  onValueChange={(value) => setShiftForm({ ...shiftForm, start_time: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {generateTimeOptions().map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>End Time *</Label>
                <Select 
                  value={shiftForm.end_time} 
                  onValueChange={(value) => setShiftForm({ ...shiftForm, end_time: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {generateTimeOptions().map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Department</Label>
                <Input
                  value={shiftForm.department}
                  disabled
                  placeholder="Auto-filled from role"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label>Location (Optional)</Label>
                <Input
                  value={shiftForm.location || ""}
                  onChange={(e) => setShiftForm({ ...shiftForm, location: e.target.value })}
                  placeholder="e.g., Main Restaurant"
                />
              </div>
            </div>

            {/* Selected Staff Info */}
            {shiftForm.staff_email && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {shiftForm.staff_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">{shiftForm.staff_name}</p>
                    <p className="text-sm text-blue-700">
                      {shiftForm.role} • {shiftForm.department}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button 
                onClick={handleSaveShift} 
                disabled={!shiftForm.staff_email || !shiftForm.role || !shiftForm.shift_date || !shiftForm.start_time || !shiftForm.end_time}
                className="bg-blue-600"
              >
                {selectedShift ? 'Update' : 'Create'} Shift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Preview Dialog */}
      <Dialog open={showTaskPreview} onOpenChange={setShowTaskPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tasks: {previewShift?.staff_name}</DialogTitle>
          </DialogHeader>
          {previewShift && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">{previewShift.role}</p>
                <p className="text-sm text-gray-600">
                  {format(parseISO(previewShift.shift_date), 'EEEE, MMM d')} • {previewShift.start_time} - {previewShift.end_time}
                </p>
                {previewShift.location && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {previewShift.location}
                  </p>
                )}
              </div>

              {previewShift.auto_generated_tasks && tasks.filter(t => t.shift_id === previewShift.id).length > 0 ? (
                <div className="space-y-2">
                  {tasks.filter(t => t.shift_id === previewShift.id).map((task, i) => (
                    <Card key={i} className="border-l-4 border-blue-500">
                      <CardContent className="p-4">
                        <p className="font-medium">{task.task_name}</p>
                        <p className="text-sm text-gray-600">{task.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge>{task.task_type}</Badge>
                          <Badge>Due: {task.due_time}</Badge>
                          <Badge>{task.priority}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                  <p className="font-semibold text-yellow-900">No Tasks Generated or Found</p>
                  <Button 
                    onClick={() => {
                      setShowTaskPreview(false);
                      handleGenerateTasks(previewShift);
                    }}
                    className="mt-4 bg-green-600"
                  >
                    Generate Tasks Now
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
