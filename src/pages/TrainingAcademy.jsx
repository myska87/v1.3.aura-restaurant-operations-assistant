import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: trainingPosts = [], isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ['trainingPosts'],
    queryFn: async () => {
      const posts = await base44.entities.TrainingPost.list('-created_date');
      console.log('📚 Posts loaded:', posts.length);
      return posts || [];
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
      console.log('Creating post:', postData);
      return await base44.entities.TrainingPost.create(postData);
    },
    onSuccess: async () => {
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
      });
      alert('✅ Post published!');
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

  const generateModuleMutation = useMutation({
    mutationFn: async (prompt) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a restaurant training module for: "${prompt}". Include title, description, category (hygiene/customer_service/safety/etc), content (HTML), duration, quiz questions (5-7 with 4 options each), and is_mandatory boolean. Return valid JSON only.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
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
      await base44.entities.TrainingModule.create({
        ...aiData,
        order_sequence: trainingModules.length + 1,
        passing_score: 80,
        is_active: true,
      });
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
      setShowAIModuleBuilder(false);
      setAIModulePrompt('');
      alert(`✅ Module created!`);
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
      alert('Upload failed');
    }
    setUploadingPhoto(false);
  };

  const handleCreatePost = async () => {
    if (!newPost.title?.trim() || !newPost.content?.trim()) {
      alert('Please provide title and content');
      return;
    }

    setCreatingPost(true);
    
    const postData = {
      title: newPost.title.trim(),
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
      tags: [],
    };

    await createPostMutation.mutateAsync(postData);
    setCreatingPost(false);
  };

  const handleGenerateModule = async () => {
    if (!aiModulePrompt.trim()) {
      alert('Please describe the module');
      return;
    }

    setGeneratingModule(true);
    await generateModuleMutation.mutateAsync(aiModulePrompt);
    setGeneratingModule(false);
  };

  const filteredPosts = (trainingPosts || []).filter(post => {
    if (!post?.is_active) return false;
    const matchesSearch = !searchQuery || 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || post.post_type === filterType;
    return matchesSearch && matchesType;
  });

  const completedModules = myProgress.filter(p => p.status === 'completed').length;
  const inProgressModules = myProgress.filter(p => p.status === 'in_progress').length;
  const totalXP = myProgress.reduce((sum, p) => sum + (p.quiz_score || 0), 0);

  const getPostGradient = (postType) => {
    const gradients = {
      inspiration: 'from-purple-50 to-pink-50',
      training_tip: 'from-blue-50 to-cyan-50',
      success_story: 'from-amber-50 to-yellow-50',
      announcement: 'from-red-50 to-pink-50',
      knowledge_share: 'from-green-50 to-emerald-50',
      best_practice: 'from-indigo-50 to-purple-50',
    };
    return gradients[postType] || gradients.inspiration;
  };

  const getPostIcon = (postType) => {
    const icons = {
      inspiration: Sparkles,
      training_tip: BookOpen,
      success_story: Award,
      announcement: Megaphone,
      knowledge_share: Zap,
      best_practice: Star,
    };
    return icons[postType] || Sparkles;
  };

  const getPostColor = (postType) => {
    const colors = {
      inspiration: 'from-purple-500 to-pink-500',
      training_tip: 'from-blue-500 to-cyan-500',
      success_story: 'from-amber-500 to-yellow-500',
      announcement: 'from-red-500 to-pink-500',
      knowledge_share: 'from-green-500 to-emerald-500',
      best_practice: 'from-indigo-500 to-purple-500',
    };
    return colors[postType] || colors.inspiration;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white py-16 px-6 mb-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-14 h-14" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            We Create Craving Fans — Not Customers
          </h1>
          <p className="text-2xl opacity-90 mb-8">Your journey to excellence starts here</p>
          
          <div className="flex justify-center gap-4 flex-wrap">
            <Button size="lg" className="bg-white text-purple-700 hover:bg-gray-100">
              <Play className="w-5 h-5 mr-2" />
              Continue Learning
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/20">
              <Award className="w-5 h-5 mr-2" />
              Certificates ({certificates.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {isManager && (
          <div className="flex justify-end gap-3 mb-6">
            <Button
              onClick={() => setShowCreatePost(true)}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Post
            </Button>
            <Button
              onClick={() => setShowAIModuleBuilder(true)}
              size="lg"
              variant="outline"
              className="border-2 border-purple-300"
            >
              <Wand2 className="w-5 h-5 mr-2" />
              AI Module Builder
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1.5 rounded-2xl shadow-lg border-2 border-purple-100">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-xl"
            >
              <Target className="w-4 h-4 mr-2" />
              Overview & Posts
            </TabsTrigger>
            <TabsTrigger
              value="values"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-xl"
            >
              <Heart className="w-4 h-4 mr-2" />
              Our Values
            </TabsTrigger>
            <TabsTrigger
              value="modules"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-xl"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Modules ({trainingModules.length})
            </TabsTrigger>
            <TabsTrigger
              value="certificates"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-yellow-600 data-[state=active]:text-white rounded-xl"
            >
              <Award className="w-4 h-4 mr-2" />
              Certificates ({certificates.length})
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg">
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-10 h-10 mb-2 mx-auto opacity-90" />
                  <p className="text-3xl font-bold">{trainingModules.length}</p>
                  <p className="text-sm opacity-90">Modules</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none shadow-lg">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-10 h-10 mb-2 mx-auto opacity-90" />
                  <p className="text-3xl font-bold">{completedModules}</p>
                  <p className="text-sm opacity-90">Completed</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-none shadow-lg">
                <CardContent className="p-6 text-center">
                  <Clock className="w-10 h-10 mb-2 mx-auto opacity-90" />
                  <p className="text-3xl font-bold">{inProgressModules}</p>
                  <p className="text-sm opacity-90">In Progress</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white border-none shadow-lg">
                <CardContent className="p-6 text-center">
                  <Zap className="w-10 h-10 mb-2 mx-auto opacity-90" />
                  <p className="text-3xl font-bold">{totalXP}</p>
                  <p className="text-sm opacity-90">Total XP</p>
                </CardContent>
              </Card>
            </div>

            {/* Posts */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Megaphone className="w-6 h-6 text-purple-600" />
                  Training Updates ({trainingPosts.length})
                </h2>
              </div>

              {/* Filters */}
              <Card className="bg-white shadow-md mb-6">
                <CardContent className="p-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="relative">
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
                        <SelectItem value="inspiration">💡 Inspiration</SelectItem>
                        <SelectItem value="training_tip">📚 Tips</SelectItem>
                        <SelectItem value="success_story">🏆 Success</SelectItem>
                        <SelectItem value="announcement">📢 Announcements</SelectItem>
                        <SelectItem value="knowledge_share">✨ Knowledge</SelectItem>
                        <SelectItem value="best_practice">⭐ Best Practice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Posts List */}
              <div className="space-y-6">
                {postsLoading ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Loading posts...</p>
                    </CardContent>
                  </Card>
                ) : filteredPosts.length === 0 ? (
                  <Card className="border-2 border-dashed border-purple-300">
                    <CardContent className="p-16 text-center">
                      <Megaphone className="w-20 h-20 text-purple-300 mx-auto mb-4" />
                      <p className="text-xl font-semibold text-gray-900 mb-2">No posts yet</p>
                      <p className="text-gray-600">
                        {trainingPosts.length === 0 ? "Create your first post!" : "No matches"}
                      </p>
                      {isManager && (
                        <Button onClick={() => setShowCreatePost(true)} className="mt-6 bg-purple-600">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Post
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  filteredPosts.map((post) => {
                    const hasAcknowledged = post.acknowledged_by?.some(ack => ack.staff_email === user?.email);
                    const PostIcon = getPostIcon(post.post_type);
                    const gradient = getPostGradient(post.post_type);
                    const iconGradient = getPostColor(post.post_type);

                    return (
                      <Card key={post.id} className={`bg-gradient-to-br ${gradient} border-2 ${post.is_featured ? 'border-amber-400' : 'border-purple-200'} shadow-lg hover:shadow-2xl transition-all`}>
                        {post.is_featured && (
                          <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-6 py-3 flex items-center gap-2">
                            <Star className="w-5 h-5 fill-current" />
                            <span className="font-bold">⭐ Featured Post</span>
                          </div>
                        )}
                        
                        <CardContent className="p-8">
                          <div className="flex gap-6">
                            <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br ${iconGradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                              <PostIcon className="w-9 h-9 text-white" />
                            </div>

                            <div className="flex-1">
                              <div className="mb-4">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{post.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <span className="font-medium">{post.author_name}</span>
                                  <span>•</span>
                                  <span>{format(new Date(post.created_date), 'MMM d, yyyy')}</span>
                                  <Badge className="ml-2 bg-purple-100 text-purple-700">
                                    {post.post_type.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                              
                              <p className="text-lg text-gray-800 whitespace-pre-wrap mb-6 leading-relaxed">
                                {post.content}
                              </p>

                              {post.photo_urls?.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                  {post.photo_urls.map((url, idx) => (
                                    <img
                                      key={idx}
                                      src={url}
                                      alt="Post"
                                      className="w-full h-48 object-cover rounded-xl shadow-md"
                                    />
                                  ))}
                                </div>
                              )}

                              {post.video_url && (
                                <video src={post.video_url} controls className="w-full rounded-xl mb-6" />
                              )}

                              <div className="flex items-center justify-between pt-4 border-t-2 border-purple-200">
                                <div className="flex items-center gap-6 text-gray-700">
                                  <div className="flex items-center gap-2">
                                    <ThumbsUp className="w-5 h-5" />
                                    <span className="font-semibold">{post.likes_count || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-semibold">{post.total_acknowledgments || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    <span className="font-semibold">{post.view_count || 0}</span>
                                  </div>
                                </div>

                                {post.requires_acknowledgment && !hasAcknowledged && (
                                  <Button
                                    onClick={() => acknowledgePostMutation.mutate({ postId: post.id, post })}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    I've Read This
                                  </Button>
                                )}

                                {hasAcknowledged && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="w-4 h-4 mr-1" />
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
            </div>
          </TabsContent>

          {/* VALUES TAB */}
          <TabsContent value="values">
            <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-none shadow-2xl">
              <CardContent className="p-16 text-center">
                <Heart className="w-24 h-24 mx-auto mb-6" />
                <h2 className="text-4xl font-bold mb-4">Our Culture & Values</h2>
                <p className="text-xl opacity-90 mb-8">Everything that makes us who we are</p>
                <Link to={createPageUrl('CultureBuilding')}>
                  <Button size="lg" className="bg-white text-orange-700 hover:bg-gray-100 shadow-xl">
                    <Heart className="w-5 h-5 mr-2" />
                    Explore Our Values
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MODULES TAB */}
          <TabsContent value="modules">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trainingModules.map((module) => {
                const progress = myProgress.find(p => p.module_id === module.id);

                return (
                  <Card key={module.id} className="bg-white shadow-lg hover:shadow-2xl transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={
                          progress?.status === 'completed' ? 'bg-green-100 text-green-800' :
                          progress?.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {progress?.status?.replace('_', ' ') || 'Not Started'}
                        </Badge>
                        {module.is_mandatory && (
                          <Badge className="bg-red-100 text-red-700">Required</Badge>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-2">{module.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{module.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {module.duration_minutes} min
                        </div>
                        {progress?.quiz_score && (
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4" />
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
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {progress?.status === 'completed' ? 'Review' : progress?.status === 'in_progress' ? 'Continue' : 'Start'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {trainingModules.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No modules yet</p>
                  {isManager && (
                    <Button onClick={() => setShowAIModuleBuilder(true)} className="mt-4">
                      <Wand2 className="w-4 h-4 mr-2" />
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
              {certificates.map((cert) => (
                <Card key={cert.id} className="bg-gradient-to-br from-amber-50 to-yellow-50 border-4 border-amber-400 shadow-xl">
                  <CardContent className="p-8 text-center">
                    <Award className="w-20 h-20 text-amber-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{cert.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{cert.description}</p>
                    <Badge className="bg-amber-600 text-white">
                      {format(new Date(cert.issued_date), 'MMM d, yyyy')}
                    </Badge>
                  </CardContent>
                </Card>
              ))}

              {certificates.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <Award className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No certificates yet</p>
                  <p className="text-sm text-gray-500 mt-2">Complete modules to earn certificates!</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* CREATE POST DIALOG */}
      <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create Training Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <label className="font-semibold">Post Title *</label>
              <Input
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="e.g., 🎯 5 Tips for Perfect Service"
              />
            </div>

            <div className="space-y-2">
              <label className="font-semibold">Content *</label>
              <Textarea
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                placeholder="Share your message..."
                rows={8}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-semibold">Type</label>
                <Select value={newPost.post_type} onValueChange={(value) => setNewPost({ ...newPost, post_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspiration">💡 Inspiration</SelectItem>
                    <SelectItem value="training_tip">📚 Tip</SelectItem>
                    <SelectItem value="success_story">🏆 Success</SelectItem>
                    <SelectItem value="announcement">📢 Announcement</SelectItem>
                    <SelectItem value="knowledge_share">✨ Knowledge</SelectItem>
                    <SelectItem value="best_practice">⭐ Best Practice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="font-semibold">Category</label>
                <Select value={newPost.category} onValueChange={(value) => setNewPost({ ...newPost, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="culture">Culture</SelectItem>
                    <SelectItem value="food_safety">Food Safety</SelectItem>
                    <SelectItem value="customer_service">Customer Service</SelectItem>
                    <SelectItem value="teamwork">Teamwork</SelectItem>
                    <SelectItem value="excellence">Excellence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-semibold">Photos (Optional)</label>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('post-photo').click()}
                disabled={uploadingPhoto}
              >
                <Camera className="w-4 h-4 mr-2" />
                {uploadingPhoto ? 'Uploading...' : 'Add Photos'}
              </Button>
              <input
                id="post-photo"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {newPost.photo_urls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {newPost.photo_urls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                      <button
                        onClick={() => setNewPost(prev => ({
                          ...prev,
                          photo_urls: prev.photo_urls.filter((_, i) => i !== idx)
                        }))}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ack"
                  checked={newPost.requires_acknowledgment}
                  onChange={(e) => setNewPost({ ...newPost, requires_acknowledgment: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="ack">Require acknowledgment</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="feat"
                  checked={newPost.is_featured}
                  onChange={(e) => setNewPost({ ...newPost, is_featured: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="feat">⭐ Feature this post</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreatePost(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={creatingPost || !newPost.title?.trim() || !newPost.content?.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {creatingPost ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish
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
            <DialogTitle>AI Module Builder</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-gray-700">Describe the training module and AI will generate complete content with quiz.</p>

            <Textarea
              value={aiModulePrompt}
              onChange={(e) => setAIModulePrompt(e.target.value)}
              placeholder="e.g., 'Food safety module about handwashing, temperature control, and cross-contamination for kitchen staff'"
              rows={6}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAIModuleBuilder(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerateModule}
                disabled={generatingModule || !aiModulePrompt.trim()}
                className="bg-purple-600"
              >
                {generatingModule ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedModule.title}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <p className="text-gray-700">{selectedModule.description}</p>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedModule.content_text }} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}