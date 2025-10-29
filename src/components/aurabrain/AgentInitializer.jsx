/**
 * AgentInitializer - Safe initialization component for AURA Brain
 * Loads agents in background without blocking UI
 */

import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AgentManager from './AgentManager';

export default function AgentInitializer({ children }) {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

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
        await AgentManager.initialize();
        setInitialized(true);
        console.log('✅ AURA Brain: Agents initialized');
      } catch (err) {
        console.error('⚠️ AURA Brain: Initialization warning:', err);
        setError(err.message);
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
  const [status, setStatus] = useState(AgentManager.getStatus());

  const runAll = async () => {
    const result = await AgentManager.runAll();
    setStatus(AgentManager.getStatus());
    return result;
  };

  const runAgent = async (agentName) => {
    const result = await AgentManager.runAgent(agentName);
    setStatus(AgentManager.getStatus());
    return result;
  };

  const getStatus = () => {
    return AgentManager.getStatus();
  };

  const getHistory = (limit = 10) => {
    return AgentManager.getHistory(limit);
  };

  const healthCheck = async () => {
    return await AgentManager.healthCheck();
  };

  return {
    status,
    runAll,
    runAgent,
    getStatus,
    getHistory,
    healthCheck,
    setEnabled: (enabled) => AgentManager.setEnabled(enabled),
    emergencyStop: () => AgentManager.emergencyStop()
  };
}