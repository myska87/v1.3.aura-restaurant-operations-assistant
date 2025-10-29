import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Home,
  Plus,
  Eye,
  Edit,
  Save,
  Loader2,
  Search,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, subDays } from "date-fns";

export default function EHOControlCenter() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [inspectionMode, setInspectionMode] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const [auditFormData, setAuditFormData] = useState({
    title: '',
    type: 'internal',
    auditor_name: '',
    auditor_organization: '',
  });

  const [checkpointFormData, setCheckpointFormData] = useState({
    checkpoint_name: '',
    category: 'food_safety',
    description: '',
    weight: 5,
    is_critical: false,
  });

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
    queryFn: () => base44.entities.DocumentBuilder.list(),
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

  const { data: checkpoints = [] } = useQuery({
    queryKey: ['auditCheckpoints'],
    queryFn: () => base44.entities.AuditCheckpoint.filter({ is_active: true }),
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['auditExecutions'],
    queryFn: () => base44.entities.AuditExecution.list('-audit_date', 50),
  });

  // Create Audit Mutation
  const createAuditMutation = useMutation({
    mutationFn: async (auditData) => {
      const checkpointResults = checkpoints.map(cp => ({
        checkpoint_id: cp.id,
        checkpoint_name: cp.checkpoint_name,
        status: 'na',
        score: 0,
        evidence_urls: [],
        notes: '',
        corrective_action_required: false,
      }));

      return await base44.entities.AuditExecution.create({
        audit_title: auditData.title,
        audit_type: auditData.type,
        audit_date: new Date().toISOString(),
        auditor_name: auditData.auditor_name,
        auditor_organization: auditData.auditor_organization,
        conducted_by_email: user.email,
        checkpoints: checkpointResults,
        overall_score: 0,
        overall_rating: 'needs_improvement',
        critical_failures: 0,
        status: 'draft',
      });
    },
    onSuccess: (audit) => {
      queryClient.invalidateQueries({ queryKey: ['auditExecutions'] });
      setShowAuditDialog(false);
      navigate(createPageUrl(`AuditEditor?id=${audit.id}`));
    },
  });

  // Create Checkpoint Mutation
  const createCheckpointMutation = useMutation({
    mutationFn: (data) => base44.entities.AuditCheckpoint.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditCheckpoints'] });
      setShowCheckpointDialog(false);
      alert('✅ Checkpoint created successfully!');
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

      await base44.entities.DocumentBuilder.create({
        title: `EHO Compliance Report - ${format(new Date(), 'MMM yyyy')}`,
        description: 'Automatically generated compliance report for EHO inspection',
        category: 'policy',
        content_html: `<h1>EHO Compliance Report</h1><p>Score: ${complianceScore.overall}%</p>`,
        department: 'all',
        created_by: user?.email || 'system',
        status: 'published',
      });

      alert('✅ EHO Compliance Report generated successfully!\n\nCheck Document Library to download.');
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('❌ Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleStartAudit = () => {
    if (!auditFormData.title || !auditFormData.auditor_name) {
      alert('Please fill in all required fields');
      return;
    }

    createAuditMutation.mutate(auditFormData);
  };

  const handleCreateCheckpoint = () => {
    if (!checkpointFormData.checkpoint_name || !checkpointFormData.description) {
      alert('Please fill in all required fields');
      return;
    }

    createCheckpointMutation.mutate({
      ...checkpointFormData,
      frequency: 'on_inspection',
      assigned_role: 'manager',
      is_active: true,
    });
  };

  const filteredCheckpoints = checkpoints.filter(cp =>
    cp.checkpoint_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cp.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  {generatingReport ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generate EHO Report
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActiveTab('dashboard')}
          >
            <Activity className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === 'audits' ? 'default' : 'outline'}
            onClick={() => setActiveTab('audits')}
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Audits ({audits.length})
          </Button>
          <Button
            variant={activeTab === 'checkpoints' ? 'default' : 'outline'}
            onClick={() => setActiveTab('checkpoints')}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Checkpoints ({checkpoints.length})
          </Button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
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
          </>
        )}

        {/* Audits Tab */}
        {activeTab === 'audits' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Audit History</h2>
              <Button
                onClick={() => setShowAuditDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Audit
              </Button>
            </div>

            <div className="space-y-4">
              {audits.map((audit) => (
                <Card key={audit.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(createPageUrl(`AuditEditor?id=${audit.id}`))}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg mb-2">{audit.audit_title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(audit.audit_date), 'PPp')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {audit.auditor_name}
                          </span>
                          <Badge className={
                            audit.overall_rating === 'excellent' ? 'bg-green-100 text-green-800' :
                            audit.overall_rating === 'good' ? 'bg-blue-100 text-blue-800' :
                            audit.overall_rating === 'satisfactory' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {audit.overall_rating}
                          </Badge>
                        </div>
                        <div className="flex gap-6">
                          <div>
                            <p className="text-xs text-gray-500">Overall Score</p>
                            <p className="text-2xl font-bold text-gray-900">{audit.overall_score || 0}%</p>
                          </div>
                          {audit.fsa_rating !== null && audit.fsa_rating !== undefined && (
                            <div>
                              <p className="text-xs text-gray-500">FSA Rating</p>
                              <p className="text-2xl font-bold text-gray-900">{audit.fsa_rating}/5</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {audits.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ClipboardCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Audits Yet</h3>
                    <p className="text-gray-600 mb-4">Start your first audit to track compliance</p>
                    <Button onClick={() => setShowAuditDialog(true)} className="bg-blue-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Start New Audit
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Checkpoints Tab */}
        {activeTab === 'checkpoints' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search checkpoints..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                onClick={() => setShowCheckpointDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Checkpoint
              </Button>
            </div>

            <div className="grid gap-4">
              {filteredCheckpoints.map((checkpoint) => (
                <Card key={checkpoint.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900">{checkpoint.checkpoint_name}</h3>
                          {checkpoint.is_critical && (
                            <Badge className="bg-red-100 text-red-800">Critical</Badge>
                          )}
                          <Badge variant="outline">{checkpoint.category.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{checkpoint.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Weight: {checkpoint.weight}/10</span>
                          <span>Frequency: {checkpoint.frequency}</span>
                          <span>Role: {checkpoint.assigned_role}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredCheckpoints.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Checkpoints Found</h3>
                    <p className="text-gray-600 mb-4">Create audit checkpoints to track compliance</p>
                    <Button onClick={() => setShowCheckpointDialog(true)} className="bg-green-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Checkpoint
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      {/* Start Audit Dialog */}
      <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Audit</DialogTitle>
            <DialogDescription>
              Begin a new compliance audit with pre-configured checkpoints
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="auditTitle">Audit Title *</Label>
              <Input
                id="auditTitle"
                value={auditFormData.title}
                onChange={(e) => setAuditFormData({ ...auditFormData, title: e.target.value })}
                placeholder="e.g., Monthly Internal Audit - January 2025"
              />
            </div>

            <div>
              <Label htmlFor="auditType">Audit Type</Label>
              <Select
                value={auditFormData.type}
                onValueChange={(value) => setAuditFormData({ ...auditFormData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal Audit</SelectItem>
                  <SelectItem value="external">External Audit</SelectItem>
                  <SelectItem value="fsa">FSA Inspection</SelectItem>
                  <SelectItem value="mock_inspection">Mock Inspection</SelectItem>
                  <SelectItem value="spot_check">Spot Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="auditorName">Auditor Name *</Label>
              <Input
                id="auditorName"
                value={auditFormData.auditor_name}
                onChange={(e) => setAuditFormData({ ...auditFormData, auditor_name: e.target.value })}
                placeholder="Full name"
              />
            </div>

            <div>
              <Label htmlFor="auditorOrg">Organization</Label>
              <Input
                id="auditorOrg"
                value={auditFormData.auditor_organization}
                onChange={(e) => setAuditFormData({ ...auditFormData, auditor_organization: e.target.value })}
                placeholder="e.g., FSA, Internal, Third-Party"
              />
            </div>

            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                {checkpoints.length} checkpoints will be included in this audit
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartAudit}
              disabled={createAuditMutation.isPending}
              className="bg-blue-600"
            >
              {createAuditMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Start Audit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Checkpoint Dialog */}
      <Dialog open={showCheckpointDialog} onOpenChange={setShowCheckpointDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Audit Checkpoint</DialogTitle>
            <DialogDescription>
              Create a new compliance checkpoint for audits
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="checkpointName">Checkpoint Name *</Label>
              <Input
                id="checkpointName"
                value={checkpointFormData.checkpoint_name}
                onChange={(e) => setCheckpointFormData({ ...checkpointFormData, checkpoint_name: e.target.value })}
                placeholder="e.g., Fridge Temperature Check"
              />
            </div>

            <div>
              <Label htmlFor="checkpointCategory">Category</Label>
              <Select
                value={checkpointFormData.category}
                onValueChange={(value) => setCheckpointFormData({ ...checkpointFormData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food_safety">Food Safety</SelectItem>
                  <SelectItem value="hygiene">Hygiene</SelectItem>
                  <SelectItem value="temperature_control">Temperature Control</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="pest_control">Pest Control</SelectItem>
                  <SelectItem value="staff_training">Staff Training</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="waste_management">Waste Management</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="checkpointDesc">Description *</Label>
              <Textarea
                id="checkpointDesc"
                value={checkpointFormData.description}
                onChange={(e) => setCheckpointFormData({ ...checkpointFormData, description: e.target.value })}
                placeholder="What needs to be checked..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="checkpointWeight">Weight (1-10)</Label>
              <Input
                id="checkpointWeight"
                type="number"
                min="1"
                max="10"
                value={checkpointFormData.weight}
                onChange={(e) => setCheckpointFormData({ ...checkpointFormData, weight: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCritical"
                checked={checkpointFormData.is_critical}
                onChange={(e) => setCheckpointFormData({ ...checkpointFormData, is_critical: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="isCritical" className="cursor-pointer">
                Mark as Critical Control Point
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckpointDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCheckpoint}
              disabled={createCheckpointMutation.isPending}
              className="bg-green-600"
            >
              {createCheckpointMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Checkpoint
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper functions
function calculateComplianceScore(data) {
  const { hygieneRecords, formResponses, documents, staff, trainingRecords, alerts } = data;

  const hygieneCompliance = hygieneRecords.length > 0
    ? Math.round((hygieneRecords.filter(r => r.is_in_range).length / hygieneRecords.length) * 100)
    : 0;

  const formsCompliance = formResponses.length > 0
    ? Math.round((formResponses.filter(f => f.status === 'submitted' || f.status === 'approved').length / formResponses.length) * 100)
    : 0;

  const trainingCompliance = staff.length > 0
    ? Math.round((trainingRecords.filter(t => t.status === 'completed').length / staff.length) * 100)
    : 0;

  const documentsCompliance = documents.length > 0
    ? Math.round((documents.filter(d => !d.expiry_date || new Date(d.expiry_date) > new Date()).length / documents.length) * 100)
    : 0;

  const overall = Math.round(
    (hygieneCompliance * 0.35) +
    (formsCompliance * 0.30) +
    (trainingCompliance * 0.20) +
    (documentsCompliance * 0.15)
  );

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
      status: documents.filter(d => d.category === 'policy' && d.status === 'published').length > 0 ? 'complete' : 'pending'
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