import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * AURA Brain - Agent Initializer
 * Creates default agent configurations on first load
 */
export default function AgentInitializer() {
  useEffect(() => {
    const initializeAgents = async () => {
      try {
        const configs = await base44.entities.AgentConfig.list();
        
        if (configs.length > 0) {
          console.log('[AgentInitializer] Agents already configured');
          return;
        }

        console.log('[AgentInitializer] Creating default agent configurations...');

        // Create default configurations
        const defaultConfigs = [
          {
            agent_name: 'hygiene_agent',
            is_enabled: true,
            run_frequency: 'hourly',
            rules: [
              {
                rule_id: 'overdue_form_reminder',
                condition: 'form_overdue > 2_hours',
                action: 'send_reminder',
                priority: 8,
                enabled: true,
              },
              {
                rule_id: 'critical_alert_task',
                condition: 'hygiene_alert_severity = critical',
                action: 'create_task',
                priority: 10,
                enabled: true,
              },
            ],
            thresholds: {
              compliance_rate_minimum: 80,
              alert_severity_threshold: 'high',
              overdue_hours: 2,
            },
            notification_settings: {
              notify_managers: true,
              notify_staff: true,
              notification_channel: 'both',
            },
            auto_execute: false,
          },
          {
            agent_name: 'inventory_agent',
            is_enabled: true,
            run_frequency: 'hourly',
            rules: [
              {
                rule_id: 'low_stock_order',
                condition: 'stock <= reorder_point',
                action: 'create_draft_order',
                priority: 7,
                enabled: true,
              },
              {
                rule_id: 'predict_shortage',
                condition: 'stock_trend = declining',
                action: 'alert_manager',
                priority: 6,
                enabled: true,
              },
            ],
            thresholds: {
              reorder_multiplier: 1.2,
              minimum_order_value: 50,
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
            run_frequency: 'daily',
            rules: [
              {
                rule_id: 'low_quality_training',
                condition: 'avg_quality_score < 3',
                action: 'recommend_training',
                priority: 7,
                enabled: true,
              },
              {
                rule_id: 'staff_coaching_needed',
                condition: 'staff_avg_score < 3.5',
                action: 'suggest_coaching',
                priority: 8,
                enabled: true,
              },
            ],
            thresholds: {
              quality_score_minimum: 3.0,
              staff_score_minimum: 3.5,
              minimum_checks_required: 5,
            },
            notification_settings: {
              notify_managers: true,
              notify_staff: false,
              notification_channel: 'chat',
            },
            auto_execute: false,
          },
        ];

        for (const config of defaultConfigs) {
          await base44.entities.AgentConfig.create(config);
        }

        console.log('[AgentInitializer] ✅ Default agents configured');

      } catch (error) {
        console.error('[AgentInitializer] Error:', error);
      }
    };

    initializeAgents();
  }, []);

  return null;
}