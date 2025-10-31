import React from 'react';
import { Shield, FileCheck, Clock, Award } from 'lucide-react';
import DashboardTabsLayout from '../components/DashboardTabsLayout';
import ComplianceDashboard from './ComplianceDashboard';
import AIComplianceSummary from '../components/compliancecore/AIComplianceSummary';
import RenewalMonitor from '../components/compliancecore/RenewalMonitor';

export default function ComplianceCore() {
  const tabs = [
    {
      value: 'overview',
      label: 'Compliance Overview',
      icon: Shield,
      component: <ComplianceDashboard />,
    },
    {
      value: 'certificates',
      label: 'Certificates & Renewals',
      icon: Award,
      component: <RenewalMonitor />,
    },
    {
      value: 'ai-report',
      label: 'AI Compliance Report',
      icon: FileCheck,
      component: <AIComplianceSummary />,
    },
  ];

  return (
    <DashboardTabsLayout
      title="Compliance Core"
      description="Certificates, renewals, and compliance management"
      icon={Shield}
      tabs={tabs}
      defaultTab="overview"
      helpText="Track compliance documents, manage renewals, and generate AI compliance reports."
    />
  );
}