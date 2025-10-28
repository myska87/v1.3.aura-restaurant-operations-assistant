import React from 'react';
import { FileText, Sparkles, Award, Link2 } from 'lucide-react';
import DashboardTabsLayout from '../components/DashboardTabsLayout';
import SOPDashboard from './SOPDashboard';
import SOPBuilder from './SOPBuilder';
import SOPCertifications from './SOPCertifications';
import SOPCore from './SOPCore';

export default function SOPDashboardHub() {
  const tabs = [
    {
      value: 'library',
      label: 'SOP Library',
      icon: FileText,
      component: <SOPDashboard />,
    },
    {
      value: 'builder',
      label: 'AI SOP Generator',
      icon: Sparkles,
      component: <SOPBuilder />,
    },
    {
      value: 'certifications',
      label: 'Certificates',
      icon: Award,
      component: <SOPCertifications />,
    },
    {
      value: 'integrations',
      label: 'SOP Links',
      icon: Link2,
      component: <SOPCore />,
    },
  ];

  return (
    <DashboardTabsLayout
      title="SOPs & Procedures"
      description="Standard operating procedures and training materials"
      icon={FileText}
      tabs={tabs}
      defaultTab="library"
      helpText="Create, manage, and track acknowledgment of all standard operating procedures."
      searchPlaceholder="Search SOPs..."
    />
  );
}