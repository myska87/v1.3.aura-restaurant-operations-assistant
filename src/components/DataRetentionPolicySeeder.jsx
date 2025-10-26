import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";

/**
 * Seeds default GDPR-compliant data retention policies on first load
 */
export default function DataRetentionPolicySeeder() {
  const [seeded, setSeeded] = useState(false);

  const { data: existingPolicies } = useQuery({
    queryKey: ['retentionPoliciesCheck'],
    queryFn: () => base44.entities.DataRetentionPolicy.list(),
    staleTime: Infinity,
  });

  const createPolicyMutation = useMutation({
    mutationFn: (policyData) => base44.entities.DataRetentionPolicy.create(policyData),
  });

  useEffect(() => {
    const seedPolicies = async () => {
      if (seeded || !existingPolicies) return;
      if (existingPolicies.length > 0) {
        setSeeded(true);
        return;
      }

      console.log('📋 Seeding default GDPR retention policies...');

      const defaultPolicies = [
        {
          policy_name: 'Attendance Records Retention',
          entity_type: 'AttendanceRecord',
          retention_period_days: 730, // 2 years
          retention_basis: 'business_need',
          legal_reference: 'Employment records - 2 years standard',
          action_after_expiry: 'archive',
          auto_execution: true,
          is_active: true,
          created_by: 'system',
        },
        {
          policy_name: 'Document Retention',
          entity_type: 'Document',
          retention_period_days: 1095, // 3 years
          retention_basis: 'legal_requirement',
          legal_reference: 'Document retention - 3 years',
          action_after_expiry: 'archive',
          auto_execution: true,
          is_active: true,
          created_by: 'system',
        },
        {
          policy_name: 'System Logs Retention',
          entity_type: 'DataAuditLog',
          retention_period_days: 365, // 1 year
          retention_basis: 'legal_requirement',
          legal_reference: 'GDPR audit logs - 1 year minimum',
          action_after_expiry: 'delete',
          auto_execution: true,
          is_active: true,
          created_by: 'system',
        },
        {
          policy_name: 'Payroll Records Retention',
          entity_type: 'PayrollRecord',
          retention_period_days: 2190, // 6 years
          retention_basis: 'legal_requirement',
          legal_reference: 'HMRC requirement - 6 years',
          action_after_expiry: 'archive',
          auto_execution: false, // Manual review required
          is_active: true,
          created_by: 'system',
        },
        {
          policy_name: 'Chat Message Retention',
          entity_type: 'ChatMessage',
          retention_period_days: 365, // 1 year
          retention_basis: 'business_need',
          legal_reference: 'Internal communications',
          action_after_expiry: 'delete',
          auto_execution: true,
          is_active: true,
          created_by: 'system',
        },
        {
          policy_name: 'Clock Event Retention',
          entity_type: 'ClockEvent',
          retention_period_days: 730, // 2 years
          retention_basis: 'business_need',
          legal_reference: 'Time tracking records',
          action_after_expiry: 'archive',
          auto_execution: true,
          is_active: true,
          created_by: 'system',
        },
      ];

      try {
        for (const policy of defaultPolicies) {
          await createPolicyMutation.mutateAsync(policy);
        }
        console.log('✅ Default retention policies seeded successfully');
        setSeeded(true);
      } catch (error) {
        console.error('❌ Failed to seed retention policies:', error);
      }
    };

    seedPolicies();
  }, [existingPolicies, seeded, createPolicyMutation]);

  return null;
}