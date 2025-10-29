
import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { differenceInDays, parseISO, startOfWeek, format } from 'date-fns';

/**
 * 🤖 AI Compliance Summary Generator
 * Creates weekly compliance risk summary
 */
export default function AIComplianceSummary() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const generateSummary = async () => {
      try {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');

        // Check if summary already created this week
        const existingSummary = await base44.entities.AnalyticsInsight.filter({
          insight_date: weekStartStr,
          category: 'compliance'
        });

        if (existingSummary.length > 0) return;

        // Get compliance documents
        const documents = await base44.entities.ComplianceDocument.list();
        
        const expiringSoon = documents.filter(doc => {
          if (!doc.expiry_date) return false;
          const days = differenceInDays(parseISO(doc.expiry_date), new Date());
          return days > 0 && days <= 30;
        });

        const expired = documents.filter(doc => {
          if (!doc.expiry_date) return false;
          return differenceInDays(parseISO(doc.expiry_date), new Date()) < 0;
        });

        const requiresAcknowledgment = documents.filter(d => d.requires_acknowledgment);
        const fullyAcknowledged = requiresAcknowledgment.filter(d => (d.acknowledged_by?.length || 0) >= 5);

        // Generate AI summary
        let summaryMessage = '';
        let severity = 'info';
        let insightType = 'recommendation';

        if (expired.length > 0) {
          summaryMessage = `⚠️ ${expired.length} certificate(s) have expired: ${expired.map(d => d.title).join(', ')}. Immediate renewal required.`;
          severity = 'critical';
          insightType = 'warning';
        } else if (expiringSoon.length > 0) {
          summaryMessage = `📋 ${expiringSoon.length} certificate(s) expiring within 30 days: ${expiringSoon.map(d => `${d.title} (${differenceInDays(parseISO(d.expiry_date), new Date())} days)`).join(', ')}.`;
          severity = 'warning';
          insightType = 'warning';
        } else {
          summaryMessage = `✅ All compliance documents are up to date. No urgent renewals required.`;
          severity = 'positive';
          insightType = 'achievement';
        }

        // Create insight
        await base44.entities.AnalyticsInsight.create({
          insight_date: weekStartStr,
          insight_type: insightType,
          category: 'compliance',
          title: 'Weekly Compliance Status',
          message: summaryMessage,
          severity,
          metric_name: 'compliance_status',
          current_value: documents.length - expired.length,
          previous_value: documents.length,
          recommended_actions: expired.length > 0 
            ? [`Renew ${expired[0]?.title}`, 'Contact issuing authority', 'Schedule renewal ASAP']
            : expiringSoon.length > 0
              ? ['Begin renewal process', 'Prepare required documentation', 'Budget for renewal costs']
              : ['Maintain current compliance standards'],
          priority: expired.length > 0 ? 9 : expiringSoon.length > 0 ? 7 : 5,
          auto_generated: true,
          is_posted_to_feed: true,
        });

        // Post to EventHub if critical
        if (expired.length > 0 || expiringSoon.length >= 3) {
          await base44.entities.Event.create({
            source_module: 'ai',
            event_type: 'ai_insight',
            title: 'Compliance Risk Alert',
            message: summaryMessage,
            severity: severity === 'critical' ? 'critical' : 'warning',
            recipient_roles: ['manager', 'owner'],
            status: 'unread',
            linked_entity_type: 'AnalyticsInsight',
            action_url: createPageUrl('ComplianceCore'),
          });
        }

        queryClient.invalidateQueries({ queryKey: ['analyticsInsights'] });

      } catch (error) {
        console.error('[AIComplianceSummary] Error:', error);
      }
    };

    // Run weekly on Monday at 9 AM
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() < 30) {
        generateSummary();
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}
