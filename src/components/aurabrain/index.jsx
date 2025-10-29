/**
 * AURA Brain - Autonomous AI Agent System
 * Central export point for all brain agents
 */

export { default as HygieneAgent } from './HygieneAgent';
export { default as InventoryAgent } from './InventoryAgent';
export { default as QualityAgent } from './QualityAgent';
export { default as AgentManager } from './AgentManager';
export { default as EventBus, EVENT_TYPES } from './EventBus';
export { default as AgentInitializer, useAgentManager } from './AgentInitializer';

/**
 * Quick import helper
 * 
 * Usage:
 * import { AgentManager, HygieneAgent, EVENT_TYPES } from '@/components/aurabrain';
 * 
 * const result = await AgentManager.runAll();
 * const hygieneStatus = HygieneAgent.getStatus();
 */