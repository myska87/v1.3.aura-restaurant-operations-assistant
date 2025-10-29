import React from 'react';
import { Brain, Activity, BarChart3, Rss } from 'lucide-react';
import DashboardTabsLayout from '../components/DashboardTabsLayout';
import AuraBrainDashboard from './AuraBrainDashboard';
import AuraIntelligence from './AuraIntelligence';
import AnalyticsDashboard from './AnalyticsDashboard';
import EventFeed from './EventFeed';

export default function AIHub() {
  const tabs = [
    {
      value: 'agents',
      label: 'AI Agents',
      icon: Brain,
      component: <AuraBrainDashboard />,
    },
    {
      value: 'intelligence',
      label: 'Intelligence',
      icon: Activity,
      component: <AuraIntelligence />,
    },
    {
      value: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      component: <AnalyticsDashboard />,
    },
    {
      value: 'events',
      label: 'Event Feed',
      icon: Rss,
      component: <EventFeed />,
    },
  ];

  return (
    <DashboardTabsLayout
      title="AURA AI Hub"
      description="Intelligent agents, analytics, and insights"
      icon={Brain}
      tabs={tabs}
      defaultTab="agents"
      helpText="AURA Brain monitors your operations 24/7 and provides intelligent recommendations."
      searchPlaceholder="Search AI activity..."
    />
  );
}