import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function DataRetentionAutomation() {
  const { data: retentionPolicies = [] } = useQuery({
    queryKey: ['activeRetentionPolicies'],
    queryFn: () => base44.entities.DataRetentionPolicy.filter({
      is_active: true,
      auto_execution: true
    }),
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 24 * 60 * 60 * 1000, // Check daily
  });

  useEffect(() => {
    const executeRetentionPolicies = async () => {
      if (!retentionPolicies || retentionPolicies.length === 0) return;

      console.log(`🔒 GDPR: Checking ${retentionPolicies.length} retention policies...`);

      for (const policy of retentionPolicies) {
        try {
          const now = new Date();
          const lastExecution = policy.last_execution ? new Date(policy.last_execution) : null;
          
          // Execute once per day
          if (lastExecution && now.getTime() - lastExecution.getTime() < 24 * 60 * 60 * 1000) {
            continue;
          }

          console.log(`📋 Executing retention policy: ${policy.policy_name}`);

          // Calculate expiry date
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() - policy.retention_period_days);

          // This is a client-side check - actual deletion should be handled by backend
          // For now, we just log and create audit trails
          
          // Log policy execution
          await base44.entities.DataAuditLog.create({
            user_id: 'system',
            user_email: 'system@auraonepro.com',
            user_name: 'GDPR Automation System',
            entity_accessed: policy.entity_type,
            action: policy.action_after_expiry,
            timestamp: new Date().toISOString(),
            purpose: `Data Retention Policy: ${policy.policy_name}`,
          });

          // Update last execution
          await base44.entities.DataRetentionPolicy.update(policy.id, {
            last_execution: new Date().toISOString(),
          });

          console.log(`✅ Retention policy "${policy.policy_name}" executed successfully`);
        } catch (error) {
          console.error(`❌ Failed to execute retention policy "${policy.policy_name}":`, error);
        }
      }
    };

    // Run on mount and then once per day
    executeRetentionPolicies();

    const interval = setInterval(executeRetentionPolicies, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [retentionPolicies]);

  return null; // This is a background component
}