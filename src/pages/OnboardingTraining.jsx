import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Play, CheckCircle, Clock, Award, ArrowLeft, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function OnboardingTraining() {
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list('order_sequence'),
  });

  const { data: records = [] } = useQuery({
    queryKey: ['trainingRecords', user?.email],
    queryFn: () => base44.entities.TrainingRecord.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
  });

  const startTrainingMutation = useMutation({
    mutationFn: (module) => base44.entities.TrainingRecord.create({
      staff_email: user?.email,
      staff_name: user?.full_name,
      module_id: module.id,
      module_title: module.title,
      module_category: module.category,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingRecords'] });
    },
  });

  const getModuleStatus = (moduleId) => {
    const record = records.find(r => r.module_id === moduleId);
    return record?.status || 'not_started';
  };

  const getProgress = () => {
    if (modules.length === 0) return 0;
    const completed = records.filter(r => r.status === 'completed').length;
    return Math.round((completed / modules.length) * 100);
  };

  const categorizedModules = modules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {});

  const progress = getProgress();
  const completedCount = records.filter(r => r.status === 'completed').length;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("StaffModel")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Staff Model
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            Onboarding & Training
          </h1>
          <p className="text-gray-600">Complete your training path and earn certificates</p>
        </div>

        {/* Progress Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-lg mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-2">Your Training Progress</h3>
                <p className="text-blue-100">{completedCount} of {modules.length} modules completed</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold">{progress}%</div>
                <p className="text-sm text-blue-100 mt-1">Complete</p>
              </div>
            </div>
            <Progress value={progress} className="h-3 bg-blue-400" />
          </CardContent>
        </Card>

        {/* Training Modules by Category */}
        <div className="space-y-8">
          {Object.entries(categorizedModules).map(([category, categoryModules]) => (
            <div key={category}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 capitalize">
                {category.replace(/_/g, ' ')}
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {categoryModules.map((module) => {
                  const status = getModuleStatus(module.id);
                  const record = records.find(r => r.module_id === module.id);

                  return (
                    <Card key={module.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {module.title}
                          </CardTitle>
                          <Badge className={
                            status === 'completed' ? 'bg-green-100 text-green-800' :
                            status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {status === 'not_started' ? 'Not Started' : status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">{module.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{module.duration_minutes} min</span>
                          </div>
                          <Badge variant="outline">{module.content_type}</Badge>
                          {module.is_mandatory && (
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              Mandatory
                            </Badge>
                          )}
                        </div>

                        {status === 'completed' && (
                          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-green-800">Completed</span>
                              </div>
                              {record?.quiz_score && (
                                <span className="text-sm font-bold text-green-700">Score: {record.quiz_score}%</span>
                              )}
                            </div>
                            {record?.certificate_issued && (
                              <div className="mt-2">
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  <Award className="w-3 h-3 mr-1" />
                                  Certificate Earned
                                </Badge>
                              </div>
                            )}
                          </div>
                        )}

                        {status === 'not_started' && (
                          <Button
                            onClick={() => startTrainingMutation.mutate(module)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start Training
                          </Button>
                        )}

                        {status === 'in_progress' && (
                          <Link to={createPageUrl(`TrainingModule?id=${module.id}`)}>
                            <Button className="w-full bg-green-600 hover:bg-green-700">
                              Continue Training
                            </Button>
                          </Link>
                        )}

                        {status === 'completed' && record?.certificate_url && (
                          <a href={record.certificate_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="w-full">
                              <Award className="w-4 h-4 mr-2" />
                              View Certificate
                            </Button>
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {modules.length === 0 && (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No training modules available yet</p>
              <p className="text-sm text-gray-400 mt-2">Check back soon for new training content</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}