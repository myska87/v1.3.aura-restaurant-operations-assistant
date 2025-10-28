import { useSOPCoreContext } from '../SOPCoreProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useSOPCertification(staffEmail) {
  const context = useSOPCoreContext();
  const queryClient = useQueryClient();

  // Get certifications for specific staff
  const myCertifications = context.certifications.filter(
    cert => cert.staff_email === staffEmail
  );

  // Get signatures for specific staff
  const mySignatures = context.signatures.filter(
    sig => sig.staff_email === staffEmail
  );

  // Complete Certification Mutation
  const completeCertificationMutation = useMutation({
    mutationFn: async ({ certificationId, signatureData }) => {
      // Create signature log
      const signature = await base44.entities.SOPSignatureLog.create(signatureData);

      // Update certification
      await base44.entities.SOPCertification.update(certificationId, {
        status: 'completed',
        completed_date: new Date().toISOString(),
        signature_log_id: signature.id,
      });

      return { signature, certificationId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sopcore-certifications'] });
      queryClient.invalidateQueries({ queryKey: ['sopcore-signatures'] });
    },
  });

  return {
    // Data
    myCertifications,
    mySignatures,
    pendingCount: myCertifications.filter(c => c.status === 'pending').length,
    completedCount: myCertifications.filter(c => c.status === 'completed').length,
    completionRate: myCertifications.length > 0
      ? Math.round((myCertifications.filter(c => c.status === 'completed').length / myCertifications.length) * 100)
      : 0,

    // Methods
    completeCertification: completeCertificationMutation.mutate,
    isCompleting: completeCertificationMutation.isPending,

    // Helpers
    hasSigned: (sopId) => mySignatures.some(sig => sig.sop_id === sopId),
    getCertification: (sopId) => myCertifications.find(cert => cert.sop_id === sopId),
  };
}