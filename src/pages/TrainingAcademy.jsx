import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Video,
  FileText,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Star,
  Users,
  Sparkles,
  Plus,
  Search,
  Filter,
  Upload,
  Camera,
  Megaphone,
  ThumbsUp,
  MessageCircle,
  Send,
  Loader2,
  Play,
  AlertCircle,
  BarChart,
  Edit,
  Heart,
  Wand2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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
  const [activeTab, setActiveTab] = useState('overview');
  
  // Posts state
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showAIModuleBuilder, setShowAIModuleBuilder] = useState(false);
  const [aiModulePrompt, setAIModulePrompt] = useState('');
  const [generatingModule, setGeneratingModule] = useState(false);
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
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [showModuleViewer, setShowModuleViewer] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: trainingPosts = [], refetch: refetchPosts } = useQuery({
    queryKey: ['trainingPosts'],
    queryFn: async () => {
      const posts = await base44.entities.TrainingPost.list('-created_date');
      console.log('📚 Loaded posts:', posts.length, posts);
      return posts;
    },
  });

  const { data: trainingModules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list('order_sequence'),
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

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      console.log('🚀 Creating post:', postData);
      const result = await base44.entities.TrainingPost.create(postData);
      console.log('✅ Post created with ID:', result.id);
      return result;
    },
    onSuccess: async (newPost) => {
      console.log('✨ Post saved successfully, refreshing list...');
      await refetchPosts();
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
      
      alert(`✅ Post "${newPost.title}" published successfully!`);
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
        prompt: `You are an expert at creating restaurant training modules. Create a comprehensive training module based on: "${prompt}". 

Include:
- Clear title and description
- Category (hygiene/customer_service/product_knowledge/safety/equipment_use/onboarding/compliance)
- Content type (video/text/quiz/mixed)
- Detailed text content with step-by-step instructions
- 5-7 quiz questions with 4 multiple choice options each
- Duration in minutes
- Whether it's mandatory

Return valid JSON only.`,
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
        media_type: prev.video_url ? 'both' : 'photo',
      }));
    } catch (error) {
      console.error('Photo upload failed:', error);
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
      title: newPost.title,
      content: newPost.content,
      post_type: newPost.post_type,
      category: newPost.category,
      author_email: user?.email,
      author_name: user?.full_name,
      media_type: newPost.photo_urls.length > 0 ? (newPost.video_url ? 'both' : 'photo') : (newPost.video_url ? 'video' : 'none'),
      photo_urls: newPost.photo_urls || [],
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

    console.log('📤 Submitting post data:', postData);
    
    try {
      await createPostMutation.mutateAsync(postData);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post: ' + error.message);
    }
    
    setCreatingPost(false);
  };

  const handleGenerateModule = async () => {
    if (!aiModulePrompt.trim()) {
      alert('Please describe the training module');
      return;
    }

    setGeneratingModule(true);
    try {
      await generateModuleMutation.mutateAsync(aiModulePrompt);
    } catch (error) {
      alert('Failed to generate module. Please try creating manually.');
    }
    setGeneratingModule(false);
  };

  // Filter posts
  const filteredPosts = trainingPosts.filter(post => {
    if (!post?.is_active) return false;
    
    const matchesSearch = !searchQuery || 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || post.post_type === filterType;
    const matchesCategory = filterCategory === 'all' || post.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  console.log('🎯 Showing', filteredPosts.length, 'out of', trainingPosts.length, 'total posts');

  const completedModules = myProgress.filter(p => p.status === 'completed').length;
  const inProgressModules = myProgress.filter(p => p.status === 'in_progress').length;
  const averageScore = myProgress.length > 0
    ? Math.round(myProgress.reduce((sum, p) => sum + (p.quiz_score || 0), 0) / myProgress.length)
    : 0;

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
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 rounded-xl shadow-md border-2 border-purple-100">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white"
            >
              <Target className="w-4 h-4 mr-2" />
              Overview & Posts
            </TabsTrigger>
            <TabsTrigger
              value="values"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              <Heart className="w-4 h-4 mr-2" />
              Our Values
            </TabsTrigger>
            <TabsTrigger
              value="modules"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Training Modules
            </TabsTrigger>
            <TabsTrigger
              value="certificates"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-yellow-600 data-[state=active]:text-white"
            >
              <Award className="w-4 h-4 mr-2" />
              My Certificates
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW & POSTS TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
                <CardContent className="p-6">
                  <BookOpen className="w-8 h-8 mb-2 opacity-80" />
                  <p className="text-2xl font-bold">{trainingModules.length}</p>
                  <p className="text-sm opacity-90">Training Modules</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
                <CardContent className="p-6">
                  <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
                  <p className="text-2xl font-bold">{completedModules}</p>
                  <p className="text-sm opacity-90">Completed</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
                <CardContent className="p-6">
                  <Clock className="w-8 h-8 mb-2 opacity-80" />
                  <p className="text-2xl font-bold">{inProgressModules}</p>
                  <p className="text-sm opacity-90">In Progress</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none">
                <CardContent className="p-6">
                  <Award className="w-8 h-8 mb-2 opacity-80" />
                  <p className="text-2xl font-bold">{certificates.length}</p>
                  <p className="text-sm opacity-90">Certificates</p>
                </CardContent>
              </Card>
            </div>

            {/* Posts Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Megaphone className="w-6 h-6 text-purple-600" />
                  Training Posts ({trainingPosts.length})
                </h2>
              </div>

              {/* Post Filters */}
              <Card className="bg-white shadow-md mb-4">
                <CardContent className="p-4">
                  <div className="grid md:grid-cols-3 gap-4">
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
                        <SelectItem value="training_tip">📚 Training Tips</SelectItem>
                        <SelectItem value="success_story">🏆 Success Stories</SelectItem>
                        <SelectItem value="announcement">📢 Announcements</SelectItem>
                        <SelectItem value="knowledge_share">🧠 Knowledge Share</SelectItem>
                        <SelectItem value="best_practice">⭐ Best Practices</SelectItem>
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
                {filteredPosts.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">No posts to display</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Total posts in system: {trainingPosts.length}
                      </p>
                      {isManager && (
                        <Button
                          onClick={() => setShowCreatePost(true)}
                          className="mt-4 bg-purple-600"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Post
                        </Button>
                      )}
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
                          <div className="flex items-start gap-4">
                            <div className={`p-3 ${postTypeIcon.bg} rounded-lg flex-shrink-0`}>
                              <Icon className={`w-6 h-6 ${postTypeIcon.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
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
                              
                              <p className="text-gray-700 whitespace-pre-wrap mb-4 leading-relaxed">{post.content}</p>

                              {post.photo_urls && post.photo_urls.length > 0 && (
                                <div className="flex gap-2 mb-4 flex-wrap">
                                  {post.photo_urls.map((url, idx) => (
                                    <img
                                      key={idx}
                                      src={url}
                                      alt="Post media"
                                      className="h-48 object-cover rounded-lg border border-gray-200"
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
                                    <CheckCircle className="w-4 h-4" />
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
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    I've Read This
                                  </Button>
                                )}

                                {hasAcknowledged && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
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
            <div className="space-y-6">
              <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-none shadow-xl">
                <CardContent className="p-8 text-center">
                  <Heart className="w-16 h-16 mx-auto mb-4 opacity-90" />
                  <h2 className="text-3xl font-bold mb-4">Our Culture & Values</h2>
                  <p className="text-xl opacity-90">
                    Everything that makes us who we are
                  </p>
                </CardContent>
              </Card>

              <div className="text-center py-8">
                <Link to={createPageUrl('CultureBuilding')}>
                  <Button size="lg" className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
                    <Heart className="w-5 h-5 mr-2" />
                    Explore Our Values & Culture
                  </Button>
                </Link>
                <p className="text-sm text-gray-600 mt-3">
                  View mission statements, company values, and culture content
                </p>
              </div>
            </div>
          </TabsContent>

          {/* TRAINING MODULES TAB */}
          <TabsContent value="modules">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trainingModules.map((module) => {
                const progress = myProgress.find(p => p.module_id === module.id);
                const statusColor = progress?.status === 'completed' ? 'bg-green-100 text-green-800' :
                                   progress?.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                   'bg-gray-100 text-gray-800';

                return (
                  <Card key={module.id} className="bg-white border-none shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={statusColor}>
                          {progress?.status || 'Not Started'}
                        </Badge>
                        {module.is_mandatory && (
                          <Badge variant="outline" className="border-red-500 text-red-700">
                            Required
                          </Badge>
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
                        {progress?.status === 'completed' ? (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Review Module
                          </>
                        ) : progress?.status === 'in_progress' ? (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Continue
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Training
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {trainingModules.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No training modules yet</p>
                  {isManager && (
                    <Button onClick={() => setShowAIModuleBuilder(true)} className="mt-4">
                      <Wand2 className="w-4 h-4 mr-2" />
                      Create Module with AI
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
                <Card key={cert.id} className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300">
                  <CardContent className="p-6 text-center">
                    <Award className="w-16 h-16 text-amber-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{cert.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{cert.description}</p>
                    <Badge className="bg-amber-600 text-white mb-4">
                      {format(new Date(cert.issued_date), 'MMM d, yyyy')}
                    </Badge>
                    {cert.certificate_url && (
                      <Button variant="outline" className="w-full" asChild>
                        <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="w-4 h-4 mr-2" />
                          View Certificate
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}

              {certificates.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No certificates yet</p>
                  <p className="text-sm text-gray-500 mt-2">Complete training modules to earn certificates!</p>
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
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Create Training Post
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Post Title *</label>
              <Input
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="e.g., Food Safety Best Practices"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Content *</label>
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
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {newPost.photo_urls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {newPost.photo_urls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} alt="Upload" className="h-24 w-24 object-cover rounded-lg border" />
                      <button
                        onClick={() => setNewPost(prev => ({
                          ...prev,
                          photo_urls: prev.photo_urls.filter((_, i) => i !== idx)
                        }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Video URL (Optional)</label>
                <Input
                  value={newPost.video_url}
                  onChange={(e) => setNewPost({ ...newPost, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>

            <div className="space-y-3">
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
                  Feature this post (appears with gold banner at top)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
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
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={creatingPost || !newPost.title?.trim() || !newPost.content?.trim()}
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

      {/* AI MODULE BUILDER DIALOG */}
      <Dialog open={showAIModuleBuilder} onOpenChange={setShowAIModuleBuilder}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-purple-600" />
              AI Training Module Builder
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-gray-700">
              Describe the training module you want to create, and AI will generate a complete module with content and quiz questions.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Module Description</label>
              <Textarea
                value={aiModulePrompt}
                onChange={(e) => setAIModulePrompt(e.target.value)}
                placeholder="e.g., 'Create a food safety training module about proper handwashing techniques, including when to wash hands, proper soap usage, and drying methods. Include temperature checks and cross-contamination prevention.'"
                rows={6}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                💡 <strong>Tip:</strong> Be specific! Include:
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-5 list-disc">
                <li>Topic and objectives</li>
                <li>Key points to cover</li>
                <li>Target audience (chefs, servers, all staff)</li>
                <li>Any specific procedures or standards</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAIModuleBuilder(false);
                  setAIModulePrompt('');
                }}
                disabled={generatingModule}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateModule}
                disabled={generatingModule || !aiModulePrompt.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {generatingModule ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Module...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Module
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Module Viewer Dialog - placeholder for now */}
      {showModuleViewer && selectedModule && (
        <Dialog open={showModuleViewer} onOpenChange={setShowModuleViewer}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedModule.title}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-gray-700 mb-4">{selectedModule.description}</p>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedModule.content_text }} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}