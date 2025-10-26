import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserX, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { anonymiseUserData, hashData } from "./encryption";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * GDPR Right to Erasure - User Anonymisation Component
 * Handles complete user data anonymisation
 */
export default function UserAnonymisation({ userId, userEmail, onComplete }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const anonymiseUserMutation = useMutation({
    mutationFn: async (userData) => {
      return await base44.entities.User.update(userId, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });

  const createAuditLogMutation = useMutation({
    mutationFn: (logData) => base44.entities.DataAuditLog.create(logData),
  });

  const handleAnonymise = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for anonymisation');
      return;
    }

    const confirmMessage = `
⚠️ PERMANENT ACTION ⚠️

This will IRREVERSIBLY anonymise the user:
• Personal data will be replaced with hashes
• Email will be scrambled
• Name will be changed to "DELETED_USER"
• All identifying information will be removed

This action CANNOT be undone.

Type "CONFIRM DELETE" to proceed:
    `;

    const userConfirmation = prompt(confirmMessage);
    
    if (userConfirmation !== 'CONFIRM DELETE') {
      alert('Anonymisation cancelled');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // 1. Fetch user data
      const users = await base44.entities.User.filter({ email: userEmail });
      const user = users[0];

      if (!user) {
        throw new Error('User not found');
      }

      // 2. Create anonymised version
      const anonymised = await anonymiseUserData(user);

      // 3. Update user record
      await anonymiseUserMutation.mutateAsync(anonymised);

      // 4. Create audit log
      await createAuditLogMutation.mutateAsync({
        user_id: 'system',
        user_email: 'system@auraonepro.com',
        user_name: 'GDPR Anonymisation System',
        entity_accessed: 'User',
        entity_id: userId,
        action: 'delete',
        timestamp: new Date().toISOString(),
        purpose: `GDPR Right to Erasure - Reason: ${reason}`,
        data_snapshot: {
          original_email: await hashData(userEmail),
          anonymised_at: new Date().toISOString(),
          requested_by: 'admin',
          legal_basis: 'GDPR Article 17'
        }
      });

      // 5. Log privacy request completion
      const privacyRequests = await base44.entities.PrivacyRequest.filter({
        user_email: userEmail,
        request_type: 'data_deletion',
        status: 'in_progress'
      });

      for (const request of privacyRequests) {
        await base44.entities.PrivacyRequest.update(request.id, {
          status: 'completed',
          handled_at: new Date().toISOString(),
          handled_by: 'system',
          handled_by_name: 'Automated Anonymisation',
          legal_basis: 'GDPR Article 17 - Right to Erasure'
        });
      }

      setSuccess(true);
      setProcessing(false);

      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2000);

    } catch (err) {
      console.error('Anonymisation failed:', err);
      setError(err.message || 'Anonymisation failed');
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✅ User successfully anonymised. All personal data has been removed in compliance with GDPR.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <UserX className="w-5 h-5" />
          GDPR User Anonymisation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            <strong>Warning:</strong> This action permanently anonymises user data and cannot be reversed.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason for Anonymisation</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g., User requested deletion under GDPR Article 17"
            rows={3}
            required
          />
        </div>

        {error && (
          <Alert className="bg-red-100 border-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-white p-4 rounded-lg border space-y-2 text-sm">
          <p className="font-semibold text-gray-900">What will be anonymised:</p>
          <ul className="space-y-1 text-gray-600">
            <li>✓ Full name → DELETED_USER_[hash]</li>
            <li>✓ Email → deleted_[hash]@anonymised.local</li>
            <li>✓ Phone number → DELETED</li>
            <li>✓ Profile photo → Removed</li>
            <li>✓ Emergency contact → DELETED</li>
            <li>✓ All PII replaced with cryptographic hashes</li>
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            Audit logs will preserve the anonymisation event for compliance.
          </p>
        </div>

        <Button
          onClick={handleAnonymise}
          disabled={processing || !reason.trim()}
          variant="destructive"
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Anonymising User Data...
            </>
          ) : (
            <>
              <UserX className="w-4 h-4 mr-2" />
              Anonymise User (Irreversible)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}