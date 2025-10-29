/**
 * AURA Brain - Autonomous AI Agent System
 * Central export point for all brain agents
 */

export { HygieneAgent } from './HygieneAgent';
export { InventoryAgent } from './InventoryAgent';
export { QualityAgent } from './QualityAgent';
export { AgentManager } from './AgentManager';
export { default as EventBus, EVENT_TYPES } from './EventBus';
export { default as AgentInitializer, useAgentManager } from './AgentInitializer';

// Re-export AgentManager as default for singleton usage
import agentManager from './AgentManager';
export default agentManager;

/**
 * Quick import examples:
 * 
 * import agentManager from '@/components/aurabrain';
 * await agentManager.runAll();
 * 
 * import { AgentManager, HygieneAgent } from '@/components/aurabrain';
 * const manager = new AgentManager();
 * await manager.initialize();
 */