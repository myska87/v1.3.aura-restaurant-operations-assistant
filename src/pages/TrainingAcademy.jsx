import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GraduationCap,
  BookOpen,
  Award,
  CheckCircle,
  Clock,
  Target,
  Star,
  Sparkles,
  Plus,
  Search,
  Camera,
  Megaphone,
  ThumbsUp,
  Send,
  Loader2,
  Play,
  Heart,
  Wand2,
  Zap,
  Image as ImageIcon,
  Video,
  Smile,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

const POST_THEMES = {
  purple: { gradient: 'from-purple-500 to-pink-500', bg: 'bg-gradient-to-r from-purple-50 to-pink-50', icon: Sparkles },
  blue: { gradient: 'from-blue-500 to-cyan-500', bg: 'bg-gradient-to-r from-blue-50 to-cyan-50', icon: BookOpen },
  green: { gradient: 'from-green-500 to-emerald-500', bg: 'bg-gradient-to-r from-green-50 to-emerald-50', icon: CheckCircle },
  gold: { gradient: 'from-amber-500 to-yellow-500', bg: 'bg-gradient-to-r from-amber-50 to-yellow-50', icon: Star },
  orange: { gradient: 'from-orange-500 to-red-500', bg: 'bg-gradient-to-r from-orange-50 to-red-50', icon: Megaphone },
  pink: { gradient: 'from-pink-500 to-rose-500', bg: 'bg-gradient-to-r from-pink-50 to-rose-50', icon: Heart },
};

const EMOJI_PICKER = ['🎓', '📚', '⭐', '🏆', '💡', '🚀', '🎯', '💪', '🔥', '✨', '👏', '🌟', '💚', '🎉', '📝', '🧠', '💼', '🍽️', '👨‍🍳', '🧼'];

export default function TrainingAcademy() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showAIModuleBuilder, setShowAIModuleBuilder] = useState(false);
  const [aiModulePrompt, setAIModulePrompt] = useState('');
  const [generatingModule, setGeneratingModule] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedModule, setSelectedModule] = useState(null);
  const [showModuleViewer, setShowModuleViewer] = useState(false);
  
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    post_type: 'inspiration',
    category: 'culture',
    photo_urls: [],
    video_url: '',
    requires_acknowledgment: true,
    is_featured: false,
    theme_color: 'purple',
    emoji: '✨',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: trainingPosts = [], refetch: refetchPosts } = useQuery({
    queryKey: ['trainingPosts'],
    queryFn: async () => {
      const posts = await base44.entities.TrainingPost.list('-created_date');
      console.log('📚 Loaded training posts:', posts.length);
      return posts;
    },
  });

  const { data: trainingModules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list('order_sequence'),
  });

  const { data: myProgress = [] } = useQuery({
    queryKey: ['myTrainingProgress', user?.email],
    queryFn: () => base44.entities.TrainingRecord.filter({ staff_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['myCertificates', user?.email],
    queryFn: () => base44.entities.Certificate.filter({ staff_email: user?.email }, '-issued_date'),
    enabled: !!user?.email,
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      console.log('🚀 Creating post:', postData);
      return await base44.entities.TrainingPost.create(postData);
    },
    onSuccess: async (result) => {
      console.log('✅ Post created:', result);
      await refetchPosts();
      queryClient.invalidateQueries({ queryKey: ['trainingPosts'] });
      setShowCreatePost(false);
      setNewPost({
        title: '',
        content: '',
        post_type: 'inspiration',
        category: 'culture',
        photo_urls: [],
        video_url: '',
        requires_acknowledgment: true,
        is_featured: false,
        theme_color: 'purple',
        emoji: '✨',
      });
      
      // Confetti effect!
      const duration = 3 * 1000;
      const end = Date.now() + duration;
      (function frame() {
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
      
      alert('🎉 Post published successfully!');
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
    mutationFn: async (postId) => {
      const post = trainingPosts.find(p => p.id === postId);
      return await base44.entities.TrainingPost.update(postId, {
        likes_count: (post.likes_count || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingPosts'] });
    },
  });

  const generateModuleMutation = useMutation({
    mutationFn: async (prompt) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert restaurant training specialist. Create a comprehensive, engaging training module based on: "${prompt}". 

Make it professional and detailed with:
- Clear, engaging title
- 2-3 sentence description
- Category: hygiene, customer_service, product_knowledge, safety, equipment_use, onboarding, or compliance
- Content type: text (for now)
- Detailed HTML-formatted content (minimum 400 words) with:
  * <h2> section headers
  * <ul> bullet lists
  * <strong> emphasis on key points
  * <p> paragraphs with clear explanations
  * Practical examples for restaurant staff
- 6-8 quiz questions with 4 multiple choice options each
- Realistic duration (20-45 minutes)
- Mark as mandatory if it's safety/hygiene related

Return ONLY valid JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            category: { 
              type: "string",
              enum: ["hygiene", "customer_service", "product_knowledge", "safety", "equipment_use", "onboarding", "compliance"]
            },
            content_type: { type: "string" },
            content_text: { type: "string" },
            duration_minutes: { type: "number" },
            is_mandatory: { type: "boolean" },
            quiz_questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correct_answer: { type: "number" }
                }
              }
            }
          }
        }
      });
      return result;
    },
    onSuccess: async (aiData) => {
      const moduleData = {
        ...aiData,
        order_sequence: trainingModules.length + 1,
        passing_score: 80,
        is_active: true,
      };
      
      await base44.entities.TrainingModule.create(moduleData);
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
      
      setShowAIModuleBuilder(false);
      setAIModulePrompt('');
      alert(`✅ Training module "${aiData.title}" created successfully!`);
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewPost(prev => ({
        ...prev,
        photo_urls: [...prev.photo_urls, file_url],
      }));
    } catch (error) {
      alert('Failed to upload photo');
    }
    setUploadingPhoto(false);
  };

  const handleCreatePost = async () => {
    if (!newPost.title?.trim() || !newPost.content?.trim()) {
      alert('⚠️ Please provide both title and content');
      return;
    }

    setCreatingPost(true);
    
    const postData = {
      title: `${newPost.emoji} ${newPost.title}`.trim(),
      content: newPost.content.trim(),
      post_type: newPost.post_type,
      category: newPost.category,
      author_email: user?.email,
      author_name: user?.full_name,
      media_type: newPost.photo_urls.length > 0 ? 'photo' : (newPost.video_url ? 'video' : 'none'),
      photo_urls: newPost.photo_urls,
      video_url: newPost.video_url || '',
      requires_acknowledgment: newPost.requires_acknowledgment,
      is_featured: newPost.is_featured,
      is_active: true,
      total_acknowledgments: 0,
      view_count: 0,
      likes_count: 0,
      acknowledged_by: [],
      tags: [newPost.theme_color, newPost.category],
    };

    console.log('📤 Creating post:', postData);
    await createPostMutation.mutateAsync(postData);
    setCreatingPost(false);
  };

  const handleGenerateModule = async () => {
    if (!aiModulePrompt.trim()) {
      alert('⚠️ Please describe the training module');
      return;
    }

    setGeneratingModule(true);
    await generateModuleMutation.mutateAsync(aiModulePrompt);
    setGeneratingModule(false);
  };

  const filteredPosts = trainingPosts.filter(post => {
    if (!post?.is_active) return false;
    
    const matchesSearch = !searchQuery || 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || post.post_type === filterType;
    const matchesCategory = filterCategory === 'all' || post.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const completedModules = myProgress.filter(p => p.status === 'completed').length;
  const inProgressModules = myProgress.filter(p => p.status === 'in_progress').length;
  const totalXP = myProgress.reduce((sum, p) => sum + (p.quiz_score || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white py-20 px-6 mb-8 shadow-2xl"
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="inline-block mb-8"
          >
            <div className="w-28 h-28 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center mx-auto shadow-2xl">
              <GraduationCap className="w-16 h-16" />
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-black mb-6"
          >
            We Create Craving Fans<br />Not Customers
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-2xl md:text-3xl opacity-95 mb-10 font-light"
          >
            Your journey to excellence starts here
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center gap-4 flex-wrap"
          >
            <Button size="lg" className="bg-white text-purple-700 hover:bg-gray-100 shadow-lg text-lg px-8 py-6">
              <Play className="w-5 h-5 mr-2" />
              Continue Learning
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/20 text-lg px-8 py-6">
              <Award className="w-5 h-5 mr-2" />
              My Certificates
            </Button>
            {isManager && (
              <Button 
                size="lg" 
                onClick={() => setShowCreatePost(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-lg px-8 py-6 shadow-lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Create Update
              </Button>
            )}
          </motion.div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Manager Action Buttons */}
        {isManager && (
          <div className="flex justify-end gap-3 mb-6">
            <Button
              onClick={() => setShowAIModuleBuilder(true)}
              variant="outline"
              className="border-purple-300 hover:bg-purple-50"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              AI Module Builder
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1.5 rounded-2xl shadow-lg border-2 border-purple-100">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-xl px-6 py-3"
            >
              <Target className="w-4 h-4 mr-2" />
              Updates & Overview
            </TabsTrigger>
            <TabsTrigger
              value="values"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-xl px-6 py-3"
            >
              <Heart className="w-4 h-4 mr-2" />
              Our Values
            </TabsTrigger>
            <TabsTrigger
              value="modules"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-xl px-6 py-3"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Modules ({trainingModules.length})
            </TabsTrigger>
            <TabsTrigger
              value="certificates"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-yellow-600 data-[state=active]:text-white rounded-xl px-6 py-3"
            >
              <Award className="w-4 h-4 mr-2" />
              Certificates ({certificates.length})
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW & POSTS TAB */}
          <TabsContent value="overview" className="space-y-8">
            {/* XP Stats */}
            <div className="grid md:grid-cols-4 gap-6">
              <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-xl">
                  <CardContent className="p-8 text-center">
                    <BookOpen className="w-12 h-12 mb-3 mx-auto opacity-90" />
                    <p className="text-4xl font-bold mb-1">{trainingModules.length}</p>
                    <p className="text-sm opacity-90">Available Modules</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none shadow-xl">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 mb-3 mx-auto opacity-90" />
                    <p className="text-4xl font-bold mb-1">{completedModules}</p>
                    <p className="text-sm opacity-90">Completed</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-none shadow-xl">
                  <CardContent className="p-8 text-center">
                    <Clock className="w-12 h-12 mb-3 mx-auto opacity-90" />
                    <p className="text-4xl font-bold mb-1">{inProgressModules}</p>
                    <p className="text-sm opacity-90">In Progress</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white border-none shadow-xl">
                  <CardContent className="p-8 text-center">
                    <Zap className="w-12 h-12 mb-3 mx-auto opacity-90" />
                    <p className="text-4xl font-bold mb-1">{totalXP}</p>
                    <p className="text-sm opacity-90">XP Points</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Training Updates Feed */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Megaphone className="w-8 h-8 text-purple-600" />
                  Training Updates
                </h2>
                {isManager && (
                  <Button
                    onClick={() => setShowCreatePost(true)}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Publish Update
                  </Button>
                )}
              </div>

              {/* Filters */}
              <Card className="bg-white shadow-md mb-6">
                <CardContent className="p-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search updates..."
                        className="pl-10"
                      />
                    </div>

                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="inspiration">💡 Inspiration</SelectItem>
                        <SelectItem value="training_tip">📚 Tips</SelectItem>
                        <SelectItem value="success_story">🏆 Success</SelectItem>
                        <SelectItem value="announcement">📢 Announcements</SelectItem>
                        <SelectItem value="knowledge_share">✨ Knowledge</SelectItem>
                        <SelectItem value="best_practice">⭐ Best Practice</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="culture">Culture</SelectItem>
                        <SelectItem value="food_safety">Food Safety</SelectItem>
                        <SelectItem value="customer_service">Customer Service</SelectItem>
                        <SelectItem value="teamwork">Teamwork</SelectItem>
                        <SelectItem value="excellence">Excellence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Posts Feed */}
              <AnimatePresence>
                <div className="space-y-6">
                  {filteredPosts.length === 0 ? (
                    <Card className="bg-white shadow-lg">
                      <CardContent className="p-16 text-center">
                        <Megaphone className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                        <p className="text-xl text-gray-600 font-semibold mb-2">No updates yet</p>
                        <p className="text-gray-500 mb-6">
                          {isManager ? 'Be the first to share something inspiring!' : 'Check back soon for team updates'}
                        </p>
                        {isManager && (
                          <Button onClick={() => setShowCreatePost(true)} size="lg" className="bg-purple-600">
                            <Plus className="w-5 h-5 mr-2" />
                            Create First Update
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    filteredPosts.map((post, index) => {
                      const hasAcknowledged = post.acknowledged_by?.some(ack => ack.staff_email === user?.email);
                      const themeColor = post.tags?.[0] || 'purple';
                      const theme = POST_THEMES[themeColor] || POST_THEMES.purple;

                      return (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, x: -50 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <Card className={`${post.is_featured ? theme.bg + ' border-4 border-amber-400' : 'bg-white'} shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden`}>
                            {post.is_featured && (
                              <div className={`bg-gradient-to-r ${POST_THEMES.gold.gradient} text-white px-6 py-3 flex items-center gap-2`}>
                                <Star className="w-5 h-5 fill-current animate-pulse" />
                                <span className="font-bold text-lg">⭐ Featured Update</span>
                              </div>
                            )}
                            
                            <CardContent className="p-8">
                              <div className="flex items-start gap-6">
                                {/* Author Avatar */}
                                <motion.div
                                  whileHover={{ rotate: 360 }}
                                  transition={{ duration: 0.6 }}
                                  className={`w-16 h-16 bg-gradient-to-br ${theme.gradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}
                                >
                                  <span className="text-3xl">{post.title?.match(/[\u{1F300}-\u{1F9FF}]/u)?.[0] || '✨'}</span>
                                </motion.div>
                                
                                <div className="flex-1">
                                  <div className="mb-4">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{post.title}</h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                      <span className="font-semibold">{post.author_name}</span>
                                      <span>•</span>
                                      <span>{format(new Date(post.created_date), 'MMM d, yyyy')}</span>
                                      <Badge className={`bg-${themeColor}-100 text-${themeColor}-800 ml-2`}>
                                        {post.post_type.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <p className="text-lg text-gray-700 whitespace-pre-wrap mb-6 leading-relaxed">
                                    {post.content}
                                  </p>

                                  {/* Photos */}
                                  {post.photo_urls?.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                                      {post.photo_urls.map((url, idx) => (
                                        <motion.img
                                          key={idx}
                                          whileHover={{ scale: 1.05 }}
                                          src={url}
                                          alt="Post"
                                          className="w-full h-48 object-cover rounded-xl shadow-md cursor-pointer"
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {/* Video */}
                                  {post.video_url && (
                                    <div className="mb-6">
                                      <video src={post.video_url} controls className="w-full rounded-2xl shadow-lg" />
                                    </div>
                                  )}

                                  {/* Engagement Bar */}
                                  <div className="flex items-center justify-between pt-6 border-t-2 border-gray-200">
                                    <div className="flex items-center gap-6">
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => likePostMutation.mutate(post.id)}
                                        className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
                                      >
                                        <ThumbsUp className="w-5 h-5" />
                                        <span className="font-semibold">{post.likes_count || 0}</span>
                                      </motion.button>
                                      
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <CheckCircle className="w-5 h-5" />
                                        <span className="font-semibold">{post.total_acknowledgments || 0} read</span>
                                      </div>
                                    </div>

                                    {post.requires_acknowledgment && !hasAcknowledged && (
                                      <Button
                                        onClick={() => acknowledgePostMutation.mutate({ postId: post.id, post })}
                                        disabled={acknowledgePostMutation.isPending}
                                        className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        I've Read This
                                      </Button>
                                    )}

                                    {hasAcknowledged && (
                                      <Badge className="bg-green-100 text-green-800 px-4 py-2 text-sm">
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        ✓ Acknowledged
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* VALUES TAB */}
          <TabsContent value="values">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-none shadow-2xl">
                <CardContent className="p-16 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Heart className="w-24 h-24 mx-auto mb-6" />
                  </motion.div>
                  <h2 className="text-5xl font-bold mb-6">Our Culture & Values</h2>
                  <p className="text-2xl opacity-95 mb-10">
                    Everything that makes us who we are
                  </p>
                  <Link to={createPageUrl('CultureBuilding')}>
                    <Button size="lg" className="bg-white text-orange-700 hover:bg-gray-100 text-xl px-10 py-6 shadow-2xl">
                      <Heart className="w-6 h-6 mr-3" />
                      Explore Our Values
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* MODULES TAB */}
          <TabsContent value="modules">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trainingModules.map((module, index) => {
                const progress = myProgress.find(p => p.module_id === module.id);
                
                return (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                  >
                    <Card className="bg-white border-none shadow-lg hover:shadow-2xl transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <Badge className={progress?.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                            {progress?.status?.replace('_', ' ') || 'Not Started'}
                          </Badge>
                          {module.is_mandatory && (
                            <Badge className="bg-red-100 text-red-800">Required</Badge>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-3">{module.title}</h3>
                        <p className="text-gray-600 mb-4 line-clamp-2">{module.description}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {module.duration_minutes} min
                          </div>
                          {progress?.quiz_score && (
                            <div className="flex items-center gap-1">
                              <Award className="w-4 h-4 text-amber-600" />
                              {progress.quiz_score}%
                            </div>
                          )}
                        </div>

                        {progress && progress.status !== 'completed' && (
                          <Progress value={(progress.quiz_attempts || 0) * 20} className="mb-4" />
                        )}

                        <Button
                          onClick={() => {
                            setSelectedModule(module);
                            setShowModuleViewer(true);
                          }}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {progress?.status === 'completed' ? 'Review' : progress?.status === 'in_progress' ? 'Continue' : 'Start'}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}

              {trainingModules.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-600 font-semibold">No modules yet</p>
                  {isManager && (
                    <Button onClick={() => setShowAIModuleBuilder(true)} className="mt-6 bg-purple-600" size="lg">
                      <Wand2 className="w-5 h-5 mr-2" />
                      Create with AI
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* CERTIFICATES TAB */}
          <TabsContent value="certificates">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert, index) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-4 border-amber-400 shadow-xl">
                    <CardContent className="p-8 text-center">
                      <Award className="w-24 h-24 text-amber-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{cert.title}</h3>
                      <p className="text-gray-600 mb-4">{cert.description}</p>
                      <Badge className="bg-amber-600 text-white text-base px-4 py-2">
                        {format(new Date(cert.issued_date), 'MMM d, yyyy')}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {certificates.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <Award className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-600 font-semibold">No certificates earned yet</p>
                  <p className="text-gray-500 mt-2">Complete training modules to earn certificates!</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* CREATE POST DIALOG - ENHANCED */}
      <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <Sparkles className="w-7 h-7 text-purple-600" />
              Publish Training Update
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Theme Color Picker */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Post Theme</Label>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(POST_THEMES).map(([color, theme]) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setNewPost({ ...newPost, theme_color: color })}
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${theme.gradient} ${
                      newPost.theme_color === color ? 'ring-4 ring-purple-600 ring-offset-2' : ''
                    } shadow-lg transition-all`}
                  />
                ))}
              </div>
            </div>

            {/* Emoji Picker */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Add Emoji (Optional)</Label>
              <div className="flex gap-2 flex-wrap">
                {EMOJI_PICKER.map(emoji => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setNewPost({ ...newPost, emoji })}
                    className={`w-12 h-12 text-2xl rounded-xl ${
                      newPost.emoji === emoji ? 'bg-purple-100 ring-2 ring-purple-600' : 'bg-gray-100 hover:bg-gray-200'
                    } transition-all`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Update Title *</Label>
              <Input
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="e.g., New Food Safety Guidelines"
                className="text-lg p-6"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Content *</Label>
              <Textarea
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                placeholder="Share your message, tips, or announcement..."
                rows={8}
                className="text-base leading-relaxed"
              />
            </div>

            {/* Type & Category */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Update Type</Label>
                <Select value={newPost.post_type} onValueChange={(value) => setNewPost({ ...newPost, post_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspiration">💡 Inspiration</SelectItem>
                    <SelectItem value="training_tip">📚 Training Tip</SelectItem>
                    <SelectItem value="success_story">🏆 Success Story</SelectItem>
                    <SelectItem value="announcement">📢 Announcement</SelectItem>
                    <SelectItem value="knowledge_share">✨ Knowledge Share</SelectItem>
                    <SelectItem value="best_practice">⭐ Best Practice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newPost.category} onValueChange={(value) => setNewPost({ ...newPost, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="culture">Culture</SelectItem>
                    <SelectItem value="food_safety">Food Safety</SelectItem>
                    <SelectItem value="customer_service">Customer Service</SelectItem>
                    <SelectItem value="teamwork">Teamwork</SelectItem>
                    <SelectItem value="innovation">Innovation</SelectItem>
                    <SelectItem value="excellence">Excellence</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                    <SelectItem value="skills">Skills</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Media Upload */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Add Media (Optional)</Label>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('post-photo-upload').click()}
                  disabled={uploadingPhoto}
                  className="flex-1"
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
                <div className="grid grid-cols-3 gap-3">
                  {newPost.photo_urls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt="Upload" className="w-full h-32 object-cover rounded-xl" />
                      <button
                        onClick={() => setNewPost(prev => ({
                          ...prev,
                          photo_urls: prev.photo_urls.filter((_, i) => i !== idx)
                        }))}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Video URL (YouTube, Vimeo)</Label>
                <Input
                  value={newPost.video_url}
                  onChange={(e) => setNewPost({ ...newPost, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requires_ack"
                  checked={newPost.requires_acknowledgment}
                  onChange={(e) => setNewPost({ ...newPost, requires_acknowledgment: e.target.checked })}
                  className="w-5 h-5"
                />
                <Label htmlFor="requires_ack" className="text-base cursor-pointer">
                  Require staff acknowledgment (they must click "I've Read This")
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={newPost.is_featured}
                  onChange={(e) => setNewPost({ ...newPost, is_featured: e.target.checked })}
                  className="w-5 h-5"
                />
                <Label htmlFor="is_featured" className="text-base cursor-pointer">
                  ⭐ Feature this update (gold banner, appears at top)
                </Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t-2">
              <Button
                variant="outline"
                onClick={() => setShowCreatePost(false)}
                size="lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={creatingPost || !newPost.title?.trim() || !newPost.content?.trim()}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
              >
                {creatingPost ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Publish Update
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI MODULE BUILDER */}
      <Dialog open={showAIModuleBuilder} onOpenChange={setShowAIModuleBuilder}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <Wand2 className="w-7 h-7 text-purple-600" />
              AI Training Module Builder
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
              <CardContent className="p-6">
                <p className="text-gray-800 text-lg mb-4">
                  ✨ <strong>Describe your training module</strong> and AI will generate complete content with quiz questions!
                </p>
                <ul className="text-sm text-gray-700 space-y-2 ml-6 list-disc">
                  <li>Be specific about the topic and learning objectives</li>
                  <li>Mention target audience (chefs, servers, all staff)</li>
                  <li>Include any standards or procedures to follow</li>
                  <li>Add practical examples if needed</li>
                </ul>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Module Description</Label>
              <Textarea
                value={aiModulePrompt}
                onChange={(e) => setAIModulePrompt(e.target.value)}
                placeholder="Example: 'Create a comprehensive food safety training module covering proper handwashing techniques, when to wash hands (before handling food, after touching raw meat, etc.), cross-contamination prevention, temperature safety, and best practices for restaurant kitchen staff. Include practical real-world scenarios.'"
                rows={8}
                className="text-base"
              />
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAIModuleBuilder(false);
                  setAIModulePrompt('');
                }}
                disabled={generatingModule}
                size="lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateModule}
                disabled={generatingModule || !aiModulePrompt.trim()}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
              >
                {generatingModule ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Module...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate Module
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Module Viewer */}
      {showModuleViewer && selectedModule && (
        <Dialog open={showModuleViewer} onOpenChange={setShowModuleViewer}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold">{selectedModule.title}</DialogTitle>
            </DialogHeader>
            <div className="mt-6 space-y-6">
              <p className="text-xl text-gray-700">{selectedModule.description}</p>
              <div 
                className="prose prose-lg max-w-none" 
                dangerouslySetInnerHTML={{ __html: selectedModule.content_text }} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}