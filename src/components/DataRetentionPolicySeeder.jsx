import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";

/**
 * Automatically seeds pre-configured GDPR retention policies
 * Runs once on app initialization
 */
export default function DataRetentionPolicySeeder() {
  const [seeded, setSeeded] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: existingPolicies = [] } = useQuery({
    queryKey: ['retentionPolicies'],
    queryFn: () => base44.entities.DataRetentionPolicy.list(),
    enabled: !!user && (user.role === 'admin' || user.position === 'owner'),
  });

  const createPolicyMutation = useMutation({
    mutationFn: (policy) => base44.entities.DataRetentionPolicy.create(policy),
  });

  useEffect(() => {
    const seedPolicies = async () => {
      if (seeded || !user || (user.role !== 'admin' && user.position !== 'owner')) {
        return;
      }

      if (existingPolicies.length > 0) {
        console.log('✅ Retention policies already seeded');
        setSeeded(true);
        return;
      }

      console.log('🌱 Seeding GDPR retention policies...');

      const policies = [
        {
          policy_name: 'Attendance Records Retention',
          entity_type: 'AttendanceRecord',
          retention_period_days: 730, // 2 years
          retention_basis: 'legal_requirement',
          legal_reference: 'HMRC employment records requirement',
          action_after_expiry: 'archive',
          encryption_required: true,
          auto_execution: true,
          is_active: true,
          created_by: user.email,
          dpo_approved: true
        },
        {
          policy_name: 'Document & Signature Retention',
          entity_type: 'Document',
          retention_period_days: 1095, // 3 years
          retention_basis: 'legal_requirement',
          legal_reference: 'UK document retention standards',
          action_after_expiry: 'archive',
          encryption_required: true,
          auto_execution: true,
          is_active: true,
          created_by: user.email,
          dpo_approved: true
        },
        {
          policy_name: 'System Audit Logs Retention',
          entity_type: 'DataAuditLog',
          retention_period_days: 365, // 1 year
          retention_basis: 'business_need',
          legal_reference: 'GDPR Article 5(2) - Accountability',
          action_after_expiry: 'delete',
          encryption_required: true,
          auto_execution: true,
          is_active: true,
          created_by: user.email,
          dpo_approved: true
        },
        {
          policy_name: 'Payroll & Finance Records',
          entity_type: 'PayrollRecord',
          retention_period_days: 2190, // 6 years
          retention_basis: 'legal_requirement',
          legal_reference: 'HMRC requires 6 years retention',
          action_after_expiry: 'archive',
          archive_location: 'secure_long_term_storage',
          encryption_required: true,
          auto_execution: false, // Require manual approval for payroll
          approval_required: true,
          is_active: true,
          created_by: user.email,
          dpo_approved: true
        },
        {
          policy_name: 'Clock In/Out Records',
          entity_type: 'ClockEvent',
          retention_period_days: 730, // 2 years
          retention_basis: 'legal_requirement',
          legal_reference: 'Employment records retention',
          action_after_expiry: 'delete',
          encryption_required: true,
          auto_execution: true,
          is_active: true,
          created_by: user.email,
          dpo_approved: true
        },
        {
          policy_name: 'Security Incident Logs',
          entity_type: 'SecurityIncident',
          retention_period_days: 2190, // 6 years
          retention_basis: 'legal_requirement',
          legal_reference: 'GDPR breach reporting requirements',
          action_after_expiry: 'archive',
          encryption_required: true,
          auto_execution: false,
          is_active: true,
          created_by: user.email,
          dpo_approved: true
        },
        {
          policy_name: 'Consent Records Retention',
          entity_type: 'ConsentRecord',
          retention_period_days: 2555, // 7 years
          retention_basis: 'legal_requirement',
          legal_reference: 'GDPR consent proof retention',
          action_after_expiry: 'archive',
          encryption_required: true,
          auto_execution: true,
          is_active: true,
          created_by: user.email,
          dpo_approved: true
        },
        {
          policy_name: 'Privacy Requests Archive',
          entity_type: 'PrivacyRequest',
          retention_period_days: 2190, // 6 years
          retention_basis: 'legal_requirement',
          legal_reference: 'GDPR compliance evidence',
          action_after_expiry: 'archive',
          encryption_required: true,
          auto_execution: true,
          is_active: true,
          created_by: user.email,
          dpo_approved: true
        },
        {
          policy_name: 'Inactive User Anonymisation',
          entity_type: 'User',
          retention_period_days: 1095, // 3 years of inactivity
          retention_basis: 'business_need',
          legal_reference: 'GDPR data minimisation principle',
          action_after_expiry: 'anonymise',
          encryption_required: true,
          auto_execution: false, // Require manual review
          approval_required: true,
          is_active: true,
          created_by: user.email,
          dpo_approved: true
        },
        {
          policy_name: 'Training Records Retention',
          entity_type: 'TrainingRecord',
          retention_period_days: 2190, // 6 years
          retention_basis: 'business_need',
          legal_reference: 'Employment training documentation',
          action_after_expiry: 'archive',
          encryption_required: false,
          auto_execution: true,
          is_active: true,
          created_by: user.email,
          dpo_approved: true
        }
      ];

      let created = 0;
      for (const policy of policies) {
        try {
          await createPolicyMutation.mutateAsync(policy);
          created++;
        } catch (error) {
          console.error(`Failed to create policy: ${policy.policy_name}`, error);
        }
      }

      console.log(`✅ Seeded ${created}/${policies.length} retention policies`);
      setSeeded(true);
    };

    seedPolicies();
  }, [user, existingPolicies, seeded]);

  return null; // This is a background component
}