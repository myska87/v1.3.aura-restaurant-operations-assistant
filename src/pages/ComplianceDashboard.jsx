import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  TrendingUp,
  Download,
  ArrowLeft,
  Home,
  Eye,
  Mail,
  Database,
  Lock,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ComplianceDashboard() {
  const [timeRange, setTimeRange] = useState('24h');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isComplianceOfficer = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: securityIncidents = [] } = useQuery({
    queryKey: ['securityIncidents', timeRange],
    queryFn: async () => {
      const incidents = await base44.entities.ComplianceSecurityIncident.list('-created_date', 100);
      const cutoffDate = subDays(new Date(), timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30);
      return incidents.filter(i => new Date(i.created_date) >= cutoffDate);
    },
    enabled: isComplianceOfficer,
  });

  const { data: privacyRequests = [] } = useQuery({
    queryKey: ['allPrivacyRequests'],
    queryFn: () => base44.entities.CompliancePrivacyRequest.list('-requested_at', 100),
    enabled: isComplianceOfficer,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['recentAuditLogs', timeRange],
    queryFn: async () => {
      const logs = await base44.entities.ComplianceAudit.list('-created_date', 100);
      const cutoffDate = subDays(new Date(), timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30);
      return logs.filter(l => new Date(l.created_date) >= cutoffDate);
    },
    enabled: isComplianceOfficer,
  });

  const { data: complianceUsers = [] } = useQuery({
    queryKey: ['allComplianceUsers'],
    queryFn: () => base44.entities.ComplianceUser.list(),
    enabled: isComplianceOfficer,
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ['recentEmailLogs', timeRange],
    queryFn: async () => {
      const logs = await base44.entities.ComplianceEmailLog.list('-sent_at', 50);
      const cutoffDate = subDays(new Date(), timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30);
      return logs.filter(l => new Date(l.sent_at) >= cutoffDate);
    },
    enabled: isComplianceOfficer,
  });

  if (!isComplianceOfficer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <Lock className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">
                This page is only accessible to Compliance Officers and Administrators.
              </p>
              <div className="flex gap-3 justify-center">
                <Link to={createPageUrl("Dashboard")}>
                  <Button>
                    <Home className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
                <Link to={createPageUrl("PrivacyCenter")}>
                  <Button variant="outline">
                    <Shield className="w-4 h-4 mr-2" />
                    Privacy Center
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = {
    totalUsers: complianceUsers.length,
    activeConsents: complianceUsers.filter(u => u.gdpr_compliant).length,
    pendingExports: privacyRequests.filter(r => r.request_type === 'data_export' && r.status === 'pending').length,
    pendingDeletions: privacyRequests.filter(r => r.request_type === 'data_deletion' && r.status === 'pending').length,
    openIncidents: securityIncidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
    criticalIncidents: securityIncidents.filter(i => i.severity === 'critical').length,
    totalAuditLogs: auditLogs.length,
    sensitiveAccess: auditLogs.filter(l => l.is_sensitive).length,
    emailsSent: emailLogs.length,
    emailsWithPII: emailLogs.filter(e => e.contains_personal_data).length,
  };

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
          <Link to={createPageUrl("PrivacyCenter")}>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              My Privacy
            </Button>
          </Link>
          <Link to={createPageUrl("EmailIntegrationHub")}>
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              Email Hub
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Compliance Dashboard</h1>
                <p className="text-gray-600">GDPR, Privacy & Security Monitoring</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={timeRange === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('24h')}
            >
              24h
            </Button>
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7d
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30d
            </Button>
          </div>
        </div>

        {/* Critical Alerts */}
        {stats.criticalIncidents > 0 && (
          <Alert className="bg-red-50 border-red-200 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>⚠️ {stats.criticalIncidents} Critical Security Incident(s)</strong>
              <br />
              Requires immediate attention. Review security incidents below.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Active Consents</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeConsents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.pendingExports + stats.pendingDeletions}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Open Incidents</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.openIncidents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Database className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Audit Events</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAuditLogs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Privacy Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Privacy Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {privacyRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No privacy requests</p>
              ) : (
                <div className="space-y-2">
                  {privacyRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{request.user_name}</p>
                        <p className="text-xs text-gray-600">
                          {request.request_type.replace(/_/g, ' ')} • {format(new Date(request.requested_at), 'MMM d')}
                        </p>
                      </div>
                      <Badge
                        className={
                          request.status === 'completed' ? 'bg-green-100 text-green-800' :
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Incidents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Security Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {securityIncidents.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No incidents reported</p>
              ) : (
                <div className="space-y-2">
                  {securityIncidents.slice(0, 5).map((incident) => (
                    <div key={incident.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{incident.title}</p>
                        <p className="text-xs text-gray-600">
                          {incident.incident_type.replace(/_/g, ' ')} • {format(new Date(incident.created_date), 'MMM d')}
                        </p>
                      </div>
                      <Badge
                        className={
                          incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {incident.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audit Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Recent Audit Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No audit logs</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {log.user_name} • {log.action}
                      </p>
                      <p className="text-xs text-gray-600">
                        {log.module_name} • {format(new Date(log.created_date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    {log.is_sensitive && (
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        Sensitive
                      </Badge>
                    )}
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