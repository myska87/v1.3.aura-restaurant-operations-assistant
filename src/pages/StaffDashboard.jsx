import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BarChart3, Settings, Calendar, Clock, GraduationCap } from 'lucide-react';
import TeamDirectory from './TeamDirectory';
import StaffRota from './StaffRota';
import SmartScheduler from './SmartScheduler';
import AttendanceReports from './AttendanceReports';
import PayrollDashboard from './PayrollDashboard';
import OnboardingTraining from './OnboardingTraining';
import PerformanceGrowth from './PerformanceGrowth';
import MyShifts from './MyShifts';
import ManageAvailability from './ManageAvailability';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Staff Hub</h1>
                <p className="text-gray-600">Team management, scheduling, and development</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team
              </TabsTrigger>
              <TabsTrigger value="scheduling" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Scheduling
              </TabsTrigger>
              <TabsTrigger value="development" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Development
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <TeamDirectory />
            </TabsContent>

            <TabsContent value="scheduling">
              <Tabs defaultValue={isManager ? "scheduler" : "myshifts"} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="myshifts">My Shifts</TabsTrigger>
                  {isManager && <TabsTrigger value="scheduler">Scheduler</TabsTrigger>}
                  {isManager && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
                  {isManager && <TabsTrigger value="payroll">Payroll</TabsTrigger>}
                </TabsList>

                <TabsContent value="myshifts">
                  <div className="space-y-6">
                    <MyShifts />
                    <ManageAvailability />
                  </div>
                </TabsContent>

                {isManager && (
                  <>
                    <TabsContent value="scheduler">
                      <div className="space-y-6">
                        <SmartScheduler />
                        <StaffRota />
                      </div>
                    </TabsContent>

                    <TabsContent value="attendance">
                      <AttendanceReports />
                    </TabsContent>

                    <TabsContent value="payroll">
                      <PayrollDashboard />
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </TabsContent>

            <TabsContent value="development" className="space-y-6">
              <Tabs defaultValue="training" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="training">Training & Onboarding</TabsTrigger>
                  <TabsTrigger value="performance">Performance & Growth</TabsTrigger>
                </TabsList>

                <TabsContent value="training">
                  <OnboardingTraining />
                </TabsContent>

                <TabsContent value="performance">
                  <PerformanceGrowth />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}