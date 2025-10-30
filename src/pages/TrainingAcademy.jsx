
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GraduationCap,
  Trophy,
  Play,
  Lock,
  CheckCircle,
  Star,
  Heart,
  Video,
  FileText,
  Award,
  Clock,
  Target,
  Download,
  ArrowLeft,
  Home,
  Sparkles,
  BookOpen,
  MessageCircle,
  Users,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function TrainingAcademy() {
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const [reflection, setReflection] = useState('');
  const [showReflection, setShowReflection] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: trainingModules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list('order_sequence'),
  });

  const { data: myTrainingProgress = [] } = useQuery({
    queryKey: ['trainingProgress', user?.email],
    queryFn: () => base44.entities.TrainingRecord.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: myCertificates = [] } = useQuery({
    queryKey: ['certificates', user?.email],
    queryFn: () => base44.entities.Certificate.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
  });

  const updateProgressMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingProgress'] });
    },
  });

  const updateProgressRecordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingProgress'] });
    },
  });

  const createCertificateMutation = useMutation({
    mutationFn: (data) => base44.entities.Certificate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
  });

  const resetProgressMutation = useMutation({
    mutationFn: async () => {
      // Delete all training progress records for this user (but keep certificates)
      const progressRecords = myTrainingProgress.filter(p => p.staff_email === user?.email);
      const progressIds = progressRecords.map(p => p.id);
      
      // Use Promise.all to await all delete operations
      await Promise.all(progressIds.map(id => base44.entities.TrainingRecord.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingProgress'] });
      setShowResetDialog(false);
      alert('✅ Training progress reset! Your certificates are saved. You can now retake all modules.');
    },
    onError: (error) => {
      console.error('Error resetting progress:', error);
      alert('Failed to reset training progress. Please try again.');
    }
  });

  const handleStartModule = (module) => {
    setSelectedModule(module);
    
    const existingProgress = myTrainingProgress.find(p => p.module_id === module.id);
    if (!existingProgress) {
      updateProgressMutation.mutate({
        staff_email: user?.email,
        staff_name: user?.full_name,
        module_id: module.id,
        module_title: module.title,
        module_category: module.category,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });
    }
  };

  const handleQuizSubmit = async () => {
    const questions = selectedModule.quiz_questions || [];
    let correctCount = 0;
    const results = [];

    questions.forEach((q, index) => {
      const userAnswer = quizAnswers[index];
      const isCorrect = userAnswer === q.correct_answer;
      if (isCorrect) correctCount++;

      results.push({
        question: q.question,
        options: q.options,
        userAnswer: userAnswer,
        correctAnswer: q.correct_answer,
        isCorrect: isCorrect,
      });
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= (selectedModule.passing_score || 80);

    setQuizResults({
      score,
      passed,
      correctCount,
      totalQuestions: questions.length,
      results,
    });

    const existingProgress = myTrainingProgress.find(p => p.module_id === selectedModule.id);
    if (existingProgress) {
      await updateProgressRecordMutation.mutateAsync({
        id: existingProgress.id,
        data: {
          quiz_score: score,
          quiz_attempts: (existingProgress.quiz_attempts || 0) + 1,
        }
      });
    }

    if (passed) {
      setShowQuiz(false);
      setShowReflection(true);
    } else {
      setQuizAnswers({});
    }
  };

  const handleReflectionSubmit = async () => {
    const existingProgress = myTrainingProgress.find(p => p.module_id === selectedModule.id);
    
    if (existingProgress) {
      await updateProgressRecordMutation.mutateAsync({
        id: existingProgress.id,
        data: {
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: reflection,
        }
      });
    }

    // Generate certificate
    const certId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await createCertificateMutation.mutateAsync({
      certificate_id: certId,
      staff_email: user?.email,
      staff_name: user?.full_name,
      certificate_type: 'training_module',
      title: `${selectedModule.title} - Certificate of Completion`,
      description: `Successfully completed ${selectedModule.title} training with ${quizResults.score}% score`,
      issued_date: new Date().toISOString(),
      issued_by: 'AURA Training Academy',
      is_verified: true,
      points_awarded: selectedModule.level === 3 ? 20 : selectedModule.level === 2 ? 15 : 10,
      badge_earned: selectedModule.level === 3 ? 'Master Trainer' : null,
    });

    // Post to EventHub
    await createEventMutation.mutateAsync({
      source_module: 'ai',
      event_type: 'sop_signed',
      title: `🎓 ${user?.full_name} completed training!`,
      message: `${user?.full_name} just completed "${selectedModule.title}" training and earned a certificate! 🏆`,
      severity: 'success',
      recipient_roles: ['manager', 'all'],
    });

    setShowReflection(false);
    setReflection('');
    setSelectedModule(null);
    setQuizResults(null);
    
    await queryClient.invalidateQueries({ queryKey: ['trainingProgress'] });
    await queryClient.invalidateQueries({ queryKey: ['certificates'] });
  };

  const handleResetProgress = () => {
    setShowResetDialog(true);
  };

  const confirmReset = () => {
    resetProgressMutation.mutate();
  };

  const getModuleProgress = (moduleId) => {
    return myTrainingProgress.find(p => p.module_id === moduleId);
  };

  const isModuleUnlocked = (module) => {
    if (!module.prerequisites || module.prerequisites.length === 0) return true;
    
    return module.prerequisites.every(prereqId => {
      const progress = myTrainingProgress.find(p => p.module_id === prereqId);
      return progress?.status === 'completed';
    });
  };

  const getCategoryProgress = (level) => {
    const levelModules = trainingModules.filter(m => {
      if (level === 'culture') return m.category === 'culture' || m.category === 'onboarding';
      if (level === 1) return m.level === 1 || ['hygiene', 'safety'].includes(m.category);
      if (level === 2) return m.level === 2 || ['product_knowledge', 'customer_service'].includes(m.category);
      if (level === 3) return m.level === 3 || ['compliance', 'equipment_use'].includes(m.category);
      return false;
    });
    
    if (levelModules.length === 0) return 0;
    
    const completed = levelModules.filter(m => {
      const progress = getModuleProgress(m.id);
      return progress?.status === 'completed';
    }).length;
    
    return Math.round((completed / levelModules.length) * 100);
  };

  const totalProgress = Math.round(
    (myTrainingProgress.filter(p => p.status === 'completed').length / 
    Math.max(trainingModules.length, 1)) * 100
  );

  const cultureModules = trainingModules.filter(m => m.category === 'culture' || m.category === 'onboarding');
  const level1Modules = trainingModules.filter(m => m.level === 1 || ['hygiene', 'safety'].includes(m.category));
  const level2Modules = trainingModules.filter(m => m.level === 2 || ['product_knowledge', 'customer_service'].includes(m.category));
  const level3Modules = trainingModules.filter(m => m.level === 3 || ['compliance', 'equipment_use'].includes(m.category));

  console.log('Training Modules:', trainingModules);
  console.log('Culture Modules:', cultureModules);
  console.log('Level 1 Modules:', level1Modules);
  console.log('Level 2 Modules:', level2Modules);
  console.log('Level 3 Modules:', level3Modules);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex gap-3 mb-6 flex-wrap items-center">
          <Link to={createPageUrl('TrainingWelcome')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Welcome
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          {isManager && (
            <Link to={createPageUrl('ManagerTrainingDashboard')}>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                Manager View
              </Button>
            </Link>
          )}
          <Link to={createPageUrl('TrainingMentor')}>
            <Button variant="outline" size="sm" className="bg-purple-50">
              <MessageCircle className="w-4 h-4 mr-2" />
              AI Mentor
            </Button>
          </Link>
          
          {/* Reset Button - Available to ALL users */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetProgress}
            className="ml-auto bg-orange-50 border-orange-300 hover:bg-orange-100 text-orange-700"
            disabled={myTrainingProgress.length === 0}
          >
            <Award className="w-4 h-4 mr-2" />
            Reset & Retake Training
          </Button>
        </div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none shadow-xl mb-8">
            <CardContent className="p-8">
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div>
                  <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
                    <GraduationCap className="w-12 h-12" />
                    Training Academy
                  </h1>
                  <p className="text-xl text-purple-100 mb-2">
                    Welcome back, {user?.full_name?.split(' ')[0]}! 🌟
                  </p>
                  <p className="text-purple-200">
                    Continue your journey to becoming a Chai Patta champion
                  </p>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-6">
                  <div className="text-6xl font-bold mb-2">{totalProgress}%</div>
                  <p className="text-purple-200">Overall Progress</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Award className="w-5 h-5 text-yellow-300" />
                    <span className="text-yellow-300 font-semibold">{myCertificates.length} Certificates</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Heart className="w-8 h-8 text-purple-600 mb-2" />
              <p className="text-3xl font-bold text-purple-600">{getCategoryProgress('culture')}%</p>
              <p className="text-sm text-gray-600">Culture Mastery</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Star className="w-8 h-8 text-blue-600 mb-2" />
              <p className="text-3xl font-bold text-blue-600">{getCategoryProgress(1)}%</p>
              <p className="text-sm text-gray-600">Level 1 - Foundation</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Target className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-3xl font-bold text-green-600">{getCategoryProgress(2)}%</p>
              <p className="text-sm text-gray-600">Level 2 - Excellence</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Trophy className="w-8 h-8 text-amber-600 mb-2" />
              <p className="text-3xl font-bold text-amber-600">{getCategoryProgress(3)}%</p>
              <p className="text-sm text-gray-600">Level 3 - Mastery</p>
            </CardContent>
          </Card>
        </div>

        {/* Training Levels Tabs */}
        <Tabs defaultValue="culture" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto bg-white shadow-sm">
            <TabsTrigger value="culture" className="flex-col gap-2 py-4 data-[state=active]:bg-purple-100">
              <Heart className="w-5 h-5" />
              <span className="font-semibold">Culture & Values</span>
              <span className="text-xs text-gray-500">Start Here</span>
            </TabsTrigger>
            <TabsTrigger value="level1" className="flex-col gap-2 py-4 data-[state=active]:bg-blue-100">
              <Star className="w-5 h-5" />
              <span className="font-semibold">Level 1</span>
              <span className="text-xs text-gray-500">Foundation</span>
            </TabsTrigger>
            <TabsTrigger value="level2" className="flex-col gap-2 py-4 data-[state=active]:bg-green-100">
              <Target className="w-5 h-5" />
              <span className="font-semibold">Level 2</span>
              <span className="text-xs text-gray-500">Excellence</span>
            </TabsTrigger>
            <TabsTrigger value="level3" className="flex-col gap-2 py-4 data-[state=active]:bg-amber-100">
              <Trophy className="w-5 h-5" />
              <span className="font-semibold">Level 3</span>
              <span className="text-xs text-gray-500">Leadership</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="culture" className="space-y-4">
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <Heart className="w-16 h-16 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold mb-3">Culture & Values Training</h3>
                    <p className="text-purple-100 text-lg mb-4">
                      "Learn the Heart of Chai Patta"
                    </p>
                    <p className="text-purple-50 mb-6">
                      Understand our mission, embrace our values, and discover what makes us different. 
                      This is where every journey begins - with purpose and passion.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={getCategoryProgress('culture')} className="flex-1 bg-purple-300" />
                      <span className="font-bold text-2xl">{getCategoryProgress('culture')}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {cultureModules.length === 0 ? (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Culture Modules Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Culture training modules will appear here once created by your manager.
                  </p>
                  {isManager && (
                    <p className="text-sm text-blue-700">
                      💡 Tip: Create training modules in the Staff Dashboard
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {cultureModules.map((module, index) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    progress={getModuleProgress(module.id)}
                    isUnlocked={isModuleUnlocked(module)}
                    isCompleted={getModuleProgress(module.id)?.status === 'completed'}
                    onStart={() => handleStartModule(module)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="level1" className="space-y-4">
            <Card className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-none shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <Star className="w-16 h-16 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold mb-3">Level 1: Foundation Training</h3>
                    <p className="text-blue-100 text-lg mb-4">
                      "Master the Essentials"
                    </p>
                    <p className="text-blue-50 mb-6">
                      Build your foundation with hygiene basics, safety protocols, and essential guest interaction skills. 
                      These are the non-negotiables for every team member.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={getCategoryProgress(1)} className="flex-1 bg-blue-300" />
                      <span className="font-bold text-2xl">{getCategoryProgress(1)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {level1Modules.length === 0 ? (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-8 text-center">
                  <Star className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Level 1 Modules Yet</h3>
                  <p className="text-gray-600">Foundation training modules will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {level1Modules.map((module, index) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    progress={getModuleProgress(module.id)}
                    isUnlocked={isModuleUnlocked(module)}
                    isCompleted={getModuleProgress(module.id)?.status === 'completed'}
                    onStart={() => handleStartModule(module)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="level2" className="space-y-4">
            <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-none shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <Target className="w-16 h-16 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold mb-3">Level 2: Excellence in Action</h3>
                    <p className="text-green-100 text-lg mb-4">
                      "Serve with Precision & Pride"
                    </p>
                    <p className="text-green-50 mb-6">
                      Master the art of perfect Karak Chai, understand our complete menu, and deliver exceptional service. 
                      This is where good becomes great.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={getCategoryProgress(2)} className="flex-1 bg-green-300" />
                      <span className="font-bold text-2xl">{getCategoryProgress(2)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {level2Modules.length === 0 ? (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-8 text-center">
                  <Target className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Level 2 Modules Yet</h3>
                  <p className="text-gray-600">Advanced training modules will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {level2Modules.map((module, index) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    progress={getModuleProgress(module.id)}
                    isUnlocked={isModuleUnlocked(module)}
                    isCompleted={getModuleProgress(module.id)?.status === 'completed'}
                    onStart={() => handleStartModule(module)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="level3" className="space-y-4">
            <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <Trophy className="w-16 h-16 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold mb-3">Level 3: Leadership & Growth</h3>
                    <p className="text-amber-100 text-lg mb-4">
                      "Lead → Inspire → Grow"
                    </p>
                    <p className="text-amber-50 mb-6">
                      Develop leadership skills, master conflict resolution, and learn to inspire others. 
                      Become a mentor who creates more Craving Fans - both customers and team members.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={getCategoryProgress(3)} className="flex-1 bg-amber-300" />
                      <span className="font-bold text-2xl">{getCategoryProgress(3)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {level3Modules.length === 0 ? (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-8 text-center">
                  <Trophy className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Level 3 Modules Yet</h3>
                  <p className="text-gray-600">Leadership training modules will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {level3Modules.map((module, index) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    progress={getModuleProgress(module.id)}
                    isUnlocked={isModuleUnlocked(module)}
                    isCompleted={getModuleProgress(module.id)?.status === 'completed'}
                    onStart={() => handleStartModule(module)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Certificates Section - Always visible */}
        {myCertificates.length > 0 && (
          <Card className="mt-8 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Award className="w-7 h-7 text-yellow-600" />
                Your Achievements ({myCertificates.length} Certificates)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {myCertificates.map(cert => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Card className="border-2 border-yellow-400 hover:shadow-xl transition-shadow">
                      <CardContent className="p-6 text-center">
                        <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                        <h4 className="font-semibold text-gray-900 mb-2">{cert.title}</h4>
                        <p className="text-xs text-gray-600 mb-1">{cert.description}</p>
                        <p className="text-xs text-gray-500 mb-3">
                          {format(new Date(cert.issued_date), 'MMM d, yyyy')}
                        </p>
                        {cert.points_awarded > 0 && (
                          <Badge className="bg-green-100 text-green-800 mb-3">
                            +{cert.points_awarded} points
                          </Badge>
                        )}
                        <Button size="sm" variant="outline" className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Module Detail Dialog */}
        <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-purple-600" />
                {selectedModule?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedModule && (
              <div className="space-y-6 mt-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {selectedModule.duration_minutes && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedModule.duration_minutes} minutes
                    </Badge>
                  )}
                  <Badge className="bg-purple-100 text-purple-800">
                    {selectedModule.category?.replace('_', ' ')}
                  </Badge>
                  {selectedModule.level && (
                    <Badge className="bg-blue-100 text-blue-800">
                      Level {selectedModule.level}
                    </Badge>
                  )}
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700 text-lg leading-relaxed">{selectedModule.description}</p>
                </div>

                {selectedModule.video_url && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Video className="w-5 h-5 text-blue-600" />
                      Training Video
                    </h3>
                    <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-lg">
                      <iframe
                        width="100%"
                        height="100%"
                        src={selectedModule.video_url.replace('watch?v=', 'embed/')}
                        title={selectedModule.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {selectedModule.content_text && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      Course Material
                    </h3>
                    <Card className="bg-gray-50">
                      <CardContent className="p-6">
                        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                          {selectedModule.content_text}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedModule.linked_sop_ids?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-green-600" />
                      Related SOPs
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedModule.linked_sop_ids.map(sopId => (
                        <Link key={sopId} to={createPageUrl(`SOPViewer?id=${sopId}`)}>
                          <Button variant="outline" size="sm">
                            View SOP Procedure
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {selectedModule.quiz_questions?.length > 0 && (
                  <Button
                    onClick={() => setShowQuiz(true)}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 py-6 text-lg"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Take Knowledge Check ({selectedModule.quiz_questions.length} questions)
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Quiz Dialog */}
        <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">📝 Knowledge Check: {selectedModule?.title}</DialogTitle>
            </DialogHeader>
            {selectedModule && (
              <div className="space-y-6 mt-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-900 font-medium">
                      📚 Answer all questions carefully. You need {selectedModule.passing_score || 80}% to pass and earn your certificate.
                    </p>
                  </CardContent>
                </Card>

                {selectedModule.quiz_questions?.map((q, index) => (
                  <Card key={index} className="border-2">
                    <CardContent className="p-6">
                      <p className="font-semibold text-gray-900 text-lg mb-4">
                        Question {index + 1}: {q.question}
                      </p>
                      <div className="space-y-3">
                        {q.options.map((option, optIndex) => (
                          <label
                            key={optIndex}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              quizAnswers[index] === optIndex
                                ? 'border-blue-600 bg-blue-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q-${index}`}
                              value={optIndex}
                              checked={quizAnswers[index] === optIndex}
                              onChange={() => setQuizAnswers({ ...quizAnswers, [index]: optIndex })}
                              className="w-5 h-5"
                            />
                            <span className="text-gray-800 flex-1">{option}</span>
                          </label>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => {
                    setShowQuiz(false);
                    setQuizAnswers({});
                  }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleQuizSubmit}
                    disabled={Object.keys(quizAnswers).length !== selectedModule.quiz_questions?.length}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Answers
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reflection Dialog */}
        <Dialog open={showReflection} onOpenChange={setShowReflection}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Reflection: What Did You Learn?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <p className="text-sm text-purple-900">
                    ✨ Take a moment to reflect on what you learned. How will you apply this in your role?
                  </p>
                </CardContent>
              </Card>

              <Textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Share your key takeaways and how you'll apply this learning...

Example:
- I learned the importance of temperature control for food safety
- I will always check fridge temps at the start of my shift
- I understand why this matters for customer safety and our reputation"
                rows={8}
                className="text-base"
              />

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReflection(false)}
                >
                  Skip for Now
                </Button>
                <Button
                  onClick={handleReflectionSubmit}
                  disabled={!reflection.trim()}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Award className="w-4 h-4 mr-2" />
                  Complete & Get Certificate
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quiz Results - Failed */}
        {quizResults && !quizResults.passed && (
          <Dialog open={!!quizResults} onOpenChange={() => setQuizResults(null)}>
            <DialogContent className="max-w-2xl">
              <div className="text-center space-y-6 py-6">
                <div className="text-6xl">📚</div>
                <h2 className="text-3xl font-bold text-gray-900">Keep Learning!</h2>
                <Card className="bg-amber-100 border-amber-300">
                  <CardContent className="p-6">
                    <p className="text-5xl font-bold text-amber-600 mb-2">{quizResults.score}%</p>
                    <p className="text-gray-700">
                      You got {quizResults.correctCount} out of {quizResults.totalQuestions} correct
                    </p>
                  </CardContent>
                </Card>
                <p className="text-gray-600">
                  You need {selectedModule?.passing_score || 80}% to pass. Review the material and try again!
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuizResults(null);
                      setQuizAnswers({});
                    }}
                  >
                    Review Material
                  </Button>
                  <Button
                    onClick={() => {
                      setQuizResults(null);
                      setQuizAnswers({});
                      setShowQuiz(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Reset Confirmation Dialog */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Award className="w-6 h-6 text-orange-600" />
                Reset Training Progress?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-900">
                    <strong>✅ What will be saved:</strong>
                  </p>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1">
                    <li>• All your certificates ({myCertificates.length} total)</li>
                    <li>• Your performance points</li>
                    <li>• Your badges and achievements</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4">
                  <p className="text-sm text-amber-900">
                    <strong>🔄 What will be reset:</strong>
                  </p>
                  <ul className="text-sm text-amber-800 mt-2 space-y-1">
                    <li>• Module completion status (you can retake all modules)</li>
                    <li>• Quiz scores (start fresh)</li>
                    <li>• Progress percentages</li>
                  </ul>
                </CardContent>
              </Card>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-900 text-center">
                  💡 <strong>Perfect for:</strong> Refreshing your knowledge, improving quiz scores, or retraining on updated content
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowResetDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmReset}
                  disabled={resetProgressMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {resetProgressMutation.isPending ? 'Resetting...' : 'Reset & Start Fresh'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ModuleCard({ module, progress, isUnlocked, isCompleted, onStart, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`${
        isCompleted ? 'border-green-500 border-2 bg-green-50/50' :
        !isUnlocked ? 'border-gray-200 bg-gray-50/50 opacity-75' : 'bg-white border-blue-200'
      } hover:shadow-xl transition-all`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              isCompleted ? 'bg-gradient-to-br from-green-500 to-green-600' :
              !isUnlocked ? 'bg-gray-300' : 'bg-gradient-to-br from-blue-500 to-blue-600'
            }`}>
              {isCompleted ? (
                <CheckCircle className="w-7 h-7 text-white" />
              ) : !isUnlocked ? (
                <Lock className="w-7 h-7 text-white" />
              ) : (
                <Play className="w-7 h-7 text-white" />
              )}
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg mb-2">{module.title}</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">{module.description}</p>

              <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
                {module.duration_minutes && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3" />
                    {module.duration_minutes} min
                  </div>
                )}
                {module.content_type && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {module.content_type.replace('_', ' ')}
                  </Badge>
                )}
                {progress?.quiz_score !== undefined && (
                  <Badge className={progress.quiz_score >= (module.passing_score || 80) ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                    Score: {progress.quiz_score}%
                  </Badge>
                )}
              </div>

              {isUnlocked && !isCompleted && (
                <Button
                  onClick={onStart}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {progress?.status === 'in_progress' ? 'Continue Learning' : 'Start Module'}
                </Button>
              )}

              {isCompleted && progress?.completed_at && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Completed {format(new Date(progress.completed_at), 'MMM d, yyyy')}
                </div>
              )}

              {!isUnlocked && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                  <Lock className="w-4 h-4" />
                  Complete prerequisites to unlock
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
