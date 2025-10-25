import React, { useState, useEffect } from "react";
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
  Users,
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
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, getWeek, parseISO, isSameDay } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const POSITIONS = [
  { 
    name: "Manager", 
    color: "bg-red-100", 
    darkColor: "bg-red-500",
    textColor: "text-red-900", 
    borderColor: "border-red-500",
    hoverColor: "hover:bg-red-200"
  },
  { 
    name: "Chef", 
    color: "bg-orange-100", 
    darkColor: "bg-orange-500",
    textColor: "text-orange-900", 
    borderColor: "border-orange-500",
    hoverColor: "hover:bg-orange-200"
  },
  { 
    name: "Barista", 
    color: "bg-green-100", 
    darkColor: "bg-green-500",
    textColor: "text-green-900", 
    borderColor: "border-green-500",
    hoverColor: "hover:bg-green-200"
  },
  { 
    name: "Front of House", 
    color: "bg-blue-100", 
    darkColor: "bg-blue-500",
    textColor: "text-blue-900", 
    borderColor: "border-blue-500",
    hoverColor: "hover:bg-blue-200"
  },
  { 
    name: "Server", 
    color: "bg-purple-100", 
    darkColor: "bg-purple-500",
    textColor: "text-purple-900", 
    borderColor: "border-purple-500",
    hoverColor: "hover:bg-purple-200"
  },
  { 
    name: "Line Cook", 
    color: "bg-amber-100", 
    darkColor: "bg-amber-500",
    textColor: "text-amber-900", 
    borderColor: "border-amber-500",
    hoverColor: "hover:bg-amber-200"
  },
  { 
    name: "Bartender", 
    color: "bg-indigo-100", 
    darkColor: "bg-indigo-500",
    textColor: "text-indigo-900", 
    borderColor: "border-indigo-500",
    hoverColor: "hover:bg-indigo-200"
  },
  { 
    name: "Cleaner", 
    color: "bg-gray-100", 
    darkColor: "bg-gray-500",
    textColor: "text-gray-900", 
    borderColor: "border-gray-500",
    hoverColor: "hover:bg-gray-200"
  },
];

// Shift Details Popup Component
function ShiftDetailsPopup({ shift, position, onEdit, onDelete, onGenerateTasks, onPreviewTasks }) {
  return (
    <div className="space-y-3 min-w-[300px]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{shift.staff_name}</h3>
          <p className="text-sm text-gray-600">{shift.role}</p>
        </div>
        <Badge className={position.color + " " + position.textColor}>
          {position.name}
        </Badge>
      </div>

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="font-semibold">
            {shift.start_time} - {shift.end_time}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span>{format(parseISO(shift.shift_date), 'EEEE, MMMM d, yyyy')}</span>
        </div>
        {shift.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{shift.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4 text-gray-500" />
          <span className="truncate">{shift.staff_email}</span>
        </div>
      </div>

      <div className="border-t pt-3">
        {shift.auto_generated_tasks ? (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Tasks Generated</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-900">No Tasks Yet</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        {!shift.auto_generated_tasks && (
          <Button
            onClick={onGenerateTasks}
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Zap className="w-3 h-3 mr-1" />
            Generate Tasks
          </Button>
        )}
        <Button
          onClick={onPreviewTasks}
          size="sm"
          variant="outline"
          className="flex-1"
        >
          <Eye className="w-3 h-3 mr-1" />
          Preview
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onEdit}
          size="sm"
          variant="outline"
          className="flex-1"
        >
          <Edit className="w-3 h-3 mr-1" />
          Edit
        </Button>
        <Button
          onClick={onDelete}
          size="sm"
          variant="outline"
          className="flex-1 text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export default function SmartScheduler() {
  const queryClient = useQueryClient();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showTaskPreview, setShowTaskPreview] = useState(false);
  const [previewShift, setPreviewShift] = useState(null);
  const [generatingTasks, setGeneratingTasks] = useState(false);

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

  // Helper function to get department
  const getDefaultDepartment = (position) => {
    const deptMap = {
      'chef': 'kitchen',
      'line_cook': 'kitchen',
      'server': 'front_of_house',
      'bartender': 'bar',
      'manager': 'management',
      'cleaner': 'cleaning',
      'barista': 'bar',
      'front of house': 'front_of_house',
    };
    return deptMap[position?.toLowerCase()] || 'general';
  };

  // Helper function to get shifts by position and date
  const getShiftsByPositionAndDate = (position, date) => {
    return shifts.filter(shift => {
      return (
        shift.role === position &&
        isSameDay(parseISO(shift.shift_date), date)
      );
    });
  };

  // Mutations
  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      resetForm();
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      setSelectedShift(null);
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
    },
  });

  const generateTasksMutation = useMutation({
    mutationFn: async (shift) => {
      const roleResponsibilities = responsibilities.find(
        r => r.position === shift.role && r.is_active && r.auto_assign_enabled
      );

      if (!roleResponsibilities) {
        throw new Error(`No responsibilities found for role: ${shift.role}`);
      }

      const tasksToCreate = [];
      const shiftDate = shift.shift_date;
      const dayOfWeek = format(parseISO(shiftDate), 'EEEE').toLowerCase();

      // Generate daily tasks
      if (roleResponsibilities.daily_tasks) {
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
            linked_form_id: task.linked_form_id || null,
            priority: task.priority || "medium",
            estimated_minutes: task.estimated_minutes || 30,
            due_time: dueTime,
            status: "pending",
            requires_photo: task.requires_photo || false,
            created_automatically: true,
            task_type: "daily",
          });
        });
      }

      // Generate weekly tasks
      if (roleResponsibilities.weekly_tasks) {
        roleResponsibilities.weekly_tasks.forEach((task) => {
          if (task.day_of_week === dayOfWeek) {
            const dueTime = calculateDueTime(shift.end_time, task.estimated_minutes || 60);
            
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
              linked_form_id: task.linked_form_id || null,
              priority: task.priority || "medium",
              estimated_minutes: task.estimated_minutes || 60,
              due_time: dueTime,
              status: "pending",
              requires_photo: task.requires_photo || false,
              created_automatically: true,
              task_type: "weekly",
            });
          }
        });
      }

      if (tasksToCreate.length > 0) {
        await base44.entities.AutoGeneratedTask.bulkCreate(tasksToCreate);
        
        await base44.entities.Shift.update(shift.id, {
          auto_generated_tasks: true,
          tasks_generated_at: new Date().toISOString(),
        });
      }

      return { tasksCreated: tasksToCreate.length, shift };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      queryClient.invalidateQueries({ queryKey: ['autoGeneratedTasks'] });
      alert(`✅ Successfully generated ${result.tasksCreated} tasks for this shift!`);
    },
    onError: (error) => {
      alert(`❌ Error generating tasks: ${error.message}`);
    },
  });

  const calculateDueTime = (shiftEndTime, minutesBefore) => {
    const [hours, minutes] = shiftEndTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes - minutesBefore;
    const dueHours = Math.floor(totalMinutes / 60);
    const dueMinutes = totalMinutes % 60;
    return `${String(dueHours).padStart(2, '0')}:${String(dueMinutes).padStart(2, '0')}`;
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
    });
  };

  const handleSaveShift = async () => {
    if (!shiftForm.staff_email || !shiftForm.shift_date || !shiftForm.start_time || !shiftForm.end_time) {
      alert("Please fill in all required fields");
      return;
    }

    const staffMember = users.find(u => u.email === shiftForm.staff_email);
    
    const data = {
      ...shiftForm,
      staff_name: staffMember?.full_name || shiftForm.staff_name,
      role: shiftForm.role || staffMember?.position,
      department: shiftForm.department || getDefaultDepartment(staffMember?.position),
      status: "scheduled",
      auto_generated_tasks: false,
    };

    if (selectedShift) {
      await updateShiftMutation.mutateAsync({
        id: selectedShift.id,
        data
      });
    } else {
      const newShift = await createShiftMutation.mutateAsync(data);
      
      const hasResponsibilities = responsibilities.some(
        r => r.position === data.role && r.is_active && r.auto_assign_enabled
      );
      
      if (hasResponsibilities && confirm("🤖 Auto-generate tasks for this shift?")) {
        await generateTasksMutation.mutateAsync(newShift);
      }
    }
  };

  const handleGenerateTasks = async (shift) => {
    if (!shift.auto_generated_tasks) {
      setGeneratingTasks(true);
      await generateTasksMutation.mutateAsync(shift);
      setGeneratingTasks(false);
    } else {
      if (confirm("Tasks already generated. Regenerate and replace existing tasks?")) {
        const existingTasks = tasks.filter(t => t.shift_id === shift.id);
        for (const task of existingTasks) {
          await base44.entities.AutoGeneratedTask.delete(task.id);
        }
        
        setGeneratingTasks(true);
        await generateTasksMutation.mutateAsync(shift);
        setGeneratingTasks(false);
      }
    }
  };

  const handlePreviewTasks = (shift) => {
    setPreviewShift(shift);
    setShowTaskPreview(true);
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
    });
    setShowAddShiftDialog(true);
  };

  const handleDeleteShift = async (shiftId) => {
    if (confirm("Are you sure you want to delete this shift? This will also delete all auto-generated tasks.")) {
      const shiftTasks = tasks.filter(t => t.shift_id === shiftId);
      for (const task of shiftTasks) {
        await base44.entities.AutoGeneratedTask.delete(task.id);
      }
      
      await deleteShiftMutation.mutateAsync(shiftId);
    }
  };

  // DRAG AND DROP HANDLER
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    console.log('Drag ended:', { source, destination, draggableId });

    if (!destination) {
      console.log('No destination - dropped outside');
      return;
    }

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      console.log('No movement detected');
      return;
    }

    const [sourcePosition, sourceDate] = source.droppableId.split('-');
    const [destPosition, destDate] = destination.droppableId.split('-');

    console.log('Source:', sourcePosition, sourceDate);
    console.log('Destination:', destPosition, destDate);

    const shiftToMove = shifts.find(s => s.id === draggableId);
    
    if (!shiftToMove) {
      console.log('Shift not found:', draggableId);
      return;
    }

    console.log('Moving shift:', shiftToMove);

    const confirmMove = confirm(
      `Move ${shiftToMove.staff_name}'s shift from ${format(parseISO(sourceDate), 'EEE, MMM d')} to ${format(parseISO(destDate), 'EEE, MMM d')}?${
        sourcePosition !== destPosition ? `\nChange role from ${sourcePosition} to ${destPosition}?` : ''
      }`
    );

    if (!confirmMove) return;

    try {
      const updatedData = {
        shift_date: destDate,
        role: destPosition,
        department: getDefaultDepartment(destPosition),
      };

      console.log('Updating shift with:', updatedData);

      await updateShiftMutation.mutateAsync({
        id: draggableId,
        data: updatedData
      });

      if (shiftToMove.auto_generated_tasks) {
        if (confirm('This shift has auto-generated tasks. Would you like to regenerate them for the new date/role?')) {
          const oldTasks = tasks.filter(t => t.shift_id === draggableId);
          for (const task of oldTasks) {
            await base44.entities.AutoGeneratedTask.delete(task.id);
          }
          
          const updatedShift = { ...shiftToMove, ...updatedData };
          await generateTasksMutation.mutateAsync(updatedShift);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['weeklyShifts'] });
      alert('✅ Shift moved successfully!');
    } catch (error) {
      console.error('Error moving shift:', error);
      alert('❌ Error moving shift: ' + error.message);
    }
  };

  const calculateWeeklyStats = () => {
    const totalShifts = shifts.length;
    const shiftsWithTasks = shifts.filter(s => s.auto_generated_tasks).length;
    const totalHours = shifts.reduce((sum, shift) => {
      const [startHour, startMin] = shift.start_time.split(':').map(Number);
      const [endHour, endMin] = shift.end_time.split(':').map(Number);
      const minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      return sum + (minutes / 60);
    }, 0);

    return { totalShifts, shiftsWithTasks, totalHours: totalHours.toFixed(1) };
  };

  const stats = calculateWeeklyStats();
  const positionsWithShifts = POSITIONS.filter(pos => 
    shifts.some(shift => shift.role === pos.name)
  );

  const displayPositions = positionsWithShifts.length > 0 ? positionsWithShifts : POSITIONS;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        {/* Back Navigation */}
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
        <div className="mb-6">
          <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🤖 Smart Scheduler – Role-Based Planning
              </h1>
              <p className="text-gray-600">
                Drag & drop shifts, automatically assign tasks based on position
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddShiftDialog(true)} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Shift
              </Button>
            </div>
          </div>

          {/* Week Navigation & Stats */}
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-none">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">Week {weekNumber}</h2>
                    <p className="text-sm text-gray-600">
                      {format(currentWeekStart, 'dd MMM')} - {format(addDays(currentWeekStart, 6), 'dd MMM yyyy')}
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
                    <p className="text-2xl font-bold text-blue-600">{stats.totalShifts}</p>
                    <p className="text-xs text-gray-600">Total Shifts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.shiftsWithTasks}</p>
                    <p className="text-xs text-gray-600">Tasks Generated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{stats.totalHours}h</p>
                    <p className="text-xs text-gray-600">Total Hours</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gantt Chart with Drag & Drop */}
        <Card className="bg-white border-none shadow-lg overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-8 border-b-2 border-gray-300 bg-gradient-to-r from-slate-700 to-slate-800">
              <div className="p-4 font-bold text-white border-r border-gray-600">
                Position
              </div>
              {weekDates.map((date, index) => {
                const isToday = isSameDay(date, new Date());
                return (
                  <div 
                    key={index}
                    className={`p-4 text-center border-r border-gray-600 ${isToday ? 'bg-yellow-400' : ''}`}
                  >
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

            {/* Position Rows with Drag & Drop */}
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading schedule...</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <AnimatePresence>
                  {displayPositions.map((position, posIndex) => {
                    const positionShifts = shifts.filter(s => s.role === position.name);
                    const hasShifts = positionShifts.length > 0;
                    
                    return (
                      <motion.div
                        key={posIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: posIndex * 0.05 }}
                        className={`grid grid-cols-8 border-b border-gray-200 ${hasShifts ? position.color : 'bg-white'}`}
                      >
                        {/* Position Label with Color Bar */}
                        <div className="p-4 border-r border-gray-200 flex items-center gap-3">
                          <div className={`w-1 h-12 rounded ${position.darkColor}`} />
                          <div>
                            <p className={`font-bold ${position.textColor}`}>
                              {position.name}
                            </p>
                            {hasShifts && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                {positionShifts.length} shift{positionShifts.length !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Days with Droppable Zones */}
                        {weekDates.map((date, dayIndex) => {
                          const dayShifts = getShiftsByPositionAndDate(position.name, date);
                          const isToday = isSameDay(date, new Date());
                          const droppableId = `${position.name}-${format(date, 'yyyy-MM-dd')}`;
                          
                          return (
                            <Droppable key={dayIndex} droppableId={droppableId}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`p-2 border-r border-gray-200 min-h-[100px] relative transition-colors ${
                                    snapshot.isDraggingOver ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                                  } ${isToday ? 'bg-yellow-50/50' : ''} ${!hasShifts ? 'bg-gray-50/30' : ''}`}
                                >
                                  {dayShifts.length === 0 ? (
                                    <div className="flex items-center justify-center h-full">
                                      {snapshot.isDraggingOver ? (
                                        <div className="text-xs text-blue-600 font-semibold">
                                          Drop Here
                                        </div>
                                      ) : (
                                        <div className="text-xs text-gray-400">
                                          {hasShifts ? 'Empty Slot' : ''}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    dayShifts.map((shift, shiftIndex) => (
                                      <Draggable 
                                        key={shift.id} 
                                        draggableId={shift.id} 
                                        index={shiftIndex}
                                      >
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                          >
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <motion.div
                                                  initial={{ scale: 0.8, opacity: 0 }}
                                                  animate={{ scale: 1, opacity: 1 }}
                                                  transition={{ delay: shiftIndex * 0.1 }}
                                                  className={`${position.darkColor} text-white rounded-lg shadow-md p-3 mb-2 cursor-move transition-all hover:shadow-lg hover:scale-105 ${
                                                    snapshot.isDragging ? 'ring-4 ring-blue-400 rotate-2 scale-110 shadow-2xl' : ''
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                                                      <span className="text-xs font-bold">{shift.staff_name?.charAt(0) || '?'}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <p className="text-xs font-bold truncate">
                                                        {shift.staff_name || shift.staff_email}
                                                      </p>
                                                    </div>
                                                  </div>
                                                  <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {shift.start_time} - {shift.end_time}
                                                  </p>
                                                  <div className="flex items-center gap-1">
                                                    {shift.auto_generated_tasks ? (
                                                      <Badge className="bg-white/30 text-white text-[10px] px-1.5 py-0.5 backdrop-blur-sm">
                                                        <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                                                        Tasks Ready
                                                      </Badge>
                                                    ) : (
                                                      <Badge className="bg-yellow-400 text-yellow-900 text-[10px] px-1.5 py-0.5">
                                                        <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                                                        No Tasks
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  {snapshot.isDragging && (
                                                    <div className="absolute top-1 right-1 text-xs font-bold bg-blue-500 px-2 py-1 rounded-full">
                                                      Dragging...
                                                    </div>
                                                  )}
                                                </motion.div>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-4" side="top">
                                                <ShiftDetailsPopup
                                                  shift={shift}
                                                  position={position}
                                                  onEdit={() => handleEditShift(shift)}
                                                  onDelete={() => handleDeleteShift(shift.id)}
                                                  onGenerateTasks={() => handleGenerateTasks(shift)}
                                                  onPreviewTasks={() => handlePreviewTasks(shift)}
                                                />
                                              </PopoverContent>
                                            </Popover>
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
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </DragDropContext>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6 items-center">
              <p className="font-semibold text-gray-900">Color Guide:</p>
              {POSITIONS.map((pos, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${pos.darkColor}`} />
                  <span className="text-sm text-gray-700">{pos.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Legend */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <p className="font-semibold text-gray-900">Quick Actions:</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-3 h-3 bg-blue-500 rounded cursor-move" />
                  <span className="font-semibold">Drag & Drop</span>
                </motion.div>
                <span>- Move shifts between days and positions</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Zap className="w-4 h-4 text-green-600" />
                <span>Auto-Generate Tasks</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Preview Tasks</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Edit className="w-4 h-4 text-gray-600" />
                <span>Edit Shift</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Delete Shift</span>
              </div>
              <div className="ml-auto text-sm text-gray-500 italic">
                💡 Click on any shift for detailed options
              </div>
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
                    <SelectValue placeholder="Select staff member" />
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
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={shiftForm.shift_date}
                  onChange={(e) => setShiftForm({ ...shiftForm, shift_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                />
              </div>

              <div>
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
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
                <Label>Role</Label>
                <Input
                  value={shiftForm.role}
                  onChange={(e) => setShiftForm({ ...shiftForm, role: e.target.value })}
                  placeholder="Auto-filled from staff profile"
                />
              </div>
            </div>

            {shiftForm.role && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-1">Auto-Task Generation</p>
                      <p className="text-sm text-blue-800">
                        {responsibilities.some(r => r.position === shiftForm.role && r.is_active && r.auto_assign_enabled)
                          ? `✅ Tasks will be auto-generated for "${shiftForm.role}" when you save this shift.`
                          : `⚠️ No responsibilities defined for "${shiftForm.role}". Tasks won't be auto-generated.`
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSaveShift} className="bg-blue-600">
                {selectedShift ? 'Update Shift' : 'Create Shift'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Preview Dialog */}
      <Dialog open={showTaskPreview} onOpenChange={setShowTaskPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Preview: {previewShift?.staff_name}</DialogTitle>
          </DialogHeader>
          {previewShift && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">{previewShift.role}</p>
                  <p className="text-sm text-gray-600">
                    {format(parseISO(previewShift.shift_date), 'EEEE, MMM d')} • {previewShift.start_time} - {previewShift.end_time}
                  </p>
                </div>
                {!previewShift.auto_generated_tasks && (
                  <Button 
                    onClick={() => {
                      setShowTaskPreview(false);
                      handleGenerateTasks(previewShift);
                    }}
                    className="bg-green-600"
                    disabled={generatingTasks}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {generatingTasks ? 'Generating...' : 'Generate Tasks'}
                  </Button>
                )}
              </div>

              {previewShift.auto_generated_tasks ? (
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900">Generated Tasks:</p>
                  {tasks
                    .filter(t => t.shift_id === previewShift.id)
                    .map((task, index) => (
                      <Card key={index} className="border-l-4 border-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{task.task_name}</p>
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {task.task_type}
                                </Badge>
                                <Badge className="text-xs">
                                  Due: {task.due_time}
                                </Badge>
                                <Badge className={`text-xs ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {task.priority}
                                </Badge>
                              </div>
                            </div>
                            <Badge className={
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {task.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                  <p className="font-semibold text-yellow-900 mb-2">No Tasks Generated Yet</p>
                  <p className="text-sm text-yellow-800">
                    Click "Generate Tasks" to automatically create tasks based on role responsibilities
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}