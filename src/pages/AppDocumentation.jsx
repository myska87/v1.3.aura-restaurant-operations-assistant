import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Search,
  ChevronRight,
  Home,
  Users,
  Calendar,
  Package,
  Star,
  FileText,
  BarChart3,
  Settings,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info,
  Utensils,
  GraduationCap,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AppDocumentation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('overview');

  const categories = [
    { id: 'overview', name: '📚 Overview', icon: BookOpen },
    { id: 'getting-started', name: '🚀 Getting Started', icon: Home },
    { id: 'staff', name: '👥 Staff Management', icon: Users },
    { id: 'operations', name: '📋 Operations', icon: CheckCircle },
    { id: 'menu', name: '🍽️ Menu & Inventory', icon: Utensils },
    { id: 'quality', name: '⭐ Quality & Compliance', icon: Star },
    { id: 'ai-tools', name: '✨ AI Tools', icon: Sparkles },
    { id: 'reports', name: '📊 Reports & Analytics', icon: BarChart3 },
  ];

  const documentation = {
    overview: {
      title: 'Welcome to AURA Restaurant Assistant',
      content: [
        {
          heading: 'What is AURA?',
          text: 'AURA (Automated Unified Restaurant Assistant) is your all-in-one platform for managing restaurant operations. From staff scheduling to quality control, inventory to training - everything in one place.',
        },
        {
          heading: 'Key Features',
          items: [
            'Staff scheduling & attendance tracking',
            'Menu management with cost analysis',
            'Quality control & audit system',
            'Inventory & supplier management',
            'SOPs & training academy',
            'AI-powered scheduling & meeting notes',
            'Real-time reporting & analytics',
            'Compliance & hygiene tracking',
          ],
        },
        {
          heading: 'System Requirements',
          text: 'AURA is a cloud-based platform accessible from any modern web browser. Works on desktop, tablet, and mobile devices.',
        },
        {
          heading: 'Tech Stack',
          items: [
            'Frontend: React + Tailwind CSS',
            'Backend: Base44 Platform (BaaS)',
            'Database: Built-in entity system',
            'Authentication: Role-based access control',
            'AI: LLM integrations for automation',
          ],
        },
      ],
    },
    'getting-started': {
      title: 'Getting Started Guide',
      content: [
        {
          heading: '1. First Login',
          text: 'When you first log in, you\'ll see a personalized dashboard based on your role (Manager, Chef, Server, etc.). Your role determines what features you can access.',
        },
        {
          heading: '2. Setting Up Your Profile',
          steps: [
            'Navigate to Settings → Profile',
            'Update your personal information',
            'Set your availability preferences',
            'Upload a profile photo (optional)',
          ],
        },
        {
          heading: '3. Understanding Your Role',
          items: [
            '**Managers/Owners**: Full access to all modules, can create schedules, manage staff, view reports',
            '**Chefs**: Access to menu, inventory, quality checks, and kitchen SOPs',
            '**Servers**: View shifts, complete tasks, access training, and customer service SOPs',
            '**All Staff**: Can clock in/out, view their shifts, complete assigned tasks',
          ],
        },
        {
          heading: '4. Quick Actions',
          text: 'Use the Quick Actions section on your dashboard for frequently used features like Clock In/Out, My Tasks, and Team Chat.',
        },
        {
          heading: '5. Voice & Search',
          text: 'Use the voice search button (microphone icon) in the sidebar to quickly navigate: "Go to inventory", "Open my tasks", etc.',
        },
      ],
    },
    staff: {
      title: 'Staff Management',
      content: [
        {
          heading: 'Staff Rota',
          text: 'Create and manage staff schedules with the AI-powered scheduler.',
          steps: [
            'Go to Staff → Staff Rota',
            'Click "Create Shift" or use "AI Scheduler"',
            'Select staff, date, time, and role',
            'Shifts automatically notify assigned staff',
          ],
        },
        {
          heading: 'AI Scheduler (Managers Only)',
          text: 'Let AI generate optimized schedules based on availability and workload.',
          steps: [
            'Navigate to AI Scheduler',
            'Describe your needs: "Generate next week\'s schedule with 2 chefs per shift"',
            'Review AI-generated schedule',
            'Approve and publish shifts',
          ],
        },
        {
          heading: 'Clock In/Out',
          text: 'All staff can track their attendance with GPS location verification.',
          steps: [
            'Go to Clock In/Out page',
            'Click "Clock In" when starting your shift',
            'Location is automatically recorded',
            'Click "Clock Out" when shift ends',
          ],
        },
        {
          heading: 'My Shifts',
          text: 'View your upcoming and past shifts, including status and notes.',
        },
        {
          heading: 'Team Directory',
          text: 'View contact information for all team members, organized by role and department.',
        },
      ],
    },
    operations: {
      title: 'Operations & Tasks',
      content: [
        {
          heading: 'My Tasks',
          text: 'View and complete tasks assigned to you, organized by priority and due date.',
          steps: [
            'Tasks are shown as Overdue, Due Today, or Upcoming',
            'Click on a task to expand details',
            'Click "Mark as Complete" when done',
            'Add notes and photos for completion evidence',
          ],
        },
        {
          heading: 'SOPs (Standard Operating Procedures)',
          text: 'Access step-by-step guides for all restaurant operations.',
          steps: [
            'Browse SOPs by category (Kitchen, Service, Cleaning, etc.)',
            'View detailed procedure steps with images',
            'Sign acknowledgment when reviewed',
            'Managers can create new SOPs',
          ],
        },
        {
          heading: 'Checklists',
          text: 'Daily, weekly, and custom checklists for opening/closing and routine tasks.',
        },
        {
          heading: 'Maintenance',
          text: 'Report equipment issues and track maintenance tickets.',
          steps: [
            'Click "Report Issue"',
            'Describe the problem and add photos',
            'Select priority level',
            'Track status of your report',
          ],
        },
      ],
    },
    menu: {
      title: 'Menu & Inventory Management',
      content: [
        {
          heading: 'Menu Management (Managers Only)',
          text: 'Create menu items with recipes, cost analysis, and allergen information.',
          steps: [
            'Go to Menu → Manage Menu',
            'Click "Add Menu Item"',
            'Enter item details, price, and description',
            'Build recipe by adding ingredients',
            'System auto-calculates food cost %',
            'Upload item photo',
          ],
        },
        {
          heading: 'Allergen Management',
          text: 'Track allergens across all menu items with the Allergen Table.',
        },
        {
          heading: 'Inventory Dashboard',
          text: 'Track stock levels, reorder points, and supplier information.',
          steps: [
            'View current stock levels',
            'Get alerts for low stock items',
            'Place orders via "Order Ingredients Now"',
            'System generates order emails to suppliers',
          ],
        },
        {
          heading: 'Supplier Management',
          text: 'Maintain supplier contacts, pricing, and delivery schedules.',
        },
        {
          heading: 'Cost Analysis',
          text: 'View profit margins, food cost percentages, and menu profitability reports.',
        },
      ],
    },
    quality: {
      title: 'Quality & Compliance',
      content: [
        {
          heading: 'Quality Control',
          text: 'Fast, lightweight quality inspection tool for daily checks.',
          steps: [
            'Go to Quality Control page',
            'Click "New Inspection"',
            'Select location and category',
            'Rate on scale of 0-100',
            'Add notes and photos',
            'Low scores (<70) auto-create action items',
          ],
        },
        {
          heading: 'Quality & Audit Hub',
          text: 'Detailed quality checks and audit reports with analytics.',
        },
        {
          heading: 'Hygiene Dashboard',
          text: 'Temperature logs, cleanliness checks, and hygiene compliance.',
          steps: [
            'Record daily temperature checks',
            'Log cleaning activities',
            'Track pest control visits',
            'View hygiene scores and trends',
          ],
        },
        {
          heading: 'Compliance Core',
          text: 'Track certificates, licenses, and renewal dates.',
        },
      ],
    },
    'ai-tools': {
      title: 'AI Tools & Automation',
      content: [
        {
          heading: 'AI Scheduler',
          text: 'Generate optimized staff rotas using natural language.',
          example: 'Try: "Create next week\'s schedule with 2 chefs and 3 servers, ensuring no one works more than 5 days"',
        },
        {
          heading: 'AI Meeting Minutes',
          text: 'Record meetings and get automatic transcription with action items.',
          steps: [
            'Go to AI Meeting Minutes',
            'Click "Record Meeting"',
            'Speak naturally during your meeting',
            'Stop recording when done',
            'AI generates summary, topics, and action items',
            'Review and approve minutes',
          ],
        },
        {
          heading: 'AI Training Post Creator',
          text: 'Generate engaging training content with AI assistance.',
          steps: [
            'Go to Training Academy',
            'Click "AI Assistant"',
            'Describe what you want to teach',
            'AI generates post with warm, motivational tone',
            'Edit and publish',
          ],
        },
      ],
    },
    reports: {
      title: 'Reports & Analytics',
      content: [
        {
          heading: 'Dashboard Overview',
          text: 'Your home dashboard shows key metrics based on your role.',
        },
        {
          heading: 'Reports Dashboard',
          text: 'Access detailed reports on staff, operations, inventory, and quality.',
          sections: [
            'Staff attendance and performance',
            'Inventory usage and waste',
            'Quality scores and trends',
            'Financial summary (managers only)',
          ],
        },
        {
          heading: 'Real-Time Data',
          text: 'All data updates in real-time across all devices.',
        },
        {
          heading: 'Export Options',
          text: 'Export reports to PDF or Excel for offline analysis.',
        },
      ],
    },
  };

  const currentContent = documentation[selectedCategory];

  const filteredCategories = searchQuery
    ? categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        documentation[cat.id]?.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  const renderContent = (item, index) => {
    return (
      <div key={index} className="mb-6">
        {item.heading && (
          <h3 className="text-lg font-bold text-gray-900 mb-2">{item.heading}</h3>
        )}
        {item.text && <p className="text-gray-700 mb-3">{item.text}</p>}
        {item.example && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-3">
            <p className="text-sm text-blue-900">
              <strong>Example:</strong> {item.example}
            </p>
          </div>
        )}
        {item.items && (
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {item.items.map((listItem, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: listItem }} />
            ))}
          </ul>
        )}
        {item.steps && (
          <ol className="list-decimal list-inside space-y-2 text-gray-700 bg-gray-50 p-4 rounded-lg">
            {item.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        )}
        {item.sections && (
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            {item.sections.map((section, i) => (
              <div key={i} className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-800">{section}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-blue-600" />
                AURA Documentation
              </h1>
              <p className="text-gray-600">Complete guide to using the restaurant assistant</p>
            </div>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white sticky top-6">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-600">TOPICS</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-1">
                  {filteredCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                          selectedCategory === category.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{category.name}</span>
                        </div>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900">
                  {currentContent?.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {currentContent?.content.map((item, index) => renderContent(item, index))}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white mt-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Need More Help?</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Link to={createPageUrl('TeamChat')}>
                    <Button variant="secondary" className="w-full">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Ask Team Chat
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Dashboard')}>
                    <Button variant="secondary" className="w-full">
                      <Home className="w-4 h-4 mr-2" />
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}