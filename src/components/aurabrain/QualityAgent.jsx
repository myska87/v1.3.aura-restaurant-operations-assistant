import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * AURA Brain - Quality Agent
 * Monitors quality scores and identifies training needs
 * Creates coaching sessions and SOP recommendations
 */
export default function QualityAgent() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const runAgent = async () => {
      try {
        // Check if agent is enabled
        const configs = await base44.entities.AgentConfig.filter({ agent_name: 'quality_agent' });
        const config = configs[0];
        
        if (!config || !config.is_enabled) {
          console.log('[QualityAgent] Agent is disabled');
          return;
        }

        // 1️⃣ Analyze recent quality records
        const records = await base44.entities.QualityRecord.list('-created_date', 100);
        
        // Find areas with consistently low scores
        const areaScores = {};
        for (const record of records) {
          const key = `${record.area}-${record.category}`;
          if (!areaScores[key]) {
            areaScores[key] = {
              area: record.area,
              category: record.category,
              scores: [],
              records: [],
            };
          }
          areaScores[key].scores.push(record.score);
          areaScores[key].records.push(record);
        }

        // 2️⃣ Identify problem areas (avg score < 3)
        const problemAreas = [];
        for (const [key, data] of Object.entries(areaScores)) {
          const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
          if (avgScore < 3 && data.scores.length >= 3) {
            problemAreas.push({ ...data, avgScore, key });
          }
        }

        // 3️⃣ Create recommendations for problem areas
        for (const problem of problemAreas.slice(0, 5)) {
          // Find relevant SOPs
          const sops = await base44.entities.SOPDocument.filter({
            category: problem.area === 'kitchen' ? 'kitchen' : 'service',
            status: 'active',
          });

          let recommendation = `Quality scores are low in ${problem.area} - ${problem.category} (${problem.avgScore.toFixed(1)}/5). `;
          
          if (sops.length > 0) {
            recommendation += `Recommend refresher training on relevant SOPs.`;
          } else {
            recommendation += `Consider creating SOP for this area.`;
          }

          await base44.entities.AgentLog.create({
            agent_name: 'quality_agent',
            action_type: 'recommendation_made',
            action_description: recommendation,
            trigger_event: 'low_quality_score',
            related_entity: 'QualityRecord',
            decision_reasoning: `Average score ${problem.avgScore.toFixed(1)}/5 across ${problem.scores.length} recent checks`,
            confidence_score: 0.85,
            severity: 'medium',
            status: 'pending',
            notification_sent: true,
            success: true,
            decision_data: {
              area: problem.area,
              category: problem.category,
              avg_score: problem.avgScore,
              check_count: problem.scores.length,
            },
          });

          // Create event
          await base44.entities.Event.create({
            source_module: 'ai',
            event_type: 'quality_check_low',
            title: '⭐ Quality Improvement Needed',
            message: recommendation,
            severity: 'warning',
            recipient_roles: ['manager', 'owner'],
            linked_entity_type: 'QualityRecord',
            action_url: '/quality-dashboard',
          });
        }

        // 4️⃣ Identify staff needing coaching
        const allStaff = await base44.entities.User.list();
        for (const staff of allStaff) {
          const staffQualityRecords = records.filter(r => r.checked_by_email === staff.email);
          
          if (staffQualityRecords.length >= 5) {
            const avgStaffScore = staffQualityRecords.reduce((sum, r) => sum + r.score, 0) / staffQualityRecords.length;
            
            if (avgStaffScore < 3.5) {
              await base44.entities.AgentLog.create({
                agent_name: 'quality_agent',
                action_type: 'recommendation_made',
                action_description: `${staff.full_name} needs coaching - average quality score ${avgStaffScore.toFixed(1)}/5`,
                trigger_event: 'low_staff_performance',
                decision_reasoning: `Staff member has ${staffQualityRecords.length} quality checks averaging ${avgStaffScore.toFixed(1)}/5`,
                confidence_score: 0.9,
                severity: 'medium',
                status: 'pending',
                notification_sent: true,
                success: true,
              });
            }
          }
        }

        console.log(`[QualityAgent] Completed run - identified ${problemAreas.length} problem areas`);

      } catch (error) {
        console.error('[QualityAgent] Error:', error);
        
        try {
          await base44.entities.AgentLog.create({
            agent_name: 'quality_agent',
            action_type: 'analysis',
            action_description: 'Agent run failed',
            trigger_event: 'scheduled_run',
            status: 'failed',
            success: false,
            error_message: error.message,
          });
        } catch (logError) {
          console.error('[QualityAgent] Failed to log error:', logError);
        }
      }
    };

    // Run on mount
    runAgent();

    // Run every 2 hours
    const interval = setInterval(runAgent, 2 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}