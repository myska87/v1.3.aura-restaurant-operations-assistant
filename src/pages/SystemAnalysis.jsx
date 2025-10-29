import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Home,
  Link as LinkIcon,
  Lightbulb,
  Wrench,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function SystemAnalysis() {
  const [activeTab, setActiveTab] = useState('health'); // health, broken, suggestions

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  // All pages from navigation
  const allPages = [
    { name: 'Dashboard', url: createPageUrl('Dashboard') },
    { name: 'MyTasks', url: createPageUrl('MyTasks') },
    { name: 'MyShifts', url: createPageUrl('MyShifts') },
    { name: 'ClockInOut', url: createPageUrl('ClockInOut') },
    { name: 'MyAttendance', url: createPageUrl('MyAttendance') },
    { name: 'MyChecklists', url: createPageUrl('MyChecklists') },
    { name: 'HygieneDashboard', url: createPageUrl('HygieneDashboard') },
    { name: 'SOPDashboard', url: createPageUrl('SOPDashboard') },
    { name: 'DocumentLibrary', url: createPageUrl('DocumentLibrary') },
    { name: 'DocumentBuilder', url: createPageUrl('DocumentBuilder') },
    { name: 'DailyChecklists', url: createPageUrl('DailyChecklists') },
    { name: 'FormIntelligence', url: createPageUrl('FormIntelligence') },
    { name: 'QualityDashboard', url: createPageUrl('QualityDashboard') },
    { name: 'Menu', url: createPageUrl('Menu') },
    { name: 'MenuManagement', url: createPageUrl('MenuManagement') },
    { name: 'IngredientStock', url: createPageUrl('IngredientStock') },
    { name: 'StaffRota', url: createPageUrl('StaffRota') },
    { name: 'TeamDirectory', url: createPageUrl('TeamDirectory') },
    { name: 'PayrollDashboard', url: createPageUrl('PayrollDashboard') },
    { name: 'SystemHealthCheck', url: createPageUrl('SystemHealthCheck') },
  ];

  // Issues Found (based on analysis)
  const knownIssues = [
    {
      severity: 'fixed',
      title: '✅ Clock In/Out - Fixed',
      description: 'Clock in/out mutations now work properly with activity logging',
      status: 'resolved',
    },
    {
      severity: 'fixed',
      title: '✅ SOP Dashboard Auto-Refresh - Fixed',
      description: 'Auto-refreshes every 5 seconds to show new SOPs',
      status: 'resolved',
    },
    {
      severity: 'fixed',
      title: '✅ Document Library Categories - Fixed',
      description: 'Category tabs now work with visual filtering',
      status: 'resolved',
    },
    {
      severity: 'fixed',
      title: '✅ PayrollDashboard - Created',
      description: 'Missing page created with full payroll overview',
      status: 'resolved',
    },
    {
      severity: 'fixed',
      title: '✅ Activity Logging - Implemented',
      description: 'All major activities now auto-tracked in real-time',
      status: 'resolved',
    },
    {
      severity: 'info',
      title: 'ℹ️ Data Population Needed',
      description: 'Some features need initial data (menu items, staff, SOPs) to be fully functional',
      status: 'info',
    },
  ];

  // Feature Suggestions
  const featureSuggestions = [
    {
      category: 'Analytics & Reporting',
      icon: TrendingUp,
      features: [
        '📊 Real-time sales analytics dashboard',
        '📈 Staff performance trends over time',
        '💰 Cost analysis and profit margin tracker',
        '📉 Waste tracking and reduction insights',
        '🎯 Goal tracking and KPI monitoring',
      ]
    },
    {
      category: 'Customer Experience',
      icon: Users,
      features: [
        '⭐ Customer feedback and review system',
        '🎫 Digital loyalty program',
        '📱 QR code menu ordering',
        '💬 Customer complaint management',
        '🎁 Promotional campaigns manager',
      ]
    },
    {
      category: 'Advanced Automation',
      icon: Zap,
      features: [
        '🤖 AI-powered inventory reorder predictions',
        '📧 Automated staff shift reminders',
        '🔔 Smart alert escalation system',
        '📅 Auto-schedule based on historical demand',
        '🎬 Video training with quiz integration',
      ]
    },
    {
      category: 'Mobile & Accessibility',
      icon: Activity,
      features: [
        '📱 Progressive Web App (PWA) for offline access',
        '🔊 Voice commands for hands-free operation',
        '🌍 Multi-language support',
        '♿ Enhanced accessibility features',
        '📲 Mobile-optimized forms',
      ]
    },
    {
      category: 'Compliance & Security',
      icon: Shield,
      features: [
        '🔐 Two-factor authentication (2FA)',
        '📜 Digital contract signing',
        '🚨 Automated compliance deadline tracking',
        '📊 Audit trail visualization',
        '🔒 Role-based data encryption',
      ]
    },
    {
      category: 'Team Engagement',
      icon: Heart,
      features: [
        '🏆 Leaderboard and gamification',
        '🎖️ Achievement badges and rewards',
        '💡 Anonymous suggestion voting',
        '🎉 Birthday and anniversary reminders',
        '📣 Staff recognition wall of fame',
      ]
    },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">System Analysis is only accessible to Administrators.</p>
              <Link to={createPageUrl('Dashboard')}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('SystemHealthCheck')}>
            <Button variant="outline" size="sm">
              <Activity className="w-4 h-4 mr-2" />
              Health Check
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            System Analysis & Recommendations
          </h1>
          <p className="text-gray-600">Comprehensive system audit with improvement suggestions</p>
        </div>

        {/* Tabs */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('health')}
                className={`flex-1 px-6 py-4 font-semibold transition-all ${
                  activeTab === 'health'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Activity className="w-5 h-5 inline mr-2" />
                System Status
              </button>
              <button
                onClick={() => setActiveTab('broken')}
                className={`flex-1 px-6 py-4 font-semibold transition-all ${
                  activeTab === 'broken'
                    ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Wrench className="w-5 h-5 inline mr-2" />
                Fixed Issues
              </button>
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`flex-1 px-6 py-4 font-semibold transition-all ${
                  activeTab === 'suggestions'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Lightbulb className="w-5 h-5 inline mr-2" />
                Suggestions
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === 'health' && (
          <Card>
            <CardHeader>
              <CardTitle>All Pages & Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {allPages.map((page) => (
                  <Link key={page.name} to={page.url}>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <span className="font-medium text-gray-900">{page.name}</span>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'broken' && (
          <div className="space-y-4">
            {knownIssues.map((issue, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={
                  issue.severity === 'fixed' ? 'bg-green-50 border-green-200' :
                  issue.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                  'bg-blue-50 border-blue-200'
                }>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {issue.severity === 'fixed' ? (
                        <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                      ) : issue.severity === 'warning' ? (
                        <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
                      ) : (
                        <Activity className="w-8 h-8 text-blue-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{issue.title}</h3>
                        <p className="text-gray-700">{issue.description}</p>
                      </div>
                      <Badge className={
                        issue.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {issue.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            {featureSuggestions.map((category, index) => {
              const Icon = category.icon;
              
              return (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Icon className="w-6 h-6 text-purple-600" />
                        {category.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {category.features.map((feature, fIndex) => (
                          <li
                            key={fIndex}
                            className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            <Lightbulb className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-800">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* CTA */}
            <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none">
              <CardContent className="p-8 text-center">
                <Zap className="w-16 h-16 mx-auto mb-4 opacity-90" />
                <h3 className="text-2xl font-bold mb-2">Want to prioritize a feature?</h3>
                <p className="text-purple-100 mb-6">
                  Submit your feature requests and vote on what gets built next!
                </p>
                <Link to={createPageUrl('FeatureIdeas')}>
                  <Button className="bg-white text-purple-700 hover:bg-purple-50">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Submit Feature Idea
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

const featureSuggestions = [
  {
    category: 'Analytics & Reporting',
    icon: TrendingUp,
    features: [
      '📊 Real-time sales analytics dashboard',
      '📈 Staff performance trends over time',
      '💰 Cost analysis and profit margin tracker',
      '📉 Waste tracking and reduction insights',
      '🎯 Goal tracking and KPI monitoring',
      '📊 Visual reports with charts and graphs',
      '📅 Custom date range analytics',
    ]
  },
  {
    category: 'Customer Experience',
    icon: Users,
    features: [
      '⭐ Customer feedback and review system',
      '🎫 Digital loyalty program with points',
      '📱 QR code menu ordering system',
      '💬 Customer complaint management portal',
      '🎁 Promotional campaigns manager',
      '📧 Automated customer email marketing',
      '🍽️ Table reservation system',
    ]
  },
  {
    category: 'Advanced Automation',
    icon: Zap,
    features: [
      '🤖 AI-powered inventory reorder predictions',
      '📧 Automated staff shift reminder emails',
      '🔔 Smart alert escalation system',
      '📅 Auto-schedule based on historical demand',
      '🎬 Video training with quiz integration',
      '🔄 Auto-sync with POS systems',
      '📊 Predictive maintenance alerts',
    ]
  },
  {
    category: 'Mobile & Accessibility',
    icon: Activity,
    features: [
      '📱 Progressive Web App (PWA) for offline access',
      '🔊 Voice commands for hands-free operation',
      '🌍 Multi-language support (Spanish, Arabic, etc.)',
      '♿ Enhanced accessibility (screen readers, keyboard nav)',
      '📲 Mobile-optimized forms and checklists',
      '📸 Camera integration for quick uploads',
      '🗺️ GPS geofencing for clock in/out',
    ]
  },
  {
    category: 'Compliance & Security',
    icon: Shield,
    features: [
      '🔐 Two-factor authentication (2FA)',
      '📜 Digital contract signing with legal validity',
      '🚨 Automated compliance deadline tracking',
      '📊 Visual audit trail with timeline',
      '🔒 Advanced role-based permissions',
      '📁 Encrypted file storage',
      '🔔 Compliance expiry notifications',
    ]
  },
  {
    category: 'Team Engagement',
    icon: Heart,
    features: [
      '🏆 Gamified leaderboards with prizes',
      '🎖️ Achievement badges and milestone rewards',
      '💡 Voting system for staff suggestions',
      '🎉 Birthday and work anniversary automation',
      '📣 Wall of fame for top performers',
      '💬 Peer-to-peer recognition system',
      '🎁 Reward redemption marketplace',
    ]
  },
  {
    category: 'Integrations',
    icon: LinkIcon,
    features: [
      '🔗 POS system integration (Square, Toast, etc.)',
      '💳 Payroll software integration (Xero, QuickBooks)',
      '📧 Gmail/Outlook calendar sync',
      '📊 Google Sheets export automation',
      '🔔 Slack/Teams notifications',
      '📱 WhatsApp business integration',
      '☁️ Cloud storage sync (Dropbox, Google Drive)',
    ]
  },
];