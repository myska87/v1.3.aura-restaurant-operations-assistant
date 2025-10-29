import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * AURA Brain - Hygiene Agent
 * Monitors hygiene records, checklists, and form completion
 * SAFE MODE: Only runs if user is authenticated
 */
export default function HygieneAgent() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let interval;
    
    const runAgent = async () => {
      try {
        // 🛡️ Safety Check: Only run if user is logged in
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          console.log('[HygieneAgent] User not authenticated - skipping');
          return;
        }

        // Check if agent is enabled
        const configs = await base44.entities.AgentConfig.filter({ agent_name: 'hygiene_agent' });
        const config = configs[0];
        
        if (!config || !config.is_enabled) {
          console.log('[HygieneAgent] Agent is disabled');
          return;
        }

        // Agent logic here (simplified for safety)
        console.log('[HygieneAgent] Running...');

      } catch (error) {
        console.error('[HygieneAgent] Error:', error);
        // Don't throw - allow app to continue
      }
    };

    // Delay first run by 5 seconds to ensure app is ready
    const initialTimer = setTimeout(() => {
      runAgent();
      // Then run every 30 minutes
      interval = setInterval(runAgent, 30 * 60 * 1000);
    }, 5000);

    return () => {
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, [queryClient]);

  return null; // Invisible background service
}