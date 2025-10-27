/**
 * AURA AI Agent Core
 * Autonomous monitoring and action system
 */

import { base44 } from '@/api/base44Client';

export class AIAgentCore {
  constructor(agentName, config = {}) {
    this.agentName = agentName;
    this.config = {
      enabled: true,
      checkInterval: 60000, // 1 minute
      actionThreshold: 3,
      ...config,
    };
    this.isRunning = false;
    this.intervalId = null;
  }

  async start() {
    if (this.isRunning) return;
    
    console.log(`🤖 [${this.agentName}] Agent started`);
    this.isRunning = true;
    
    // Run immediately
    await this.execute();
    
    // Set interval
    this.intervalId = setInterval(() => {
      this.execute();
    }, this.config.checkInterval);
  }

  async stop() {
    if (!this.isRunning) return;
    
    console.log(`🤖 [${this.agentName}] Agent stopped`);
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async execute() {
    // Override in subclass
    throw new Error('execute() must be implemented');
  }

  async logAction(action, data) {
    try {
      await base44.entities.AgentLog.create({
        agent_name: this.agentName,
        action_type: action,
        data: data,
        timestamp: new Date().toISOString(),
        status: 'completed',
      });
    } catch (error) {
      console.error(`❌ [${this.agentName}] Failed to log action:`, error);
    }
  }

  async createInsight(title, description, priority, actionable) {
    try {
      await base44.entities.AgentInsight.create({
        agent_name: this.agentName,
        insight_title: title,
        insight_description: description,
        priority: priority,
        is_actionable: actionable,
        created_at: new Date().toISOString(),
        status: 'new',
      });
    } catch (error) {
      console.error(`❌ [${this.agentName}] Failed to create insight:`, error);
    }
  }
}

/**
 * Hygiene Monitoring Agent
 * Monitors hygiene records and alerts on issues
 */
export class HygieneAgent extends AIAgentCore {
  constructor() {
    super('HygieneAgent', {
      checkInterval: 300000, // 5 minutes
    });
  }

  async execute() {
    try {
      // Check for missing temperature logs
      const today = new Date().toISOString().split('T')[0];
      const records = await base44.entities.HygieneRecord.filter({
        created_date: today,
      });

      // Check for critical temperature failures
      const criticalFailures = records.filter(r => 
        r.is_critical && !r.corrective_action
      );

      if (criticalFailures.length > 0) {
        await this.createInsight(
          '🚨 Critical Temperature Failures',
          `${criticalFailures.length} critical temperature failure(s) require immediate attention`,
          'critical',
          true
        );

        // Auto-create corrective tasks
        for (const failure of criticalFailures) {
          await base44.entities.StaffTask.create({
            task_name: `URGENT: Address Temperature Failure - ${failure.item_name}`,
            description: `Critical temperature reading detected. Immediate corrective action required.`,
            category: 'hygiene',
            assigned_to: failure.recorded_by_email,
            due_date: new Date().toISOString(),
            status: 'pending',
            priority: 'urgent',
          });
        }

        await this.logAction('critical_alert_sent', {
          failures: criticalFailures.length,
        });
      }

      // Check for missing records
      const expectedRecordTypes = ['delivery', 'storage_fridge', 'cooking'];
      const todayRecordTypes = new Set(records.map(r => r.record_type));
      const missingTypes = expectedRecordTypes.filter(t => !todayRecordTypes.has(t));

      if (missingTypes.length > 0) {
        await this.createInsight(
          '⚠️ Missing Hygiene Records',
          `Missing required records: ${missingTypes.join(', ')}`,
          'high',
          true
        );
      }

    } catch (error) {
      console.error('❌ [HygieneAgent] Execution error:', error);
    }
  }
}

/**
 * Inventory Prediction Agent
 * Predicts stock needs based on usage trends
 */
export class InventoryAgent extends AIAgentCore {
  constructor() {
    super('InventoryAgent', {
      checkInterval: 3600000, // 1 hour
    });
  }

  async execute() {
    try {
      const ingredients = await base44.entities.Ingredient.list();
      const lowStockItems = ingredients.filter(ing => 
        ing.current_stock <= ing.reorder_point && ing.auto_order_enabled
      );

      if (lowStockItems.length > 0) {
        await this.createInsight(
          '📦 Low Stock Alert',
          `${lowStockItems.length} item(s) need reordering: ${lowStockItems.map(i => i.name).join(', ')}`,
          'medium',
          true
        );

        await this.logAction('low_stock_detected', {
          items: lowStockItems.length,
        });
      }

      // Predict next week's needs (simplified)
      const highUsageItems = ingredients.filter(ing => 
        ing.current_stock < (ing.par_level * 0.5)
      );

      if (highUsageItems.length > 0) {
        await this.createInsight(
          '📈 High Usage Trend',
          `${highUsageItems.length} item(s) showing high usage. Consider increasing par levels.`,
          'low',
          false
        );
      }

    } catch (error) {
      console.error('❌ [InventoryAgent] Execution error:', error);
    }
  }
}

/**
 * Quality Monitoring Agent
 * Analyzes quality scores and recommends improvements
 */
export class QualityAgent extends AIAgentCore {
  constructor() {
    super('QualityAgent', {
      checkInterval: 1800000, // 30 minutes
    });
  }

  async execute() {
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const recentRecords = await base44.entities.QualityRecord.list('-created_date', 100);
      const weekRecords = recentRecords.filter(r => 
        new Date(r.created_date) >= weekAgo
      );

      if (weekRecords.length === 0) return;

      // Calculate average score
      const avgScore = weekRecords.reduce((sum, r) => sum + r.score, 0) / weekRecords.length;

      // Find recurring low scores
      const lowScoreAreas = {};
      weekRecords.filter(r => r.score < 3).forEach(r => {
        const key = `${r.category}_${r.area}`;
        lowScoreAreas[key] = (lowScoreAreas[key] || 0) + 1;
      });

      const recurringIssues = Object.entries(lowScoreAreas).filter(([_, count]) => count >= 3);

      if (recurringIssues.length > 0) {
        const issueList = recurringIssues.map(([key, count]) => 
          `${key.replace('_', ' ')}: ${count} incidents`
        ).join(', ');

        await this.createInsight(
          '⚠️ Recurring Quality Issues',
          `Repeated low scores detected in: ${issueList}. Training may be needed.`,
          'high',
          true
        );

        // Create training task for manager
        const managers = await base44.entities.User.filter({ position: 'manager' });
        if (managers.length > 0) {
          await base44.entities.StaffTask.create({
            task_name: 'Review Quality Issues & Schedule Training',
            description: `Recurring quality issues detected: ${issueList}`,
            category: 'training',
            assigned_to: managers[0].email,
            due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            status: 'pending',
            priority: 'high',
          });
        }
      }

      // Positive trend detection
      if (avgScore >= 4.5) {
        await this.createInsight(
          '⭐ Excellent Quality Scores',
          `Average quality score this week: ${avgScore.toFixed(1)}/5. Great work!`,
          'low',
          false
        );
      }

      await this.logAction('quality_analysis_completed', {
        avgScore: avgScore.toFixed(2),
        totalRecords: weekRecords.length,
        recurringIssues: recurringIssues.length,
      });

    } catch (error) {
      console.error('❌ [QualityAgent] Execution error:', error);
    }
  }
}

// Agent Manager
export class AIAgentManager {
  constructor() {
    this.agents = new Map();
  }

  registerAgent(agent) {
    this.agents.set(agent.agentName, agent);
  }

  async startAll() {
    console.log('🤖 Starting all AI agents...');
    for (const agent of this.agents.values()) {
      await agent.start();
    }
  }

  async stopAll() {
    console.log('🛑 Stopping all AI agents...');
    for (const agent of this.agents.values()) {
      await agent.stop();
    }
  }

  getAgent(name) {
    return this.agents.get(name);
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }
}

// Global instance
export const agentManager = new AIAgentManager();

// Initialize agents
agentManager.registerAgent(new HygieneAgent());
agentManager.registerAgent(new InventoryAgent());
agentManager.registerAgent(new QualityAgent());