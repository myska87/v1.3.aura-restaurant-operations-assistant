
import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, format, subDays } from 'date-fns';

/**
 * 🔮 AURA Predictive Insights Engine
 * Forecasts operational risks using historical patterns
 */
export default function PredictiveInsightsEngine() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const generatePredictions = async () => {
      try {
        const today = new Date();

        // 1. PREDICT STOCK SHORTAGES
        const ingredients = await base44.entities.Ingredient.list();
        const lowStockItems = ingredients.filter(i => 
          (i.current_stock || 0) <= (i.reorder_point || 0) * 1.5 // Within 50% of reorder point
        );

        if (lowStockItems.length > 0) {
          for (const item of lowStockItems.slice(0, 3)) {
            const prediction = await base44.integrations.Core.InvokeLLM({
              prompt: `Analyze this ingredient stock data:
              
Item: ${item.name}
Current Stock: ${item.current_stock} ${item.unit}
Reorder Point: ${item.reorder_point} ${item.unit}
Par Level: ${item.par_level} ${item.unit}
Category: ${item.category}

Based on typical restaurant usage patterns, predict:
1. When will this run out?
2. How urgently should it be reordered?
3. What's the risk if not addressed?

Provide a brief prediction (2 sentences) and confidence level.`,
            });

            await base44.entities.AIPrediction.create({
              prediction_date: format(today, 'yyyy-MM-dd'),
              prediction_type: 'stock_shortage',
              target_date: format(addDays(today, 3), 'yyyy-MM-dd'),
              category: 'inventory',
              prediction_summary: prediction,
              confidence_level: lowStockItems.length > 5 ? 0.85 : 0.65,
              severity: item.current_stock <= item.reorder_point ? 'high' : 'medium',
              recommended_actions: [
                `Order ${item.name} from ${item.supplier_name || 'supplier'}`,
                `Check current usage rate`,
                `Review par levels for accuracy`
              ],
              data_points_used: 1,
              pattern_detected: `${item.name} approaching reorder threshold`,
            });
          }
        }

        // 2. PREDICT QUALITY DECLINE
        const qualityRecords = await base44.entities.QualityRecord.list('-created_date', 50);
        const recentScores = qualityRecords.slice(0, 10).map(q => q.score);
        const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

        if (avgRecent < 4) {
          await base44.entities.AIPrediction.create({
            prediction_date: format(today, 'yyyy-MM-dd'),
            prediction_type: 'quality_decline',
            target_date: format(addDays(today, 7), 'yyyy-MM-dd'),
            category: 'quality',
            prediction_summary: `Quality scores trending downward (average ${avgRecent.toFixed(1)}/5). Risk of declining standards if not addressed.`,
            confidence_level: 0.78,
            severity: avgRecent < 3 ? 'high' : 'medium',
            recommended_actions: [
              'Schedule quality training session',
              'Review SOPs with team',
              'Increase manager spot checks'
            ],
            data_points_used: recentScores.length,
            pattern_detected: 'Declining quality trend over 10 checks',
          });
        }

        // 3. PREDICT STAFF BURNOUT
        const attendance = await base44.entities.AttendanceRecord.list('-shift_date', 100);
        const staffHoursMap = {};

        attendance.forEach(record => {
          if (!staffHoursMap[record.staff_email]) {
            staffHoursMap[record.staff_email] = {
              email: record.staff_email,
              name: record.staff_name,
              totalHours: 0,
              shifts: 0
            };
          }
          staffHoursMap[record.staff_email].totalHours += record.total_hours || 0;
          staffHoursMap[record.staff_email].shifts += 1;
        });

        const overworkedStaff = Object.values(staffHoursMap).filter(s => s.totalHours > 50); // Over 50h/week

        if (overworkedStaff.length > 0) {
          for (const staff of overworkedStaff.slice(0, 2)) {
            await base44.entities.AIPrediction.create({
              prediction_date: format(today, 'yyyy-MM-dd'),
              prediction_type: 'staff_burnout',
              target_date: format(addDays(today, 7), 'yyyy-MM-dd'),
              category: 'staff',
              prediction_summary: `${staff.name} worked ${staff.totalHours.toFixed(0)} hours recently. Risk of burnout and performance decline.`,
              confidence_level: 0.72,
              severity: staff.totalHours > 60 ? 'high' : 'medium',
              recommended_actions: [
                `Reduce ${staff.name}'s shifts next week`,
                'Check in on wellbeing',
                'Consider hiring additional support'
              ],
              data_points_used: staff.shifts,
              pattern_detected: `${staff.shifts} shifts in recent period`,
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['aiPredictions'] });

      } catch (error) {
        console.error('[PredictiveEngine] Error:', error);
      }
    };

    // Run daily at 7 AM
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 7 && now.getMinutes() < 30) {
        generatePredictions();
      }
    }, 30 * 60 * 1000); // Check every 30 minutes

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}
