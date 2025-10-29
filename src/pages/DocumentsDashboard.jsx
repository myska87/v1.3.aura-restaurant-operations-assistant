import React from 'react';
import { FileText, FilePlus, CheckCircle, BarChart3 } from 'lucide-react';
import DashboardTabsLayout from '../components/DashboardTabsLayout';
import DocumentLibrary from './DocumentLibrary';
import DocumentBuilder from './DocumentBuilder';
import DocumentSignatureReport from './DocumentSignatureReport';
import DocumentManagement from './DocumentManagement';

export default function DocumentsDashboard() {
  const tabs = [
    {
      value: 'library',
      label: 'Library',
      icon: FileText,
      component: <DocumentLibrary />,
    },
    {
      value: 'builder',
      label: 'Create Document',
      icon: FilePlus,
      component: <DocumentBuilder />,
    },
    {
      value: 'signatures',
      label: 'Signatures',
      icon: CheckCircle,
      component: <DocumentSignatureReport />,
    },
    {
      value: 'management',
      label: 'Management',
      icon: BarChart3,
      component: <DocumentManagement />,
    },
  ];

  return (
    <DashboardTabsLayout
      title="Documents Hub"
      description="Company documents, policies, and signature tracking"
      icon={FileText}
      tabs={tabs}
      defaultTab="library"
      helpText="Centralized document management with digital signatures and version control."
      searchPlaceholder="Search documents..."
    />
  );
}