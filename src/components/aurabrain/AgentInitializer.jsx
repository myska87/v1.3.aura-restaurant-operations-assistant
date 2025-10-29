/**
 * AgentInitializer - Safe initialization component for AURA Brain
 * Loads agents in background without blocking UI
 */

import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import agentManager from './AgentManager';

export default function AgentInitializer({ children }) {
  const [initialized, setInitialized] = useState(false);

  // Get current user to check permissions
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  useEffect(() => {
    // Only managers can trigger agent runs
    if (!isManager) {
      setInitialized(true);
      return;
    }

    // Initialize agents in background
    const initializeAgents = async () => {
      try {
        await agentManager.initialize();
        setInitialized(true);
        console.log('✅ AURA Brain: Agents initialized');
      } catch (err) {
        console.warn('⚠️ AURA Brain: Initialization warning:', err);
        setInitialized(true); // Continue anyway
      }
    };

    initializeAgents();
  }, [isManager]);

  // Always render children - don't block UI
  return <>{children}</>;
}

/**
 * Hook to use AgentManager in components
 */
export function useAgentManager() {
  const [status, setStatus] = useState(agentManager.getStatus());

  const runAll = async () => {
    const result = await agentManager.runAll();
    setStatus(agentManager.getStatus());
    return result;
  };

  const runAgent = async (agentName) => {
    const result = await agentManager.runAgent(agentName);
    setStatus(agentManager.getStatus());
    return result;
  };

  const refreshStatus = () => {
    setStatus(agentManager.getStatus());
  };

  return {
    status,
    runAll,
    runAgent,
    refreshStatus,
    healthCheck: () => agentManager.healthCheck()
  };
}