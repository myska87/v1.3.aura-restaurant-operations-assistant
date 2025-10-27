/**
 * AURA Smart Scheduler Engine
 * AI-powered shift scheduling based on forecasts, weather, events
 */

import { base44 } from "@/api/base44Client";
import CoreDB from './CoreDB';

class SmartSchedulerEngine {
  constructor() {
    this.forecastCache = new Map();
    this.recommendations = [];
  }

  /**
   * Generate AI-powered shift recommendations
   */
  async generateWeeklyRecommendations(startDate, endDate) {
    console.log('[SmartScheduler] Generating recommendations for', startDate, 'to', endDate);

    const recommendations = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayRecommendations = await this.generateDayRecommendations(dateStr);
      recommendations.push(...dayRecommendations);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.recommendations = recommendations;
    return recommendations;
  }

  /**
   * Generate recommendations for a specific day
   */
  async generateDayRecommendations(date) {
    const dayOfWeek = new Date(date).getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    // Analyze historical data
    const historicalData = await this.analyzeHistoricalData(dayOfWeek);
    
    // Get weather forecast (simulated)
    const weatherImpact = await this.getWeatherImpact(date);
    
    // Check for events
    const eventImpact = await this.checkLocalEvents(date);
    
    // Calculate recommended staff count
    const baseStaff = historicalData.avgStaffCount;
    const weatherMultiplier = weatherImpact.multiplier;
    const eventMultiplier = eventImpact.multiplier;
    
    const recommendedStaff = Math.ceil(baseStaff * weatherMultiplier * eventMultiplier);
    
    // Get available staff
    const availableStaff = await this.getAvailableStaff(date);
    
    // Match staff to roles
    const shiftRecommendations = await this.matchStaffToRoles(
      date,
      recommendedStaff,
      availableStaff,
      historicalData
    );

    return [{
      date,
      day_of_week: dayName,
      recommended_staff_count: recommendedStaff,
      confidence: this.calculateConfidence(historicalData, weatherImpact, eventImpact),
      factors: {
        historical_average: baseStaff,
        weather_impact: weatherImpact.description,
        event_impact: eventImpact.description,
        weather_multiplier: weatherMultiplier,
        event_multiplier: eventMultiplier
      },
      shift_recommendations: shiftRecommendations,
      generated_at: new Date().toISOString()
    }];
  }

  /**
   * Analyze historical shift patterns
   */
  async analyzeHistoricalData(dayOfWeek, lookbackDays = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const shifts = await CoreDB.getShifts({}, '-shift_date', 500);
    
    // Filter shifts for the same day of week
    const relevantShifts = shifts.filter(s => {
      const shiftDate = new Date(s.shift_date);
      const daysAgo = (new Date() - shiftDate) / (1000 * 60 * 60 * 24);
      return shiftDate.getDay() === dayOfWeek && daysAgo <= lookbackDays;
    });

    // Group by date and count
    const dailyCounts = {};
    relevantShifts.forEach(shift => {
      const date = shift.shift_date;
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const counts = Object.values(dailyCounts);
    const avgStaffCount = counts.length > 0 
      ? counts.reduce((a, b) => a + b, 0) / counts.length 
      : 5; // Default to 5 if no data

    // Role distribution
    const roleDistribution = {};
    relevantShifts.forEach(shift => {
      roleDistribution[shift.role] = (roleDistribution[shift.role] || 0) + 1;
    });

    return {
      avgStaffCount: Math.ceil(avgStaffCount),
      minStaffCount: counts.length > 0 ? Math.min(...counts) : 3,
      maxStaffCount: counts.length > 0 ? Math.max(...counts) : 8,
      roleDistribution,
      dataPoints: counts.length,
      confidence: counts.length > 4 ? 'high' : counts.length > 2 ? 'medium' : 'low'
    };
  }

  /**
   * Simulate weather impact (in production, integrate with weather API)
   */
  async getWeatherImpact(date) {
    // Simulate weather forecast
    const random = Math.random();
    
    if (random > 0.8) {
      return {
        condition: 'rain',
        multiplier: 0.85,
        description: 'Rainy weather - expect 15% fewer customers'
      };
    } else if (random > 0.6) {
      return {
        condition: 'sunny',
        multiplier: 1.15,
        description: 'Sunny weather - expect 15% more customers'
      };
    } else {
      return {
        condition: 'normal',
        multiplier: 1.0,
        description: 'Normal weather conditions'
      };
    }
  }

  /**
   * Check for local events (concerts, sports, holidays)
   */
  async checkLocalEvents(date) {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    
    // Check if weekend
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      return {
        hasEvent: true,
        eventType: 'weekend',
        multiplier: 1.3,
        description: 'Weekend - expect 30% more customers'
      };
    }
    
    // Check if holiday (simplified)
    const month = dateObj.getMonth();
    const day = dateObj.getDate();
    
    if ((month === 11 && day >= 20) || (month === 0 && day <= 5)) {
      return {
        hasEvent: true,
        eventType: 'holiday_season',
        multiplier: 1.4,
        description: 'Holiday season - expect 40% more customers'
      };
    }

    return {
      hasEvent: false,
      eventType: null,
      multiplier: 1.0,
      description: 'No special events detected'
    };
  }

  /**
   * Get available staff for a date
   */
  async getAvailableStaff(date) {
    const allStaff = await CoreDB.getStaff({ status: 'active' });
    
    // Check availability records
    const availabilities = await base44.entities.Availability.filter({ date });
    
    const availableStaff = allStaff.filter(staff => {
      const availability = availabilities.find(a => a.staff_email === staff.email);
      return !availability || availability.is_available;
    });

    return availableStaff;
  }

  /**
   * Match staff to roles based on position and performance
   */
  async matchStaffToRoles(date, targetCount, availableStaff, historicalData) {
    const shifts = [];
    const roleDistribution = historicalData.roleDistribution;
    
    // Sort roles by frequency
    const sortedRoles = Object.entries(roleDistribution)
      .sort(([, a], [, b]) => b - a)
      .map(([role]) => role);

    // Assign staff to shifts
    let assigned = 0;
    
    for (const role of sortedRoles) {
      if (assigned >= targetCount) break;
      
      // Find staff with matching position
      const matchingStaff = availableStaff.filter(s => 
        s.position?.toLowerCase() === role.toLowerCase() ||
        s.position?.toLowerCase().includes(role.toLowerCase())
      );

      for (const staff of matchingStaff.slice(0, 2)) {
        if (assigned >= targetCount) break;
        
        shifts.push({
          staff_email: staff.email,
          staff_name: staff.full_name,
          role: role,
          shift_date: date,
          shift_type: 'mid_shift',
          start_time: staff.shift_start || '09:00',
          end_time: staff.shift_end || '17:00',
          status: 'recommended',
          confidence: 'high',
          reason: `Matched by position and availability`
        });
        
        assigned++;
      }
    }

    // Fill remaining slots with any available staff
    if (assigned < targetCount) {
      const unassignedStaff = availableStaff.filter(s => 
        !shifts.find(shift => shift.staff_email === s.email)
      );

      for (const staff of unassignedStaff) {
        if (assigned >= targetCount) break;
        
        shifts.push({
          staff_email: staff.email,
          staff_name: staff.full_name,
          role: staff.position || 'general',
          shift_date: date,
          shift_type: 'mid_shift',
          start_time: staff.shift_start || '09:00',
          end_time: staff.shift_end || '17:00',
          status: 'recommended',
          confidence: 'medium',
          reason: 'Available staff to meet demand'
        });
        
        assigned++;
      }
    }

    return shifts;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(historical, weather, event) {
    let score = 0;
    
    // Historical data quality
    if (historical.dataPoints > 8) score += 40;
    else if (historical.dataPoints > 4) score += 25;
    else score += 10;
    
    // Weather certainty
    if (weather.condition !== 'uncertain') score += 30;
    else score += 15;
    
    // Event certainty
    if (event.hasEvent) score += 30;
    else score += 20;
    
    return score;
  }

  /**
   * Apply recommendations - create actual shifts
   */
  async applyRecommendations(recommendations) {
    const createdShifts = [];
    
    for (const rec of recommendations) {
      for (const shift of rec.shift_recommendations) {
        try {
          const created = await CoreDB.createShift({
            ...shift,
            status: 'scheduled' // Change from recommended to scheduled
          });
          createdShifts.push(created);
          
          // Auto-assign forms
          await this.autoAssignForms(created);
        } catch (error) {
          console.error('[SmartScheduler] Error creating shift:', error);
        }
      }
    }
    
    return createdShifts;
  }

  /**
   * Auto-assign forms when shift is created
   */
  async autoAssignForms(shift) {
    const forms = await CoreDB.getForms({ 
      assigned_position: shift.role,
      auto_assign_enabled: true,
      is_active: true
    });

    const assignments = [];

    for (const form of forms) {
      // Determine due time based on shift type
      let dueTime = new Date(`${shift.shift_date}T${shift.start_time}`);
      
      if (form.trigger_type === 'shift_start' || form.trigger_type === 'opening') {
        dueTime.setMinutes(dueTime.getMinutes() + 30);
      } else if (form.trigger_type === 'shift_end' || form.trigger_type === 'closing') {
        dueTime = new Date(`${shift.shift_date}T${shift.end_time}`);
        dueTime.setMinutes(dueTime.getMinutes() - 30);
      }

      const assignment = await base44.entities.FormAssignmentMetadata.create({
        form_id: form.id,
        form_name: form.form_name,
        assignment_type: 'shift_based',
        trigger_event: 'shift_created',
        linked_shift_id: shift.id,
        assigned_to_email: shift.staff_email,
        assigned_to_name: shift.staff_name,
        assigned_position: shift.role,
        assigned_by: 'smart_scheduler',
        due_date: dueTime.toISOString(),
        completion_status: 'pending'
      });

      assignments.push(assignment);
    }

    console.log(`[SmartScheduler] Auto-assigned ${assignments.length} forms to shift ${shift.id}`);
    return assignments;
  }
}

export const smartScheduler = new SmartSchedulerEngine();
export default smartScheduler;