import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  Users,
  BarChart3,
  LogOut,
  Menu as MenuIcon,
  X,
  Utensils,
  BookOpen,
  Star,
  FileText,
  Calendar,
  MessageCircle,
  Search,
  Settings,
  Mic,
  Moon,
  Sun,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import AgentInitializer from './components/aurabrain/AgentInitializer';

// Dark Mode Toggle Component (inline)
function DarkModeToggle() {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('aura-theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);

    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aura-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aura-theme', 'light');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDarkMode}
      className="rounded-full"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600" />
      )}
    </Button>
  );
}

// Voice Search Component (inline)
function VoiceSearch({ onClose, navigate }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);

  React.useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onresult = (event) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);

      if (event.results[current].isFinal) {
        handleVoiceCommand(transcriptText);
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognition) {
      setTranscript('');
      recognition.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const handleVoiceCommand = (command) => {
    const lowerCommand = command.toLowerCase();

    const navMap = {
      'dashboard': 'Dashboard',
      'home': 'Dashboard',
      'tasks': 'MyTasks',
      'my tasks': 'MyTasks',
      'shifts': 'MyShifts',
      'my shifts': 'MyShifts',
      'clock in': 'ClockInOut',
      'clock out': 'ClockInOut',
      'team chat': 'TeamChat',
      'chat': 'TeamChat',
      'inventory': 'InventoryDashboard',
      'stock': 'InventoryDashboard',
      'menu': 'Menu',
      'quality': 'QualityDashboard',
      'sop': 'SOPDashboardHub',
      'procedures': 'SOPDashboardHub',
      'documents': 'DocumentsFormsHub',
      'forms': 'DocumentsFormsHub',
      'reports': 'Reports',
      'staff': 'StaffDashboard',
      'hygiene': 'HygieneDashboard',
      'settings': 'SettingsDashboard',
    };

    for (const [keyword, page] of Object.entries(navMap)) {
      if (lowerCommand.includes(keyword)) {
        navigate(createPageUrl(page));
        if (onClose) onClose();
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(`Opening ${keyword}`);
          window.speechSynthesis.speak(utterance);
        }
        return;
      }
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("I didn't understand that command. Try saying 'go to dashboard' or 'open tasks'");
      window.speechSynthesis.speak(utterance);
    }
  };

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  if (!isSupported) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-amber-800">
          Voice search is not supported in your browser. Try Chrome or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="text-center">
        <div className="mb-4">
          <Button
            onClick={isListening ? stopListening : startListening}
            className={`w-20 h-20 rounded-full ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Mic className="w-10 h-10 text-white" />
          </Button>
        </div>

        <p className="text-sm font-semibold text-gray-900 mb-2">
          {isListening ? 'Listening...' : 'Tap to speak'}
        </p>

        {transcript && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
            <p className="text-sm text-gray-900">"{transcript}"</p>
          </div>
        )}

        <div className="mt-4 space-y-1">
          <p className="text-xs text-gray-600">Try saying:</p>
          <p className="text-xs text-purple-700 font-medium">"Go to dashboard"</p>
          <p className="text-xs text-purple-700 font-medium">"Open my tasks"</p>
          <p className="text-xs text-purple-700 font-medium">"Show inventory"</p>
        </div>
      </div>
    </div>
  );
}

// Role-based navigation configuration
const getRoleNavigation = (user) => {
  if (!user) return [];

  const position = user.position?.toLowerCase();
  const isManager = user.role === 'admin' || position === 'manager' || position === 'owner';

  if (isManager) {
    return [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      { title: "Operations", url: createPageUrl("OperationsDashboard"), icon: ClipboardCheck },
      { title: "Staff", url: createPageUrl("StaffDashboard"), icon: Users },
      { title: "Inventory", url: createPageUrl("InventoryDashboard"), icon: Package },
      { title: "Reports", url: createPageUrl("Reports"), icon: BarChart3 },
      { title: "Settings", url: createPageUrl("SettingsDashboard"), icon: Settings },
    ];
  }

  if (position === 'chef' || position === 'sous_chef' || position === 'line_cook') {
    return [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      { title: "Menu", url: createPageUrl("Menu"), icon: Utensils },
      { title: "SOPs", url: createPageUrl("SOPDashboardHub"), icon: BookOpen },
      { title: "Inventory", url: createPageUrl("InventoryDashboard"), icon: Package },
      { title: "Quality", url: createPageUrl("QualityDashboard"), icon: Star },
      { title: "My Shifts", url: createPageUrl("MyShifts"), icon: Calendar },
    ];
  }

  if (position === 'server' || position === 'bartender' || position === 'host') {
    return [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      { title: "My Shifts", url: createPageUrl("MyShifts"), icon: Calendar },
      { title: "My Tasks", url: createPageUrl("MyTasks"), icon: ClipboardCheck },
      { title: "Team Chat", url: createPageUrl("TeamChat"), icon: MessageCircle },
      { title: "Documents", url: createPageUrl("DocumentsFormsHub"), icon: FileText },
      { title: "Training", url: createPageUrl("OnboardingTraining"), icon: BookOpen },
    ];
  }

  if (position === 'cleaner' || position === 'maintenance') {
    return [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      { title: "My Shifts", url: createPageUrl("MyShifts"), icon: Calendar },
      { title: "My Tasks", url: createPageUrl("MyTasks"), icon: ClipboardCheck },
      { title: "Quality Checks", url: createPageUrl("QuickQualityCheck"), icon: Star },
      { title: "Maintenance", url: createPageUrl("Maintenance"), icon: Settings },
      { title: "Team Chat", url: createPageUrl("TeamChat"), icon: MessageCircle },
    ];
  }

  return [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { title: "My Shifts", url: createPageUrl("MyShifts"), icon: Calendar },
    { title: "My Tasks", url: createPageUrl("MyTasks"), icon: ClipboardCheck },
    { title: "Team Chat", url: createPageUrl("TeamChat"), icon: MessageCircle },
  ];
};

// Comprehensive page list for global search
const ALL_PAGES = [
  { name: "Dashboard", url: createPageUrl("Dashboard"), keywords: "home main overview", category: "Core" },
  { name: "AURA Control Center", url: createPageUrl("DashboardPro"), keywords: "unified widgets ai brain", category: "Core" },
  { name: "Documents & Forms Hub", url: createPageUrl("DocumentsFormsHub"), keywords: "documents forms sops unified", category: "Core" },
  
  { name: "Operations Hub", url: createPageUrl("OperationsDashboard"), keywords: "tasks checklists daily", category: "Operations" },
  { name: "My Tasks", url: createPageUrl("MyTasks"), keywords: "todo assignments work", category: "Operations" },
  
  { name: "Staff Hub", url: createPageUrl("StaffDashboard"), keywords: "team employees hr", category: "Staff" },
  { name: "Team Directory", url: createPageUrl("TeamDirectory"), keywords: "contacts staff list", category: "Staff" },
  { name: "My Shifts", url: createPageUrl("MyShifts"), keywords: "schedule rota roster", category: "Staff" },
  { name: "Staff Rota", url: createPageUrl("StaffRota"), keywords: "schedule weekly planning", category: "Staff" },
  { name: "Clock In/Out", url: createPageUrl("ClockInOut"), keywords: "attendance time tracking", category: "Staff" },
  
  { name: "Inventory Hub", url: createPageUrl("InventoryDashboard"), keywords: "stock supplies ordering", category: "Inventory" },
  { name: "Menu Hub", url: createPageUrl("Menu"), keywords: "food dishes recipes", category: "Menu" },
  
  { name: "SOP Hub", url: createPageUrl("SOPDashboardHub"), keywords: "procedures training guides", category: "SOPs" },
  { name: "Quality Dashboard", url: createPageUrl("QualityDashboard"), keywords: "audits checks standards", category: "Quality" },
  
  { name: "Hygiene Central", url: createPageUrl("HygieneDashboard"), keywords: "cleanliness temperature safety", category: "Hygiene" },
  { name: "Form Intelligence", url: createPageUrl("FormIntelligence"), keywords: "checklists forms compliance", category: "Forms" },
  
  { name: "Team Chat", url: createPageUrl("TeamChat"), keywords: "messages communication", category: "Communication" },
  { name: "Announcements", url: createPageUrl("Announcements"), keywords: "news updates notices", category: "Communication" },
  
  { name: "Training", url: createPageUrl("OnboardingTraining"), keywords: "learning courses onboarding", category: "Training" },
  { name: "Reports", url: createPageUrl("Reports"), keywords: "analytics statistics data", category: "Reports" },
  { name: "Settings", url: createPageUrl("SettingsDashboard"), keywords: "configuration admin", category: "Settings" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [voiceSearchOpen, setVoiceSearchOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('aura-theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const navigation = getRoleNavigation(user);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);

    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aura-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aura-theme', 'light');
    }
  };

  const filteredPages = ALL_PAGES;

  const pagesByCategory = filteredPages.reduce((acc, page) => {
    if (!acc[page.category]) acc[page.category] = [];
    acc[page.category].push(page);
    return acc;
  }, {});

  React.useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <AgentInitializer>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-900">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transition-transform duration-300 w-72 overflow-y-auto ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          {/* Logo Header */}
          <div className="border-b border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <div>
                  <h2 className="font-bold text-xl text-gray-900 dark:text-white">AURA</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Restaurant Assistant</p>
                </div>
              </div>
              <button
                className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* Search & Voice Controls */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 space-y-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Search pages...</span>
              <kbd className="ml-auto px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-400">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={() => setVoiceSearchOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
            >
              <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-700 dark:text-purple-300">Voice Search</span>
            </button>
          </div>

          {/* User Role Badge */}
          {user && (
            <div className="px-4 py-3">
              <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Your Role</p>
                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                  {user.position?.replace('_', ' ') || 'Staff Member'}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="p-3">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500 dark:text-gray-400"}`} />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-3">QUICK ACTIONS</p>
            <div className="space-y-1">
              <Link to={createPageUrl("ClockInOut")} onClick={() => setSidebarOpen(false)}>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  ⏰ Clock In/Out
                </button>
              </Link>
              <Link to={createPageUrl("TeamChat")} onClick={() => setSidebarOpen(false)}>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  💬 Team Chat
                </button>
              </Link>
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                🔍 Find Anything...
              </button>
            </div>
          </div>

          {/* User Profile Section */}
          <div className="border-t border-gray-100 dark:border-gray-700 p-4">
            {user && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.position?.replace('_', ' ') || "Staff"}
                      </p>
                    </div>
                  </div>
                  {/* Dark Mode Toggle Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleDarkMode}
                    className="rounded-full flex-shrink-0"
                    title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    {isDarkMode ? (
                      <Sun className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <Moon className="w-5 h-5 text-gray-600" />
                    )}
                  </Button>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden lg:ml-72">
          {/* Mobile Header */}
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 lg:hidden">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors duration-200"
              >
                <MenuIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">AURA</h1>
              <button
                onClick={() => setSearchOpen(true)}
                className="ml-auto hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
              >
                <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setVoiceSearchOpen(true)}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
              >
                <Mic className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </button>
              <button
                onClick={toggleDarkMode}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">{children}</div>
        </main>

        {/* Global Search Dialog */}
        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
          <CommandInput placeholder="Search pages, features, or modules..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {Object.entries(pagesByCategory).map(([category, pages]) => (
              <CommandGroup key={category} heading={category}>
                {pages.map((page) => (
                  <CommandItem
                    key={page.url}
                    onSelect={() => {
                      window.location.href = page.url;
                      setSearchOpen(false);
                    }}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    <span>{page.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </CommandDialog>

        {/* Voice Search Dialog */}
        <Dialog open={voiceSearchOpen} onOpenChange={setVoiceSearchOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-purple-600" />
                Voice Navigation
              </DialogTitle>
            </DialogHeader>
            <VoiceSearch 
              onClose={() => setVoiceSearchOpen(false)} 
              navigate={(url) => {
                window.location.href = url;
                setVoiceSearchOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AgentInitializer>
  );
}