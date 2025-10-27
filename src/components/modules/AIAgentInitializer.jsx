/**
 * AURA AI Agent Initializer
 * Automatically starts agents when app loads
 */

import { useEffect } from 'react';
import { agentManager } from './AIAgentCore';

export default function AIAgentInitializer() {
  useEffect(() => {
    // Start agents after 5 seconds (let app initialize first)
    const timer = setTimeout(() => {
      console.log('🤖 Initializing AI Agents...');
      agentManager.startAll();
    }, 5000);

    return () => {
      clearTimeout(timer);
      agentManager.stopAll();
    };
  }, []);

  return null; // This component doesn't render anything
}