import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Download, 
  Trash2, 
  Eye, 
  Lock, 
  FileText, 
  Check, 
  AlertTriangle,
  History,
  Home,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function PrivacyCenter() {
  const queryClient = useQueryClient();
  const [requestingExport, setRequestingExport] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get user's privacy requests
  const { data: privacyRequests = [] } = useQuery({
    queryKey: ['myPrivacyRequests', user?.email],
    queryFn: () => base44.entities.PrivacyRequest.filter({
      user_email: user?.email
    }),
    enabled: !!user?.email,
  });

  // Get user's consent records
  const { data: consentRecords = [] } = useQuery({
    queryKey: ['myConsentRecords', user?.email],
    queryFn: () => base44.entities.ConsentRecord.filter({
      user_email: user?.email
    }),
    enabled: !!user?.email,
  });

  // Get audit logs for this user
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['myAuditLogs', user?.id],
    queryFn: () => base44.entities.DataAuditLog.filter({
      entity_id: user?.id
    }),
    enabled: !!user?.id,
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      // Create export request
      const request = await base44.entities.PrivacyRequest.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        request_type: 'data_export',
        status: 'pending',
        request_details: 'User requested full data export from Privacy Center',
      });

      // Log the action
      await base44.entities.DataAuditLog.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        entity_accessed: 'PrivacyRequest',
        entity_id: request.id,
        action: 'create',
        timestamp: new Date().toISOString(),
        purpose: 'GDPR Data Export Request',
      });

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPrivacyRequests'] });
      alert('✅ Data export requested! You will receive an email with a secure download link within 24 hours.');
      setRequestingExport(false);
    },
  });

  const deletionRequestMutation = useMutation({
    mutationFn: async () => {
      // Create deletion request
      const request = await base44.entities.PrivacyRequest.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        request_type: 'data_deletion',
        status: 'pending',
        priority: 'urgent',
        request_details: 'User exercised right to be forgotten (GDPR Article 17)',
      });

      // Log the action
      await base44.entities.DataAuditLog.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        entity_accessed: 'PrivacyRequest',
        entity_id: request.id,
        action: 'create',
        timestamp: new Date().toISOString(),
        purpose: 'GDPR Right to Erasure Request',
      });

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPrivacyRequests'] });
      alert('✅ Deletion request submitted. Our Data Protection Officer will review your request within 48 hours.');
      setRequestingDeletion(false);
    },
  });

  const handleExportData = () => {
    if (confirm('📦 Export all your personal data?\n\nYou will receive a secure link via email within 24 hours.')) {
      exportDataMutation.mutate();
    }
  };

  const handleRequestDeletion = () => {
    if (confirm('⚠️ REQUEST DATA DELETION?\n\nThis will permanently delete your account and all associated data. This action CANNOT be undone.\n\nAre you absolutely sure?')) {
      if (confirm('⚠️ FINAL CONFIRMATION\n\nOnce deleted, you will not be able to access AURA One Pro anymore. Continue?')) {
        deletionRequestMutation.mutate();
      }
    }
  };

  const getRequestStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#014D40]" />
            Privacy Center
          </h1>
          <p className="text-gray-600">Your data, your rights, your control.</p>
        </div>

        {/* Privacy Info Alert */}
        <Alert className="bg-blue-50 border-blue-200 mb-8">
          <Shield className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Your Privacy Matters.</strong> AURA One Pro is fully GDPR compliant. You have complete control over your personal data.
          </AlertDescription>
        </Alert>

        {/* Main Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  View Your Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  See exactly what personal data we store about you.
                </p>
                <div className="space-y-2 text-sm">
                  <p>✅ Personal Profile</p>
                  <p>✅ Work History</p>
                  <p>✅ Training Records</p>
                  <p>✅ Activity Logs</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-600" />
                  Export Your Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Download all your data in a portable format.
                </p>
                <Button
                  onClick={handleExportData}
                  disabled={exportDataMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {exportDataMutation.isPending ? 'Requesting...' : 'Request Export'}
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Delivered securely within 24 hours
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  Delete Your Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Permanently remove all your personal data.
                </p>
                <Button
                  onClick={handleRequestDeletion}
                  disabled={deletionRequestMutation.isPending}
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                >
                  {deletionRequestMutation.isPending ? 'Requesting...' : 'Request Deletion'}
                </Button>
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ This action cannot be undone
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Consent Records */}
        <Card className="bg-white border-none shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#014D40]" />
              Your Consent History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {consentRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No consent records found</p>
            ) : (
              <div className="space-y-3">
                {consentRecords.map((consent) => (
                  <div key={consent.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {consent.consent_type.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Version {consent.consent_version} • {format(new Date(consent.consent_timestamp), 'PPP p')}
                      </p>
                    </div>
                    <Badge className={consent.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {consent.consent_given && consent.is_active ? 'Active' : 'Withdrawn'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Requests */}
        <Card className="bg-white border-none shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#014D40]" />
              Your Privacy Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {privacyRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No privacy requests yet</p>
            ) : (
              <div className="space-y-3">
                {privacyRequests.map((request) => (
                  <div key={request.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {request.request_type.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Requested: {format(new Date(request.created_date), 'PPP p')}
                        </p>
                      </div>
                      <Badge className={getRequestStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    
                    {request.handled_at && (
                      <p className="text-sm text-gray-600">
                        Completed: {format(new Date(request.handled_at), 'PPP p')}
                      </p>
                    )}
                    
                    {request.export_file_url && (
                      <div className="mt-3">
                        <a 
                          href={request.export_file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Your Data
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          Expires: {request.export_expires_at ? format(new Date(request.export_expires_at), 'PPP') : 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#014D40]" />
              Recent Data Access Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <p className="font-medium text-gray-900">
                        {log.action.toUpperCase()} - {log.entity_accessed}
                      </p>
                      <p className="text-gray-600">
                        {format(new Date(log.timestamp), 'PPP p')}
                      </p>
                    </div>
                    <Badge variant="outline">{log.device_type || 'Unknown'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Policy Link */}
        <div className="mt-8 text-center">
          <Link to={createPageUrl("PrivacyPolicy")} className="text-[#014D40] hover:underline flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            Read our full Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}