
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
export { default } from './AgentManager'; // Default export for singleton usage

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
