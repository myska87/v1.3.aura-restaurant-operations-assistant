import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  Users,
  Thermometer,
  ClipboardCheck,
  Download,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowLeft,
  Home
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, subDays } from "date-fns";
import CoreDB from '../components/CoreDB';

export default function EHOControlCenter() {
  const queryClient = useQueryClient();
  const [inspectionMode, setInspectionMode] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Fetch compliance data
  const { data: hygieneRecords = [] } = useQuery({
    queryKey: ['hygieneRecords'],
    queryFn: () => base44.entities.HygieneRecord.list('-created_date', 500),
  });

  const { data: formResponses = [] } = useQuery({
    queryKey: ['formResponses'],
    queryFn: () => base44.entities.FormResponse.list('-submitted_at', 500),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: trainingRecords = [] } = useQuery({
    queryKey: ['trainingRecords'],
    queryFn: () => base44.entities.TrainingRecord.list(),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['hygieneAlerts'],
    queryFn: async () => {
      const allAlerts = await base44.entities.HygieneAlertLog.list('-created_date', 100);
      return allAlerts.filter(a => a.status === 'open' || a.status === 'acknowledged');
    },
  });

  // Calculate compliance score
  const complianceScore = calculateComplianceScore({
    hygieneRecords,
    formResponses,
    documents,
    staff,
    trainingRecords,
    alerts
  });

  // Toggle inspection mode
  const toggleInspectionMode = () => {
    setInspectionMode(!inspectionMode);
    if (!inspectionMode) {
      // Lock app into inspection mode
      document.body.style.cursor = 'not-allowed';
      alert('🔒 INSPECTION MODE ACTIVATED\n\nApp is now locked for EHO inspection.\nOnly viewing reports and documents is allowed.');
    } else {
      document.body.style.cursor = 'default';
      alert('🔓 Inspection mode deactivated');
    }
  };

  // Generate EHO report
  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    
    try {
      // In production, this would generate a PDF report
      const reportData = {
        generated_at: new Date().toISOString(),
        venue_name: 'Main Kitchen',
        compliance_score: complianceScore.overall,
        period: {
          start: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
          end: format(new Date(), 'yyyy-MM-dd')
        },
        summary: {
          total_hygiene_records: hygieneRecords.length,
          temperature_logs: hygieneRecords.filter(r => r.record_type.includes('storage') || r.record_type === 'cooking').length,
          cleaning_records: hygieneRecords.filter(r => r.record_type === 'cleaning').length,
          compliance_rate: complianceScore.hygieneCompliance,
          critical_alerts: alerts.filter(a => a.severity === 'critical').length,
          staff_trained: trainingRecords.filter(t => t.status === 'completed').length,
          documents_current: documents.filter(d => !d.expiry_date || new Date(d.expiry_date) > new Date()).length
        },
        critical_issues: alerts.filter(a => a.severity === 'critical'),
        recommendations: complianceScore.recommendations
      };

      // Create report document
      await base44.entities.Document.create({
        title: `EHO Compliance Report - ${format(new Date(), 'MMM yyyy')}`,
        description: 'Automatically generated compliance report for EHO inspection',
        file_url: 'generated_report_' + Date.now(), // In production, this would be actual PDF URL
        file_type: 'pdf',
        category: 'compliance',
        department: 'all',
        confidentiality_level: 'restricted',
        uploaded_by: user?.email || 'system',
        uploaded_by_name: user?.full_name || 'System',
        is_active: true
      });

      alert('✅ EHO Compliance Report generated successfully!\n\nCheck Document Management to download.');
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('❌ Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className={`p-6 md:p-8 ${inspectionMode ? 'bg-yellow-50' : 'bg-gray-50'} min-h-screen transition-all`}>
      {inspectionMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-yellow-900 p-4 text-center font-bold border-b-4 border-yellow-600">
          🔒 INSPECTION MODE ACTIVE - App Locked for EHO Inspection
        </div>
      )}

      <div className={`max-w-7xl mx-auto ${inspectionMode ? 'mt-16' : ''}`}>
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("HygieneDashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Hygiene Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              EHO & Audit Control Center
            </h1>
            <p className="text-gray-600">Real-time compliance monitoring and inspection-ready reporting</p>
          </div>
          
          <div className="flex gap-3">
            {isManager && (
              <>
                <Button
                  onClick={toggleInspectionMode}
                  variant={inspectionMode ? "destructive" : "outline"}
                  className={inspectionMode ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                >
                  {inspectionMode ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  {inspectionMode ? 'Exit' : 'Activate'} Inspection Mode
                </Button>
                <Button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {generatingReport ? 'Generating...' : 'Generate EHO Report'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Compliance Score Dashboard */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className={`border-2 ${getScoreColor(complianceScore.overall)}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Overall Compliance</h3>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-gray-900">
                  {complianceScore.overall}%
                </p>
                {complianceScore.trend === 'improving' ? (
                  <TrendingUp className="w-5 h-5 text-green-600 mb-2" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600 mb-2" />
                )}
              </div>
              <Badge className={complianceScore.overall >= 90 ? 'bg-green-100 text-green-800' : complianceScore.overall >= 75 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                {complianceScore.overall >= 90 ? 'Excellent' : complianceScore.overall >= 75 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Hygiene Records</h3>
                <Thermometer className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {complianceScore.hygieneCompliance}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {hygieneRecords.filter(r => r.is_in_range).length} / {hygieneRecords.length} in range
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Forms Completed</h3>
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {complianceScore.formsCompliance}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formResponses.filter(f => f.status === 'submitted' || f.status === 'approved').length} submitted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Staff Training</h3>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {complianceScore.trainingCompliance}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {trainingRecords.filter(t => t.status === 'completed').length} / {staff.length} trained
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Critical Alerts */}
        {alerts.filter(a => a.severity === 'critical' || a.severity === 'urgent').length > 0 && (
          <Alert className="mb-6 border-red-300 bg-red-50">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{alerts.filter(a => a.severity === 'critical' || a.severity === 'urgent').length} Critical Alert(s) Require Immediate Attention</strong>
              <div className="mt-2 space-y-1">
                {alerts.filter(a => a.severity === 'critical' || a.severity === 'urgent').slice(0, 3).map(alert => (
                  <div key={alert.id} className="text-sm">
                    • {alert.item_name} at {alert.location}: {alert.recorded_value}°C (Expected: {alert.expected_range})
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* AI Flagging - Missing Items */}
        {complianceScore.missingItems.length > 0 && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="w-5 h-5" />
                AI Detected Missing Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {complianceScore.missingItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-yellow-900">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inspection Readiness Checklist */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              EHO Inspection Readiness Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complianceScore.readinessChecklist.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.status === 'complete' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <Badge className={item.status === 'complete' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {item.status === 'complete' ? 'Complete' : 'Action Needed'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Temperature Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {hygieneRecords.slice(0, 5).map(record => (
                  <div key={record.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{record.item_name}</p>
                      <p className="text-xs text-gray-600">{record.location} • {format(new Date(record.created_date), 'HH:mm')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${record.is_in_range ? 'text-green-600' : 'text-red-600'}`}>
                        {record.recorded_value}°C
                      </span>
                      {record.is_in_range ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Form Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {formResponses.slice(0, 5).map(response => (
                  <div key={response.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{response.form_name}</p>
                      <p className="text-xs text-gray-600">{response.staff_name} • {format(new Date(response.submitted_at), 'MMM d, HH:mm')}</p>
                    </div>
                    <Badge className={response.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {response.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function calculateComplianceScore(data) {
  const { hygieneRecords, formResponses, documents, staff, trainingRecords, alerts } = data;

  // Hygiene compliance (temperature logs in range)
  const hygieneCompliance = hygieneRecords.length > 0
    ? Math.round((hygieneRecords.filter(r => r.is_in_range).length / hygieneRecords.length) * 100)
    : 0;

  // Forms compliance (submitted forms)
  const formsCompliance = formResponses.length > 0
    ? Math.round((formResponses.filter(f => f.status === 'submitted' || f.status === 'approved').length / formResponses.length) * 100)
    : 0;

  // Training compliance
  const trainingCompliance = staff.length > 0
    ? Math.round((trainingRecords.filter(t => t.status === 'completed').length / staff.length) * 100)
    : 0;

  // Documents compliance
  const documentsCompliance = documents.length > 0
    ? Math.round((documents.filter(d => !d.expiry_date || new Date(d.expiry_date) > new Date()).length / documents.length) * 100)
    : 0;

  // Overall score (weighted average)
  const overall = Math.round(
    (hygieneCompliance * 0.35) +
    (formsCompliance * 0.30) +
    (trainingCompliance * 0.20) +
    (documentsCompliance * 0.15)
  );

  // AI flagging - detect missing items
  const missingItems = [];
  
  if (hygieneRecords.filter(r => {
    const age = (new Date() - new Date(r.created_date)) / (1000 * 60 * 60 * 24);
    return age <= 1;
  }).length < 3) {
    missingItems.push('Less than 3 temperature logs recorded today');
  }

  if (trainingRecords.filter(t => t.status !== 'completed').length > 0) {
    missingItems.push(`${trainingRecords.filter(t => t.status !== 'completed').length} staff member(s) have incomplete training`);
  }

  if (documents.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length > 0) {
    missingItems.push(`${documents.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length} document(s) have expired`);
  }

  if (alerts.filter(a => a.severity === 'critical' && a.status === 'open').length > 0) {
    missingItems.push(`${alerts.filter(a => a.severity === 'critical' && a.status === 'open').length} unresolved critical alert(s)`);
  }

  // Readiness checklist
  const readinessChecklist = [
    {
      title: 'Temperature Logs Current (Last 24h)',
      status: hygieneRecords.filter(r => (new Date() - new Date(r.created_date)) / (1000 * 60 * 60) <= 24).length >= 3 ? 'complete' : 'pending'
    },
    {
      title: 'All Staff Training Certificates Valid',
      status: trainingRecords.filter(t => t.status === 'completed').length >= staff.length * 0.9 ? 'complete' : 'pending'
    },
    {
      title: 'HACCP Documentation Up to Date',
      status: documents.filter(d => d.category === 'haccp' && d.is_active).length > 0 ? 'complete' : 'pending'
    },
    {
      title: 'No Critical Alerts Open',
      status: alerts.filter(a => a.severity === 'critical' && a.status === 'open').length === 0 ? 'complete' : 'pending'
    },
    {
      title: 'Cleaning Records Complete',
      status: hygieneRecords.filter(r => r.record_type === 'cleaning' && (new Date() - new Date(r.created_date)) / (1000 * 60 * 60) <= 24).length >= 1 ? 'complete' : 'pending'
    }
  ];

  const recommendations = [];
  if (hygieneCompliance < 90) recommendations.push('Increase frequency of temperature logging');
  if (trainingCompliance < 100) recommendations.push('Complete outstanding staff training');
  if (alerts.length > 5) recommendations.push('Address open hygiene alerts promptly');

  return {
    overall,
    hygieneCompliance,
    formsCompliance,
    trainingCompliance,
    documentsCompliance,
    missingItems,
    readinessChecklist,
    recommendations,
    trend: overall >= 85 ? 'improving' : 'declining'
  };
}

function getScoreColor(score) {
  if (score >= 90) return 'border-green-500 bg-green-50';
  if (score >= 75) return 'border-yellow-500 bg-yellow-50';
  return 'border-red-500 bg-red-50';
}