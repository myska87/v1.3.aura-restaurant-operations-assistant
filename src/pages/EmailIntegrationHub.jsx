import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  ArrowLeft,
  Home,
  Shield,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmailIntegrationHub() {
  const queryClient = useQueryClient();
  const [testEmail, setTestEmail] = useState("");
  const [testSubject, setTestSubject] = useState("Test Email from AURA");
  const [testBody, setTestBody] = useState("This is a test email from the AURA system.");
  const [sendingTest, setSendingTest] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAuthorized = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: gmailConnections = [] } = useQuery({
    queryKey: ['gmailConnections'],
    queryFn: () => base44.entities.ComplianceGmailConnection.list(),
    enabled: isAuthorized,
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ['emailLogs'],
    queryFn: () => base44.entities.ComplianceEmailLog.list('-sent_at', 50),
    enabled: isAuthorized,
  });

  const createEmailLogMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceEmailLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
    },
  });

  const handleSendTestEmail = async () => {
    if (!testEmail || !testSubject) {
      alert('⚠️ Please enter recipient email and subject');
      return;
    }

    setSendingTest(true);

    try {
      // Create email log entry
      await createEmailLogMutation.mutateAsync({
        email_type: 'other',
        recipient_email: testEmail,
        recipient_name: 'Test Recipient',
        subject: testSubject,
        body_preview: testBody.substring(0, 200),
        sent_by_user_id: user.id,
        sent_by_email: user.email,
        sent_by_name: user.full_name,
        sent_via: 'system',
        sent_at: new Date().toISOString(),
        delivery_status: 'sent',
        contains_personal_data: false,
      });

      // Create mailto link and open email client
      const mailtoLink = `mailto:${testEmail}?subject=${encodeURIComponent(testSubject)}&body=${encodeURIComponent(testBody)}`;
      window.location.href = mailtoLink;

      alert('✅ Email client opened! Email logged successfully.\n\n(Note: Full Gmail integration requires OAuth setup)');
      setTestEmail("");
      setTestBody("This is a test email from the AURA system.");
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('❌ Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">
                This page is only accessible to Managers and Administrators.
              </p>
              <Link to={createPageUrl("Dashboard")}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeConnection = gmailConnections.find(c => c.connection_status === 'active');
  const totalEmailsSent = emailLogs.length;
  const emailsDelivered = emailLogs.filter(e => e.delivery_status === 'delivered' || e.delivery_status === 'sent').length;
  const emailsFailed = emailLogs.filter(e => e.delivery_status === 'failed' || e.delivery_status === 'bounced').length;
  const emailsWithPII = emailLogs.filter(e => e.contains_personal_data).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
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
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Email Integration Hub</h1>
              <p className="text-gray-600">Gmail connectivity and email logging</p>
            </div>
          </div>
        </div>

        {/* Connection Status Alert */}
        {!activeConnection ? (
          <Alert className="bg-yellow-50 border-yellow-200 mb-6">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Gmail Not Connected</strong>
              <br />
              Connect your Gmail account to send emails directly from AURA.
              OAuth setup required.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-green-50 border-green-200 mb-6">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>✅ Gmail Connected:</strong> {activeConnection.gmail_account}
              <br />
              Last used: {format(new Date(activeConnection.last_used_at || activeConnection.connected_at), 'PPP')}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{totalEmailsSent}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Delivered</p>
                  <p className="text-2xl font-bold text-gray-900">{emailsDelivered}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-gray-900">{emailsFailed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">With PII</p>
                  <p className="text-2xl font-bold text-gray-900">{emailsWithPII}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Send Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-green-600" />
                Send Test Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="testEmail">Recipient Email</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <Label htmlFor="testSubject">Subject</Label>
                <Input
                  id="testSubject"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="testBody">Message</Label>
                <Textarea
                  id="testBody"
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                onClick={handleSendTestEmail}
                disabled={sendingTest}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendingTest ? 'Sending...' : 'Send Test Email'}
              </Button>
            </CardContent>
          </Card>

          {/* Connection Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                Connection Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeConnection ? (
                <>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-green-900">Active Connection</p>
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    </div>
                    <p className="text-sm text-green-700">{activeConnection.gmail_account}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {activeConnection.emails_sent_count || 0} emails sent
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" disabled>
                    <XCircle className="w-4 h-4 mr-2" />
                    Disconnect Gmail
                  </Button>
                </>
              ) : (
                <>
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      Gmail OAuth integration requires backend setup.
                      Contact your system administrator.
                    </AlertDescription>
                  </Alert>
                  <Button className="w-full" disabled>
                    <Mail className="w-4 h-4 mr-2" />
                    Connect Gmail Account
                  </Button>
                </>
              )}
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">How Email Integration Works</h4>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>All emails are automatically logged for compliance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Purchase orders can be emailed directly to suppliers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Staff notifications sent via system</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Full Gmail OAuth integration coming soon</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Recent Email Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emailLogs.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-2">No emails logged yet</p>
                <p className="text-sm text-gray-400">Send a test email to see it appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {emailLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{log.subject}</p>
                      <p className="text-xs text-gray-600">
                        To: {log.recipient_email} • {format(new Date(log.sent_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.contains_personal_data && (
                        <Badge className="bg-purple-100 text-purple-800 text-xs">PII</Badge>
                      )}
                      <Badge
                        className={
                          log.delivery_status === 'delivered' || log.delivery_status === 'sent' 
                            ? 'bg-green-100 text-green-800' 
                            : log.delivery_status === 'failed' || log.delivery_status === 'bounced'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {log.delivery_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}