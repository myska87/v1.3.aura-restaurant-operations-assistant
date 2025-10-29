/**
 * QualityAgent - Autonomous Quality Monitoring & SOP Compliance
 * Audits SOP completion, tracks quality scores, sends alerts
 */

import { base44 } from '@/api/base44Client';
import EventBus, { EVENT_TYPES } from './EventBus';

export class QualityAgent {
  constructor() {
    this.name = 'quality_agent';
    this.isRunning = false;
    this.lastRun = null;
  }

  /**
   * Audit SOP completion rates
   */
  async auditSOPCompletion() {
    try {
      const today = new Date();
      const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last30DaysStr = last30Days.toISOString().split('T')[0];

      const sops = await base44.entities.SOPDocument.filter({
        status: 'active'
      }, '-created_date', 100);

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
          for (const cert of overdueCerts.slice(0, 5)) {
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
      console.warn('QualityAgent: Error in auditSOPCompletion:', error);
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

      const records = await base44.entities.QualityRecord.filter({
        created_date: { $gte: last7DaysStr }
      }, '-created_date', 100);

      if (records.length === 0) {
        return { generated: 0 };
      }

      const avgScore = records.reduce((sum, r) => sum + r.score, 0) / records.length;

      const areaScores = {};
      records.forEach(record => {
        if (!areaScores[record.area]) {
          areaScores[record.area] = { total: 0, sum: 0, count: 0 };
        }
        areaScores[record.area].sum += record.score;
        areaScores[record.area].count++;
        areaScores[record.area].total = areaScores[record.area].sum / areaScores[record.area].count;
      });

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
      return { generated, avgScore: parseFloat(avgScore.toFixed(2)) };

    } catch (error) {
      console.warn('QualityAgent: Error in pushQualityReports:', error);
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

      const lowQualityRecords = await base44.entities.QualityRecord.filter({
        created_date: { $gte: last24HoursStr },
        score: { $lte: 2 }
      }, '-created_date', 50);

      let created = 0;

      for (const record of lowQualityRecords) {
        if (!record.corrective_task_id) {
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
            due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            priority: record.score === 1 ? 'critical' : 'high',
            auto_generated: true,
            comments: `Quality check scored ${record.score}/5. Corrective action required. Original comment: ${record.comments || 'None'}`
          });

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
      console.warn('QualityAgent: Error in detectQualityIssues:', error);
      return { created: 0, error: error.message };
    }
  }
}