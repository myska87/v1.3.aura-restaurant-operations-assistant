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
  TrendingUp,
  Download,
  ArrowLeft,
  Home,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const TRAINING_LEVELS = {
  culture: {
    name: "Culture & Values",
    icon: Heart,
    color: "from-purple-500 to-pink-500",
    description: "Learn our mission, values, and what makes Chai Patta special"
  },
  level_1: {
    name: "Level 1: Foundations",
    icon: Star,
    color: "from-blue-500 to-cyan-500",
    description: "Essential basics for all team members"
  },
  level_2: {
    name: "Level 2: Advanced",
    icon: Target,
    color: "from-green-500 to-emerald-500",
    description: "Advanced skills and specialized knowledge"
  },
  level_3: {
    name: "Level 3: Mastery",
    icon: Trophy,
    color: "from-amber-500 to-orange-500",
    description: "Expert level training and leadership"
  }
};

export default function TrainingAcademy() {
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const [feedback, setFeedback] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: trainingModules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list('order_sequence'),
  });

  const { data: cultureContent = [] } = useQuery({
    queryKey: ['cultureContent'],
    queryFn: () => base44.entities.CultureContent.list('order_sequence'),
  });

  const { data: myTrainingProgress = [] } = useQuery({
    queryKey: ['trainingProgress', user?.email],
    queryFn: () => base44.entities.TrainingRecord.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: myCultureProgress = [] } = useQuery({
    queryKey: ['cultureProgress', user?.email],
    queryFn: () => base44.entities.CultureAcknowledgement.filter({ staff_email: user?.email }),
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

  const createCertificateMutation = useMutation({
    mutationFn: (data) => base44.entities.Certificate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
  });

  const handleStartModule = (module) => {
    setSelectedModule(module);
    
    // Create or update progress
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

    // Update progress
    const existingProgress = myTrainingProgress.find(p => p.module_id === selectedModule.id);
    if (existingProgress) {
      await base44.entities.TrainingRecord.update(existingProgress.id, {
        status: passed ? 'completed' : 'failed',
        completed_at: passed ? new Date().toISOString() : null,
        quiz_score: score,
        quiz_attempts: (existingProgress.quiz_attempts || 0) + 1,
      });
    }

    // Generate certificate if passed
    if (passed) {
      const certId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await createCertificateMutation.mutateAsync({
        certificate_id: certId,
        staff_email: user?.email,
        staff_name: user?.full_name,
        certificate_type: 'training_module',
        title: `${selectedModule.title} - Certificate of Completion`,
        description: `Successfully completed ${selectedModule.title} training module`,
        issued_date: new Date().toISOString(),
        issued_by: 'AURA Training Academy',
        is_verified: true,
        points_awarded: 10,
      });
    }

    setShowQuiz(false);
    setQuizAnswers({});
    
    await queryClient.invalidateQueries({ queryKey: ['trainingProgress'] });
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

  const getCategoryProgress = (category) => {
    const categoryModules = trainingModules.filter(m => m.category === category);
    if (categoryModules.length === 0) return 0;
    
    const completed = categoryModules.filter(m => {
      const progress = getModuleProgress(m.id);
      return progress?.status === 'completed';
    }).length;
    
    return Math.round((completed / categoryModules.length) * 100);
  };

  const cultureProgress = Math.round((myCultureProgress.length / Math.max(cultureContent.length, 1)) * 100);
  const totalProgress = Math.round(
    ((myTrainingProgress.filter(p => p.status === 'completed').length + myCultureProgress.length) / 
    Math.max((trainingModules.length + cultureContent.length), 1)) * 100
  );

  const cultureModules = trainingModules.filter(m => m.category === 'culture' || m.category === 'onboarding');
  const level1Modules = trainingModules.filter(m => m.level === 1 || m.category === 'hygiene' || m.category === 'safety');
  const level2Modules = trainingModules.filter(m => m.level === 2 || m.category === 'product_knowledge' || m.category === 'customer_service');
  const level3Modules = trainingModules.filter(m => m.level === 3 || m.category === 'compliance' || m.category === 'equipment_use');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('StaffModel')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Staff Model
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none shadow-xl mb-8">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
                    <GraduationCap className="w-12 h-12" />
                    Training Academy
                  </h1>
                  <p className="text-xl text-purple-100 mb-2">
                    Welcome to your learning journey, {user?.full_name?.split(' ')[0]}!
                  </p>
                  <p className="text-purple-200">
                    "We don't create customers — we create <strong>Craving Fans</strong>"
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-6xl font-bold mb-2">{totalProgress}%</div>
                  <p className="text-purple-200">Overall Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Heart className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{cultureProgress}%</p>
              <p className="text-sm text-gray-600">Culture Mastery</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{getCategoryProgress('hygiene')}%</p>
              <p className="text-sm text-gray-600">Level 1 Progress</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{getCategoryProgress('customer_service')}%</p>
              <p className="text-sm text-gray-600">Level 2 Progress</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-600">{myCertificates.length}</p>
              <p className="text-sm text-gray-600">Certificates Earned</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="culture" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="culture" className="flex-col gap-2 py-3">
              <Heart className="w-5 h-5" />
              <span>Culture</span>
            </TabsTrigger>
            <TabsTrigger value="level1" className="flex-col gap-2 py-3">
              <Star className="w-5 h-5" />
              <span>Level 1</span>
            </TabsTrigger>
            <TabsTrigger value="level2" className="flex-col gap-2 py-3">
              <Target className="w-5 h-5" />
              <span>Level 2</span>
            </TabsTrigger>
            <TabsTrigger value="level3" className="flex-col gap-2 py-3">
              <Trophy className="w-5 h-5" />
              <span>Level 3</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="culture" className="space-y-4">
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Heart className="w-12 h-12 text-purple-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Culture & Values</h3>
                    <p className="text-gray-700 mb-4">
                      Learn the heart of Chai Patta - our mission, values, and the philosophy of creating Craving Fans. 
                      This is where your journey begins.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={cultureProgress} className="flex-1" />
                      <span className="font-bold text-purple-600">{cultureProgress}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {cultureContent.map((content, index) => {
                const isCompleted = myCultureProgress.some(p => p.culture_content_id === content.id);
                
                return (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={isCompleted ? 'border-green-500 border-2' : ''}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-lg">{content.title}</span>
                          {isCompleted && <CheckCircle className="w-6 h-6 text-green-600" />}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">{content.content?.substring(0, 120)}...</p>
                        <Link to={createPageUrl('CultureBuilding')}>
                          <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">
                            {isCompleted ? 'Review' : 'Start Learning'}
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="level1" className="space-y-4">
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Star className="w-12 h-12 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Level 1: Foundation Training</h3>
                    <p className="text-gray-700 mb-4">
                      Essential training for all team members. Master hygiene, safety, and core operational skills.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={getCategoryProgress('hygiene')} className="flex-1" />
                      <span className="font-bold text-blue-600">{getCategoryProgress('hygiene')}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {level1Modules.map((module, index) => {
                const progress = getModuleProgress(module.id);
                const isUnlocked = isModuleUnlocked(module);
                const isCompleted = progress?.status === 'completed';
                
                return (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    progress={progress}
                    isUnlocked={isUnlocked}
                    isCompleted={isCompleted}
                    onStart={() => handleStartModule(module)}
                    index={index}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="level2" className="space-y-4">
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Target className="w-12 h-12 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Level 2: Advanced Skills</h3>
                    <p className="text-gray-700 mb-4">
                      Deepen your expertise in customer service, product knowledge, and specialized skills.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={getCategoryProgress('customer_service')} className="flex-1" />
                      <span className="font-bold text-green-600">{getCategoryProgress('customer_service')}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {level2Modules.map((module, index) => {
                const progress = getModuleProgress(module.id);
                const isUnlocked = isModuleUnlocked(module);
                const isCompleted = progress?.status === 'completed';
                
                return (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    progress={progress}
                    isUnlocked={isUnlocked}
                    isCompleted={isCompleted}
                    onStart={() => handleStartModule(module)}
                    index={index}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="level3" className="space-y-4">
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Trophy className="w-12 h-12 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Level 3: Mastery & Leadership</h3>
                    <p className="text-gray-700 mb-4">
                      Expert-level training for team leaders, trainers, and specialists. Master advanced techniques and leadership.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={getCategoryProgress('compliance')} className="flex-1" />
                      <span className="font-bold text-amber-600">{getCategoryProgress('compliance')}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {level3Modules.map((module, index) => {
                const progress = getModuleProgress(module.id);
                const isUnlocked = isModuleUnlocked(module);
                const isCompleted = progress?.status === 'completed';
                
                return (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    progress={progress}
                    isUnlocked={isUnlocked}
                    isCompleted={isCompleted}
                    onStart={() => handleStartModule(module)}
                    index={index}
                  />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {myCertificates.length > 0 && (
          <Card className="mt-8 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-600" />
                Your Certificates ({myCertificates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {myCertificates.map(cert => (
                  <Card key={cert.id} className="border-2 border-yellow-300">
                    <CardContent className="p-4 text-center">
                      <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                      <h4 className="font-semibold text-gray-900 mb-2">{cert.title}</h4>
                      <p className="text-xs text-gray-600 mb-3">
                        {format(new Date(cert.issued_date), 'MMM d, yyyy')}
                      </p>
                      <Button size="sm" variant="outline" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedModule?.title}</DialogTitle>
            </DialogHeader>
            {selectedModule && (
              <div className="space-y-6 mt-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {selectedModule.duration_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{selectedModule.duration_minutes} min</span>
                    </div>
                  )}
                  <Badge>{selectedModule.category}</Badge>
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700">{selectedModule.description}</p>
                </div>

                {selectedModule.video_url && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Video className="w-5 h-5 text-blue-600" />
                      Training Video
                    </h3>
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <video
                        src={selectedModule.video_url}
                        controls
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}

                {selectedModule.content_text && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      Course Material
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
                      {selectedModule.content_text}
                    </div>
                  </div>
                )}

                {selectedModule.quiz_questions?.length > 0 && (
                  <Button
                    onClick={() => setShowQuiz(true)}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Take Knowledge Check ({selectedModule.quiz_questions.length} questions)
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Knowledge Check: {selectedModule?.title}</DialogTitle>
            </DialogHeader>
            {selectedModule && (
              <div className="space-y-6 mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    📝 Answer all questions. You need {selectedModule.passing_score || 80}% to pass and earn your certificate.
                  </p>
                </div>

                {selectedModule.quiz_questions?.map((q, index) => (
                  <div key={index} className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                    <p className="font-semibold text-gray-900">{index + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            quizAnswers[index] === optIndex
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${index}`}
                            value={optIndex}
                            checked={quizAnswers[index] === optIndex}
                            onChange={() => setQuizAnswers({ ...quizAnswers, [index]: optIndex })}
                            className="w-4 h-4"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowQuiz(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleQuizSubmit}
                    disabled={Object.keys(quizAnswers).length !== selectedModule.quiz_questions?.length}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Submit Quiz
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {quizResults && (
          <Dialog open={!!quizResults} onOpenChange={() => setQuizResults(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {quizResults.passed ? '🎉 Congratulations!' : '📚 Keep Learning!'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <Card className={`border-none shadow-lg ${
                  quizResults.passed
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600'
                } text-white`}>
                  <CardContent className="p-6 text-center">
                    <div className="text-6xl font-bold mb-3">{quizResults.score}%</div>
                    <p className="text-xl mb-2">
                      {quizResults.correctCount} out of {quizResults.totalQuestions} correct
                    </p>
                    <p className="text-lg opacity-90">
                      {quizResults.passed
                        ? '✅ You passed! Certificate generated!'
                        : '⚠️ You need 80% to pass. Review and try again.'}
                    </p>
                  </CardContent>
                </Card>

                {quizResults.passed && (
                  <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300">
                    <CardContent className="p-6 text-center">
                      <Trophy className="w-16 h-16 text-yellow-600 mx-auto mb-3" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Certificate Earned!</h3>
                      <p className="text-gray-700 mb-4">+10 Performance Points Added</p>
                      <Button className="bg-yellow-600 hover:bg-yellow-700">
                        <Download className="w-4 h-4 mr-2" />
                        Download Certificate
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Button
                  variant="outline"
                  onClick={() => setQuizResults(null)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
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
        isCompleted ? 'border-green-500 border-2 bg-green-50' :
        !isUnlocked ? 'border-gray-200 bg-gray-50' : 'bg-white'
      } hover:shadow-lg transition-all`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              isCompleted ? 'bg-green-500' :
              !isUnlocked ? 'bg-gray-300' : 'bg-blue-500'
            }`}>
              {isCompleted ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : !isUnlocked ? (
                <Lock className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">{module.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{module.description}</p>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                {module.duration_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {module.duration_minutes} min
                  </div>
                )}
                {module.content_type && (
                  <Badge variant="outline" className="text-xs">{module.content_type}</Badge>
                )}
                {progress?.quiz_score && (
                  <span className="text-green-600 font-medium">Score: {progress.quiz_score}%</span>
                )}
              </div>

              {isUnlocked && !isCompleted && (
                <Button
                  onClick={onStart}
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {progress?.status === 'in_progress' ? 'Continue' : 'Start Module'}
                </Button>
              )}

              {isCompleted && progress?.completed_at && (
                <div className="text-sm text-green-600 font-medium">
                  ✓ Completed {format(new Date(progress.completed_at), 'MMM d, yyyy')}
                </div>
              )}

              {!isUnlocked && (
                <div className="text-sm text-gray-500 italic">
                  🔒 Complete prerequisites to unlock
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}