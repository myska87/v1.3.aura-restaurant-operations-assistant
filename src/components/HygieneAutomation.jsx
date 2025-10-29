/**
 * AURA Hygiene Record Automation Engine
 * 
 * Features:
 * - IoT sensor integration for automatic temperature logging
 * - Predictive alerting for temperature trends
 * - Auto-sync with FormIntelligence
 * - Smart anomaly detection
 */

import { base44 } from "@/api/base44Client";
import CoreDB from './CoreDB';

class HygieneAutomation {
  constructor() {
    this.sensorCache = new Map();
    this.trendAnalysis = new Map();
    this.alertThresholds = {
      fridge: { min: 0, max: 5, warning: 7 },
      freezer: { min: -25, max: -18, warning: -15 },
      hot_holding: { min: 63, max: 100, warning: 60 },
      cooling: { min: 0, max: 8, warning: 10 }
    };
  }

  /**
   * Process IoT sensor reading
   */
  async processSensorReading(sensorData) {
    const {
      sensor_id,
      sensor_type,
      item_name,
      location,
      temperature,
      venue_id,
      venue_name,
      timestamp = new Date().toISOString()
    } = sensorData;

    console.log('[HygieneAutomation] Processing sensor reading:', sensor_id, temperature);

    // Store in trend cache
    if (!this.trendAnalysis.has(sensor_id)) {
      this.trendAnalysis.set(sensor_id, []);
    }
    
    const trends = this.trendAnalysis.get(sensor_id);
    trends.push({ temperature, timestamp });
    
    // Keep only last 20 readings for trend analysis
    if (trends.length > 20) {
      trends.shift();
    }

    // Analyze trend
    const trendResult = this.analyzeTrend(trends, sensor_type);

    // Create hygiene record
    const record = await base44.entities.HygieneRecord.create({
      record_type: this.mapSensorTypeToRecordType(sensor_type),
      item_name,
      location,
      recorded_value: temperature,
      unit: 'celsius',
      recommended_min: this.alertThresholds[sensor_type]?.min,
      recommended_max: this.alertThresholds[sensor_type]?.max,
      is_in_range: this.isInRange(temperature, sensor_type),
      variance_alert: trendResult.shouldAlert || !this.isInRange(temperature, sensor_type),
      recorded_by_email: 'system@aura.ai',
      recorded_by_name: 'AURA Auto-Logger',
      venue_id: venue_id || 'default',
      venue_name: venue_name || 'Main Venue',
      status: trendResult.shouldAlert ? 'needs_attention' : 'recorded',
      is_critical: !this.isInRange(temperature, sensor_type),
      notes: trendResult.alert || 'Auto-logged by IoT sensor',
      points_awarded: this.isInRange(temperature, sensor_type) ? 10 : 0
    });

    // Create alert if needed
    if (trendResult.shouldAlert || !this.isInRange(temperature, sensor_type)) {
      await this.createAlert(record, trendResult);
    }

    // Auto-complete related form if exists
    await this.autoCompleteTemperatureForm(record);

    return {
      success: true,
      record,
      trend: trendResult,
      alert_created: trendResult.shouldAlert
    };
  }

  /**
   * Analyze temperature trend for predictive alerting
   */
  analyzeTrend(readings, sensorType) {
    if (readings.length < 3) {
      return { trend: 'insufficient_data', shouldAlert: false };
    }

    // Calculate average change rate
    const recentReadings = readings.slice(-5);
    const changes = [];
    
    for (let i = 1; i < recentReadings.length; i++) {
      const change = recentReadings[i].temperature - recentReadings[i - 1].temperature;
      changes.push(change);
    }

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const currentTemp = recentReadings[recentReadings.length - 1].temperature;
    
    const threshold = this.alertThresholds[sensorType];
    if (!threshold) return { trend: 'unknown', shouldAlert: false };

    // Predictive alerting logic
    let shouldAlert = false;
    let alert = null;
    let trend = 'stable';

    // Trending upward toward danger zone
    if (avgChange > 0.3 && sensorType === 'fridge') {
      const projectedTemp = currentTemp + (avgChange * 3); // Project 3 readings ahead
      if (projectedTemp > threshold.warning) {
        shouldAlert = true;
        alert = `⚠️ PREDICTIVE ALERT: Fridge temperature trending upward. Currently ${currentTemp.toFixed(1)}°C, projected to reach ${projectedTemp.toFixed(1)}°C. Check cooling system immediately.`;
        trend = 'rising_dangerous';
      } else if (currentTemp > threshold.max) {
        shouldAlert = true;
        alert = `🚨 CRITICAL: Temperature ${currentTemp.toFixed(1)}°C exceeds safe limit of ${threshold.max}°C. Immediate action required!`;
        trend = 'critical';
      }
    }

    // Freezer warming up
    if (avgChange > 0.5 && sensorType === 'freezer') {
      const projectedTemp = currentTemp + (avgChange * 3);
      if (projectedTemp > threshold.warning) {
        shouldAlert = true;
        alert = `⚠️ PREDICTIVE ALERT: Freezer temperature rising. Currently ${currentTemp.toFixed(1)}°C, could reach ${projectedTemp.toFixed(1)}°C. Check freezer seal and compressor.`;
        trend = 'rising_dangerous';
      }
    }

    // Hot holding cooling down
    if (avgChange < -0.5 && sensorType === 'hot_holding') {
      const projectedTemp = currentTemp + (avgChange * 3);
      if (projectedTemp < threshold.warning) {
        shouldAlert = true;
        alert = `⚠️ PREDICTIVE ALERT: Hot holding temperature dropping. Currently ${currentTemp.toFixed(1)}°C, projected ${projectedTemp.toFixed(1)}°C. Check heating element.`;
        trend = 'falling_dangerous';
      }
    }

    return {
      trend,
      avgChange: avgChange.toFixed(2),
      currentTemp,
      shouldAlert,
      alert,
      confidence: readings.length >= 10 ? 'high' : 'medium'
    };
  }

  /**
   * Check if temperature is within safe range
   */
  isInRange(temperature, sensorType) {
    const threshold = this.alertThresholds[sensorType];
    if (!threshold) return true;
    return temperature >= threshold.min && temperature <= threshold.max;
  }

  /**
   * Map sensor type to hygiene record type
   */
  mapSensorTypeToRecordType(sensorType) {
    const mapping = {
      fridge: 'storage_fridge',
      freezer: 'storage_freezer',
      hot_holding: 'cooking',
      cooling: 'cooling',
      delivery: 'delivery'
    };
    return mapping[sensorType] || 'equipment_check';
  }

  /**
   * Create alert for temperature issue
   */
  async createAlert(record, trendData) {
    const severity = record.is_critical ? 'critical' : 'warning';

    await base44.entities.HygieneAlertLog.create({
      record_id: record.id,
      alert_type: trendData.trend === 'rising_dangerous' || trendData.trend === 'falling_dangerous' 
        ? 'temperature_' + (trendData.trend.includes('rising') ? 'high' : 'low')
        : 'critical_failure',
      severity,
      item_name: record.item_name,
      location: record.location,
      venue_id: record.venue_id,
      venue_name: record.venue_name,
      recorded_value: record.recorded_value,
      expected_range: `${record.recommended_min}°C - ${record.recommended_max}°C`,
      variance_amount: Math.abs(record.recorded_value - (record.recommended_max || 0)),
      triggered_by_email: 'system@aura.ai',
      triggered_by_name: 'AURA Auto-Monitor',
      status: 'open',
      requires_eho_notification: record.is_critical
    });

    // Notify managers
    await this.notifyManagers(record, trendData);
  }

  /**
   * Notify managers of temperature issues
   */
  async notifyManagers(record, trendData) {
    try {
      const managers = await CoreDB.getStaff({ position: 'manager' });
      
      for (const manager of managers) {
        await base44.entities.TaskNotification.create({
          notification_type: 'task_overdue',
          recipient_email: manager.email,
          recipient_name: manager.full_name,
          sender_type: 'system',
          title: record.is_critical ? '🚨 CRITICAL Temperature Alert' : '⚠️ Temperature Warning',
          message: trendData.alert || `Temperature reading for ${record.item_name} at ${record.location}: ${record.recorded_value}°C`,
          priority: record.is_critical ? 'urgent' : 'warning',
          is_read: false,
          action_url: '/hygiene-dashboard'
        });
      }
    } catch (error) {
      console.error('[HygieneAutomation] Failed to notify managers:', error);
    }
  }

  /**
   * Auto-complete temperature form if one exists for today
   */
  async autoCompleteTemperatureForm(record) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Find temperature form assignments for today
      const assignments = await base44.entities.FormAssignmentMetadata.filter({
        completion_status: 'pending'
      });

      for (const assignment of assignments) {
        // Check if this is a temperature form
        const form = await CoreDB.getFormById(assignment.form_id);
        if (!form || form.form_name !== 'Daily Temperature Log') continue;

        // Check if assignment is for today
        const dueDate = new Date(assignment.due_date).toISOString().split('T')[0];
        if (dueDate !== today) continue;

        // Auto-fill form response
        await base44.entities.FormResponse.create({
          form_id: form.id,
          form_name: form.form_name,
          assignment_id: assignment.id,
          staff_email: 'system@aura.ai',
          staff_name: 'AURA Auto-Logger',
          response_data: {
            temp_type: this.mapRecordTypeToTempType(record.record_type),
            asset_name: record.item_name,
            temperature: record.recorded_value,
            location: record.location,
            notes: 'Auto-logged by IoT sensor'
          },
          status: 'submitted',
          passed: record.is_in_range,
          submitted_at: new Date().toISOString()
        });

        // Update assignment status
        await base44.entities.FormAssignmentMetadata.update(assignment.id, {
          completion_status: 'completed',
          completed_at: new Date().toISOString(),
          form_response_id: 'auto_' + record.id
        });

        console.log('[HygieneAutomation] Auto-completed temperature form for', record.item_name);
      }
    } catch (error) {
      console.error('[HygieneAutomation] Failed to auto-complete form:', error);
    }
  }

  /**
   * Map record type to temperature type dropdown value
   */
  mapRecordTypeToTempType(recordType) {
    const mapping = {
      storage_fridge: 'Fridge',
      storage_freezer: 'Freezer',
      cooking: 'Cooking/Core Temp',
      cooling: 'Cooling'
    };
    return mapping[recordType] || 'Other';
  }

  /**
   * Simulate IoT sensor readings (for demo/testing)
   */
  simulateReading(sensorId, sensorType, itemName, location, baseTemp, variance = 2) {
    const temp = baseTemp + (Math.random() * variance * 2 - variance);
    return this.processSensorReading({
      sensor_id: sensorId,
      sensor_type: sensorType,
      item_name: itemName,
      location,
      temperature: parseFloat(temp.toFixed(1)),
      venue_id: 'default',
      venue_name: 'Main Kitchen'
    });
  }
}

// Singleton instance
const hygieneAutomation = new HygieneAutomation();
export default hygieneAutomation;