/**
 * AI Pattern Detector
 * Analyzes attendance patterns and provides proactive recommendations
 */

import { base44 } from '@/api/base44Client';
import CoreDB from './CoreDB';

class AIPatternDetector {
  constructor() {
    this.patterns = new Map();
    this.recommendations = [];
  }

  /**
   * Analyze late patterns for a staff member
   */
  async analyzeLatePatterns(staffEmail, lookbackDays = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const attendance = await base44.entities.AttendanceRecord.filter({
      staff_email: staffEmail
    });

    const recentAttendance = attendance.filter(a => 
      new Date(a.shift_date) >= startDate
    );

    if (recentAttendance.length === 0) {
      return null;
    }

    // Analyze by time of day
    const morningShifts = recentAttendance.filter(a => {
      const hour = parseInt(a.scheduled_start.split(':')[0]);
      return hour < 12;
    });

    const afternoonShifts = recentAttendance.filter(a => {
      const hour = parseInt(a.scheduled_start.split(':')[0]);
      return hour >= 12 && hour < 17;
    });

    const eveningShifts = recentAttendance.filter(a => {
      const hour = parseInt(a.scheduled_start.split(':')[0]);
      return hour >= 17;
    });

    const calculatePunctuality = (shifts) => {
      if (shifts.length === 0) return 0;
      const onTime = shifts.filter(s => s.status === 'on_time' || s.lateness_minutes <= 5).length;
      return (onTime / shifts.length) * 100;
    };

    const morningPunctuality = calculatePunctuality(morningShifts);
    const afternoonPunctuality = calculatePunctuality(afternoonShifts);
    const eveningPunctuality = calculatePunctuality(eveningShifts);

    // Find best time slot
    const timeSlots = [
      { name: 'morning', punctuality: morningPunctuality, count: morningShifts.length },
      { name: 'afternoon', punctuality: afternoonPunctuality, count: afternoonShifts.length },
      { name: 'evening', punctuality: eveningPunctuality, count: eveningShifts.length }
    ].filter(slot => slot.count > 2); // Need at least 3 shifts to be reliable

    const bestTimeSlot = timeSlots.reduce((best, current) => 
      current.punctuality > best.punctuality ? current : best
    , timeSlots[0]);

    const worstTimeSlot = timeSlots.reduce((worst, current) => 
      current.punctuality < worst.punctuality ? current : worst
    , timeSlots[0]);

    // Generate recommendation
    let recommendation = null;
    const punctualityDifference = bestTimeSlot.punctuality - worstTimeSlot.punctuality;

    if (punctualityDifference > 20 && bestTimeSlot.punctuality > 80) {
      recommendation = {
        type: 'shift_time_optimization',
        priority: 'high',
        message: `Staff member is ${Math.round(bestTimeSlot.punctuality)}% punctual in ${bestTimeSlot.name} shifts but only ${Math.round(worstTimeSlot.punctuality)}% in ${worstTimeSlot.name} shifts. Consider scheduling more ${bestTimeSlot.name} shifts.`,
        best_time: bestTimeSlot.name,
        worst_time: worstTimeSlot.name,
        impact: `Could improve punctuality by ${Math.round(punctualityDifference)}%`
      };
    }

    return {
      staff_email: staffEmail,
      total_shifts: recentAttendance.length,
      overall_punctuality: calculatePunctuality(recentAttendance),
      time_slot_analysis: {
        morning: { shifts: morningShifts.length, punctuality: morningPunctuality },
        afternoon: { shifts: afternoonShifts.length, punctuality: afternoonPunctuality },
        evening: { shifts: eveningShifts.length, punctuality: eveningPunctuality }
      },
      best_time_slot: bestTimeSlot,
      worst_time_slot: worstTimeSlot,
      recommendation,
      analyzed_at: new Date().toISOString()
    };
  }

  /**
   * Analyze all staff and generate recommendations
   */
  async generateTeamRecommendations() {
    const staff = await CoreDB.getStaff({ status: 'active' });
    const recommendations = [];

    for (const member of staff) {
      const analysis = await this.analyzeLatePatterns(member.email);
      
      if (analysis && analysis.recommendation) {
        recommendations.push({
          staff_email: member.email,
          staff_name: member.full_name,
          ...analysis.recommendation,
          created_at: new Date().toISOString()
        });
      }
    }

    this.recommendations = recommendations;
    return recommendations;
  }

  /**
   * Detect absence patterns
   */
  async detectAbsencePatterns(staffEmail) {
    const shifts = await CoreDB.getShifts({ staff_email: staffEmail }, '-shift_date', 100);
    const missedShifts = shifts.filter(s => s.status === 'missed');

    if (missedShifts.length === 0) return null;

    // Analyze day of week pattern
    const dayPattern = {};
    missedShifts.forEach(shift => {
      const day = new Date(shift.shift_date).getDay();
      dayPattern[day] = (dayPattern[day] || 0) + 1;
    });

    const mostMissedDay = Object.entries(dayPattern)
      .reduce((max, [day, count]) => count > max.count ? { day, count } : max, { day: 0, count: 0 });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      total_missed: missedShifts.length,
      total_scheduled: shifts.length,
      absence_rate: (missedShifts.length / shifts.length * 100).toFixed(1),
      most_missed_day: dayNames[mostMissedDay.day],
      pattern_detected: mostMissedDay.count > missedShifts.length * 0.4,
      recommendation: mostMissedDay.count > missedShifts.length * 0.4
        ? `High absence rate on ${dayNames[mostMissedDay.day]}. Consider avoiding this day or investigating personal constraints.`
        : null
    };
  }

  /**
   * Predict shift completion success
   */
  async predictShiftSuccess(shiftId) {
    const shift = await CoreDB.getShiftById(shiftId);
    if (!shift) return null;

    // Get historical data for this staff member
    const historicalShifts = await CoreDB.getShifts({ 
      staff_email: shift.staff_email 
    }, '-shift_date', 50);

    const completedShifts = historicalShifts.filter(s => s.status === 'completed');
    const successRate = (completedShifts.length / historicalShifts.length) * 100;

    // Check time slot preference
    const analysis = await this.analyzeLatePatterns(shift.staff_email, 30);
    
    let timeSlotBonus = 0;
    if (analysis) {
      const hour = parseInt(shift.start_time.split(':')[0]);
      let currentSlot = 'afternoon';
      if (hour < 12) currentSlot = 'morning';
      else if (hour >= 17) currentSlot = 'evening';

      if (analysis.best_time_slot?.name === currentSlot) {
        timeSlotBonus = 15;
      } else if (analysis.worst_time_slot?.name === currentSlot) {
        timeSlotBonus = -15;
      }
    }

    const predictedSuccess = Math.min(100, Math.max(0, successRate + timeSlotBonus));

    return {
      shift_id: shiftId,
      staff_email: shift.staff_email,
      predicted_success_rate: Math.round(predictedSuccess),
      confidence: historicalShifts.length > 10 ? 'high' : 'medium',
      factors: {
        historical_success_rate: Math.round(successRate),
        time_slot_adjustment: timeSlotBonus,
        total_historical_shifts: historicalShifts.length
      },
      recommendation: predictedSuccess < 60 
        ? 'Low predicted success. Consider backup staff or extra support.'
        : predictedSuccess > 85
        ? 'High predicted success. Reliable assignment.'
        : 'Moderate predicted success. Monitor closely.'
    };
  }
}

export const aiPatternDetector = new AIPatternDetector();
export default aiPatternDetector;