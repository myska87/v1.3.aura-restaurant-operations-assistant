
import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * AURA Brain - Quality Agent
 * Monitors quality scores and identifies training needs
 * Creates coaching sessions and SOP recommendations
 */
export default function QualityAgent() {
  const queryClient = useQueryClient();

  const processQualityData = async (qualityRecords, sopSignatures) => {
    try {
      // Calculate quality metrics
      const totalChecks = qualityRecords.length;
      const avgScore = totalChecks > 0
        ? qualityRecords.reduce((sum, r) => sum + r.score, 0) / totalChecks
        : 0;

      const lowScoreChecks = qualityRecords.filter(r => r.score < 3);
      const excellentChecks = qualityRecords.filter(r => r.score === 5);

      // SOP adherence rate
      const totalSOPs = sopSignatures.length;
      const onTimeSOPs = sopSignatures.filter(s => {
        // Consider on-time if signed within reasonable timeframe (e.g., within 60 minutes)
        return s.completion_time_minutes && s.completion_time_minutes <= 60;
      }).length;
      const sopAdherence = totalSOPs > 0 ? (onTimeSOPs / totalSOPs) * 100 : 100;

      // 1. Low Quality Alert
      if (lowScoreChecks.length >= 3) {
        await base44.entities.AgentLog.create({
          agent_name: 'quality_agent',
          action_type: 'alert_triggered',
          action_description: `⚠️ ${lowScoreChecks.length} quality checks scored below 3/5`,
          trigger_event: 'quality_monitoring',
          related_entity: 'QualityRecord',
          decision_data: {
            low_score_count: lowScoreChecks.length,
            areas_affected: [...new Set(lowScoreChecks.map(r => r.area))],
            categories: [...new Set(lowScoreChecks.map(r => r.category))],
          },
          decision_reasoning: `Multiple low quality scores detected. Areas needing attention: ${[...new Set(lowScoreChecks.map(r => r.area))].join(', ')}. Recommend targeted training and process review.`,
          confidence_score: 0.85,
          severity: lowScoreChecks.length >= 5 ? 'high' : 'medium',
          status: 'pending',
        });
      }

      // 2. Excellence Recognition
      if (excellentChecks.length >= 5) {
        const topPerformers = excellentChecks.reduce((acc, r) => {
          acc[r.checked_by_email] = (acc[r.checked_by_email] || 0) + 1;
          return acc;
        }, {});

        const topPerformer = Object.keys(topPerformers).length > 0
            ? Object.entries(topPerformers).sort((a, b) => b[1] - a[1])[0]
            : null;

        if (topPerformer) {
          await base44.entities.AgentLog.create({
            agent_name: 'quality_agent',
            action_type: 'recommendation_made',
            action_description: `⭐ Excellent quality performance detected`,
            trigger_event: 'performance_recognition',
            decision_data: {
              excellent_count: excellentChecks.length,
              top_performer: topPerformer[0],
              perfect_scores: topPerformer[1],
            },
            decision_reasoning: `${topPerformer[1]} perfect quality scores. Recommend recognition or reward for consistent excellence.`,
            confidence_score: 0.9,
            severity: 'info',
            status: 'completed',
          });
        }
      }

      // 3. Overall Quality Analysis
      let qualityTier = 'N/A'; // Default value if totalChecks is less than 10
      if (totalChecks >= 10) {
        qualityTier = avgScore >= 4.5 ? 'Exceptional' :
                           avgScore >= 4.0 ? 'Excellent' :
                           avgScore >= 3.5 ? 'Good' :
                           avgScore >= 3.0 ? 'Satisfactory' : 'Needs Improvement';

        await base44.entities.AgentLog.create({
          agent_name: 'quality_agent',
          action_type: 'analysis',
          action_description: `📊 Quality score: ${avgScore.toFixed(1)}/5 - ${qualityTier}`,
          trigger_event: 'daily_analysis',
          decision_data: {
            total_checks: totalChecks,
            average_score: avgScore,
            low_scores: lowScoreChecks.length,
            excellent_scores: excellentChecks.length,
            sop_adherence: sopAdherence,
          },
          decision_reasoning: avgScore >= 4.0
            ? `Strong quality performance. ${excellentChecks.length} perfect scores out of ${totalChecks} checks. SOP adherence at ${sopAdherence.toFixed(0)}%.`
            : `Quality needs attention. Focus areas: ${[...new Set(lowScoreChecks.map(r => r.area))].slice(0, 3).join(', ')}.`,
          confidence_score: totalChecks >= 20 ? 0.95 : 0.75,
          severity: avgScore >= 4.0 ? 'info' : 'medium',
          status: 'completed',
        });
      }

      // 5. SOP Adherence Alert
      if (sopAdherence < 80 && totalSOPs >= 5) {
        await base44.entities.AgentLog.create({
          agent_name: 'quality_agent',
          action_type: 'recommendation_made',
          action_description: `📋 SOP adherence below target: ${sopAdherence.toFixed(0)}%`,
          trigger_event: 'sop_monitoring',
          decision_data: {
            total_sops: totalSOPs,
            on_time_completions: onTimeSOPs,
            adherence_rate: sopAdherence,
          },
          decision_reasoning: `Staff taking longer than expected to complete SOPs. Recommend reviewing SOP clarity and providing additional training support.`,
          confidence_score: 0.8,
          severity: 'medium',
          status: 'pending',
        });
      }

      console.log('[QualityAgent] Analysis complete:', {
        avgScore,
        qualityTier,
        sopAdherence,
      });

    } catch (error) {
      console.error('[QualityAgent] Error processing data:', error);
    }
  };

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
        
        // Fetch SOP completions for adherence checks (assuming 'SOPCompletion' is the entity)
        const sopSignatures = await base44.entities.SOPCompletion.list('-completion_date', 100); 

        // Call the new processQualityData function for overall analysis and alerts
        await processQualityData(records, sopSignatures);

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
