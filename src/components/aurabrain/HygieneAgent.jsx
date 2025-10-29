/**
 * HygieneAgent - Autonomous Hygiene Monitoring & Task Management
 * Monitors hygiene records, calculates scores, auto-assigns tasks
 */

import { base44 } from '@/api/base44Client';
import EventBus, { EVENT_TYPES } from './EventBus';

class HygieneAgentClass {
  constructor() {
    this.name = 'hygiene_agent';
    this.isRunning = false;
    this.lastRun = null;
  }

  /**
   * Main run cycle - executes all hygiene checks
   */
  async run() {
    if (this.isRunning) {
      console.log('HygieneAgent: Already running, skipping...');
      return { status: 'skipped', reason: 'already_running' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const results = {
      checklistsAssigned: 0,
      scoresUpdated: 0,
      alertsCreated: 0,
      errors: []
    };

    try {
      console.log('🧠 HygieneAgent: Starting run...');
      
      await EventBus.emit(EVENT_TYPES.AGENT_STARTED, { 
        agent: this.name,
        timestamp: new Date().toISOString()
      });

      // 1. Auto-assign open checklists
      const checklistResult = await this.runChecklists();
      results.checklistsAssigned = checklistResult.assigned;

      // 2. Calculate compliance scores
      const scoreResult = await this.scoreCompliance();
      results.scoresUpdated = scoreResult.updated;

      // 3. Detect and create alerts
      const alertResult = await this.detectIssues();
      results.alertsCreated = alertResult.created;

      // 4. Log agent action
      await this.logAction('auto_run', 'completed', results);

      const duration = Date.now() - startTime;
      console.log(`✅ HygieneAgent: Completed in ${duration}ms`, results);

      await EventBus.emit(EVENT_TYPES.AGENT_COMPLETED, { 
        agent: this.name,
        duration,
        results
      });

      this.lastRun = new Date().toISOString();
      return { status: 'success', results, duration };

    } catch (error) {
      console.error('❌ HygieneAgent: Run failed:', error);
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
   * Auto-assign open hygiene checklists
   */
  async runChecklists() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get pending form assignments for hygiene
      const assignments = await base44.entities.FormAssignmentMetadata.filter({
        completion_status: 'pending',
        due_date: { $gte: today }
      }, '-due_date', 50);

      let assigned = 0;

      for (const assignment of assignments) {
        // Check if it's a hygiene-related form
        if (assignment.form_name && 
            (assignment.form_name.toLowerCase().includes('hygiene') ||
             assignment.form_name.toLowerCase().includes('temperature') ||
             assignment.form_name.toLowerCase().includes('cleaning'))) {
          
          // Notify assigned staff
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
      console.error('HygieneAgent: Error in runChecklists:', error);
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

      // Get recent hygiene records
      const records = await base44.entities.HygieneRecord.filter({
        created_date: { $gte: last7DaysStr }
      }, '-created_date', 200);

      if (records.length === 0) {
        return { updated: 0 };
      }

      // Group by staff member
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

      // Update scores
      let updated = 0;
      for (const email in staffScores) {
        const data = staffScores[email];
        const complianceRate = data.totalRecords > 0 
          ? Math.round((data.inRangeRecords / data.totalRecords) * 100)
          : 0;

        try {
          // Get existing score or create new
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
          console.error(`Failed to update score for ${email}:`, error);
        }
      }

      console.log(`📊 HygieneAgent: Updated ${updated} compliance scores`);
      return { updated };

    } catch (error) {
      console.error('HygieneAgent: Error in scoreCompliance:', error);
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

      // Get recent records with issues
      const problematicRecords = await base44.entities.HygieneRecord.filter({
        created_date: { $gte: last24HoursStr },
        is_in_range: false
      }, '-created_date', 50);

      let created = 0;

      for (const record of problematicRecords) {
        // Check if alert already exists
        const existingAlerts = await base44.entities.HygieneAlertLog.filter({
          record_id: record.id
        }, '-created_date', 1);

        if (existingAlerts.length === 0) {
          // Create new alert
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
      console.error('HygieneAgent: Error in detectIssues:', error);
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
        action_description: `Hygiene agent ${actionType}: ${status}`,
        trigger_event: 'scheduled_run',
        decision_data: data,
        decision_reasoning: 'Automated hygiene monitoring and task assignment',
        confidence_score: 0.95,
        severity: status === 'failed' ? 'high' : 'info',
        status: status === 'failed' ? 'failed' : 'completed',
        notification_sent: false,
        success: status !== 'failed',
        processing_time_ms: data.duration || 0
      });
    } catch (error) {
      console.error('HygieneAgent: Failed to log action:', error);
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
const HygieneAgent = new HygieneAgentClass();

export default HygieneAgent;