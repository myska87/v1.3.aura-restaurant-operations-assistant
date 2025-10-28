import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DashboardPro from './DashboardPro';

// 🔄 BACKWARD COMPATIBILITY WRAPPER
// This keeps the old Dashboard.js route working while using the new DashboardPro

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Feature flag - set to true to use new dashboard
  const useNewDashboard = true; // Can be controlled via app settings

  if (useNewDashboard) {
    return <DashboardPro />;
  }

  // Fallback to old dashboard (can keep old code here if needed)
  return <DashboardPro />;
}