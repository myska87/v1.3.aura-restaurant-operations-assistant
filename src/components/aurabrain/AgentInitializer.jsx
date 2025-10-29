/**
 * AgentInitializer - Safe initialization component for AURA Brain
 * Loads agents in background without blocking UI
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { AgentManager } from './AgentManager';

const AgentContext = createContext(null);

export const useAgentManager = () => {
  const context = useContext(AgentContext);
  if (!context) {
    console.warn('useAgentManager used outside of AgentInitializer');
    return null;
  }
  return context;
};

export default function AgentInitializer({ children }) {
  const [manager, setManager] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize agents in background
    const initAgents = async () => {
      try {
        const agentManager = new AgentManager();
        setManager(agentManager);
        
        // Initialize asynchronously without blocking render
        agentManager.initialize().then(() => {
          setInitialized(true);
          console.log('✅ Agents ready');
        }).catch(err => {
          console.warn('Agent init warning:', err);
          setInitialized(true); // Continue anyway
        });
      } catch (error) {
        console.error('AgentInitializer error:', error);
        setInitialized(true); // Continue anyway
      }
    };

    initAgents();
  }, []);

  return (
    <AgentContext.Provider value={{ manager, initialized }}>
      {children}
    </AgentContext.Provider>
  );
}