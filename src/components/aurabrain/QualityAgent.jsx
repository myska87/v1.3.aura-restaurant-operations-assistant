/**
 * QualityAgent - Autonomous Quality Monitoring & SOP Compliance
 * Audits SOP completion, tracks quality scores, sends alerts
 */

import { base44 } from '@/api/base44Client';
import EventBus, { EVENT_TYPES } from './EventBus';

class QualityAgentClass {
  constructor() {
    this.name = 'quality_agent';
    this.isRunning = false;
    this.lastRun = null;
  }

  /**
   * Main run cycle
   */
  async run() {
    if (this.isRunning) {
      console.log('QualityAgent: Already running, skipping...');
      return { status: 'skipped', reason: 'already_running' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const results = {
      sopsAudited: 0,
      reportsGenerated: 0,
      alertsCreated: 0,
      errors: []
    };

    try {
      console.log('🧠 QualityAgent: Starting run...');
      
      await EventBus.emit(EVENT_TYPES.AGENT_STARTED, { 
        agent: this.name,
        timestamp: new Date().toISOString()
      });

      // 1. Audit SOP completion
      const sopResult = await this.auditSOPCompletion();
      results.sopsAudited = sopResult.audited;

      // 2. Generate quality reports
      const reportResult = await this.pushQualityReports();
      results.reportsGenerated = reportResult.generated;

      // 3. Detect quality issues
      const alertResult = await this.detectQualityIssues();
      results.alertsCreated = alertResult.created;

      // 4. Log agent action
      await this.logAction('auto_run', 'completed', results);

      const duration = Date.now() - startTime;
      console.log(`✅ QualityAgent: Completed in ${duration}ms`, results);

      await EventBus.emit(EVENT_TYPES.AGENT_COMPLETED, { 
        agent: this.name,
        duration,
        results
      });

      this.lastRun = new Date().toISOString();
      return { status: 'success', results, duration };

    } catch (error) {
      console.error('❌ QualityAgent: Run failed:', error);
      results.errors.push(error.message);
      
      await this.logAction('auto_run', 'failed', { error: error.message });
      
      await EventBus.emit(EVENT_TYPES.AGENT_FAILED, { 
        agent: this.name,
        error: error.message
      });

      return { status: 'error', error: error.message, results };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Audit SOP completion rates
   */
  async auditSOPCompletion() {
    try {
      const today = new Date();
      const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last30DaysStr = last30Days.toISOString().split('T')[0];

      // Get active SOPs
      const sops = await base44.entities.SOPDocument.filter({
        status: 'active'
      }, '-created_date', 100);

      // Get certifications
      const certifications = await base44.entities.SOPCertification.filter({
        assigned_date: { $gte: last30DaysStr }
      }, '-assigned_date', 200);

      let audited = 0;

      for (const sop of sops) {
        if (!sop.is_mandatory) continue;

        const sopCerts = certifications.filter(c => c.sop_id === sop.id);
        const overdueCerts = sopCerts.filter(c => 
          c.status === 'overdue' || 
          (c.status === 'pending' && new Date(c.assigned_date) < last30Days)
        );

        if (overdueCerts.length > 0) {
          // Create events for overdue SOPs
          for (const cert of overdueCerts.slice(0, 5)) { // Limit to 5 per SOP
            await EventBus.emit(EVENT_TYPES.SOP_MISSED, {
              sop_id: sop.id,
              sop_title: sop.title,
              staff_email: cert.staff_email,
              staff_name: cert.staff_name,
              assigned_date: cert.assigned_date
            });
          }
        }

        audited++;
      }

      console.log(`📚 QualityAgent: Audited ${audited} SOPs`);
      return { audited };

    } catch (error) {
      console.error('QualityAgent: Error in auditSOPCompletion:', error);
      return { audited: 0, error: error.message };
    }
  }

  /**
   * Generate quality reports and alerts
   */
  async pushQualityReports() {
    try {
      const today = new Date();
      const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last7DaysStr = last7Days.toISOString().split('T')[0];

      // Get recent quality records
      const records = await base44.entities.QualityRecord.filter({
        created_date: { $gte: last7DaysStr }
      }, '-created_date', 100);

      if (records.length === 0) {
        return { generated: 0 };
      }

      // Calculate overall quality metrics
      const avgScore = records.reduce((sum, r) => sum + r.score, 0) / records.length;
      const lowScoreCount = records.filter(r => r.score < 3).length;
      const excellentCount = records.filter(r => r.score === 5).length;

      // Group by area
      const areaScores = {};
      records.forEach(record => {
        if (!areaScores[record.area]) {
          areaScores[record.area] = { total: 0, sum: 0, count: 0 };
        }
        areaScores[record.area].sum += record.score;
        areaScores[record.area].count++;
        areaScores[record.area].total = areaScores[record.area].sum / areaScores[record.area].count;
      });

      // Create quality score records
      let generated = 0;

      for (const area in areaScores) {
        const data = areaScores[area];
        
        await base44.entities.QualityScore.create({
          period_start: last7DaysStr,
          period_end: today.toISOString().split('T')[0],
          area: area,
          category: 'overall',
          average_score: parseFloat(data.total.toFixed(2)),
          total_checks: data.count,
          excellent_count: records.filter(r => r.area === area && r.score === 5).length,
          good_count: records.filter(r => r.area === area && r.score === 4).length,
          needs_improvement_count: records.filter(r => r.area === area && r.score < 3).length,
          trend: data.total >= 4 ? 'improving' : data.total >= 3 ? 'stable' : 'declining',
          calculated_at: new Date().toISOString()
        });

        await EventBus.emit(EVENT_TYPES.QUALITY_SCORE_UPDATED, {
          area: area,
          averageScore: data.total,
          totalChecks: data.count
        });

        generated++;
      }

      console.log(`📊 QualityAgent: Generated ${generated} quality reports`);
      return { generated, avgScore: parseFloat(avgScore.toFixed(2)), lowScoreCount, excellentCount };

    } catch (error) {
      console.error('QualityAgent: Error in pushQualityReports:', error);
      return { generated: 0, error: error.message };
    }
  }

  /**
   * Detect quality issues requiring attention
   */
  async detectQualityIssues() {
    try {
      const today = new Date();
      const last24Hours = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const last24HoursStr = last24Hours.toISOString();

      // Get low quality checks
      const lowQualityRecords = await base44.entities.QualityRecord.filter({
        created_date: { $gte: last24HoursStr },
        score: { $lte: 2 }
      }, '-created_date', 50);

      let created = 0;

      for (const record of lowQualityRecords) {
        // Check if corrective task already created
        if (!record.corrective_task_id) {
          // Create corrective task
          const task = await base44.entities.OperationTask.create({
            title: `Quality Issue: ${record.check_title}`,
            type: 'quality',
            frequency: 'one_time',
            department: record.area === 'kitchen' ? 'kitchen' : 
                       record.area === 'front_of_house' ? 'front_of_house' : 'all',
            assigned_to: record.checked_by_email,
            assigned_to_name: record.checked_by_name,
            linked_quality_id: record.id,
            linked_quality_title: record.check_title,
            status: 'pending',
            due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
            priority: record.score === 1 ? 'critical' : 'high',
            auto_generated: true,
            comments: `Quality check scored ${record.score}/5. Corrective action required. Original comment: ${record.comments || 'None'}`
          });

          // Update quality record with task reference
          await base44.entities.QualityRecord.update(record.id, {
            corrective_task_id: task.id,
            corrective_action_required: true
          });

          await EventBus.emit(EVENT_TYPES.QUALITY_CHECK_FAILED, {
            record_id: record.id,
            check_title: record.check_title,
            score: record.score,
            area: record.area,
            task_id: task.id
          });

          created++;
        }
      }

      console.log(`⚠️ QualityAgent: Created ${created} corrective tasks`);
      return { created };

    } catch (error) {
      console.error('QualityAgent: Error in detectQualityIssues:', error);
      return { created: 0, error: error.message };
    }
  }

  /**
   * Log agent action to database
   */
  async logAction(actionType, status, data = {}) {
    try {
      await base44.entities.AgentLog.create({
        agent_name: this.name,
        action_type: 'auto_action',
        action_description: `Quality agent ${actionType}: ${status}`,
        trigger_event: 'scheduled_run',
        decision_data: data,
        decision_reasoning: 'Automated quality monitoring and SOP compliance tracking',
        confidence_score: 0.92,
        severity: status === 'failed' ? 'high' : 'info',
        status: status === 'failed' ? 'failed' : 'completed',
        notification_sent: false,
        success: status !== 'failed',
        processing_time_ms: data.duration || 0
      });
    } catch (error) {
      console.error('QualityAgent: Failed to log action:', error);
    }
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      name: this.name,
      isRunning: this.isRunning,
      lastRun: this.lastRun
    };
  }
}

// Create singleton instance
const QualityAgent = new QualityAgentClass();

export default QualityAgent;