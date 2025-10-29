
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Upload,
  Calendar,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Home,
  Plus,
  FileText,
  Search,
  Filter,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

export default function ComplianceCore() {
  const queryClient = useQueryClient();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    category: 'food_hygiene',
    description: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: '',
    department: 'all',
    requires_acknowledgment: false,
    renewal_alert_days: 30,
    issuing_authority: '',
    certificate_number: '',
    cost: 0,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['complianceDocuments'],
    queryFn: () => base44.entities.ComplianceDocument.list('-issue_date'),
    enabled: isManager,
  });

  const { data: renewalAlerts = [] } = useQuery({
    queryKey: ['renewalAlerts'],
    queryFn: () => base44.entities.ComplianceRenewalAlert.filter({ status: { $in: ['pending', 'sent'] } }),
    enabled: isManager,
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, data }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return await base44.entities.ComplianceDocument.create({
        ...data,
        document_url: file_url,
        uploaded_by: user.email,
        uploaded_by_name: user.full_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceDocuments'] });
      setShowUploadDialog(false);
      resetForm();
      alert('✅ Compliance document uploaded!');
    },
  });

  const acknowledgeDocumentMutation = useMutation({
    mutationFn: async ({ documentId, signatureUrl }) => {
      const doc = documents.find(d => d.id === documentId);
      const acknowledgedBy = doc.acknowledged_by || [];
      
      acknowledgedBy.push({
        staff_email: user.email,
        staff_name: user.full_name,
        acknowledged_at: new Date().toISOString(),
        signature_url: signatureUrl,
      });

      await base44.entities.ComplianceDocument.update(documentId, { acknowledged_by: acknowledgedBy });

      await base44.entities.ComplianceAcknowledgment.create({
        document_id: documentId,
        document_title: doc.title,
        document_category: doc.category,
        staff_email: user.email,
        staff_name: user.full_name,
        staff_position: user.position,
        acknowledged_at: new Date().toISOString(),
        signature_url: signatureUrl,
        verification_code: `ACK-${Date.now()}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceDocuments'] });
      alert('✅ Document acknowledged!');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'food_hygiene',
      description: '',
      issue_date: format(new Date(), 'yyyy-MM-dd'),
      expiry_date: '',
      department: 'all',
      requires_acknowledgment: false,
      renewal_alert_days: 30,
      issuing_authority: '',
      certificate_number: '',
      cost: 0,
    });
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('document-file');
    const file = fileInput?.files?.[0];

    if (!file) {
      alert('Please select a file');
      return;
    }

    if (!formData.title || !formData.expiry_date) {
      alert('Please provide title and expiry date');
      return;
    }

    setUploading(true);
    await uploadDocumentMutation.mutateAsync({ file, data: formData });
    setUploading(false);
  };

  // Calculate status based on expiry
  const getDocumentStatus = (doc) => {
    if (!doc.expiry_date) return 'active';
    const daysUntilExpiry = differenceInDays(parseISO(doc.expiry_date), new Date());
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring_soon';
    return 'active';
  };

  const getStatusColor = (status) => {
    if (status === 'active') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'expiring_soon') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status === 'expired') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    if (status === 'active') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'expiring_soon') return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    if (status === 'expired') return <XCircle className="w-5 h-5 text-red-600" />;
    return <FileText className="w-5 h-5 text-gray-600" />;
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const actualStatus = getDocumentStatus(doc);
    const matchesSearch = !searchQuery || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || actualStatus === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: documents.length,
    active: documents.filter(d => getDocumentStatus(d) === 'active').length,
    expiringSoon: documents.filter(d => getDocumentStatus(d) === 'expiring_soon').length,
    expired: documents.filter(d => getDocumentStatus(d) === 'expired').length,
  };

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">Compliance Centre is only accessible to Managers.</p>
              <Link to={createPageUrl('Dashboard')}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('ComplianceDashboard')}>
            <Button variant="outline" size="sm">
              <Shield className="w-4 h-4 mr-2" />
              Privacy & GDPR
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Compliance & Certification Centre</h1>
                <p className="text-gray-600">Manage certificates, policies & legal documentation</p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Documents</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-900">{stats.active}</p>
              <p className="text-sm text-gray-600">Active</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-amber-900">{stats.expiringSoon}</p>
              <p className="text-sm text-gray-600">Expiring Soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-red-900">{stats.expired}</p>
              <p className="text-sm text-gray-600">Expired</p>
            </CardContent>
          </Card>
        </div>

        {/* Renewal Alerts Banner */}
        {renewalAlerts.length > 0 && (
          <Card className="mb-6 bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-5 h-5" />
                Renewal Alerts ({renewalAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {renewalAlerts.slice(0, 3).map(alert => (
                  <div key={alert.id} className="p-3 bg-white rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{alert.document_title}</p>
                        <p className="text-sm text-gray-600">
                          Expires in {alert.days_until_expiry} days ({format(parseISO(alert.expiry_date), 'MMM d, yyyy')})
                        </p>
                      </div>
                      <Badge className={
                        alert.days_until_expiry <= 7 ? 'bg-red-600 text-white' :
                        alert.days_until_expiry <= 15 ? 'bg-amber-600 text-white' :
                        'bg-blue-600 text-white'
                      }>
                        {alert.alert_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="pl-10"
                />
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="fire_safety">Fire Safety</SelectItem>
                  <SelectItem value="gas_certificate">Gas Certificate</SelectItem>
                  <SelectItem value="food_hygiene">Food Hygiene</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="licenses">Licenses</SelectItem>
                  <SelectItem value="haccp">HACCP</SelectItem>
                  <SelectItem value="pest_control">Pest Control</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading documents...</p>
              </CardContent>
            </Card>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Documents Found</h3>
                <p className="text-gray-600 mb-6">Upload your first compliance document to get started</p>
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredDocuments.map((doc, index) => {
              const actualStatus = getDocumentStatus(doc);
              const daysUntilExpiry = doc.expiry_date ? differenceInDays(parseISO(doc.expiry_date), new Date()) : null;
              const hasAcknowledged = doc.acknowledged_by?.some(a => a.staff_email === user.email);

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className={`border-2 ${getStatusColor(actualStatus)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {getStatusIcon(actualStatus)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-lg text-gray-900">{doc.title}</h3>
                              <Badge className={getStatusColor(actualStatus)}>
                                {actualStatus.replace('_', ' ')}
                              </Badge>
                            </div>

                            {doc.description && (
                              <p className="text-sm text-gray-700 mb-3">{doc.description}</p>
                            )}

                            <div className="flex flex-wrap gap-2 text-sm mb-3">
                              <Badge variant="outline" className="capitalize">
                                {doc.category.replace(/_/g, ' ')}
                              </Badge>
                              <Badge variant="outline">
                                {doc.department}
                              </Badge>
                              {doc.certificate_number && (
                                <Badge variant="outline">
                                  #{doc.certificate_number}
                                </Badge>
                              )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                              <span>Issued: {format(parseISO(doc.issue_date), 'MMM d, yyyy')}</span>
                              {doc.expiry_date && (
                                <span className={daysUntilExpiry < 30 ? 'text-red-600 font-semibold' : ''}>
                                  Expires: {format(parseISO(doc.expiry_date), 'MMM d, yyyy')}
                                  {daysUntilExpiry !== null && ` (${daysUntilExpiry} days)`}
                                </span>
                              )}
                              {doc.issuing_authority && (
                                <span>Authority: {doc.issuing_authority}</span>
                              )}
                              {doc.uploaded_by_name && (
                                <span>Uploaded by: {doc.uploaded_by_name}</span>
                              )}
                            </div>

                            {doc.requires_acknowledgment && (
                              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                                <p className="text-xs text-blue-800">
                                  ✍️ Requires staff acknowledgment ({doc.acknowledged_by?.length || 0} signed)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {doc.document_url && (
                            <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </a>
                          )}
                          {doc.requires_acknowledgment && !hasAcknowledged && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => acknowledgeDocumentMutation.mutate({ documentId: doc.id, signatureUrl: '' })}
                            >
                              Acknowledge
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Compliance Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFileUpload} className="space-y-4 mt-4">
              <div>
                <Label>Document Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Food Hygiene Certificate 2025"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fire_safety">Fire Safety</SelectItem>
                      <SelectItem value="gas_certificate">Gas Certificate</SelectItem>
                      <SelectItem value="food_hygiene">Food Hygiene</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="licenses">Licenses</SelectItem>
                      <SelectItem value="health_safety">Health & Safety</SelectItem>
                      <SelectItem value="data_protection">Data Protection</SelectItem>
                      <SelectItem value="haccp">HACCP</SelectItem>
                      <SelectItem value="pest_control">Pest Control</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({...formData, department: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="front_of_house">Front of House</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description"
                  rows={2}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Issue Date *</Label>
                  <Input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Expiry Date *</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Issuing Authority</Label>
                  <Input
                    value={formData.issuing_authority}
                    onChange={(e) => setFormData({...formData, issuing_authority: e.target.value})}
                    placeholder="e.g., FSA, Local Council"
                  />
                </div>

                <div>
                  <Label>Certificate Number</Label>
                  <Input
                    value={formData.certificate_number}
                    onChange={(e) => setFormData({...formData, certificate_number: e.target.value})}
                    placeholder="Official reference number"
                  />
                </div>
              </div>

              <div>
                <Label>Document File *</Label>
                <Input
                  id="document-file"
                  type="file"
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires-ack"
                  checked={formData.requires_acknowledgment}
                  onChange={(e) => setFormData({...formData, requires_acknowledgment: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="requires-ack" className="cursor-pointer">
                  Require staff acknowledgment & signature
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
