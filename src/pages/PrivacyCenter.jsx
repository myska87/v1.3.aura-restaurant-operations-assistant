import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Trash2,
  Shield,
  Eye,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Home,
  FileText,
  Mail,
  Clock,
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

  const { data: complianceUser } = useQuery({
    queryKey: ['complianceUser', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const results = await base44.entities.ComplianceUser.filter({ user_email: user.email });
      return results[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: privacyRequests = [] } = useQuery({
    queryKey: ['privacyRequests', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.CompliancePrivacyRequest.filter({ user_email: user.email }, '-requested_at');
    },
    enabled: !!user?.email,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['userAuditLogs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const logs = await base44.entities.ComplianceAudit.filter({ user_email: user.email }, '-created_date', 50);
      return logs;
    },
    enabled: !!user?.email,
  });

  const createPrivacyRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.CompliancePrivacyRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacyRequests'] });
    },
  });

  const handleRequestExport = async () => {
    if (!user) return;

    const hasPendingExport = privacyRequests.some(
      r => r.request_type === 'data_export' && r.status === 'pending'
    );

    if (hasPendingExport) {
      alert('⏳ You already have a pending data export request. Please wait for it to be processed.');
      return;
    }

    setRequestingExport(true);

    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await createPrivacyRequestMutation.mutateAsync({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        request_type: 'data_export',
        request_description: 'User requested full data export (GDPR Article 15)',
        status: 'pending',
        requested_at: new Date().toISOString(),
        due_date: dueDate.toISOString().split('T')[0],
        priority: 'normal',
      });

      alert('✅ Data export request submitted! You will receive your data within 30 days.');
    } catch (error) {
      console.error('Error requesting export:', error);
      alert('❌ Failed to submit export request. Please try again.');
    } finally {
      setRequestingExport(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user) return;

    const confirmed = confirm(
      '⚠️ Are you sure you want to delete your account?\n\n' +
      'This action will:\n' +
      '• Schedule your account for deletion in 30 days\n' +
      '• Remove all your personal data\n' +
      '• Cannot be undone after 30 days\n\n' +
      'Click OK to proceed with deletion request.'
    );

    if (!confirmed) return;

    setRequestingDeletion(true);

    try {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 30);

      await createPrivacyRequestMutation.mutateAsync({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        request_type: 'data_deletion',
        request_description: 'User requested account and data deletion (GDPR Article 17 - Right to Erasure)',
        status: 'pending',
        requested_at: new Date().toISOString(),
        due_date: scheduledDate.toISOString().split('T')[0],
        priority: 'urgent',
        requires_manager_approval: true,
      });

      alert('✅ Deletion request submitted!\n\nYour account is scheduled for deletion in 30 days.\nYou can cancel this request within the next 30 days.');
    } catch (error) {
      console.error('Error requesting deletion:', error);
      alert('❌ Failed to submit deletion request. Please try again.');
    } finally {
      setRequestingDeletion(false);
    }
  };

  const pendingExportRequest = privacyRequests.find(
    r => r.request_type === 'data_export' && r.status === 'pending'
  );

  const pendingDeletionRequest = privacyRequests.find(
    r => r.request_type === 'data_deletion' && (r.status === 'pending' || r.status === 'in_progress')
  );

  const completedExports = privacyRequests.filter(
    r => r.request_type === 'data_export' && r.status === 'completed'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("ComplianceDashboard")}>
            <Button variant="outline" size="sm">
              <Shield className="w-4 h-4 mr-2" />
              Compliance Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Privacy Center</h1>
              <p className="text-gray-600">Manage your data and privacy preferences</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {pendingDeletionRequest && (
          <Alert className="bg-red-50 border-red-200 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Account Deletion Scheduled</strong>
              <br />
              Your account is scheduled for deletion on{' '}
              <strong>{format(new Date(pendingDeletionRequest.due_date), 'PPP')}</strong>.
              Contact support to cancel this request.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">My Data</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Data Export Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    Export Your Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Request a complete copy of all your personal data stored in AURA.
                    You'll receive a downloadable file within 30 days.
                  </p>

                  {pendingExportRequest ? (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        Export request pending. Due by{' '}
                        {format(new Date(pendingExportRequest.due_date), 'MMM d, yyyy')}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Button
                      onClick={handleRequestExport}
                      disabled={requestingExport}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {requestingExport ? 'Submitting...' : 'Request Data Export'}
                    </Button>
                  )}

                  {completedExports.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800 font-medium mb-2">
                        ✅ Previous Exports Available
                      </p>
                      {completedExports.slice(0, 3).map((exp) => (
                        <div key={exp.id} className="flex justify-between items-center text-xs text-green-700 mb-1">
                          <span>{format(new Date(exp.requested_at), 'MMM d, yyyy')}</span>
                          {exp.export_file_url && (
                            <a
                              href={exp.export_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              Download
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delete Account Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    Delete Your Account
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Permanently delete your account and all associated data.
                    This action is irreversible after 30 days.
                  </p>

                  {pendingDeletionRequest ? (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">
                        Deletion scheduled for{' '}
                        {format(new Date(pendingDeletionRequest.due_date), 'MMM d, yyyy')}.
                        Contact support to cancel.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Button
                      onClick={handleRequestDeletion}
                      disabled={requestingDeletion}
                      variant="destructive"
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {requestingDeletion ? 'Submitting...' : 'Request Account Deletion'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Consent Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Consent & Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Privacy Policy</p>
                      <p className="text-xs text-gray-600">
                        Accepted: {complianceUser?.consent_timestamp 
                          ? format(new Date(complianceUser.consent_timestamp), 'PPP')
                          : 'Not yet accepted'}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Version {complianceUser?.consent_version || '1.0'}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Marketing Communications</p>
                      <p className="text-xs text-gray-600">Receive promotional emails</p>
                    </div>
                    <Badge className={complianceUser?.marketing_consent ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {complianceUser?.marketing_consent ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Personal Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Full Name</p>
                      <p className="font-medium text-gray-900">{user?.full_name || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Email Address</p>
                      <p className="font-medium text-gray-900">{user?.email || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Position</p>
                      <p className="font-medium text-gray-900">{user?.position || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Department</p>
                      <p className="font-medium text-gray-900">{user?.department || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Phone</p>
                      <p className="font-medium text-gray-900">{user?.phone || 'Not provided'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Hire Date</p>
                      <p className="font-medium text-gray-900">
                        {user?.hire_date ? format(new Date(user.hire_date), 'PPP') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                      Your data is processed in accordance with GDPR regulations.
                      We store only essential information required for employment and operations.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Requests History</CardTitle>
              </CardHeader>
              <CardContent>
                {privacyRequests.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No privacy requests yet</p>
                ) : (
                  <div className="space-y-3">
                    {privacyRequests.map((request) => (
                      <div key={request.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">
                              {request.request_type.replace(/_/g, ' ').toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-600">
                              Requested: {format(new Date(request.requested_at), 'PPP')}
                            </p>
                          </div>
                          <Badge
                            className={
                              request.status === 'completed' ? 'bg-green-100 text-green-800' :
                              request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>
                        {request.completion_notes && (
                          <p className="text-sm text-gray-700 mt-2">{request.completion_notes}</p>
                        )}
                        {request.export_file_url && request.status === 'completed' && (
                          <a
                            href={request.export_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-2 text-sm text-blue-600 hover:underline"
                          >
                            <Download className="w-4 h-4" />
                            Download Your Data
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No activity logs yet</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium text-gray-900">
                            {log.action_description || log.action}
                          </p>
                          <p className="text-xs text-gray-600">
                            {log.module_name} • {format(new Date(log.created_date), 'PPP p')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {log.action}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}