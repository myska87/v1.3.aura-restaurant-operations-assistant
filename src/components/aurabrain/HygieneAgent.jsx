/**
 * HygieneAgent - Autonomous Hygiene Monitoring & Task Management
 * Monitors hygiene records, calculates scores, auto-assigns tasks
 */

import { base44 } from '@/api/base44Client';
import EventBus, { EVENT_TYPES } from './EventBus';

export class HygieneAgent {
  constructor() {
    this.name = 'hygiene_agent';
    this.isRunning = false;
    this.lastRun = null;
  }

  /**
   * Auto-assign open hygiene checklists
   */
  async runChecklists() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const assignments = await base44.entities.FormAssignmentMetadata.filter({
        completion_status: 'pending',
        due_date: { $gte: today }
      }, '-due_date', 50);

      let assigned = 0;

      for (const assignment of assignments) {
        if (assignment.form_name && 
            (assignment.form_name.toLowerCase().includes('hygiene') ||
             assignment.form_name.toLowerCase().includes('temperature') ||
             assignment.form_name.toLowerCase().includes('cleaning'))) {
          
          await EventBus.emit(EVENT_TYPES.TASK_ASSIGNED, {
            type: 'hygiene_checklist',
            assignmentId: assignment.id,
            assignedTo: assignment.assigned_to_email,
            dueDate: assignment.due_date
          });

          assigned++;
        }
      }

      console.log(`📋 HygieneAgent: Assigned ${assigned} checklists`);
      return { assigned };

    } catch (error) {
      console.warn('HygieneAgent: Error in runChecklists:', error);
      return { assigned: 0, error: error.message };
    }
  }

  /**
   * Calculate compliance scores
   */
  async scoreCompliance() {
    try {
      const today = new Date();
      const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last7DaysStr = last7Days.toISOString().split('T')[0];

      const records = await base44.entities.HygieneRecord.filter({
        created_date: { $gte: last7DaysStr }
      }, '-created_date', 200);

      if (records.length === 0) {
        return { updated: 0 };
      }

      const staffScores = {};

      records.forEach(record => {
        const email = record.recorded_by_email;
        if (!email) return;

        if (!staffScores[email]) {
          staffScores[email] = {
            email: email,
            name: record.recorded_by_name,
            totalRecords: 0,
            inRangeRecords: 0,
            points: 0
          };
        }

        staffScores[email].totalRecords++;
        if (record.is_in_range !== false) {
          staffScores[email].inRangeRecords++;
        }
        if (record.points_awarded) {
          staffScores[email].points += record.points_awarded;
        }
      });

      let updated = 0;
      for (const email in staffScores) {
        const data = staffScores[email];
        const complianceRate = data.totalRecords > 0 
          ? Math.round((data.inRangeRecords / data.totalRecords) * 100)
          : 0;

        try {
          const existing = await base44.entities.HygieneUserScore.filter({
            staff_email: email
          }, '-created_date', 1);

          if (existing.length > 0) {
            await base44.entities.HygieneUserScore.update(existing[0].id, {
              total_records: (existing[0].total_records || 0) + data.totalRecords,
              points_this_week: data.points,
              compliance_rate: complianceRate,
              last_record_date: new Date().toISOString()
            });
          } else {
            await base44.entities.HygieneUserScore.create({
              staff_email: email,
              staff_name: data.name,
              total_records: data.totalRecords,
              points_this_week: data.points,
              compliance_rate: complianceRate,
              last_record_date: new Date().toISOString()
            });
          }

          updated++;

          await EventBus.emit(EVENT_TYPES.HYGIENE_SCORE_UPDATED, {
            staff_email: email,
            complianceRate,
            points: data.points
          });

        } catch (error) {
          console.warn(`Failed to update score for ${email}:`, error);
        }
      }

      console.log(`📊 HygieneAgent: Updated ${updated} compliance scores`);
      return { updated };

    } catch (error) {
      console.warn('HygieneAgent: Error in scoreCompliance:', error);
      return { updated: 0, error: error.message };
    }
  }

  /**
   * Detect hygiene issues and create alerts
   */
  async detectIssues() {
    try {
      const today = new Date();
      const last24Hours = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const last24HoursStr = last24Hours.toISOString();

      const problematicRecords = await base44.entities.HygieneRecord.filter({
        created_date: { $gte: last24HoursStr },
        is_in_range: false
      }, '-created_date', 50);

      let created = 0;

      for (const record of problematicRecords) {
        const existingAlerts = await base44.entities.HygieneAlertLog.filter({
          record_id: record.id
        }, '-created_date', 1);

        if (existingAlerts.length === 0) {
          const severity = record.is_critical ? 'critical' : 'warning';
          
          await base44.entities.HygieneAlertLog.create({
            record_id: record.id,
            alert_type: record.record_type === 'storage_fridge' || record.record_type === 'storage_freezer'
              ? (record.recorded_value > (record.recommended_max || 8) ? 'temperature_high' : 'temperature_low')
              : 'critical_failure',
            severity: severity,
            item_name: record.item_name,
            location: record.location || 'Unknown',
            venue_id: record.venue_id,
            venue_name: record.venue_name,
            recorded_value: record.recorded_value,
            expected_range: `${record.recommended_min || 0}°C - ${record.recommended_max || 8}°C`,
            variance_amount: Math.abs(record.recorded_value - (record.recommended_max || 8)),
            triggered_by_email: record.recorded_by_email,
            triggered_by_name: record.recorded_by_name,
            status: 'open',
            notified_at: new Date().toISOString()
          });

          await EventBus.emit(EVENT_TYPES.HYGIENE_ALERT, {
            severity,
            item: record.item_name,
            location: record.location,
            value: record.recorded_value
          });

          created++;
        }
      }

      console.log(`🚨 HygieneAgent: Created ${created} hygiene alerts`);
      return { created };

    } catch (error) {
      console.warn('HygieneAgent: Error in detectIssues:', error);
      return { created: 0, error: error.message };
    }
  }
}