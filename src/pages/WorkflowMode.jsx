import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  Calendar,
  ClipboardCheck,
  Package,
  Users,
  FileText,
  Star,
  Home,
  ChevronRight,
  Timer,
  Coffee
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const workflowSteps = {
  manager: [
    { id: 'opening_checklist', title: 'Opening Checklist', icon: ClipboardCheck, color: 'blue' },
    { id: 'inventory_check', title: 'Inventory Check', icon: Package, color: 'green' },
    { id: 'staff_briefing', title: 'Staff Briefing', icon: Users, color: 'purple' },
    { id: 'daily_tasks', title: 'Daily Tasks Review', icon: FileText, color: 'amber' },
    { id: 'quality_check', title: 'Quality Walkthrough', icon: Star, color: 'pink' },
    { id: 'closing_checklist', title: 'Closing Checklist', icon: ClipboardCheck, color: 'indigo' },
  ],
  kitchen: [
    { id: 'opening_prep', title: 'Kitchen Opening', icon: ClipboardCheck, color: 'blue' },
    { id: 'temperature_checks', title: 'Temperature Logs', icon: Clock, color: 'red' },
    { id: 'prep_tasks', title: 'Prep Tasks', icon: FileText, color: 'green' },
    { id: 'hygiene_check', title: 'Hygiene Checks', icon: Star, color: 'teal' },
    { id: 'closing_clean', title: 'Kitchen Closing', icon: ClipboardCheck, color: 'indigo' },
  ],
  front_of_house: [
    { id: 'opening_setup', title: 'FOH Opening', icon: ClipboardCheck, color: 'blue' },
    { id: 'cleanliness_check', title: 'Cleanliness Check', icon: Star, color: 'green' },
    { id: 'service_tasks', title: 'Service Tasks', icon: FileText, color: 'purple' },
    { id: 'closing_checklist', title: 'FOH Closing', icon: ClipboardCheck, color: 'indigo' },
  ],
};

export default function WorkflowMode() {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [notes, setNotes] = useState({});
  const [startTime] = useState(new Date());

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: todayShift } = useQuery({
    queryKey: ['myTodayShift'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const shifts = await base44.entities.Shift.filter({ 
        staff_email: user?.email, 
        shift_date: today 
      });
      return shifts[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ['myTodayTasks'],
    queryFn: async () => {
      const tasks = await base44.entities.StaffTask.filter({
        assigned_to: user?.email,
        status: { $in: ['pending', 'in_progress'] }
      });
      return tasks;
    },
    enabled: !!user?.email,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTodayTasks'] });
    },
  });

  const department = user?.department || 'front_of_house';
  const role = user?.position || 'server';
  
  let steps = workflowSteps[department] || workflowSteps.front_of_house;
  
  if (role === 'manager' || role === 'owner') {
    steps = workflowSteps.manager;
  }

  const currentStep = steps[activeStep];
  const progress = (completedSteps.length / steps.length) * 100;
  const elapsedMinutes = differenceInMinutes(new Date(), startTime);

  const handleCompleteStep = () => {
    if (!completedSteps.includes(currentStep.id)) {
      setCompletedSteps([...completedSteps, currentStep.id]);
    }
    
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleSkipStep = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleCompleteTask = async (taskId) => {
    await updateTaskMutation.mutateAsync({
      id: taskId,
      data: {
        status: 'completed',
        completed_date: new Date().toISOString(),
        completion_notes: notes[taskId] || '',
      }
    });
  };

  const isAllComplete = completedSteps.length === steps.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🌟 Workflow Mode</h1>
            <p className="text-gray-600">Your guided daily routine</p>
          </div>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Exit Workflow
            </Button>
          </Link>
        </div>

        {/* Progress Card */}
        <Card className="mb-6 bg-gradient-to-r from-emerald-500 to-blue-500 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/80 text-sm">Today's Progress</p>
                <p className="text-3xl font-bold">{completedSteps.length}/{steps.length} Steps</p>
              </div>
              <div className="text-right">
                <p className="text-white/80 text-sm">Time Elapsed</p>
                <p className="text-2xl font-bold">
                  <Timer className="w-5 h-5 inline mr-1" />
                  {elapsedMinutes}m
                </p>
              </div>
            </div>
            <Progress value={progress} className="h-3 bg-white/20" />
            <p className="text-white/80 text-sm mt-2">{Math.round(progress)}% Complete</p>
          </CardContent>
        </Card>

        {/* Current Step */}
        {!isAllComplete ? (
          <Card className="mb-6 border-2 border-emerald-400 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full bg-${currentStep.color}-100 flex items-center justify-center`}>
                    {React.createElement(currentStep.icon, { className: `w-6 h-6 text-${currentStep.color}-600` })}
                  </div>
                  <div>
                    <Badge className="mb-1">Step {activeStep + 1} of {steps.length}</Badge>
                    <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Related Tasks */}
              {myTasks.filter(t => 
                t.category?.toLowerCase().includes(currentStep.id.split('_')[0]) ||
                t.task_name?.toLowerCase().includes(currentStep.title.toLowerCase())
              ).length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Related Tasks:</h4>
                  <div className="space-y-2">
                    {myTasks.filter(t => 
                      t.category?.toLowerCase().includes(currentStep.id.split('_')[0]) ||
                      t.task_name?.toLowerCase().includes(currentStep.title.toLowerCase())
                    ).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{task.task_name}</p>
                          <p className="text-sm text-gray-600">{task.description}</p>
                        </div>
                        {task.status === 'completed' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Done
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteTask(task.id)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Mark Done
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {currentStep.id.includes('checklist') && (
                  <Link to={createPageUrl('MyChecklists')}>
                    <Button variant="outline" className="w-full">
                      <ClipboardCheck className="w-4 h-4 mr-2" />
                      Open Checklists
                    </Button>
                  </Link>
                )}
                {currentStep.id.includes('inventory') && (
                  <Link to={createPageUrl('InventoryManagement')}>
                    <Button variant="outline" className="w-full">
                      <Package className="w-4 h-4 mr-2" />
                      Check Inventory
                    </Button>
                  </Link>
                )}
                {currentStep.id.includes('quality') && (
                  <Link to={createPageUrl('QuickQualityCheck')}>
                    <Button variant="outline" className="w-full">
                      <Star className="w-4 h-4 mr-2" />
                      Quality Check
                    </Button>
                  </Link>
                )}
                {currentStep.id.includes('tasks') && (
                  <Link to={createPageUrl('MyTasks')}>
                    <Button variant="outline" className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      View All Tasks
                    </Button>
                  </Link>
                )}
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Step Notes (optional)
                </label>
                <Textarea
                  value={notes[currentStep.id] || ''}
                  onChange={(e) => setNotes({ ...notes, [currentStep.id]: e.target.value })}
                  placeholder="Add any observations or notes..."
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSkipStep}
                  variant="outline"
                  className="flex-1"
                >
                  Skip for Now
                </Button>
                <Button
                  onClick={handleCompleteStep}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Step
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                🎉 All Steps Complete!
              </h2>
              <p className="text-gray-600 mb-6">
                Great work! You've completed your workflow in {elapsedMinutes} minutes.
              </p>
              <div className="flex gap-3 justify-center">
                <Link to={createPageUrl('Dashboard')}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Home className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
                <Button onClick={() => {
                  setCompletedSteps([]);
                  setActiveStep(0);
                  setNotes({});
                }} variant="outline">
                  Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Steps Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workflow Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = index === activeStep;
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.id}
                    onClick={() => setActiveStep(index)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isCurrent
                        ? 'border-emerald-400 bg-emerald-50 shadow-md'
                        : isCompleted
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? 'bg-green-500'
                            : isCurrent
                            ? 'bg-emerald-500'
                            : 'bg-gray-200'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-white" />
                          ) : (
                            <StepIcon className={`w-5 h-5 ${isCurrent ? 'text-white' : 'text-gray-500'}`} />
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${isCurrent ? 'text-emerald-700' : 'text-gray-900'}`}>
                            {step.title}
                          </p>
                          <p className="text-xs text-gray-500">Step {index + 1}</p>
                        </div>
                      </div>
                      {isCurrent && <ChevronRight className="w-5 h-5 text-emerald-600" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        {todayShift && (
          <Card className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Your Shift</p>
                  <p className="font-bold text-gray-900">{todayShift.start_time} - {todayShift.end_time}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Tasks</p>
                  <p className="font-bold text-gray-900">
                    {myTasks.filter(t => t.status === 'completed').length}/{myTasks.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Progress</p>
                  <p className="font-bold text-emerald-600">{Math.round(progress)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}