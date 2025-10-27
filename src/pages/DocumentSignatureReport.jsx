import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Search,
  Download,
  CheckCircle,
  AlertTriangle,
  Users,
  Clock,
  Filter,
  Home,
  ArrowLeft,
  TrendingUp,
  Eye,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function DocumentSignatureReport() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['allDocumentsForReport'],
    queryFn: () => base44.entities.DocumentBuilder.filter({
      status: 'published',
      requires_signature: true,
    }),
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allSignatures = [] } = useQuery({
    queryKey: ['allDocumentSignatures'],
    queryFn: () => base44.entities.DocumentBuilderSignature.list(),
  });

  // Build comprehensive report data
  const reportData = documents.map(doc => {
    const signatures = allSignatures.filter(sig => sig.document_id === doc.id);
    const signedStaffEmails = signatures.map(sig => sig.staff_email);
    const missingStaff = allStaff.filter(staff => 
      !signedStaffEmails.includes(staff.email) &&
      staff.status === 'active'
    );

    return {
      document: doc,
      totalStaff: allStaff.filter(s => s.status === 'active').length,
      signedCount: signatures.length,
      missingCount: missingStaff.length,
      signatureRate: allStaff.filter(s => s.status === 'active').length > 0 
        ? ((signatures.length / allStaff.filter(s => s.status === 'active').length) * 100).toFixed(0)
        : 0,
      signatures: signatures,
      missingStaff: missingStaff,
    };
  });

  // Filter report data
  const filteredData = reportData.filter(item => {
    const matchesSearch = item.document.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.document.category === filterCategory;
    
    let matchesStatus = true;
    if (filterStatus === 'complete') {
      matchesStatus = item.signatureRate == 100;
    } else if (filterStatus === 'incomplete') {
      matchesStatus = item.signatureRate < 100;
    } else if (filterStatus === 'critical') {
      matchesStatus = item.signatureRate < 50;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate summary stats
  const stats = {
    totalDocuments: documents.length,
    fullyCompleted: reportData.filter(item => item.signatureRate == 100).length,
    incomplete: reportData.filter(item => item.signatureRate < 100).length,
    averageRate: reportData.length > 0 
      ? (reportData.reduce((sum, item) => sum + parseFloat(item.signatureRate), 0) / reportData.length).toFixed(0)
      : 0,
  };

  const exportToCSV = () => {
    const csvRows = [
      ['Document Signature Report', `Generated: ${format(new Date(), 'PPP')}`],
      [''],
      ['Document Title', 'Category', 'Total Staff', 'Signed', 'Missing', 'Completion Rate', 'Published Date'],
    ];

    filteredData.forEach(item => {
      csvRows.push([
        item.document.title,
        item.document.category,
        item.totalStaff,
        item.signedCount,
        item.missingCount,
        `${item.signatureRate}%`,
        format(new Date(item.document.published_at || item.document.created_date), 'yyyy-MM-dd'),
      ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-signatures-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-700 mb-6">
                This report is only accessible to managers and administrators.
              </p>
              <Link to={createPageUrl('Dashboard')}>
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

  if (loadingDocs) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xl font-semibold">Loading report...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('DocumentManagement')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Document Signature Report</h1>
              <p className="text-lg text-gray-600">Track document acknowledgments and compliance across your team</p>
            </div>
            <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{stats.totalDocuments}</p>
                <p className="text-sm text-gray-600">Total Documents</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{stats.fullyCompleted}</p>
                <p className="text-sm text-gray-600">Fully Signed</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{stats.incomplete}</p>
                <p className="text-sm text-gray-600">Incomplete</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{stats.averageRate}%</p>
                <p className="text-sm text-gray-600">Avg. Compliance</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[250px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="pl-10"
                />
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="sop">SOP</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="complete">Complete (100%)</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="critical">Critical (&lt;50%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Report Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Document</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Category</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Signed</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Missing</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Rate</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredData.map((item, index) => (
                    <motion.tr
                      key={item.document.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.document.title}</p>
                          <p className="text-xs text-gray-500">
                            Published {format(new Date(item.document.published_at || item.document.created_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize">
                          {item.document.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div>
                          <span className="font-semibold text-green-700">
                            {item.signedCount} / {item.totalStaff}
                          </span>
                          {/* Show signed staff names */}
                          {item.signatures.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {item.signatures.slice(0, 3).map((sig) => (
                                <div key={sig.id} className="flex items-center justify-center gap-1 text-xs text-gray-600">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <span>{sig.staff_name}</span>
                                </div>
                              ))}
                              {item.signatures.length > 3 && (
                                <p className="text-xs text-gray-500">+{item.signatures.length - 3} more</p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div>
                          <span className={`font-semibold ${item.missingCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {item.missingCount}
                          </span>
                          {/* Show missing staff names */}
                          {item.missingStaff.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {item.missingStaff.slice(0, 3).map((staff) => (
                                <div key={staff.id} className="flex items-center justify-center gap-1 text-xs text-gray-600">
                                  <XCircle className="w-3 h-3 text-red-600" />
                                  <span>{staff.full_name}</span>
                                </div>
                              ))}
                              {item.missingStaff.length > 3 && (
                                <p className="text-xs text-gray-500">+{item.missingStaff.length - 3} more</p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div 
                              className={`h-2 rounded-full ${
                                item.signatureRate >= 80 ? 'bg-green-500' :
                                item.signatureRate >= 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${item.signatureRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">{item.signatureRate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(createPageUrl(`DocumentViewer?id=${item.document.id}`))}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {filteredData.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-semibold mb-2">No documents found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}