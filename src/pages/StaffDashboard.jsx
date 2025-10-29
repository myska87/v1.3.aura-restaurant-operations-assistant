import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, GraduationCap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

// Lazy load components
const TeamDirectory = React.lazy(() => import('./TeamDirectory'));
const MyShifts = React.lazy(() => import('./MyShifts'));
const ManageAvailability = React.lazy(() => import('./ManageAvailability'));
const SmartScheduler = React.lazy(() => import('./SmartScheduler'));
const StaffRota = React.lazy(() => import('./StaffRota'));
const AttendanceReports = React.lazy(() => import('./AttendanceReports'));
const PayrollDashboard = React.lazy(() => import('./PayrollDashboard'));
const OnboardingTraining = React.lazy(() => import('./OnboardingTraining'));
const PerformanceGrowth = React.lazy(() => import('./PerformanceGrowth'));

const LoadingFallback = () => (
  <Card>
    <CardContent className="p-12 text-center">
      <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </CardContent>
  </Card>
);

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
              <TabsTrigger value="overview">
                <Users className="w-4 h-4 mr-2" />
                Team
              </TabsTrigger>
              <TabsTrigger value="scheduling">
                <Calendar className="w-4 h-4 mr-2" />
                Scheduling
              </TabsTrigger>
              <TabsTrigger value="development">
                <GraduationCap className="w-4 h-4 mr-2" />
                Development
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <React.Suspense fallback={<LoadingFallback />}>
                <TeamDirectory />
              </React.Suspense>
            </TabsContent>

            <TabsContent value="scheduling">
              <Tabs defaultValue={isManager ? "scheduler" : "myshifts"} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="myshifts">My Shifts</TabsTrigger>
                  {isManager && <TabsTrigger value="scheduler">Scheduler</TabsTrigger>}
                  {isManager && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
                </TabsList>

                <TabsContent value="myshifts">
                  <React.Suspense fallback={<LoadingFallback />}>
                    <div className="space-y-6">
                      <MyShifts />
                      <ManageAvailability />
                    </div>
                  </React.Suspense>
                </TabsContent>

                {isManager && (
                  <>
                    <TabsContent value="scheduler">
                      <React.Suspense fallback={<LoadingFallback />}>
                        <SmartScheduler />
                      </React.Suspense>
                    </TabsContent>

                    <TabsContent value="attendance">
                      <React.Suspense fallback={<LoadingFallback />}>
                        <AttendanceReports />
                      </React.Suspense>
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </TabsContent>

            <TabsContent value="development">
              <Tabs defaultValue="training" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="training">Training & Onboarding</TabsTrigger>
                  <TabsTrigger value="performance">Performance & Growth</TabsTrigger>
                </TabsList>

                <TabsContent value="training">
                  <React.Suspense fallback={<LoadingFallback />}>
                    <OnboardingTraining />
                  </React.Suspense>
                </TabsContent>

                <TabsContent value="performance">
                  <React.Suspense fallback={<LoadingFallback />}>
                    <PerformanceGrowth />
                  </React.Suspense>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}