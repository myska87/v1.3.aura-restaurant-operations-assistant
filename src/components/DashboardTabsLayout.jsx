import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Info } from 'lucide-react';

export default function DashboardTabsLayout({ 
  title, 
  description, 
  icon: Icon, 
  tabs, 
  defaultTab,
  helpText,
  searchPlaceholder = "Search..."
}) {
  // Persistent tab state using localStorage
  const storageKey = `aura-tab-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved || defaultTab;
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem(storageKey, activeTab);
  }, [activeTab, storageKey]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            {Icon && <Icon className="w-8 h-8 text-emerald-600" />}
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          </div>
          <p className="text-gray-600">{description}</p>
        </div>

        {/* Help Text */}
        {helpText && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {helpText}
            </AlertDescription>
          </Alert>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 rounded-lg shadow-sm flex-wrap h-auto">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white transition-all relative group"
                  title={tab.label}
                >
                  {TabIcon && <TabIcon className="w-4 h-4 mr-2" />}
                  {tab.label}
                  {tab.badge && (
                    <Badge className="ml-2 bg-red-500 text-white text-xs">
                      {tab.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
              {tab.component}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}