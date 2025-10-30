
import React, { useState, useEffect, useCallback } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  RefreshCw,
  Plus, // Added Plus icon
  Pencil, // Added Pencil icon
  Save, // Added Save icon
  Trash2, // Added Trash2 icon
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

const CORE_VALUES = [
  {
    icon: '🌿',
    title: 'Warmth',
    description: 'Every interaction radiates genuine care and hospitality',
    detail: 'Greet guests with authenticity. Remember names. Make everyone feel like family.',
    color: 'from-green-400 to-emerald-500'
  },
  {
    icon: '💪',
    title: 'Discipline',
    description: 'Excellence through consistency and attention to detail',
    detail: 'Show up early. Follow SOPs. Never compromise on quality. Raise the standard daily.',
    color: 'from-blue-400 to-cyan-500'
  },
  {
    icon: '🧭',
    title: 'Heritage',
    description: 'Honoring authentic traditions while innovating boldly',
    detail: 'Respect the roots of Karak Chai. Honor traditional recipes. Innovate with purpose.',
    color: 'from-amber-400 to-orange-500'
  },
  {
    icon: '🚀',
    title: 'Growth',
    description: 'Continuous learning and development for every team member',
    detail: 'Learn something new every shift. Share knowledge. Train others. Evolve together.',
    color: 'from-purple-400 to-pink-500'
  },
  {
    icon: '💚',
    title: 'Respect',
    description: 'Valuing every person, every role, every contribution',
    detail: 'Respect colleagues, guests, suppliers, and the planet. Everyone matters.',
    color: 'from-teal-400 to-green-500'
  }
];

const CULTURAL_RITUALS = [
  {
    icon: '☀️',
    title: 'Morning Ritual: Start with a Smile',
    description: 'Greet each team member with warmth and positive energy to set the tone for the day.',
    color: 'from-yellow-400 to-orange-400'
  },
  {
    icon: '🎯',
    title: 'Pre-Service Alignment',
    description: '5-minute team huddle before service. Set intentions, review goals, celebrate wins.',
    color: 'from-blue-400 to-indigo-400'
  },
  {
    icon: '🍵',
    title: 'Chai Break Tradition',
    description: 'Once a week, sit together for 15 minutes. Share stories, connect as humans.',
    color: 'from-green-400 to-teal-400'
  },
  {
    icon: '💬',
    title: 'Feedback Fridays',
    description: 'Share one kind word + one improvement with a teammate. Growth through care.',
    color: 'from-purple-400 to-pink-400'
  },
  {
    icon: '⭐',
    title: 'Craving Fan Wall',
    description: 'Celebrate customer messages, reviews, and moments that made someone\'s day.',
    color: 'from-amber-400 to-yellow-400'
  }
];

const REFLECTION_PROMPTS = [
  'What does "Craving Fans" mean to you personally?',
  'Which Chai Patta value feels most natural to you, and why?',
  'How will you live one of our values in your next shift?',
  'Share a moment when you felt the warmth of our team culture.',
  'What story will you tell through the chai you serve?'
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

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [moduleForm, setModuleForm] = useState({
    title: '',
    category: 'culture',
    level: null,
    description: '',
    content_type: 'video',
    video_url: '',
    content_text: '',
    duration_minutes: 5,
    quiz_questions: [],
    passing_score: 80,
    is_mandatory: true,
    order_sequence: 1,
    prerequisites: [],
  });

  const [cultureReflections, setCultureReflections] = useState({});
  const [showCultureQuiz, setShowCultureQuiz] = useState(false);
  const [cultureQuizAnswers, setCultureQuizAnswers] = useState({});
  const [cultureCompleted, setCultureCompleted] = useState(false);

  const [editingQuizIndex, setEditingQuizIndex] = useState(null);
  const [quizQuestionForm, setQuizQuestionForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
  });


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

  const createModuleMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingModule.create({
      ...data,
      is_active: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
      setShowEditDialog(false);
      setEditingModule(null);
      resetModuleForm();
      alert('✅ Module created successfully!');
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingModule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
      setShowEditDialog(false);
      setEditingModule(null);
      resetModuleForm();
      alert('✅ Module updated successfully!');
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id) => base44.entities.TrainingModule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
      alert('✅ Module deleted successfully!');
    },
  });

  const resetModuleForm = useCallback(() => {
    setModuleForm({
      title: '',
      category: 'culture',
      level: null,
      description: '',
      content_type: 'video',
      video_url: '',
      content_text: '',
      duration_minutes: 5,
      quiz_questions: [],
      passing_score: 80,
      is_mandatory: true,
      order_sequence: (trainingModules?.length || 0) + 1,
      prerequisites: [],
    });
    setEditingQuizIndex(null);
    setQuizQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
    });
  }, [trainingModules]);

  const handleEditModule = useCallback((module) => {
    setEditingModule(module);
    setModuleForm({
      title: module.title || '',
      category: module.category || 'culture',
      level: module.level || null,
      description: module.description || '',
      content_type: module.content_type || 'video',
      video_url: module.video_url || '',
      content_text: module.content_text || '',
      duration_minutes: module.duration_minutes || 5,
      quiz_questions: module.quiz_questions || [],
      passing_score: module.passing_score || 80,
      is_mandatory: module.is_mandatory ?? true,
      order_sequence: module.order_sequence || 1,
      prerequisites: module.prerequisites || [],
    });
    setShowEditDialog(true);
  }, []);

  const handleSaveModule = () => {
    if (!moduleForm.title.trim()) {
      alert('Please enter a module title');
      return;
    }

    // Ensure level is null for 'culture' or 'onboarding' if it was accidentally set
    const finalForm = { ...moduleForm };
    if (['culture', 'onboarding'].includes(finalForm.category)) {
      finalForm.level = null;
    }

    if (editingModule) {
      updateModuleMutation.mutate({ id: editingModule.id, data: finalForm });
    } else {
      createModuleMutation.mutate(finalForm);
    }
  };

  const handleDeleteModule = (module) => {
    if (confirm(`Delete "${module.title}"? This cannot be undone.`)) {
      deleteModuleMutation.mutate(module.id);
    }
  };

  const handleAddQuizQuestion = () => {
    if (!quizQuestionForm.question.trim() || quizQuestionForm.options.some(o => !o.trim())) {
      alert('Please fill in all quiz fields');
      return;
    }

    const updatedQuestions = [...moduleForm.quiz_questions];
    if (editingQuizIndex !== null) {
      updatedQuestions[editingQuizIndex] = quizQuestionForm;
      setEditingQuizIndex(null);
    } else {
      updatedQuestions.push(quizQuestionForm);
    }

    setModuleForm({ ...moduleForm, quiz_questions: updatedQuestions });
    setQuizQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
    });
  };

  const handleEditQuizQuestion = (index) => {
    setQuizQuestionForm(moduleForm.quiz_questions[index]);
    setEditingQuizIndex(index);
  };

  const handleDeleteQuizQuestion = (index) => {
    if (confirm('Delete this quiz question?')) {
      setModuleForm({
        ...moduleForm,
        quiz_questions: moduleForm.quiz_questions.filter((_, i) => i !== index),
      });
    }
  };

  useEffect(() => {
    const handleEditRequest = (event) => {
      if (event.detail) {
        handleEditModule(event.detail);
      }
    };
    window.addEventListener('editModule', handleEditRequest);
    return () => {
      window.removeEventListener('editModule', handleEditRequest);
    };
  }, [handleEditModule]);

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

  const CULTURE_QUIZ = [
    {
      question: "What is Chai Patta's mission?",
      options: ["Serve tea fast", "Create Craving Fans", "Sell premium drinks", "Make profit"],
      correct_answer: 1
    },
    {
      question: "Which value represents our roots and traditions?",
      options: ["Growth", "Heritage", "Excellence", "Speed"],
      correct_answer: 1
    },
    {
      question: "What does Discipline mean at Chai Patta?",
      options: ["Be strict", "Always show up early and prepared", "Punish mistakes", "Work longer"],
      correct_answer: 1
    },
    {
      question: "What's our morning ritual?",
      options: ["Huddle silently", "Start with a smile", "Skip briefing", "Clock in fast"],
      correct_answer: 1
    },
    {
      question: "What makes a guest a 'Craving Fan'?",
      options: ["Free chai", "Consistent excellence and care", "Promotions", "Fast service"],
      correct_answer: 1
    }
  ];

  const handleCultureQuizSubmit = async () => {
    let correctCount = 0;
    CULTURE_QUIZ.forEach((q, index) => {
      if (cultureQuizAnswers[index] === q.correct_answer) correctCount++;
    });

    const score = Math.round((correctCount / CULTURE_QUIZ.length) * 100);
    const passed = score >= 80;

    if (passed) {
      setCultureCompleted(true);
      setShowCultureQuiz(false);
      
      // Generate certificate
      const certId = `CERT-CULTURE-${Date.now()}`;
      await createCertificateMutation.mutateAsync({
        certificate_id: certId,
        staff_email: user?.email,
        staff_name: user?.full_name,
        certificate_type: 'culture_completion',
        title: 'Welcome to the Chai Patta Family',
        description: `Successfully completed Culture & Values training with ${score}% score`,
        issued_date: new Date().toISOString(),
        issued_by: 'AURA Training Academy',
        verification_url: `${window.location.origin}/verify-cert/${certId}`,
        is_verified: true,
        points_awarded: 20,
        badge_earned: 'Culture Champion',
      });

      // Award points
      await createRewardMutation.mutateAsync({
        staff_email: user?.email,
        staff_name: user?.full_name,
        reward_type: 'training_completion',
        points_earned: 20,
        badge_name: 'Culture Champion',
        badge_icon: '🌿',
        reason: 'Completed Culture & Values training',
        awarded_by: 'AURA Training Academy',
        awarded_date: new Date().toISOString(),
        is_public: true,
        linked_achievement: 'culture_training',
      });

      // Post to EventHub
      await createEventMutation.mutateAsync({
        source_module: 'training',
        event_type: 'culture_completed',
        title: `🌿 ${user?.full_name} joined the Chai Patta family!`,
        message: `${user?.full_name} completed Culture & Values training and earned the "Culture Champion" badge! 🏆`,
        severity: 'success',
        recipient_roles: ['manager', 'all'],
      });

      triggerConfetti();
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['trainingProgress'] }); // Invalidate progress to update general progress bar
      queryClient.invalidateQueries({ queryKey: ['staffRewards'] }); // Invalidate rewards
    } else {
      alert(`You scored ${score}%. You need 80% to pass. Review the content and try again!`);
      setCultureQuizAnswers({});
    }
  };


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
            <>
              <Link to={createPageUrl('ManagerTrainingDashboard')}>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Manager View
                </Button>
              </Link>
              <Button
                onClick={() => {
                  setEditingModule(null);
                  resetModuleForm();
                  setShowEditDialog(true);
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Module
              </Button>
            </>
          )}
          <Link to={createPageUrl('TrainingMentor')}>
            <Button variant="outline" size="sm" className="bg-purple-50">
              <MessageCircle className="w-4 h-4 mr-2" />
              AI Mentor
            </Button>
          </Link>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetProgress}
            className="ml-auto bg-orange-50 border-orange-300 hover:bg-orange-100 text-orange-700"
            disabled={myTrainingProgress.length === 0}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset & Retake
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

          <TabsContent value="culture" className="space-y-6">
            <Card className="bg-gradient-to-r from-[#014D40] via-emerald-600 to-[#E0B037] text-white border-none shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32" />
              <CardContent className="p-12 relative">
                <div className="text-center">
                  <h2 className="text-5xl font-bold mb-4">🌿 Culture & Values 🌿</h2>
                  <p className="text-2xl text-emerald-100 italic mb-4">
                    "Learn the Heart of Chai Patta"
                  </p>
                  <p className="text-lg text-white/90 max-w-3xl mx-auto leading-relaxed">
                    Understand our mission, embrace our values, and discover what makes us different. 
                    This is where every journey begins - with purpose and passion.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Mission & Vision */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-[#014D40] to-emerald-600 text-white border-none shadow-xl">
                <CardContent className="p-8">
                  <div className="text-6xl mb-4 text-center">🎯</div>
                  <h3 className="text-2xl font-bold mb-4 text-center">Our Mission</h3>
                  <p className="text-lg text-emerald-100 leading-relaxed italic text-center">
                    "To serve every cup with a story, inspire every team member with purpose, 
                    and build a culture of excellence."
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-[#E0B037] to-amber-500 text-white border-none shadow-xl">
                <CardContent className="p-8">
                  <div className="text-6xl mb-4 text-center">✨</div>
                  <h3 className="text-2xl font-bold mb-4 text-center">Our Vision</h3>
                  <p className="text-lg text-amber-100 leading-relaxed italic text-center">
                    "To become the most loved chai brand - where every team member thrives 
                    and every guest becomes a Craving Fan."
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Core Values - Interactive Cards */}
            <Card className="border-2 border-[#014D40] shadow-xl">
              <CardHeader>
                <CardTitle className="text-3xl text-center text-[#014D40]">Our 5 Core Values</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-5 gap-4">
                  {CORE_VALUES.map((value, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ scale: 1.05, rotate: 2 }}
                      className="cursor-pointer"
                    >
                      <Card className={`bg-gradient-to-br ${value.color} text-white border-none shadow-lg h-full`}>
                        <CardContent className="p-6 text-center">
                          <div className="text-5xl mb-3">{value.icon}</div>
                          <h4 className="text-xl font-bold mb-2">{value.title}</h4>
                          <p className="text-sm text-white/90 mb-3">{value.description}</p>
                          <div className="text-xs text-white/80 italic border-t border-white/30 pt-3">
                            {value.detail}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Brand Story Video */}
            <Card className="border-2 border-[#E0B037] shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
                  <Video className="w-6 h-6 text-[#014D40]" />
                  The Chai Patta Story — From Spice to Spirit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-600 italic mb-4">
                  "Every great journey starts with a story. Here's ours — the blend of tradition, passion, and modern hospitality."
                </p>
                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                    title="The Chai Patta Story"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cultural Rituals */}
            <Card className="border-2 border-purple-400 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-[#014D40]">
                  🪄 Cultural Rituals - Living Our Values
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {CULTURAL_RITUALS.map((ritual, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Card className={`bg-gradient-to-r ${ritual.color} text-white border-none`}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-3">
                            <div className="text-4xl">{ritual.icon}</div>
                            <div>
                              <h4 className="font-bold text-lg mb-2">{ritual.title}</h4>
                              <p className="text-sm text-white/90">{ritual.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reflection Prompts */}
            <Card className="border-2 border-purple-500 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-purple-900">
                  🧠 Reflection: Connect with Our Culture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {REFLECTION_PROMPTS.map((prompt, idx) => (
                  <div key={idx}>
                    <label className="text-sm font-semibold text-purple-800 mb-2 block">
                      {idx + 1}. {prompt}
                    </label>
                    <Textarea
                      value={cultureReflections[idx] || ''}
                      onChange={(e) => setCultureReflections({...cultureReflections, [idx]: e.target.value})}
                      placeholder="Share your thoughts..."
                      rows={2}
                      className="border-purple-300 focus:border-purple-500"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Culture Quiz */}
            {!cultureCompleted && (
              <Card className="border-2 border-[#E0B037] shadow-xl">
                <CardContent className="p-8 text-center">
                  <Trophy className="w-16 h-16 text-[#E0B037] mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Ready to Test Your Knowledge?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Complete the Culture Quiz to earn your "Culture Champion" badge and unlock Level 1 training!
                  </p>
                  <Button
                    onClick={() => setShowCultureQuiz(true)}
                    className="bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700 text-white px-8 py-6 text-lg"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Take Culture Quiz (5 Questions)
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Training Modules */}
            {cultureModules.length > 0 && (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-[#014D40]" />
                    Culture Training Modules
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}

            {/* Photo Gallery Placeholders */}
            <Card className="border-2 border-[#014D40] shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-[#014D40]">Our Culture in Action</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="aspect-video bg-gradient-to-br from-green-100 to-emerald-200 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <Users className="w-12 h-12 text-emerald-700 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-emerald-800">Team at Work</p>
                    </div>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-amber-100 to-yellow-200 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <Star className="w-12 h-12 text-amber-700 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-amber-800">Happy Guests</p>
                    </div>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-orange-100 to-red-200 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <Heart className="w-12 h-12 text-orange-700 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-orange-800">Perfect Chai</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Motivational Quotes Footer */}
            <Card className="bg-gradient-to-r from-gray-900 to-slate-800 text-white border-none shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <p className="text-2xl font-bold italic">
                    "Raise your standard — not your excuses."
                  </p>
                  <p className="text-lg text-gray-300">- Tony Robbins</p>
                  <div className="h-px bg-white/20 my-4" />
                  <p className="text-xl italic text-emerald-300">
                    "We don't sell chai — we share energy."
                  </p>
                </div>
              </CardContent>
            </Card>
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

        {/* Module Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold text-[#014D40]">
                {editingModule ? '✏️ Edit Training Module' : '➕ Create New Training Module'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-6">
              
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Module Title *</label>
                    <Input
                      value={moduleForm.title}
                      onChange={(e) => setModuleForm({...moduleForm, title: e.target.value})}
                      placeholder="e.g., The Perfect Karak Chai"
                      className="text-lg"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Category *</label>
                      <Select value={moduleForm.category} onValueChange={(v) => setModuleForm({...moduleForm, category: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="culture">🌿 Culture & Values</SelectItem>
                          <SelectItem value="onboarding">👋 Onboarding</SelectItem>
                          <SelectItem value="hygiene">🧼 Hygiene & Safety</SelectItem>
                          <SelectItem value="customer_service">😊 Customer Service</SelectItem>
                          <SelectItem value="product_knowledge">📚 Product Knowledge</SelectItem>
                          <SelectItem value="compliance">⚖️ Leadership & Compliance</SelectItem>
                          <SelectItem value="equipment_use">🔧 Equipment Use</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">Level</label>
                      <Select value={moduleForm.level?.toString() || 'none'} onValueChange={(v) => setModuleForm({...moduleForm, level: v === 'none' ? null : parseInt(v)})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Culture (no level)</SelectItem>
                          <SelectItem value="1">Level 1 - Foundation</SelectItem>
                          <SelectItem value="2">Level 2 - Excellence</SelectItem>
                          <SelectItem value="3">Level 3 - Leadership</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">Duration (min)</label>
                      <Input
                        type="number"
                        value={moduleForm.duration_minutes}
                        onChange={(e) => setModuleForm({...moduleForm, duration_minutes: parseInt(e.target.value) || 5})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">Description *</label>
                    <Textarea
                      value={moduleForm.description}
                      onChange={(e) => setModuleForm({...moduleForm, description: e.target.value})}
                      placeholder="What will learners gain from this module?"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={moduleForm.is_mandatory}
                        onChange={(e) => setModuleForm({...moduleForm, is_mandatory: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-semibold">Mandatory for all staff</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold">Passing Score:</label>
                      <Input
                        type="number"
                        value={moduleForm.passing_score}
                        onChange={(e) => setModuleForm({...moduleForm, passing_score: parseInt(e.target.value) || 80})}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Video & Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Training Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Content Type</label>
                    <Select value={moduleForm.content_type} onValueChange={(v) => setModuleForm({...moduleForm, content_type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">🎥 Video</SelectItem>
                        <SelectItem value="text">📝 Text</SelectItem>
                        <SelectItem value="mixed">🎬 Video + Text</SelectItem>
                        <SelectItem value="quiz">❓ Quiz Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(moduleForm.content_type === 'video' || moduleForm.content_type === 'mixed') && (
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Video URL (YouTube)</label>
                      <Input
                        value={moduleForm.video_url}
                        onChange={(e) => setModuleForm({...moduleForm, video_url: e.target.value})}
                        placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                      />
                      {moduleForm.video_url && (
                        <div className="mt-3 aspect-video bg-black rounded-lg overflow-hidden">
                          <iframe
                            width="100%"
                            height="100%"
                            src={moduleForm.video_url.replace('watch?v=', 'embed/')}
                            frameBorder="0"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {(moduleForm.content_type === 'text' || moduleForm.content_type === 'mixed') && (
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Course Material (Text)</label>
                      <Textarea
                        value={moduleForm.content_text}
                        onChange={(e) => setModuleForm({...moduleForm, content_text: e.target.value})}
                        placeholder="Detailed course content, instructions, tips..."
                        rows={8}
                        className="font-mono text-sm"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quiz Questions Builder */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Quiz Questions ({moduleForm.quiz_questions.length})</span>
                    <Badge className="bg-blue-600">{moduleForm.passing_score}% to pass</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Existing Questions */}
                  {moduleForm.quiz_questions.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {moduleForm.quiz_questions.map((q, idx) => (
                        <Card key={idx} className="bg-gray-50 border-2 border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-semibold text-gray-900 flex-1">
                                Q{idx + 1}: {q.question}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditQuizQuestion(idx)}
                                >
                                  <Pencil className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteQuizQuestion(idx)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1 ml-4">
                              {q.options?.map((opt, optIdx) => (
                                <p key={optIdx} className={`text-sm ${optIdx === q.correct_answer ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                                  {optIdx === q.correct_answer && '✅ '}{opt}
                                </p>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Add/Edit Quiz Question Form */}
                  <Card className="bg-blue-50 border-2 border-blue-300">
                    <CardContent className="p-6 space-y-4">
                      <h4 className="font-bold text-blue-900">
                        {editingQuizIndex !== null ? '✏️ Edit Question' : '➕ Add New Question'}
                      </h4>
                      
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Question</label>
                        <Input
                          value={quizQuestionForm.question}
                          onChange={(e) => setQuizQuestionForm({...quizQuestionForm, question: e.target.value})}
                          placeholder="What is Chai Patta's mission?"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold mb-2 block">Answer Options</label>
                        <div className="space-y-2">
                          {[0, 1, 2, 3].map((optIdx) => (
                            <div key={optIdx} className="flex gap-2 items-center">
                              <input
                                type="radio"
                                name="correct-answer"
                                checked={quizQuestionForm.correct_answer === optIdx}
                                onChange={() => setQuizQuestionForm({...quizQuestionForm, correct_answer: optIdx})}
                                className="w-4 h-4"
                                title="Mark as correct answer"
                              />
                              <Input
                                value={quizQuestionForm.options[optIdx] || ''}
                                onChange={(e) => {
                                  const newOptions = [...quizQuestionForm.options];
                                  newOptions[optIdx] = e.target.value;
                                  setQuizQuestionForm({...quizQuestionForm, options: newOptions});
                                }}
                                placeholder={`Option ${optIdx + 1}`}
                              />
                              {quizQuestionForm.correct_answer === optIdx && (
                                <Badge className="bg-green-600">✓ Correct</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-600 mt-2">💡 Click the radio button to mark the correct answer</p>
                      </div>

                      <div className="flex gap-2">
                        {editingQuizIndex !== null && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingQuizIndex(null);
                              setQuizQuestionForm({ question: '', options: ['', '', '', ''], correct_answer: 0 });
                            }}
                          >
                            Cancel Edit
                          </Button>
                        )}
                        <Button
                          onClick={handleAddQuizQuestion}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {editingQuizIndex !== null ? 'Update Question' : 'Add Question'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              {/* Save/Cancel Actions */}
              <div className="flex justify-between gap-3 pt-4 border-t">
                <div>
                  {editingModule && (
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteModule(editingModule)}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Module
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => {
                    setShowEditDialog(false);
                    setEditingModule(null);
                    resetModuleForm();
                  }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveModule}
                    disabled={createModuleMutation.isPending || updateModuleMutation.isPending}
                    className="bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700 px-8"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingModule ? 'Update Module' : 'Create Module'}
                  </Button>
                </div>
              </div>
            </div>
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

        {/* Culture Quiz Dialog */}
        <Dialog open={showCultureQuiz} onOpenChange={setShowCultureQuiz}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                🌿 Culture & Values Quiz
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <Card className="bg-gradient-to-r from-[#014D40] to-emerald-600 text-white border-none">
                <CardContent className="p-6">
                  <p className="text-lg font-semibold text-center">
                    Show us you understand the heart of Chai Patta! 
                  </p>
                  <p className="text-sm text-emerald-100 text-center mt-2">
                    Pass with 80% to earn your "Culture Champion" badge 🏆
                  </p>
                </CardContent>
              </Card>

              {CULTURE_QUIZ.map((q, index) => (
                <Card key={index} className="border-2 border-[#014D40]">
                  <CardContent className="p-6">
                    <p className="font-bold text-gray-900 text-lg mb-4">
                      Question {index + 1}: {q.question}
                    </p>
                    <div className="space-y-3">
                      {q.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            cultureQuizAnswers[index] === optIndex
                              ? 'border-emerald-600 bg-emerald-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`cq-${index}`}
                            checked={cultureQuizAnswers[index] === optIndex}
                            onChange={() => setCultureQuizAnswers({ ...cultureQuizAnswers, [index]: optIndex })}
                            className="w-5 h-5 text-emerald-600"
                          />
                          <span className="text-gray-800 flex-1 font-medium">{option}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowCultureQuiz(false);
                  setCultureQuizAnswers({});
                }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCultureQuizSubmit}
                  disabled={Object.keys(cultureQuizAnswers).length !== CULTURE_QUIZ.length}
                  className="bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Quiz
                </Button>
              </div>
            </div>
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
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

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
      } hover:shadow-xl transition-all relative`}>
        
        {isManager && (
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.dispatchEvent(new CustomEvent('editModule', { detail: module }))}
              className="bg-white/90 hover:bg-white text-blue-600 hover:text-blue-700 shadow-sm"
              title="Edit Module"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        )}

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
