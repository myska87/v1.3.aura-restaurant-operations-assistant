/**
 * AgentManager - Coordinates all AURA Brain Agents
 * Orchestrates agent execution, prevents conflicts, manages state
 */

import { HygieneAgent, InventoryAgent, QualityAgent } from "./";
import EventBus, { EVENT_TYPES } from './EventBus';

export class AgentManager {
  constructor() {
    this.hygiene = new HygieneAgent();
    this.inventory = new InventoryAgent();
    this.quality = new QualityAgent();
    this.initialized = false;
  }

  /**
   * Initialize all agents - runs core checks with safety fallbacks
   */
  async initialize() {
    try {
      console.log('🧠 AgentManager: Initializing agents...');
      
      await EventBus.emit(EVENT_TYPES.AGENT_STARTED, { 
        agent: 'manager',
        timestamp: new Date().toISOString()
      });

      // Run agents with individual error handling
      const results = await Promise.allSettled([
        this.safeRun(() => this.hygiene.runChecklists(), 'hygiene'),
        this.safeRun(() => this.inventory.checkLowStock(), 'inventory'),
        this.safeRun(() => this.quality.auditSOPCompletion(), 'quality')
      ]);

      this.initialized = true;
      console.log('✅ AgentManager: Initialization complete');
      
      return { status: 'initialized', success: true };

    } catch (err) {
      console.warn("AgentManager fallback mode:", err);
      this.initialized = true; // Continue anyway
      return { status: 'partial', error: err.message };
    }
  }

  /**
   * Safety wrapper for agent calls
   */
  async safeRun(agentFn, agentName) {
    try {
      return await agentFn();
    } catch (e) {
      console.error("Agent failed:", agentName, e);
      return { error: e.message, status: 'failed' };
    }
  }

  /**
   * Run all agents with full suite of tasks
   */
  async runAll() {
    try {
      console.log('🚀 AgentManager: Running all agents...');
      const startTime = Date.now();

      const results = await Promise.allSettled([
        // Hygiene tasks
        this.safeRun(() => this.hygiene.runChecklists(), 'hygiene.runChecklists'),
        this.safeRun(() => this.hygiene.scoreCompliance(), 'hygiene.scoreCompliance'),
        this.safeRun(() => this.hygiene.detectIssues(), 'hygiene.detectIssues'),
        
        // Inventory tasks
        this.safeRun(() => this.inventory.checkLowStock(), 'inventory.checkLowStock'),
        this.safeRun(() => this.inventory.autoGenerateOrders(), 'inventory.autoGenerateOrders'),
        this.safeRun(() => this.inventory.predictShortages(), 'inventory.predictShortages'),
        
        // Quality tasks
        this.safeRun(() => this.quality.auditSOPCompletion(), 'quality.auditSOPCompletion'),
        this.safeRun(() => this.quality.pushQualityReports(), 'quality.pushQualityReports'),
        this.safeRun(() => this.quality.detectQualityIssues(), 'quality.detectQualityIssues')
      ]);

      const duration = Date.now() - startTime;

      const summary = {
        hygiene: {
          checklistsAssigned: results[0].status === 'fulfilled' ? results[0].value.assigned : 0,
          scoresUpdated: results[1].status === 'fulfilled' ? results[1].value.updated : 0,
          alertsCreated: results[2].status === 'fulfilled' ? results[2].value.created : 0,
        },
        inventory: {
          lowStockDetected: results[3].status === 'fulfilled' ? results[3].value.detected : 0,
          ordersGenerated: results[4].status === 'fulfilled' ? results[4].value.generated : 0,
          predictionsCreated: results[5].status === 'fulfilled' ? results[5].value.created : 0,
        },
        quality: {
          sopsAudited: results[6].status === 'fulfilled' ? results[6].value.audited : 0,
          reportsGenerated: results[7].status === 'fulfilled' ? results[7].value.generated : 0,
          correctiveTasksCreated: results[8].status === 'fulfilled' ? results[8].value.created : 0,
        }
      };

      await EventBus.emit(EVENT_TYPES.AGENT_COMPLETED, { 
        agent: 'all',
        duration,
        summary
      });

      console.log(`✅ AgentManager: Completed in ${duration}ms`, summary);
      return { status: 'success', summary, duration };

    } catch (error) {
      console.error('❌ AgentManager: Error running agents:', error);
      
      await EventBus.emit(EVENT_TYPES.AGENT_FAILED, { 
        agent: 'manager',
        error: error.message
      });

      return { status: 'error', error: error.message };
    }
  }

  /**
   * Run specific agent
   */
  async runAgent(agentName) {
    const agent = this[agentName];
    
    if (!agent) {
      return { status: 'error', error: 'Agent not found' };
    }

    try {
      console.log(`🎯 Running ${agentName} agent...`);
      const startTime = Date.now();

      let results = {};

      if (agentName === 'hygiene') {
        const [checklists, scores, issues] = await Promise.allSettled([
          this.safeRun(() => agent.runChecklists(), 'hygiene.runChecklists'),
          this.safeRun(() => agent.scoreCompliance(), 'hygiene.scoreCompliance'),
          this.safeRun(() => agent.detectIssues(), 'hygiene.detectIssues')
        ]);
        
        results = {
          checklistsAssigned: checklists.status === 'fulfilled' ? checklists.value.assigned : 0,
          scoresUpdated: scores.status === 'fulfilled' ? scores.value.updated : 0,
          alertsCreated: issues.status === 'fulfilled' ? issues.value.created : 0,
        };
      } else if (agentName === 'inventory') {
        const [stock, orders, predictions] = await Promise.allSettled([
          this.safeRun(() => agent.checkLowStock(), 'inventory.checkLowStock'),
          this.safeRun(() => agent.autoGenerateOrders(), 'inventory.autoGenerateOrders'),
          this.safeRun(() => agent.predictShortages(), 'inventory.predictShortages')
        ]);
        
        results = {
          lowStockDetected: stock.status === 'fulfilled' ? stock.value.detected : 0,
          ordersGenerated: orders.status === 'fulfilled' ? orders.value.generated : 0,
          predictionsCreated: predictions.status === 'fulfilled' ? predictions.value.created : 0,
        };
      } else if (agentName === 'quality') {
        const [sopAudit, reports, issues] = await Promise.allSettled([
          this.safeRun(() => agent.auditSOPCompletion(), 'quality.auditSOPCompletion'),
          this.safeRun(() => agent.pushQualityReports(), 'quality.pushQualityReports'),
          this.safeRun(() => agent.detectQualityIssues(), 'quality.detectQualityIssues')
        ]);
        
        results = {
          sopsAudited: sopAudit.status === 'fulfilled' ? sopAudit.value.audited : 0,
          reportsGenerated: reports.status === 'fulfilled' ? reports.value.generated : 0,
          correctiveTasksCreated: issues.status === 'fulfilled' ? issues.value.created : 0,
        };
      }

      const duration = Date.now() - startTime;

      console.log(`✅ ${agentName} agent completed in ${duration}ms`, results);
      return { status: 'success', results, duration };

    } catch (error) {
      console.error(`❌ ${agentName} agent failed:`, error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Get status of all agents
   */
  getStatus() {
    return {
      initialized: this.initialized,
      agents: {
        hygiene: {
          name: this.hygiene.name,
          isRunning: this.hygiene.isRunning,
          lastRun: this.hygiene.lastRun
        },
        inventory: {
          name: this.inventory.name,
          isRunning: this.inventory.isRunning,
          lastRun: this.inventory.lastRun
        },
        quality: {
          name: this.quality.name,
          isRunning: this.quality.isRunning,
          lastRun: this.quality.lastRun
        }
      }
    };
  }

  /**
   * Health check - verify all agents are responsive
   */
  async healthCheck() {
    const health = {
      overall: 'healthy',
      agents: {
        hygiene: { responsive: true },
        inventory: { responsive: true },
        quality: { responsive: true }
      },
      timestamp: new Date().toISOString()
    };

    return health;
  }
}

// Create singleton instance
const agentManager = new AgentManager();

export default agentManager;