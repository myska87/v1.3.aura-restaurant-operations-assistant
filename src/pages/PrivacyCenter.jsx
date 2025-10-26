import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Download, 
  Trash2, 
  Eye, 
  Lock, 
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PrivacyCenter() {
  const queryClient = useQueryClient();
  const [requestingExport, setRequestingExport] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['myPrivacyRequests', user?.email],
    queryFn: () => base44.entities.PrivacyRequest.filter({
      user_email: user?.email
    }),
    enabled: !!user?.email,
  });

  const { data: myConsents = [] } = useQuery({
    queryKey: ['myConsents', user?.email],
    queryFn: () => base44.entities.ConsentRecord.filter({
      user_email: user?.email,
      is_active: true
    }),
    enabled: !!user?.email,
  });

  const { data: myAuditLogs = [] } = useQuery({
    queryKey: ['myAuditLogs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const logs = await base44.entities.DataAuditLog.filter({
        user_email: user.email
      });
      return logs.slice(0, 10); // Last 10 activities
    },
    enabled: !!user?.email,
  });

  const createRequestMutation = useMutation({
    mutationFn: (requestData) => base44.entities.PrivacyRequest.create(requestData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPrivacyRequests'] });
    },
  });

  const handleExportRequest = async () => {
    if (requestingExport) return;
    
    setRequestingExport(true);

    try {
      await createRequestMutation.mutateAsync({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        request_type: 'data_export',
        status: 'pending',
        priority: 'normal',
        request_details: 'User requested full data export via Privacy Center'
      });

      alert('✅ Data export request submitted! You will receive an email when your data is ready.');
    } catch (error) {
      console.error('Export request failed:', error);
      alert('❌ Failed to submit export request. Please try again.');
    }

    setRequestingExport(false);
  };

  const handleDeletionRequest = async () => {
    if (requestingDeletion) return;

    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete your account and all associated data.\n\n' +
      'This action cannot be undone.\n\n' +
      'Are you sure you want to proceed?'
    );

    if (!confirmed) return;

    setRequestingDeletion(true);

    try {
      await createRequestMutation.mutateAsync({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        request_type: 'data_deletion',
        status: 'pending',
        priority: 'urgent',
        request_details: 'User requested account deletion via Privacy Center (GDPR Right to Erasure)'
      });

      alert('✅ Deletion request submitted. A manager will review your request within 30 days as required by GDPR.');
    } catch (error) {
      console.error('Deletion request failed:', error);
      alert('❌ Failed to submit deletion request. Please try again.');
    }

    setRequestingDeletion(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Privacy Center</h1>
            <p className="text-gray-600">Manage your data and privacy preferences</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleExportRequest}>
            <CardContent className="p-6 text-center">
              <Download className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Export My Data</h3>
              <p className="text-sm text-gray-600 mb-4">Download all your personal data</p>
              <Button 
                disabled={requestingExport}
                className="w-full"
              >
                {requestingExport ? 'Requesting...' : 'Request Export'}
              </Button>
            </CardContent>
          </Card>

          <Link to={createPageUrl("PrivacyPolicy")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <FileText className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Privacy Policy</h3>
                <p className="text-sm text-gray-600 mb-4">Read our privacy policy</p>
                <Button variant="outline" className="w-full">
                  View Policy
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-red-200" onClick={handleDeletionRequest}>
            <CardContent className="p-6 text-center">
              <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Delete My Account</h3>
              <p className="text-sm text-gray-600 mb-4">Permanently remove your data</p>
              <Button 
                variant="destructive"
                disabled={requestingDeletion}
                className="w-full"
              >
                {requestingDeletion ? 'Requesting...' : 'Request Deletion'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* My Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              My Privacy Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No privacy requests yet</p>
            ) : (
              <div className="space-y-3">
                {myRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{request.request_type.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-sm text-gray-600">
                        Requested: {format(new Date(request.created_date), 'PPP')}
                      </p>
                    </div>
                    <Badge className={
                      request.status === 'completed' ? 'bg-green-100 text-green-800' :
                      request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }>
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Consents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              My Consents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myConsents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active consents</p>
            ) : (
              <div className="space-y-3">
                {myConsents.map((consent) => (
                  <div key={consent.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{consent.consent_type.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-sm text-gray-600">
                        Given: {format(new Date(consent.consent_timestamp), 'PPP')}
                      </p>
                    </div>
                    <Badge className={consent.consent_given ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {consent.consent_given ? 'Active' : 'Withdrawn'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Recent Data Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myAuditLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {myAuditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{log.action.toUpperCase()} - {log.entity_accessed}</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(log.timestamp), 'PPp')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {log.device_type || 'Unknown'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* GDPR Rights Info */}
        <Alert>
          <Lock className="w-4 h-4" />
          <AlertDescription>
            <strong>Your GDPR Rights:</strong> You have the right to access, rectify, erase, restrict processing, 
            data portability, and object to processing of your personal data. Contact us at privacy@auraonepro.com for more information.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}