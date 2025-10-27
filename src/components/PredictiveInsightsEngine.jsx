/**
 * AURA Predictive Insights Engine
 * Monitors trends and suggests optimizations
 */

import { base44 } from '@/api/base44Client';
import CoreDB from './CoreDB';

class PredictiveInsightsEngine {
  constructor() {
    this.insights = [];
    this.monitoringInterval = null;
  }

  /**
   * Start monitoring system trends
   */
  startMonitoring(intervalMinutes = 60) {
    console.log('[PredictiveInsights] Starting monitoring every', intervalMinutes, 'minutes');
    
    // Run immediately
    this.generateInsights();

    // Then run periodically
    this.monitoringInterval = setInterval(() => {
      this.generateInsights();
    }, intervalMinutes * 60 * 1000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Generate all insights
   */
  async generateInsights() {
    console.log('[PredictiveInsights] Generating insights...');
    
    const newInsights = [];

    try {
      // Staffing vs Sales
      const staffingInsight = await this.analyzeStaffingVsSales();
      if (staffingInsight) newInsights.push(staffingInsight);

      // Hygiene vs Fatigue
      const hygieneInsight = await this.analyzeHygieneVsFatigue();
      if (hygieneInsight) newInsights.push(hygieneInsight);

      // Supplier Performance
      const supplierInsight = await this.analyzeSupplierPerformance();
      if (supplierInsight) newInsights.push(supplierInsight);

      // Cost Optimization
      const costInsight = await this.analyzeCostOptimization();
      if (costInsight) newInsights.push(costInsight);

      // Staff Burnout Detection
      const burnoutInsight = await this.detectStaffBurnout();
      if (burnoutInsight) newInsights.push(burnoutInsight);

      this.insights = newInsights;
      
      // Store insights in database
      for (const insight of newInsights) {
        await this.storeInsight(insight);
      }

      console.log('[PredictiveInsights] Generated', newInsights.length, 'insights');

    } catch (error) {
      console.error('[PredictiveInsights] Error generating insights:', error);
    }

    return this.insights;
  }

  /**
   * Analyze staffing efficiency vs sales patterns
   */
  async analyzeStaffingVsSales() {
    const shifts = await CoreDB.getShifts({}, '-shift_date', 200);
    
    // Group by hour of day
    const hourlyStaffing = {};
    shifts.forEach(shift => {
      const hour = parseInt(shift.start_time.split(':')[0]);
      if (!hourlyStaffing[hour]) hourlyStaffing[hour] = 0;
      hourlyStaffing[hour]++;
    });

    // Detect overstaffing (simplified - in production, correlate with actual sales data)
    const lowTrafficHours = [15, 16, 17]; // 3-5 PM typically slower
    let overlapStaff = 0;
    let monthlySavings = 0;

    lowTrafficHours.forEach(hour => {
      const count = hourlyStaffing[hour] || 0;
      if (count > 2) {
        overlapStaff += (count - 2);
        monthlySavings += (count - 2) * 8 * 30 * 12; // £12/hour avg
      }
    });

    if (monthlySavings > 300) {
      return {
        type: 'cost_optimization',
        category: 'staffing',
        title: 'Reduce Shift Overlap for Cost Savings',
        description: `AI detected ${overlapStaff} excess staff during low-traffic hours (3-5 PM).`,
        recommendation: `Reducing shift overlap between 3-5 PM could save £${Math.round(monthlySavings)}/month.`,
        impact: 'high',
        potential_savings: monthlySavings,
        confidence: 'medium',
        priority: 8,
        created_at: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Analyze hygiene performance vs shift fatigue
   */
  async analyzeHygieneVsFatigue() {
    const records = await base44.entities.HygieneRecord.list('-created_date', 300);
    
    // Group by time of day
    const performanceByHour = {};
    records.forEach(record => {
      const hour = new Date(record.created_date).getHours();
      if (!performanceByHour[hour]) performanceByHour[hour] = { total: 0, failures: 0 };
      performanceByHour[hour].total++;
      if (!record.is_in_range) performanceByHour[hour].failures++;
    });

    // Detect fatigue pattern (more failures in late hours)
    const lateHours = [20, 21, 22, 23]; // 8 PM - 11 PM
    let lateFailureRate = 0;
    let lateTotal = 0;

    lateHours.forEach(hour => {
      if (performanceByHour[hour]) {
        lateTotal += performanceByHour[hour].total;
        lateFailureRate += performanceByHour[hour].failures;
      }
    });

    if (lateTotal > 10 && (lateFailureRate / lateTotal) > 0.15) {
      return {
        type: 'quality_alert',
        category: 'hygiene',
        title: 'Hygiene Compliance Drops During Late Shifts',
        description: `Failure rate increases to ${Math.round((lateFailureRate / lateTotal) * 100)}% after 8 PM, suggesting staff fatigue.`,
        recommendation: 'Consider rotating staff, adding breaks, or increasing supervision during evening hours.',
        impact: 'high',
        confidence: 'high',
        priority: 9,
        created_at: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Analyze supplier delivery performance
   */
  async analyzeSupplierPerformance() {
    const orders = await base44.entities.PurchaseOrder.list('-order_date', 100);
    
    const supplierMetrics = {};
    orders.forEach(order => {
      if (order.status !== 'approved_received') return;

      if (!supplierMetrics[order.supplier_id]) {
        supplierMetrics[order.supplier_id] = {
          name: order.supplier_name,
          orders: 0,
          delays: 0,
          totalCost: 0
        };
      }

      supplierMetrics[order.supplier_id].orders++;
      supplierMetrics[order.supplier_id].totalCost += order.total || 0;

      // Check for delays
      if (order.expected_delivery_date && order.actual_delivery_date) {
        const expected = new Date(order.expected_delivery_date);
        const actual = new Date(order.actual_delivery_date);
        if (actual > expected) {
          supplierMetrics[order.supplier_id].delays++;
        }
      }
    });

    // Find problematic suppliers
    for (const [supplierId, metrics] of Object.entries(supplierMetrics)) {
      const delayRate = metrics.delays / metrics.orders;
      
      if (delayRate > 0.3 && metrics.orders >= 5) {
        return {
          type: 'supplier_issue',
          category: 'supply_chain',
          title: `Supplier ${metrics.name} Has High Delay Rate`,
          description: `${Math.round(delayRate * 100)}% of orders delayed, impacting food cost planning.`,
          recommendation: `Consider negotiating better terms or finding alternative supplier. Delays may be contributing to waste.`,
          impact: 'medium',
          confidence: 'high',
          priority: 6,
          supplier_id: supplierId,
          created_at: new Date().toISOString()
        };
      }
    }

    return null;
  }

  /**
   * Analyze cost optimization opportunities
   */
  async analyzeCostOptimization() {
    const ingredients = await base44.entities.Ingredient.list();
    
    // Find ingredients with high turnover and price volatility
    const highValueIngredients = ingredients
      .filter(ing => ing.unit_cost > 5 && ing.current_stock > ing.reorder_point * 1.5);

    if (highValueIngredients.length > 3) {
      const overstockValue = highValueIngredients.reduce((sum, ing) => {
        const excess = ing.current_stock - ing.reorder_point;
        return sum + (excess * ing.unit_cost);
      }, 0);

      if (overstockValue > 200) {
        return {
          type: 'cost_optimization',
          category: 'inventory',
          title: 'High-Value Inventory Overstock Detected',
          description: `£${Math.round(overstockValue)} tied up in excess stock of premium ingredients.`,
          recommendation: `Adjust par levels for ${highValueIngredients.length} items to free up cash flow and reduce waste risk.`,
          impact: 'medium',
          potential_savings: overstockValue * 0.1, // Assume 10% potential savings
          confidence: 'high',
          priority: 7,
          created_at: new Date().toISOString()
        };
      }
    }

    return null;
  }

  /**
   * Detect early signs of staff burnout
   */
  async detectStaffBurnout() {
    const shifts = await CoreDB.getShifts({}, '-shift_date', 100);
    const attendance = await base44.entities.AttendanceRecord.list('-shift_date', 100);

    // Analyze staff patterns
    const staffPatterns = {};
    
    shifts.forEach(shift => {
      if (!staffPatterns[shift.staff_email]) {
        staffPatterns[shift.staff_email] = {
          name: shift.staff_name,
          shifts: 0,
          consecutive: 0,
          lateCount: 0
        };
      }
      staffPatterns[shift.staff_email].shifts++;
    });

    attendance.forEach(record => {
      if (staffPatterns[record.staff_email] && record.lateness_minutes > 10) {
        staffPatterns[record.staff_email].lateCount++;
      }
    });

    // Find burnout patterns
    for (const [email, pattern] of Object.entries(staffPatterns)) {
      const lateRate = pattern.lateCount / pattern.shifts;
      
      if (lateRate > 0.3 && pattern.shifts >= 10) {
        return {
          type: 'staff_wellbeing',
          category: 'team_health',
          title: `Potential Burnout Alert: ${pattern.name}`,
          description: `${Math.round(lateRate * 100)}% late arrival rate over ${pattern.shifts} shifts suggests fatigue or disengagement.`,
          recommendation: `Schedule a 1-on-1 check-in. Consider workload adjustment or rotating to preferred shifts.`,
          impact: 'high',
          confidence: 'medium',
          priority: 8,
          staff_email: email,
          created_at: new Date().toISOString()
        };
      }
    }

    return null;
  }

  /**
   * Store insight in database for tracking
   */
  async storeInsight(insight) {
    // In a real system, you'd store these in a dedicated Insights entity
    // For now, we'll use TaskNotification to alert managers
    
    try {
      const managers = await CoreDB.getStaff({ position: 'manager' });
      
      for (const manager of managers.slice(0, 1)) { // Only notify first manager to avoid spam
        await base44.entities.TaskNotification.create({
          notification_type: 'task_overdue', // Reusing existing type
          recipient_email: manager.email,
          recipient_name: manager.full_name,
          sender_type: 'system',
          title: `💡 ${insight.title}`,
          message: `${insight.description}\n\n${insight.recommendation}`,
          priority: insight.priority >= 8 ? 'urgent' : 'warning',
          is_read: false
        });
      }
    } catch (error) {
      console.error('[PredictiveInsights] Failed to store insight:', error);
    }
  }

  /**
   * Get all current insights
   */
  getInsights() {
    return this.insights;
  }

  /**
   * Get insights by category
   */
  getInsightsByCategory(category) {
    return this.insights.filter(i => i.category === category);
  }

  /**
   * Get high priority insights
   */
  getHighPriorityInsights() {
    return this.insights
      .filter(i => i.priority >= 8)
      .sort((a, b) => b.priority - a.priority);
  }
}

// Singleton instance
const predictiveInsights = new PredictiveInsightsEngine();

// Auto-start monitoring when imported
if (typeof window !== 'undefined') {
  predictiveInsights.startMonitoring(60); // Check every hour
}

export default predictiveInsights;