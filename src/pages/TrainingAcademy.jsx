
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
  Plus,
  Pencil,
  Save,
  Trash2,
  Upload, Camera, Check, Eye, X, Pin, Wand2, // Camera added
  Megaphone,
  Loader2,
  Send,
  Lightbulb,
  Search, // Added Search
  Filter, // Added Filter
  ThumbsUp, // Added ThumbsUp
  BarChart, // Added BarChart
  Edit, // Added Edit
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns'; // Removed formatDistanceToNow
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

const POST_TYPE_ICONS = {
  inspiration: { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100' },
  training_tip: { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-100' },
  success_story: { icon: Award, color: 'text-amber-600', bg: 'bg-amber-100' },
  announcement: { icon: Megaphone, color: 'text-red-600', bg: 'bg-red-100' },
  knowledge_share: { icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-100' },
  best_practice: { icon: Star, color: 'text-pink-600', bg: 'bg-pink-100' },
};


export default function TrainingAcademy() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('posts');
  
  // Posts state
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    post_type: 'inspiration',
    category: 'culture',
    media_type: 'none',
    photo_urls: [],
    video_url: '',
    requires_acknowledgment: true,
    is_featured: false,
  });

  // Training modules state
  const [showCreateModule, setShowCreateModule] = useState(false); // New state for creating modules
  const [selectedModule, setSelectedModule] = useState(null);
  const [showModuleViewer, setShowModuleViewer] = useState(false); // This seems to be the equivalent of original selectedModule state

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

  const [showAIHelper, setShowAIHelper] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);


  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: trainingModules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: async () => {
      const modules = await base44.entities.TrainingModule.list('order_sequence');
      console.log('📝 Loaded modules:', modules);
      return modules;
    },
  });

  const { data: myProgress = [] } = useQuery({
    queryKey: ['myTrainingProgress', user?.email],
    queryFn: () => base44.entities.TrainingRecord.filter(
      { staff_email: user?.email },
      '-created_date'
    ),
    enabled: !!user?.email,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['myCertificates', user?.email],
    queryFn: () => base44.entities.Certificate.filter(
      { staff_email: user?.email },
      '-issued_date'
    ),
    enabled: !!user?.email,
  });

  const { data: trainingPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['trainingPosts'],
    queryFn: async () => {
      const posts = await base44.entities.TrainingPost.list('-created_date');
      console.log('📝 Loaded posts:', posts);
      return posts;
    },
    refetchInterval: 3000,
  });

  const updateProgressMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTrainingProgress'] });
    },
  });

  const updateProgressRecordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTrainingProgress'] });
    },
  });

  const createCertificateMutation = useMutation({
    mutationFn: (data) => base44.entities.Certificate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCertificates'] });
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
      const progressRecords = myProgress.filter(p => p.staff_email === user?.email);
      const progressIds = progressRecords.map(p => p.id);
      
      // Use Promise.all to await all delete operations
      await Promise.all(progressIds.map(id => base44.entities.TrainingRecord.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTrainingProgress'] });
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

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      console.log('🚀 Creating post:', postData);
      return await base44.entities.TrainingPost.create(postData);
    },
    onSuccess: (data) => {
      console.log('✅ Post created:', data);
      queryClient.invalidateQueries({ queryKey: ['trainingPosts'] });
      setShowCreatePost(false);
      setNewPost({
        title: '',
        content: '',
        post_type: 'inspiration',
        category: 'culture',
        media_type: 'none',
        photo_urls: [],
        video_url: '',
        requires_acknowledgment: true,
        is_featured: false,
      });
    },
    onError: (error) => {
      console.error('❌ Error creating post:', error);
      alert('Failed to create post. Please try again.');
    },
  });

  const acknowledgePostMutation = useMutation({
    mutationFn: async ({ postId, post }) => {
      const acknowledgment = {
        staff_email: user?.email,
        staff_name: user?.full_name,
        acknowledged_at: new Date().toISOString(),
      };

      return await base44.entities.TrainingPost.update(postId, {
        acknowledged_by: [...(post.acknowledged_by || []), acknowledgment],
        total_acknowledgments: (post.total_acknowledgments || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingPosts'] });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: ({ postId, currentLikes }) => 
      base44.entities.TrainingPost.update(postId, {
        likes_count: currentLikes + 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingPosts'] });
    },
  });

  // Filter posts based on new state variables
  const filteredPosts = trainingPosts.filter(post => {
    if (!post) return false;
    
    const matchesSearch = !searchQuery || 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || post.post_type === filterType;
    const matchesCategory = filterCategory === 'all' || post.category === filterCategory;
    
    // Only show active posts in the feed
    return matchesSearch && matchesType && matchesCategory && post.is_active;
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

  // Removed original resetPostForm, replaced by setNewPost in createPostMutation.onSuccess

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

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingPhoto(true); // Changed to uploadingPhoto
    const uploadedUrls = [];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    setNewPost(prev => ({ // Changed to newPost
      ...prev,
      photo_urls: [...prev.photo_urls, ...uploadedUrls],
      media_type: prev.video_url ? 'both' : 'photo',
    }));
    setUploadingPhoto(false); // Changed to uploadingPhoto
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true); // Changed to uploadingPhoto
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setNewPost(prev => ({ // Changed to newPost
      ...prev,
      video_url: file_url,
      media_type: prev.photo_urls.length > 0 ? 'both' : 'video',
    }));
    setUploadingPhoto(false); // Changed to uploadingPhoto
  };

  const handleCreatePost = async () => { // Changed function signature to match dialog usage
    if (!newPost.title || !newPost.content) {
      alert('⚠️ Please fill in title and content');
      return;
    }

    setCreatingPost(true);
    
    const postData = {
      title: newPost.title,
      content: newPost.content,
      post_type: newPost.post_type,
      category: newPost.category,
      media_type: newPost.photo_urls.length > 0 && newPost.video_url ? 'both' : newPost.photo_urls.length > 0 ? 'photo' : newPost.video_url ? 'video' : 'none',
      photo_urls: newPost.photo_urls,
      video_url: newPost.video_url || null,
      requires_acknowledgment: newPost.requires_acknowledgment,
      is_featured: newPost.is_featured,
      is_active: true,
      author_email: user?.email,
      author_name: user?.full_name,
      total_acknowledgments: 0,
      view_count: 0,
      likes_count: 0,
      acknowledged_by: [],
      tags: [],
    };

    console.log('📤 Submitting post:', postData);
    await createPostMutation.mutateAsync(postData);
    setCreatingPost(false);
  };

  // Removed original hasAcknowledged as it's now internal to render logic

  const generateAIPost = async () => {
    if (!aiPrompt.trim()) {
      alert('⚠️ Please describe what you want to create');
      return;
    }

    setGeneratingAI(true);
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a warm, motivational training content creator for AURA Restaurant.

User wants to create a training post about: "${aiPrompt}"

Generate a professional, inspiring training post with:
1. A catchy, motivational title
2. Engaging content (2-3 paragraphs) that teaches and inspires
3. Include emojis where appropriate
4. Use bullet points for key takeaways
5. End with an encouraging message

Tone: Warm, professional, motivational, aligned with excellence and teamwork culture.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            suggested_category: { type: 'string' },
            suggested_post_type: { type: 'string' },
            key_takeaways: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      // Map suggested categories and types to valid options if they don't exactly match
      const validCategories = ['leadership', 'customer_service', 'food_safety', 'teamwork', 'innovation', 'excellence', 'culture', 'skills'];
      const validPostTypes = ['inspiration', 'training_tip', 'success_story', 'announcement', 'knowledge_share', 'best_practice'];

      setNewPost({ // Changed to setNewPost
        title: result.title,
        content: result.content + (result.key_takeaways && result.key_takeaways.length > 0 ? '\n\nKey Takeaways:\n' + result.key_takeaways.map(kt => `- ${kt}`).join('\n') : ''),
        post_type: validPostTypes.includes(result.suggested_post_type) ? result.suggested_post_type : 'inspiration',
        category: validCategories.includes(result.suggested_category) ? result.suggested_category : 'culture',
        photo_urls: [],
        video_url: '',
        requires_acknowledgment: true,
        is_featured: false, // Default for AI-generated posts
        is_active: true, // Default for AI-generated posts
      });

      setShowAIHelper(false);
      setShowCreatePost(true); // Changed to setShowCreatePost
      setAiPrompt('');
      
    } catch (error) {
      console.error('Error generating AI post:', error);
      alert('❌ Failed to generate post. Please try again.');
    } finally {
      setGeneratingAI(false);
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
    
    const existingProgress = myProgress.find(p => p.module_id === module.id); // Changed to myProgress
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

    const existingProgress = myProgress.find(p => p.module_id === selectedModule.id); // Changed to myProgress
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
    const existingProgress = myProgress.find(p => p.module_id === selectedModule.id); // Changed to myProgress
    
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
    
    await queryClient.invalidateQueries({ queryKey: ['myTrainingProgress'] }); // Changed to myTrainingProgress
    await queryClient.invalidateQueries({ queryKey: ['myCertificates'] }); // Changed to myCertificates
  };

  const handleResetProgress = () => {
    setShowResetDialog(true);
  };

  const confirmReset = () => {
    resetProgressMutation.mutate();
  };

  const getModuleProgress = (moduleId) => {
    return myProgress.find(p => p.module_id === moduleId); // Changed to myProgress
  };

  const isModuleUnlocked = (module) => {
    if (!module.prerequisites || module.prerequisites.length === 0) return true;
    
    return module.prerequisites.every(prereqId => {
      const progress = myProgress.find(p => p.module_id === prereqId); // Changed to myProgress
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
    (myProgress.filter(p => p.status === 'completed').length / // Changed to myProgress
    Math.max(trainingModules.length, 1)) * 100
  );

  const cultureModules = trainingModules.filter(m => m.category === 'culture' || m.category === 'onboarding');
  const level1Modules = trainingModules.filter(m => m.level === 1 || ['hygiene', 'safety', 'customer_service'].includes(m.category));
  const level2Modules = trainingModules.filter(m => m.level === 2 || m.category === 'product_knowledge');
  const level3Modules = trainingModules.filter(m => m.level === 3 || m.category === 'compliance');


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
      queryClient.invalidateQueries({ queryKey: ['myCertificates'] }); // Changed to myCertificates
      queryClient.invalidateQueries({ queryKey: ['myTrainingProgress'] }); // Invalidate progress to update general progress bar // Changed to myTrainingProgress
      queryClient.invalidateQueries({ queryKey: ['staffRewards'] }); // Invalidate rewards
    } else {
      alert(`You scored ${score}%. You need 80% to pass. Review the content and try again!`);
      setCultureQuizAnswers({});
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Training Academy</h1>
                <p className="text-gray-600">Learn, grow, and achieve excellence</p>
              </div>
            </div>

            {isManager && (
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCreatePost(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Post
                </Button>
                <Link to={createPageUrl('ManagerTrainingDashboard')}>
                  <Button variant="outline">
                    <BarChart className="w-4 h-4 mr-2" />
                    Training Reports
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 rounded-xl shadow-md border-2 border-purple-100">
            <TabsTrigger
              value="posts"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white"
            >
              <Megaphone className="w-4 h-4 mr-2" />
              Training Posts ({trainingPosts.length})
            </TabsTrigger>
            <TabsTrigger
              value="modules"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Training Modules ({trainingModules.length})
            </TabsTrigger>
            <TabsTrigger
              value="certificates"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-yellow-600 data-[state=active]:text-white"
            >
              <Award className="w-4 h-4 mr-2" />
              My Certificates ({certificates.length})
            </TabsTrigger>
          </TabsList>

          {/* POSTS TAB */}
          <TabsContent value="posts">
            {/* Filters */}
            <Card className="bg-white shadow-md mb-6">
              <CardContent className="p-4">
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search posts..."
                      className="pl-10"
                    />
                  </div>

                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="inspiration">Inspiration</SelectItem>
                      <SelectItem value="training_tip">Training Tips</SelectItem>
                      <SelectItem value="success_story">Success Stories</SelectItem>
                      <SelectItem value="announcement">Announcements</SelectItem>
                      <SelectItem value="knowledge_share">Knowledge Share</SelectItem>
                      <SelectItem value="best_practice">Best Practices</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="leadership">Leadership</SelectItem>
                      <SelectItem value="customer_service">Customer Service</SelectItem>
                      <SelectItem value="food_safety">Food Safety</SelectItem>
                      <SelectItem value="teamwork">Teamwork</SelectItem>
                      <SelectItem value="innovation">Innovation</SelectItem>
                      <SelectItem value="excellence">Excellence</SelectItem>
                      <SelectItem value="culture">Culture</SelectItem>
                      <SelectItem value="skills">Skills</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Posts Feed */}
            <div className="space-y-4">
              {postsLoading ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading posts...</p>
                  </CardContent>
                </Card>
              ) : filteredPosts.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">
                      {trainingPosts.length === 0 ? 'No posts yet' : 'No posts match your filters'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {isManager ? 'Create your first training post!' : 'Check back soon for updates from management'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredPosts.map((post) => {
                  const hasAcknowledged = post.acknowledged_by?.some(ack => ack.staff_email === user?.email);
                  const postTypeIcon = POST_TYPE_ICONS[post.post_type] || POST_TYPE_ICONS.inspiration;
                  const Icon = postTypeIcon.icon;

                  return (
                    <Card key={post.id} className={`bg-white border-2 shadow-lg hover:shadow-xl transition-all ${post.is_featured ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50' : 'border-gray-200'}`}>
                      {post.is_featured && (
                        <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-4 py-2 flex items-center gap-2">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-bold">Featured Post</span>
                        </div>
                      )}
                      
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`p-3 ${postTypeIcon.bg} rounded-lg`}>
                            <Icon className={`w-6 h-6 ${postTypeIcon.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{post.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <span>{post.author_name}</span>
                                  <span>•</span>
                                  <span>{format(new Date(post.created_date), 'MMM d, yyyy')}</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge className={postTypeIcon.bg + ' ' + postTypeIcon.color}>
                                  {post.post_type.replace('_', ' ')}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                  {post.category.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            
                            <p className="text-gray-700 whitespace-pre-wrap mb-4">{post.content}</p>

                            {post.photo_urls && post.photo_urls.length > 0 && (
                              <div className="flex gap-2 mb-4 flex-wrap">
                                {post.photo_urls.map((url, idx) => (
                                  <img
                                    key={idx}
                                    src={url}
                                    alt="Post media"
                                    className="h-48 object-cover rounded-lg"
                                  />
                                ))}
                              </div>
                            )}

                            {post.video_url && (
                              <div className="mb-4">
                                <video
                                  src={post.video_url}
                                  controls
                                  className="w-full rounded-lg"
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="w-4 h-4" />
                                  {post.likes_count || 0}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Check className="w-4 h-4" />
                                  {post.total_acknowledgments || 0} read
                                </div>
                              </div>

                              {post.requires_acknowledgment && !hasAcknowledged && (
                                <Button
                                  onClick={() => acknowledgePostMutation.mutate({ postId: post.id, post })}
                                  disabled={acknowledgePostMutation.isPending}
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  I've Read This
                                </Button>
                              )}

                              {hasAcknowledged && (
                                <Badge className="bg-green-100 text-green-800">
                                  <Check className="w-3 h-3 mr-1" />
                                  Acknowledged
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* MODULES TAB */}
          <TabsContent value="modules" className="space-y-4">
          <Card className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-none shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <BookOpen className="w-16 h-16 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold mb-3">Training Modules</h3>
                    <p className="text-blue-100 text-lg mb-2 font-semibold">
                      "Structured Learning for Continuous Growth"
                    </p>
                    <p className="text-blue-50 mb-6">
                      Explore our comprehensive training curriculum designed to elevate your skills from foundational knowledge to leadership mastery.
                    </p>
                    <div className="flex items-center gap-4">
                      <Progress value={totalProgress} className="flex-1 bg-blue-300 h-3" />
                      <span className="font-bold text-2xl">{totalProgress}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isManager && (
              <div className="flex justify-between items-center mb-4">
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
                  Create New Module
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetProgress}
                  className="bg-orange-50 border-orange-300 hover:bg-orange-100 text-orange-700"
                  disabled={myProgress.length === 0}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset & Retake All Progress
                </Button>
              </div>
            )}

            {trainingModules.length === 0 ? (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Training Modules Yet</h3>
                  <p className="text-gray-600">Training content will appear here soon.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Culture & Onboarding Modules */}
                {cultureModules.length > 0 && (
                  <Card className="shadow-xl">
                    <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
                      <CardTitle className="flex items-center gap-2 text-xl text-purple-800">
                        <Heart className="w-5 h-5 text-purple-600" />
                        Culture & Onboarding ({getCategoryProgress('culture')}%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 grid md:grid-cols-2 gap-4">
                      {cultureModules.map((module, index) => (
                        <ModuleCard
                          key={module.id}
                          module={module}
                          progress={getModuleProgress(module.id)}
                          isUnlocked={isModuleUnlocked(module)}
                          isCompleted={getModuleProgress(module.id)?.status === 'completed'}
                          onStart={() => handleStartModule(module)}
                          index={index}
                          isManager={isManager} // Pass isManager prop
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Level 1 Modules */}
                {level1Modules.length > 0 && (
                  <Card className="shadow-xl">
                    <CardHeader className="bg-gradient-to-r from-blue-100 to-cyan-100">
                      <CardTitle className="flex items-center gap-2 text-xl text-blue-800">
                        <Star className="w-5 h-5 text-blue-600" />
                        Level 1: Foundation ({getCategoryProgress(1)}%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 grid md:grid-cols-2 gap-4">
                      {level1Modules.map((module, index) => (
                        <ModuleCard
                          key={module.id}
                          module={module}
                          progress={getModuleProgress(module.id)}
                          isUnlocked={isModuleUnlocked(module)}
                          isCompleted={getModuleProgress(module.id)?.status === 'completed'}
                          onStart={() => handleStartModule(module)}
                          index={index}
                          isManager={isManager}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Level 2 Modules */}
                {level2Modules.length > 0 && (
                  <Card className="shadow-xl">
                    <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100">
                      <CardTitle className="flex items-center gap-2 text-xl text-green-800">
                        <Target className="w-5 h-5 text-green-600" />
                        Level 2: Excellence ({getCategoryProgress(2)}%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 grid md:grid-cols-2 gap-4">
                      {level2Modules.map((module, index) => (
                        <ModuleCard
                          key={module.id}
                          module={module}
                          progress={getModuleProgress(module.id)}
                          isUnlocked={isModuleUnlocked(module)}
                          isCompleted={getModuleProgress(module.id)?.status === 'completed'}
                          onStart={() => handleStartModule(module)}
                          index={index}
                          isManager={isManager}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Level 3 Modules */}
                {level3Modules.length > 0 && (
                  <Card className="shadow-xl">
                    <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100">
                      <CardTitle className="flex items-center gap-2 text-xl text-amber-800">
                        <Trophy className="w-5 h-5 text-amber-600" />
                        Level 3: Leadership ({getCategoryProgress(3)}%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 grid md:grid-cols-2 gap-4">
                      {level3Modules.map((module, index) => (
                        <ModuleCard
                          key={module.id}
                          module={module}
                          progress={getModuleProgress(module.id)}
                          isUnlocked={isModuleUnlocked(module)}
                          isCompleted={getModuleProgress(module.id)?.status === 'completed'}
                          onStart={() => handleStartModule(module)}
                          index={index}
                          isManager={isManager}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* CERTIFICATES TAB */}
          <TabsContent value="certificates">
            <Card className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-none shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <Award className="w-16 h-16 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold mb-3">My Certificates</h3>
                    <p className="text-amber-100 text-lg mb-2 font-semibold">
                      "Celebrate Your Achievements!"
                    </p>
                    <p className="text-amber-50 mb-6">
                      View and download all the certificates you've earned by completing training modules and quizzes.
                    </p>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-4xl">{certificates.length}</span>
                      <span className="font-semibold text-2xl text-amber-100">Certificates Earned</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {certificates.length === 0 ? (
              <Card className="bg-amber-50 border-amber-200 mt-6">
                <CardContent className="p-8 text-center">
                  <Award className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Certificates Yet</h3>
                  <p className="text-gray-600">Start completing modules to earn your first certificate!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                {certificates.map(cert => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Card className="border-2 border-yellow-400 hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-yellow-50">
                      <CardContent className="p-6 text-center">
                        <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                        <h4 className="font-semibold text-gray-900 mb-2">{cert.title}</h4>
                        <p className="text-xs text-gray-600 mb-1">{cert.description}</p>
                        <p className="text-xs text-gray-500 mb-3">
                          Issued: {format(new Date(cert.issued_date), 'MMM d, yyyy')}
                        </p>
                        {cert.points_awarded > 0 && (
                          <Badge className="bg-green-100 text-green-800 mb-2">
                            +{cert.points_awarded} XP
                          </Badge>
                        )}
                        {cert.badge_earned && (
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
            )}
          </TabsContent>
        </Tabs>
        
        {/* Module Detail Dialog */}
        <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-[#014D40]" />
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
                  <Badge className="bg-purple-100 text-purple-800 capitalize">
                    {selectedModule.category?.replace('_', ' ')}
                  </Badge>
                  {selectedModule.level && (
                    <Badge className="bg-[#014D40] text-white">
                      Level {selectedModule.level}
                    </Badge>
                  )}
                </div>

                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
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
                      <FileText className="w-5 h-5 text-[#014D40]" />
                      Course Material
                    </h3>
                    <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200">
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
                      Related Procedures
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedModule.linked_sop_ids.map(sopId => (
                        <Link key={sopId} to={createPageUrl(`SOPViewer?id=${sopId}`)}>
                          <Button variant="outline" size="sm" className="bg-green-50">
                            <BookOpen className="w-4 h-4 mr-2" />
                            View SOP for this Recipe
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {selectedModule.quiz_questions?.length > 0 && (
                  <Button
                    onClick={() => setShowQuiz(true)}
                    className="w-full bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700 py-6 text-lg shadow-lg"
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
                <RefreshCw className="w-6 h-6 text-orange-600" />
                Reset Training Progress?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Card className="bg-blue-50 border-blue-300 border-2">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-900 font-bold mb-2">
                    ✅ What will be SAVED:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>All {certificates.length} certificates</strong> you earned</li>
                    <li>• Your performance points and XP</li>
                    <li>• Your badges and achievements</li>
                    <li>• Historical completion records</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-300 border-2">
                <CardContent className="p-4">
                  <p className="text-sm text-orange-900 font-bold mb-2">
                    🔄 What will be RESET:
                  </p>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• Module completion status</li>
                    <li>• Quiz scores (retake for improvement)</li>
                    <li>• Progress percentages</li>
                    <li>• Reflection notes</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-purple-900 font-semibold">
                    💡 Perfect for refreshing knowledge, improving scores, or retraining!
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowResetDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmReset}
                  disabled={resetProgressMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg"
                >
                  {resetProgressMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Yes, Reset & Start Fresh
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* CREATE POST DIALOG */}
        <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Create Training Post
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Post Title</label>
                <Input
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="e.g., Food Safety Best Practices"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Share your training content, tips, or announcement..."
                  rows={6}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Post Type</label>
                  <Select value={newPost.post_type} onValueChange={(value) => setNewPost({ ...newPost, post_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inspiration">💡 Inspiration</SelectItem>
                      <SelectItem value="training_tip">📚 Training Tip</SelectItem>
                      <SelectItem value="success_story">🏆 Success Story</SelectItem>
                      <SelectItem value="announcement">📢 Announcement</SelectItem>
                      <SelectItem value="knowledge_share">🧠 Knowledge Share</SelectItem>
                      <SelectItem value="best_practice">⭐ Best Practice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={newPost.category} onValueChange={(value) => setNewPost({ ...newPost, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leadership">Leadership</SelectItem>
                      <SelectItem value="customer_service">Customer Service</SelectItem>
                      <SelectItem value="food_safety">Food Safety</SelectItem>
                      <SelectItem value="teamwork">Teamwork</SelectItem>
                      <SelectItem value="innovation">Innovation</SelectItem>
                      <SelectItem value="excellence">Excellence</SelectItem>
                      <SelectItem value="culture">Culture</SelectItem>
                      <SelectItem value="skills">Skills</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Media (Optional)</label>
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('post-photo-upload').click()}
                    disabled={uploadingPhoto}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploadingPhoto ? 'Uploading...' : 'Add Photos'}
                  </Button>
                  <input
                    id="post-photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {newPost.photo_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {newPost.photo_urls.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt="Upload" className="h-24 w-24 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setNewPost(prev => ({
                            ...prev,
                            photo_urls: prev.photo_urls.filter((_, i) => i !== idx)
                          }))}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Video URL (YouTube, Vimeo, etc.)</label>
                  <Input
                    value={newPost.video_url}
                    onChange={(e) => setNewPost({ ...newPost, video_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requires_ack"
                  checked={newPost.requires_acknowledgment}
                  onChange={(e) => setNewPost({ ...newPost, requires_acknowledgment: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="requires_ack" className="text-sm text-gray-700">
                  Require staff to acknowledge they've read this post
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={newPost.is_featured}
                  onChange={(e) => setNewPost({ ...newPost, is_featured: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_featured" className="text-sm text-gray-700">
                  Feature this post (appears at top with gold banner)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreatePost(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePost}
                  disabled={creatingPost || !newPost.title || !newPost.content}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {creatingPost ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Publish Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Helper Dialog */}
        <Dialog open={showAIHelper} onOpenChange={setShowAIHelper}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-purple-600" />
                AI Training Post Generator
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                <h3 className="font-bold text-purple-900 mb-2">✨ Describe what you want to create:</h3>
                <p className="text-sm text-purple-700 mb-4">
                  Examples: "customer service excellence", "food safety tips", "teamwork motivation", "handling stress"
                </p>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={4}
                  placeholder="I want to create a post about..."
                  className="mb-4"
                />
                <Button
                  onClick={generateAIPost}
                  disabled={generatingAI || !aiPrompt.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  size="lg"
                >
                  {generatingAI ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                      AI is creating your post...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-gray-500">
                <p>The AI will create a professional, motivational post that you can edit before publishing.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ModuleCard({ module, progress, isUnlocked, isCompleted, onStart, index, isManager }) {
  // isManager is passed as a prop, removed local user query
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`${
        isCompleted ? 'border-green-500 border-2 bg-gradient-to-br from-green-50 to-emerald-50' :
        !isUnlocked ? 'border-gray-300 bg-gray-50/50 opacity-75' :
        'bg-white border-2 border-blue-200'
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
              !isUnlocked ? 'bg-gray-400' :
              'bg-gradient-to-br from-[#014D40] to-emerald-600'
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
                {module.is_mandatory && (
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
                  className="w-full bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700 shadow-md"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {progress?.status === 'in_progress' ? 'Continue Learning' : 'Start Module'}
                </Button>
              )}

              {isCompleted && progress?.completed_at && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg font-medium border border-green-200">
                  <CheckCircle className="w-4 h-4" />
                  Completed {format(new Date(progress.completed_at), 'MMM d, yyyy')}
                </div>
              )}

              {!isUnlocked && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
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
