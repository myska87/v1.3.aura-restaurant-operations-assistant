import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * 🤖 AGENT INITIALIZER
 * Ensures all AURA Brain agents are configured and ready
 */
export default function AgentInitializer() {
  useEffect(() => {
    const initializeAgents = async () => {
      try {
        const existingConfigs = await base44.entities.AgentConfig.list();
        
        const requiredAgents = [
          {
            agent_name: 'hygiene_agent',
            is_enabled: true,
            run_frequency: 'event_triggered',
            rules: [
              { rule_id: 'temp_alert', condition: 'temperature_out_of_range', action: 'create_alert', priority: 10, enabled: true },
              { rule_id: 'checklist_overdue', condition: 'checklist_overdue', action: 'send_reminder', priority: 8, enabled: true },
              { rule_id: 'compliance_low', condition: 'compliance_rate_below_75', action: 'manager_alert', priority: 7, enabled: true },
            ],
            thresholds: {
              min_compliance_rate: 75,
              critical_temp_variance: 5,
              max_overdue_hours: 2,
            },
            notification_settings: {
              notify_managers: true,
              notify_staff: false,
              notification_channel: 'both',
            },
            auto_execute: false,
          },
          {
            agent_name: 'inventory_agent',
            is_enabled: true,
            run_frequency: 'event_triggered',
            rules: [
              { rule_id: 'stock_low', condition: 'stock_below_reorder_point', action: 'suggest_order', priority: 8, enabled: true },
              { rule_id: 'stock_critical', condition: 'stock_below_25_percent', action: 'create_alert', priority: 10, enabled: true },
              { rule_id: 'expiring_soon', condition: 'shelf_life_3_days', action: 'create_alert', priority: 6, enabled: true },
            ],
            thresholds: {
              reorder_multiplier: 1.5,
              critical_stock_percentage: 25,
              expiry_warning_days: 3,
            },
            notification_settings: {
              notify_managers: true,
              notify_staff: false,
              notification_channel: 'chat',
            },
            auto_execute: false,
          },
          {
            agent_name: 'quality_agent',
            is_enabled: true,
            run_frequency: 'event_triggered',
            rules: [
              { rule_id: 'score_low', condition: 'quality_score_below_3', action: 'create_task', priority: 9, enabled: true },
              { rule_id: 'sop_delayed', condition: 'sop_completion_over_60min', action: 'send_reminder', priority: 5, enabled: true },
              { rule_id: 'excellence', condition: 'perfect_score_streak', action: 'recognition', priority: 3, enabled: true },
            ],
            thresholds: {
              min_acceptable_score: 3,
              target_avg_score: 4.0,
              sop_completion_target_minutes: 60,
            },
            notification_settings: {
              notify_managers: true,
              notify_staff: true,
              notification_channel: 'both',
            },
            auto_execute: false,
          },
        ];

        for (const agentConfig of requiredAgents) {
          const exists = existingConfigs.find(c => c.agent_name === agentConfig.agent_name);
          
          if (!exists) {
            await base44.entities.AgentConfig.create(agentConfig);
            console.log(`[AgentInitializer] Created config for ${agentConfig.agent_name}`);
          }
        }

        console.log('[AgentInitializer] All agents initialized ✅');
      } catch (error) {
        console.error('[AgentInitializer] Error:', error);
      }
    };

    initializeAgents();
  }, []);

  return null;
}