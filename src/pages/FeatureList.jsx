import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  CheckCircle,
  Code,
  Search,
  Home,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Calendar,
  FileText,
  Users,
  BarChart3,
  Clock,
  Star,
  MessageCircle,
  Camera,
  Mic,
  Globe,
  Smartphone,
  Database,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function FeatureList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const features = [
    // ========================================
    // ✅ CORE OPERATIONAL FEATURES
    // ========================================
    {
      name: 'Dashboard with Live Activity Feed',
      category: 'Core',
      status: 'live',
      icon: LayoutDashboard,
      color: 'blue',
      description: 'Real-time activity monitoring with auto-refresh',
      badges: ['New', 'Live'],
    },
    {
      name: 'Smart Task Management',
      category: 'Core',
      status: 'live',
      icon: CheckCircle,
      color: 'green',
      description: 'Auto-assignment, photo evidence, activity logging',
      badges: ['Enhanced'],
    },
    {
      name: 'Advanced Shift & Rota System',
      category: 'Core',
      status: 'live',
      icon: Calendar,
      color: 'purple',
      description: 'Geo-fenced clock in/out, auto attendance tracking',
      badges: ['GPS'],
    },
    {
      name: 'AI Rota Generator',
      category: 'AI',
      status: 'live',
      icon: Zap,
      color: 'amber',
      description: 'ML-powered shift scheduling with availability matching',
      badges: ['AI', 'New'],
    },
    
    // ========================================
    // ✅ QUALITY & COMPLIANCE
    // ========================================
    {
      name: 'Quality Control System',
      category: 'Quality',
      status: 'live',
      icon: Star,
      color: 'amber',
      description: 'Template-based quality checks with corrective actions',
      badges: ['Enhanced'],
    },
    {
      name: 'SOP Management & Certification',
      category: 'Documentation',
      status: 'live',
      icon: FileText,
      color: 'indigo',
      description: 'Full SOP lifecycle with voice mode & digital signatures',
      badges: ['Voice'],
    },
    {
      name: 'Document Builder & Library',
      category: 'Documentation',
      status: 'live',
      icon: FileText,
      color: 'blue',
      description: 'Rich text editor, version control, signature tracking',
      badges: ['New'],
    },
    {
      name: 'Hygiene & Temperature Tracking',
      category: 'Compliance',
      status: 'live',
      icon: Shield,
      color: 'green',
      description: 'HACCP compliance with gamification & leaderboards',
      badges: ['Gamified'],
    },
    {
      name: 'EHO Control Center',
      category: 'Compliance',
      status: 'live',
      icon: Shield,
      color: 'red',
      description: 'Environmental Health Officer audit preparation',
      badges: ['Audit'],
    },
    {
      name: 'GDPR Compliance Suite',
      category: 'Compliance',
      status: 'live',
      icon: Lock,
      color: 'purple',
      description: 'Privacy requests, audit logs, email tracking',
      badges: ['GDPR'],
    },

    // ========================================
    // ✅ INTELLIGENT AUTOMATION
    // ========================================
    {
      name: 'Form Intelligence Engine',
      category: 'AI',
      status: 'live',
      icon: Sparkles,
      color: 'purple',
      description: 'Auto-assigns forms based on shifts, roles, and events',
      badges: ['AI', 'Auto'],
    },
    {
      name: 'DataBridge Integration System',
      category: 'Automation',
      status: 'live',
      icon: Database,
      color: 'teal',
      description: 'Real-time module integration & event processing',
      badges: ['Live', 'Sync'],
    },
    {
      name: 'Smart Role Sync',
      category: 'Automation',
      status: 'live',
      icon: Users,
      color: 'blue',
      description: 'Auto-updates workflows when staff positions change',
      badges: ['Auto'],
    },
    {
      name: 'Hey AURA - AI Manager Console',
      category: 'AI',
      status: 'live',
      icon: Mic,
      color: 'pink',
      description: 'Voice & text commands for complete restaurant control',
      badges: ['AI', 'Voice'],
    },
    {
      name: 'Meeting Intelligence',
      category: 'AI',
      status: 'live',
      icon: Mic,
      color: 'purple',
      description: 'Auto-transcribe meetings, extract actions, assign tasks',
      badges: ['AI', 'Auto'],
    },
    {
      name: 'AI Stock Verification',
      category: 'AI',
      status: 'live',
      icon: Camera,
      color: 'green',
      description: 'Photo-based stock counting with AI validation',
      badges: ['AI', 'Camera'],
    },
    {
      name: 'Menu Intelligence',
      category: 'AI',
      status: 'live',
      icon: Sparkles,
      color: 'orange',
      description: 'Auto-update allergens, costs, and menu item data',
      badges: ['AI', 'Auto'],
    },

    // ========================================
    // ✅ WORKFORCE MANAGEMENT
    // ========================================
    {
      name: 'Automated Payroll System',
      category: 'Payroll',
      status: 'live',
      icon: DollarSign,
      color: 'green',
      description: 'Auto-calculate wages with overtime, bonuses, performance',
      badges: ['Auto', 'New'],
    },
    {
      name: 'Attendance Management',
      category: 'Workforce',
      status: 'live',
      icon: ClipboardCheck,
      color: 'blue',
      description: 'Auto-tracking, adjustments, manager approval workflow',
      badges: ['Auto'],
    },
    {
      name: 'Performance & Coaching',
      category: 'Workforce',
      status: 'live',
      icon: TrendingUp,
      color: 'purple',
      description: 'Self-reflection, manager feedback, goal tracking, badges',
      badges: ['Growth'],
    },
    {
      name: 'Team Chat & Communication',
      category: 'Communication',
      status: 'live',
      icon: MessageCircle,
      color: 'blue',
      description: 'Real-time chat, reactions, file sharing',
      badges: ['Live'],
    },

    // ========================================
    // ✅ INVENTORY & MENU
    // ========================================
    {
      name: 'Menu Management',
      category: 'Menu',
      status: 'live',
      icon: FileText,
      color: 'orange',
      description: 'Complete menu CRUD with allergen tracking',
      badges: ['Auto-Allergens'],
    },
    {
      name: 'Ingredient Stock Management',
      category: 'Inventory',
      status: 'live',
      icon: Package,
      color: 'teal',
      description: 'Auto-ordering when stock hits reorder point',
      badges: ['Auto-Order'],
    },
    {
      name: 'Production Planning',
      category: 'Operations',
      status: 'live',
      icon: Target,
      color: 'blue',
      description: 'Calculate ingredients needed, auto-generate purchase orders',
      badges: ['Smart'],
    },
    {
      name: 'Cost Analytics Dashboard',
      category: 'Analytics',
      status: 'live',
      icon: BarChart3,
      color: 'green',
      description: 'AI-powered cost analysis and profitability insights',
      badges: ['AI', 'Analytics'],
    },

    // ========================================
    // ✅ ADVANCED SYSTEMS
    // ========================================
    {
      name: 'Leafe Multi-Venue Management',
      category: 'Enterprise',
      status: 'live',
      icon: Globe,
      color: 'teal',
      description: 'Manage multiple restaurant locations from one dashboard',
      badges: ['Enterprise'],
    },
    {
      name: 'Security & RBAC System',
      category: 'Security',
      status: 'live',
      icon: Shield,
      color: 'red',
      description: 'Role-based access control with permission management',
      badges: ['Security', 'RBAC'],
    },
    {
      name: 'Automated Backup System',
      category: 'Data',
      status: 'live',
      icon: Database,
      color: 'blue',
      description: 'Twice-daily auto-backups with restore capability',
      badges: ['Auto', 'Secure'],
    },
    {
      name: 'System Protection Mode',
      category: 'Security',
      status: 'live',
      icon: Lock,
      color: 'red',
      description: 'Prevents unauthorized changes to critical entities',
      badges: ['Security'],
    },

    // ========================================
    // 💡 SUGGESTED NEW FEATURES
    // ========================================
    {
      name: '📱 Mobile App (PWA)',
      category: 'Mobile',
      status: 'suggested',
      icon: Smartphone,
      color: 'purple',
      description: 'Offline-first mobile app for staff on the go',
      badges: ['High Priority', 'Mobile'],
    },
    {
      name: '🤖 Predictive Inventory',
      category: 'AI',
      status: 'suggested',
      icon: TrendingUp,
      color: 'blue',
      description: 'AI predicts stock needs based on sales patterns',
      badges: ['AI', 'Smart'],
    },
    {
      name: '📊 Customer Feedback Integration',
      category: 'Analytics',
      status: 'suggested',
      icon: Star,
      color: 'amber',
      description: 'Collect and analyze customer reviews & ratings',
      badges: ['Customer', 'Analytics'],
    },
    {
      name: '💬 WhatsApp Notifications',
      category: 'Communication',
      status: 'suggested',
      icon: MessageCircle,
      color: 'green',
      description: 'Send shift reminders, alerts via WhatsApp',
      badges: ['Integration'],
    },
    {
      name: '📈 Sales Analytics Dashboard',
      category: 'Analytics',
      status: 'suggested',
      icon: BarChart3,
      color: 'indigo',
      description: 'Track revenue, best sellers, sales trends',
      badges: ['Analytics', 'POS'],
    },
    {
      name: '🎯 Goal Management System',
      category: 'Performance',
      status: 'suggested',
      icon: Target,
      color: 'purple',
      description: 'Set team goals, track progress, celebrate wins',
      badges: ['Team', 'Growth'],
    },
    {
      name: '📅 Booking & Reservation System',
      category: 'Operations',
      status: 'suggested',
      icon: Calendar,
      color: 'pink',
      description: 'Table bookings with customer management',
      badges: ['Customer'],
    },
    {
      name: '🔔 Smart Alert Engine',
      category: 'Automation',
      status: 'suggested',
      icon: AlertTriangle,
      color: 'red',
      description: 'Contextual alerts based on patterns & anomalies',
      badges: ['AI', 'Smart'],
    },
    {
      name: '📸 Instagram Menu Sync',
      category: 'Marketing',
      status: 'suggested',
      icon: Camera,
      color: 'pink',
      description: 'Auto-post menu updates to Instagram',
      badges: ['Social', 'Auto'],
    },
    {
      name: '🌍 Multi-Language Support',
      category: 'Accessibility',
      status: 'suggested',
      icon: Globe,
      color: 'blue',
      description: 'Support for multiple languages (Urdu, Hindi, Arabic)',
      badges: ['i18n', 'Accessibility'],
    },
    {
      name: '🎮 Gamification Leaderboards',
      category: 'Engagement',
      status: 'suggested',
      icon: Award,
      color: 'amber',
      description: 'Points, badges, competitions across all modules',
      badges: ['Gamification', 'Team'],
    },
    {
      name: '📱 QR Code Check-In',
      category: 'Operations',
      status: 'suggested',
      icon: Camera,
      color: 'teal',
      description: 'Staff scan QR codes at stations to clock in',
      badges: ['Mobile', 'Quick'],
    },
  ];

  const categories = [
    { value: 'all', label: 'All Features', icon: Sparkles },
    { value: 'Core', label: 'Core', icon: CheckCircle },
    { value: 'AI', label: 'AI Powered', icon: Sparkles },
    { value: 'Quality', label: 'Quality', icon: Star },
    { value: 'Compliance', label: 'Compliance', icon: Shield },
    { value: 'Workforce', label: 'Workforce', icon: Users },
    { value: 'Analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'Automation', label: 'Automation', icon: Zap },
    { value: 'Documentation', label: 'Documentation', icon: FileText },
    { value: 'Mobile', label: 'Mobile', icon: Smartphone },
  ];

  const filteredFeatures = features.filter(f => {
    const matchesSearch = !searchQuery || 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const liveCount = features.filter(f => f.status === 'live').length;
  const suggestedCount = features.filter(f => f.status === 'suggested').length;

  const getStatusBadge = (status) => {
    if (status === 'live') {
      return <Badge className="bg-green-500 text-white">✅ Live</Badge>;
    }
    if (status === 'beta') {
      return <Badge className="bg-blue-500 text-white">🧪 Beta</Badge>;
    }
    return <Badge className="bg-gray-500 text-white">💡 Suggested</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">AURA Feature List</h1>
              <p className="text-gray-600">Complete overview of all features & capabilities</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{liveCount}</p>
                <p className="text-sm opacity-90">Live Features</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-none">
              <CardContent className="p-4 text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{features.filter(f => f.badges?.includes('AI')).length}</p>
                <p className="text-sm opacity-90">AI-Powered</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-none">
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{suggestedCount}</p>
                <p className="text-sm opacity-90">Suggested Ideas</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Category Tabs */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="flex overflow-x-auto scrollbar-hide">
              {categories.map(cat => {
                const Icon = cat.icon;
                const count = cat.value === 'all' 
                  ? features.length 
                  : features.filter(f => f.category === cat.value).length;
                
                return (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
                      selectedCategory === cat.value
                        ? 'border-purple-600 bg-purple-50 text-purple-700 font-semibold'
                        : 'border-transparent hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                    <Badge variant="outline">{count}</Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features..."
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className={`hover:shadow-xl transition-all h-full ${
                  feature.status === 'live' ? 'border-green-200' : 'border-gray-200'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-${feature.color}-100 flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-6 h-6 text-${feature.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">{feature.name}</h3>
                        <div className="flex flex-wrap gap-1">
                          {getStatusBadge(feature.status)}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                      {feature.description}
                    </p>

                    {feature.badges && feature.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {feature.badges.map(badge => (
                          <Badge
                            key={badge}
                            variant="outline"
                            className="text-xs"
                          >
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredFeatures.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No features found matching your search</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}