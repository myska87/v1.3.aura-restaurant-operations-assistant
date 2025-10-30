
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
  RefreshCw, // Added RefreshCw icon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

// New Motivational Quotes Array
const MOTIVATIONAL_QUOTES = [
  "Raise your standard — not your excuses.",
  "Every cup you pour tells your story.",
  "We don't create customers — we create Craving Fans.",
  "Excellence is not a skill, it's an attitude.",
  "Your energy creates your reality.",
  "Small daily improvements lead to stunning results.",
];

export default function TrainingAcademy() {
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const [reflection, setReflection] = useState('');
  const [showReflection, setShowReflection] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  // Initializing randomQuote from the MOTIVATIONAL_QUOTES array
  const [randomQuote] = useState(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

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

  // New mutation for staff rewards (points/badges)
  const createRewardMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffReward.create(data),
  });

  const resetProgressMutation = useMutation({
    mutationFn: async () => {
      // Delete all training progress records for this user
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

  // New confetti trigger function
  const triggerConfetti = () => {
    const celebrationEl = document.createElement('div');
    celebrationEl.innerHTML = '🎉🎊✨🌟💫⭐🏆';
    celebrationEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 80px;
      animation: celebrate 2s ease-out forwards;
      z-index: 9999;
      pointer-events: none;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes celebrate {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(0) rotate(0deg); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.5) rotate(180deg); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(2) rotate(360deg); }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(celebrationEl);
    
    setTimeout(() => {
      document.body.removeChild(celebrationEl);
      document.head.removeChild(style);
    }, 2000);
  };

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

    // Define points and badges based on module level/category
    const pointsMap = { 3: 20, 2: 15, 1: 10 };
    const badgeMap = {
      culture: 'Culture Champion',
      onboarding: 'Onboarding Star',
      hygiene: 'Hygiene Hero',
      safety: 'Safety Specialist',
      product_knowledge: 'Product Master',
      customer_service: 'Service Star',
      compliance: 'Compliance Pro',
      equipment_use: 'Equipment Expert',
    };

    const points = pointsMap[selectedModule.level] || 10; // Default to 10 points
    const badge = badgeMap[selectedModule.category];

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
      verification_url: `${window.location.origin}/verify-cert/${certId}`, // Added verification_url
      is_verified: true,
      points_awarded: points, // Updated points awarded
      badge_earned: badge, // Updated badge earned
    });

    // Award points and badge using the new mutation
    await createRewardMutation.mutateAsync({
      staff_email: user?.email,
      staff_name: user?.full_name,
      reward_type: 'training_completion', // A specific type for training rewards
      points_earned: points,
      badge_name: badge,
      badge_icon: selectedModule.level === 3 ? '🏆' : selectedModule.level === 2 ? '⭐' : '✨',
      reason: `Completed "${selectedModule.title}" training module.`,
      awarded_by: 'AURA Training Academy',
      awarded_date: new Date().toISOString(),
      is_public: true,
      linked_achievement: `training_module_${selectedModule.id}`, // Link to the specific module
    });

    // Post to EventHub with updated message
    await createEventMutation.mutateAsync({
      source_module: 'training', // Changed source_module to 'training'
      event_type: 'training_completed', // Changed event_type
      title: `🎓 ${user?.full_name} completed Level ${selectedModule.level || 'Culture'} training!`,
      message: `${user?.full_name} just completed "${selectedModule.title}" and earned the "${badge}" badge! 🏆 +${points} XP`,
      severity: 'success',
      recipient_roles: ['manager', 'all'],
    });

    // Trigger confetti for celebration
    triggerConfetti();

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
      if (level === 1) return m.level === 1 || ['hygiene', 'safety', 'customer_service'].includes(m.category); // Updated filtering
      if (level === 2) return m.level === 2 || m.category === 'product_knowledge'; // Updated filtering
      if (level === 3) return m.level === 3 || m.category === 'compliance'; // Updated filtering
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
  const level1Modules = trainingModules.filter(m => m.level === 1 || ['hygiene', 'safety', 'customer_service'].includes(m.category));
  const level2Modules = trainingModules.filter(m => m.level === 2 || m.category === 'product_knowledge');
  const level3Modules = trainingModules.filter(m => m.level === 3 || m.category === 'compliance');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-amber-50 to-emerald-50 p-6 md:p-8">
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
            <RefreshCw className="w-4 h-4 mr-2" /> {/* Changed icon to RefreshCw */}
            Reset & Retake {/* Changed text */}
          </Button>
        </div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-[#014D40] to-emerald-600 text-white border-none shadow-xl mb-8 overflow-hidden relative"> {/* Updated background and added overflow/relative */}
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
            <CardContent className="p-8 relative"> {/* Added relative */}
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div>
                  <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
                    <GraduationCap className="w-12 h-12" />
                    Training Academy
                  </h1>
                  <p className="text-xl text-emerald-100 mb-2"> {/* Updated text color */}
                    Welcome back, {user?.full_name?.split(' ')[0]}! 🌟
                  </p>
                  <p className="text-emerald-200 italic"> {/* Updated text color and added italic */}
                    "{randomQuote}" {/* Display random quote */}
                  </p>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"> {/* Added border */}
                  <div className="text-6xl font-bold mb-2">{totalProgress}%</div>
                  <p className="text-emerald-200">Overall Progress</p> {/* Updated text color */}
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
          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-purple-50"> {/* Added gradient bg */}
            <CardContent className="p-6">
              <Heart className="w-8 h-8 text-purple-600 mb-2" />
              <p className="text-3xl font-bold text-purple-600">{getCategoryProgress('culture')}%</p>
              <p className="text-sm text-gray-600 font-medium">Culture Mastery</p> {/* Added font-medium */}
              <p className="text-xs text-gray-500 mt-1">{cultureModules.length} modules</p> {/* Added module count */}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-blue-50"> {/* Added gradient bg */}
            <CardContent className="p-6">
              <Star className="w-8 h-8 text-blue-600 mb-2" />
              <p className="text-3xl font-bold text-blue-600">{getCategoryProgress(1)}%</p>
              <p className="text-sm text-gray-600 font-medium">Level 1 - Foundation</p> {/* Added font-medium */}
              <p className="text-xs text-gray-500 mt-1">{level1Modules.length} modules</p> {/* Added module count */}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-green-50"> {/* Added gradient bg */}
            <CardContent className="p-6">
              <Target className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-3xl font-bold text-green-600">{getCategoryProgress(2)}%</p>
              <p className="text-sm text-gray-600 font-medium">Level 2 - Excellence</p> {/* Added font-medium */}
              <p className="text-xs text-gray-500 mt-1">{level2Modules.length} modules</p> {/* Added module count */}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-amber-50"> {/* Added gradient bg */}
            <CardContent className="p-6">
              <Trophy className="w-8 h-8 text-amber-600 mb-2" />
              <p className="text-3xl font-bold text-amber-600">{getCategoryProgress(3)}%</p>
              <p className="text-sm text-gray-600 font-medium">Level 3 - Mastery</p> {/* Added font-medium */}
              <p className="text-xs text-gray-500 mt-1">{level3Modules.length} modules</p> {/* Added module count */}
            </CardContent>
          </Card>
        </div>

        {/* Training Levels Tabs */}
        <Tabs defaultValue="culture" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto bg-white shadow-md rounded-xl p-1"> {/* Updated shadow and added rounded-xl, p-1 */}
            <TabsTrigger value="culture" className="flex-col gap-2 py-4 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-100 data-[state=active]:to-pink-100"> {/* Added rounded-lg and gradient for active state */}
              <Heart className="w-5 h-5" />
              <span className="font-semibold">Culture & Values</span>
              <span className="text-xs text-gray-500">Start Here</span>
            </TabsTrigger>
            <TabsTrigger value="level1" className="flex-col gap-2 py-4 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-100 data-[state=active]:to-cyan-100"> {/* Added rounded-lg and gradient for active state */}
              <Star className="w-5 h-5" />
              <span className="font-semibold">Level 1</span>
              <span className="text-xs text-gray-500">Foundation</span>
            </TabsTrigger>
            <TabsTrigger value="level2" className="flex-col gap-2 py-4 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-100 data-[state=active]:to-emerald-100"> {/* Added rounded-lg and gradient for active state */}
              <Target className="w-5 h-5" />
              <span className="font-semibold">Level 2</span>
              <span className="text-xs text-gray-500">Excellence</span>
            </TabsTrigger>
            <TabsTrigger value="level3" className="flex-col gap-2 py-4 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-100 data-[state=active]:to-orange-100"> {/* Added rounded-lg and gradient for active state */}
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
                    <p className="text-purple-100 text-lg mb-2 font-semibold"> {/* Changed mb-4 to mb-2 and added font-semibold */}
                      "Learn the Heart of Chai Patta"
                    </p>
                    <p className="text-purple-50 mb-6">
                      Understand our mission, embrace our values, and discover what makes us different. 
                      This is where every journey begins - with purpose and passion.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={getCategoryProgress('culture')} className="flex-1 bg-purple-300 h-3" /> {/* Added h-3 */}
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
                    <p className="text-blue-100 text-lg mb-2 font-semibold"> {/* Changed mb-4 to mb-2 and added font-semibold */}
                      "Master the Essentials"
                    </p>
                    <p className="text-blue-50 mb-6">
                      Build your foundation with hygiene basics, safety protocols, and essential guest interaction skills. 
                      These are the non-negotiables for every team member.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={getCategoryProgress(1)} className="flex-1 bg-blue-300 h-3" /> {/* Added h-3 */}
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
                    <p className="text-green-100 text-lg mb-2 font-semibold"> {/* Changed mb-4 to mb-2 and added font-semibold */}
                      "Serve with Precision & Pride"
                    </p>
                    <p className="text-green-50 mb-6">
                      Master the art of perfect Karak Chai, understand our complete menu, and deliver exceptional service. 
                      This is where good becomes great.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={getCategoryProgress(2)} className="flex-1 bg-green-300 h-3" /> {/* Added h-3 */}
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
                    <p className="text-amber-100 text-lg mb-2 font-semibold"> {/* Changed mb-4 to mb-2 and added font-semibold */}
                      "Lead → Inspire → Grow"
                    </p>
                    <p className="text-amber-50 mb-6">
                      Develop leadership skills, master conflict resolution, and learn to inspire others. 
                      Become a mentor who creates more Craving Fans - both customers and team members.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={getCategoryProgress(3)} className="flex-1 bg-amber-300 h-3" /> {/* Added h-3 */}
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
          <Card className="mt-8 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 shadow-xl"> {/* Updated border and shadow */}
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
                    <Card className="border-2 border-yellow-400 hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-yellow-50"> {/* Added gradient bg */}
                      <CardContent className="p-6 text-center">
                        <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                        <h4 className="font-semibold text-gray-900 mb-2">{cert.title}</h4>
                        <p className="text-xs text-gray-600 mb-1">{cert.description}</p>
                        <p className="text-xs text-gray-500 mb-3">
                          Issued: {format(new Date(cert.issued_date), 'MMM d, yyyy')} {/* Changed text */}
                        </p>
                        {cert.points_awarded > 0 && (
                          <Badge className="bg-green-100 text-green-800 mb-2"> {/* Changed mb-3 to mb-2 */}
                            +{cert.points_awarded} XP {/* Changed text */}
                          </Badge>
                        )}
                        {cert.badge_earned && ( // Conditionally render badge_earned
                          <Badge className="bg-purple-100 text-purple-800 mb-3 block">
                            {cert.badge_earned}
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
                <GraduationCap className="w-6 h-6 text-[#014D40]" /> {/* Updated text color */}
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
                  <Badge className="bg-purple-100 text-purple-800 capitalize"> {/* Added capitalize */}
                    {selectedModule.category?.replace('_', ' ')}
                  </Badge>
                  {selectedModule.level && (
                    <Badge className="bg-[#014D40] text-white"> {/* Updated background and text color */}
                      Level {selectedModule.level}
                    </Badge>
                  )}
                </div>

                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"> {/* Added Card wrapper and new styles */}
                  <CardContent className="p-4">
                    <p className="text-gray-800 text-lg leading-relaxed">{selectedModule.description}</p>
                  </CardContent>
                </Card>

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
                      <FileText className="w-5 h-5 text-[#014D40]" /> {/* Updated text color */}
                      Course Material
                    </h3>
                    <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200"> {/* Updated Card styles */}
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
                      Related Procedures {/* Changed text */}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedModule.linked_sop_ids.map(sopId => (
                        <Link key={sopId} to={createPageUrl(`SOPViewer?id=${sopId}`)}>
                          <Button variant="outline" size="sm" className="bg-green-50"> {/* Added bg-green-50 */}
                            <BookOpen className="w-4 h-4 mr-2" />
                            View SOP for this Recipe {/* Changed text */}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {selectedModule.quiz_questions?.length > 0 && (
                  <Button
                    onClick={() => setShowQuiz(true)}
                    className="w-full bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700 py-6 text-lg shadow-lg" // Updated colors and added shadow
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
                <RefreshCw className="w-6 h-6 text-orange-600" /> {/* Changed icon to RefreshCw */}
                Reset Training Progress?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Card className="bg-blue-50 border-blue-300 border-2"> {/* Added border-2 */}
                <CardContent className="p-4">
                  <p className="text-sm text-blue-900 font-bold mb-2"> {/* Added font-bold and mb-2 */}
                    ✅ What will be SAVED:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>All {myCertificates.length} certificates</strong> you earned</li> {/* Updated text with count and strong */}
                    <li>• Your performance points and XP</li> {/* Added XP */}
                    <li>• Your badges and achievements</li>
                    <li>• Historical completion records</li> {/* New item */}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-300 border-2"> {/* Added border-2 */}
                <CardContent className="p-4">
                  <p className="text-sm text-orange-900 font-bold mb-2"> {/* Added font-bold and mb-2 */}
                    🔄 What will be RESET:
                  </p>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• Module completion status</li>
                    <li>• Quiz scores (retake for improvement)</li> {/* Added context */}
                    <li>• Progress percentages</li>
                    <li>• Reflection notes</li> {/* New item */}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300"> {/* Updated card styles */}
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-purple-900 font-semibold"> {/* Added font-semibold */}
                    💡 Perfect for refreshing knowledge, improving scores, or retraining! {/* Updated text */}
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-4 border-t"> {/* Added border-t and pt-4 */}
                <Button
                  variant="outline"
                  onClick={() => setShowResetDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmReset}
                  disabled={resetProgressMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg" // Updated colors and added shadow
                >
                  {resetProgressMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> {/* Spinner for pending state */}
                      Resetting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" /> {/* CheckCircle for ready state */}
                      Yes, Reset & Start Fresh {/* Changed text */}
                    </>
                  )}
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
        isCompleted ? 'border-green-500 border-2 bg-gradient-to-br from-green-50 to-emerald-50' : // Updated styles for completed
        !isUnlocked ? 'border-gray-300 bg-gray-50/50 opacity-75' : // Updated styles for unlocked
        'bg-white border-2 border-blue-200' // Updated border-2
      } hover:shadow-xl transition-all`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              isCompleted ? 'bg-gradient-to-br from-green-500 to-green-600' :
              !isUnlocked ? 'bg-gray-400' : // Updated background color for locked
              'bg-gradient-to-br from-[#014D40] to-emerald-600' // Updated background color
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
                {module.is_mandatory && ( // New mandatory badge
                  <Badge className="bg-red-100 text-red-800 text-xs">
                    Mandatory
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
                  className="w-full bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700 shadow-md" // Updated colors and added shadow
                >
                  <Play className="w-4 h-4 mr-2" />
                  {progress?.status === 'in_progress' ? 'Continue Learning' : 'Start Module'}
                </Button>
              )}

              {isCompleted && progress?.completed_at && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg font-medium border border-green-200"> {/* Added border */}
                  <CheckCircle className="w-4 h-4" />
                  Completed {format(new Date(progress.completed_at), 'MMM d, yyyy')}
                </div>
              )}

              {!isUnlocked && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200"> {/* Added border */}
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
