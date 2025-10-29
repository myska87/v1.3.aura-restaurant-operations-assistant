/**
 * AgentManager - Coordinates all AURA Brain Agents
 * Orchestrates agent execution, prevents conflicts, manages state
 */

import HygieneAgent from './HygieneAgent';
import InventoryAgent from './InventoryAgent';
import QualityAgent from './QualityAgent';
import EventBus, { EVENT_TYPES } from './EventBus';
import { base44 } from '@/api/base44Client';

class AgentManagerClass {
  constructor() {
    this.agents = {
      hygiene: HygieneAgent,
      inventory: InventoryAgent,
      quality: QualityAgent
    };
    
    this.runHistory = [];
    this.isGlobalRun = false;
    this.config = {
      enabled: true,
      runInterval: 60 * 60 * 1000, // 1 hour default
      autoRun: false,
      parallelExecution: false
    };
  }

  /**
   * Initialize agent manager and load config from database
   */
  async initialize() {
    try {
      console.log('🧠 AgentManager: Initializing...');

      // Load agent configs from database
      const configs = await base44.entities.AgentConfig.list();
      
      configs.forEach(config => {
        if (config.agent_name === 'hygiene_agent' && this.agents.hygiene) {
          // Apply config settings if needed
          console.log('✅ HygieneAgent config loaded');
        }
        if (config.agent_name === 'inventory_agent' && this.agents.inventory) {
          console.log('✅ InventoryAgent config loaded');
        }
        if (config.agent_name === 'quality_agent' && this.agents.quality) {
          console.log('✅ QualityAgent config loaded');
        }
      });

      // Subscribe to system events
      this.setupEventListeners();

      console.log('✅ AgentManager: Initialized successfully');
      return { status: 'initialized', agentCount: Object.keys(this.agents).length };

    } catch (error) {
      console.error('❌ AgentManager: Initialization failed:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Setup event listeners for inter-agent communication
   */
  setupEventListeners() {
    // Listen for critical inventory events
    EventBus.on(EVENT_TYPES.STOCK_CRITICAL, async (data) => {
      console.log('🚨 Critical stock detected:', data.ingredient_name);
      // Could trigger immediate manager notification
    });

    // Listen for hygiene alerts
    EventBus.on(EVENT_TYPES.HYGIENE_ALERT, async (data) => {
      console.log('🚨 Hygiene alert:', data.item, data.location);
      // Could trigger quality check task
    });

    // Listen for quality check failures
    EventBus.on(EVENT_TYPES.QUALITY_CHECK_FAILED, async (data) => {
      console.log('⚠️ Quality check failed:', data.check_title);
      // Could trigger SOP review
    });
  }

  /**
   * Run all agents sequentially
   */
  async runAll() {
    if (this.isGlobalRun) {
      console.log('AgentManager: Global run already in progress');
      return { status: 'skipped', reason: 'already_running' };
    }

    if (!this.config.enabled) {
      console.log('AgentManager: Agents are disabled');
      return { status: 'disabled' };
    }

    this.isGlobalRun = true;
    const startTime = Date.now();
    const results = {};

    try {
      console.log('🚀 AgentManager: Starting all agents...');

      if (this.config.parallelExecution) {
        // Run agents in parallel
        const [hygieneResult, inventoryResult, qualityResult] = await Promise.allSettled([
          this.agents.hygiene.run(),
          this.agents.inventory.run(),
          this.agents.quality.run()
        ]);

        results.hygiene = hygieneResult.status === 'fulfilled' ? hygieneResult.value : { status: 'error', error: hygieneResult.reason };
        results.inventory = inventoryResult.status === 'fulfilled' ? inventoryResult.value : { status: 'error', error: inventoryResult.reason };
        results.quality = qualityResult.status === 'fulfilled' ? qualityResult.value : { status: 'error', error: qualityResult.reason };

      } else {
        // Run agents sequentially (safer)
        results.hygiene = await this.agents.hygiene.run();
        results.inventory = await this.agents.inventory.run();
        results.quality = await this.agents.quality.run();
      }

      const duration = Date.now() - startTime;
      
      // Add to history
      this.runHistory.push({
        timestamp: new Date().toISOString(),
        duration,
        results,
        success: true
      });

      // Keep only last 50 runs
      if (this.runHistory.length > 50) {
        this.runHistory.shift();
      }

      console.log(`✅ AgentManager: All agents completed in ${duration}ms`);
      return { status: 'success', results, duration };

    } catch (error) {
      console.error('❌ AgentManager: Run failed:', error);
      
      this.runHistory.push({
        timestamp: new Date().toISOString(),
        results,
        success: false,
        error: error.message
      });

      return { status: 'error', error: error.message, results };
    } finally {
      this.isGlobalRun = false;
    }
  }

  /**
   * Run a specific agent
   */
  async runAgent(agentName) {
    const agent = this.agents[agentName];
    
    if (!agent) {
      console.error(`Agent ${agentName} not found`);
      return { status: 'error', error: 'Agent not found' };
    }

    if (!this.config.enabled) {
      return { status: 'disabled' };
    }

    console.log(`🎯 AgentManager: Running ${agentName} agent...`);
    const result = await agent.run();
    
    return result;
  }

  /**
   * Get status of all agents
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      isRunning: this.isGlobalRun,
      agents: {
        hygiene: this.agents.hygiene.getStatus(),
        inventory: this.agents.inventory.getStatus(),
        quality: this.agents.quality.getStatus()
      },
      lastRun: this.runHistory.length > 0 
        ? this.runHistory[this.runHistory.length - 1].timestamp 
        : null,
      totalRuns: this.runHistory.length
    };
  }

  /**
   * Get run history
   */
  getHistory(limit = 10) {
    return this.runHistory.slice(-limit).reverse();
  }

  /**
   * Enable/disable all agents
   */
  setEnabled(enabled) {
    this.config.enabled = enabled;
    console.log(`AgentManager: Agents ${enabled ? 'enabled' : 'disabled'}`);
    return { enabled: this.config.enabled };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('AgentManager: Config updated', this.config);
    return this.config;
  }

  /**
   * Emergency stop all agents
   */
  async emergencyStop() {
    console.log('🛑 AgentManager: EMERGENCY STOP');
    this.config.enabled = false;
    this.isGlobalRun = false;
    
    // Agents will naturally stop on their next check
    return { status: 'stopped', timestamp: new Date().toISOString() };
  }

  /**
   * Health check - verify all agents are responsive
   */
  async healthCheck() {
    const health = {
      overall: 'healthy',
      agents: {},
      timestamp: new Date().toISOString()
    };

    try {
      for (const [name, agent] of Object.entries(this.agents)) {
        const status = agent.getStatus();
        health.agents[name] = {
          responsive: true,
          isRunning: status.isRunning,
          lastRun: status.lastRun
        };
      }

      // Check if any agent hasn't run in last 24 hours (warning)
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      for (const name in health.agents) {
        const agent = health.agents[name];
        if (agent.lastRun && new Date(agent.lastRun).getTime() < dayAgo) {
          health.overall = 'warning';
          agent.warning = 'No run in 24 hours';
        }
      }

    } catch (error) {
      health.overall = 'error';
      health.error = error.message;
    }

    return health;
  }
}

// Create singleton instance
const AgentManager = new AgentManagerClass();

export default AgentManager;

/**
 * Auto-initialize on import (safe)
 */
if (typeof window !== 'undefined') {
  // Only in browser environment
  AgentManager.initialize().catch(err => {
    console.warn('AgentManager: Silent initialization warning:', err.message);
  });
}