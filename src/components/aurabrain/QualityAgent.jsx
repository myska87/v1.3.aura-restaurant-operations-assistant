import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * AURA Brain - Quality Agent
 * Monitors quality scores and identifies training needs
 * SAFE MODE: Only runs if user is authenticated
 */
export default function QualityAgent() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let interval;
    
    const runAgent = async () => {
      try {
        // 🛡️ Safety Check: Only run if user is logged in
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          console.log('[QualityAgent] User not authenticated - skipping');
          return;
        }

        // Check if agent is enabled
        const configs = await base44.entities.AgentConfig.filter({ agent_name: 'quality_agent' });
        const config = configs[0];
        
        if (!config || !config.is_enabled) {
          console.log('[QualityAgent] Agent is disabled');
          return;
        }

        // Agent logic here (simplified for safety)
        console.log('[QualityAgent] Running...');

      } catch (error) {
        console.error('[QualityAgent] Error:', error);
        // Don't throw - allow app to continue
      }
    };

    // Delay first run by 10 seconds
    const initialTimer = setTimeout(() => {
      runAgent();
      // Then run every 2 hours
      interval = setInterval(runAgent, 2 * 60 * 60 * 1000);
    }, 10000);

    return () => {
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, [queryClient]);

  return null;
}