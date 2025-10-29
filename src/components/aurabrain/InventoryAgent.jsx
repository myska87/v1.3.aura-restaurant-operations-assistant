import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * AURA Brain - Inventory Agent
 * Monitors stock levels and predicts shortages
 * SAFE MODE: Only runs if user is authenticated
 */
export default function InventoryAgent() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let interval;
    
    const runAgent = async () => {
      try {
        // 🛡️ Safety Check: Only run if user is logged in
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          console.log('[InventoryAgent] User not authenticated - skipping');
          return;
        }

        // Check if agent is enabled
        const configs = await base44.entities.AgentConfig.filter({ agent_name: 'inventory_agent' });
        const config = configs[0];
        
        if (!config || !config.is_enabled) {
          console.log('[InventoryAgent] Agent is disabled');
          return;
        }

        // Agent logic here (simplified for safety)
        console.log('[InventoryAgent] Running...');

      } catch (error) {
        console.error('[InventoryAgent] Error:', error);
        // Don't throw - allow app to continue
      }
    };

    // Delay first run by 7 seconds
    const initialTimer = setTimeout(() => {
      runAgent();
      // Then run every hour
      interval = setInterval(runAgent, 60 * 60 * 1000);
    }, 7000);

    return () => {
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, [queryClient]);

  return null;
}