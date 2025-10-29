import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  ClipboardList,
  BookOpen,
  PenTool,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Sparkles,
  Home,
  Plus,
  Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DocumentsFormsHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('pending');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  // Fetch pending documents
  const { data: pendingDocs = [] } = useQuery({
    queryKey: ['pendingDocuments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allDocs = await base44.entities.Document.filter({
        is_mandatory: true,
        is_active: true
      });
      
      const acknowledgments = await base44.entities.DocumentReview.filter({
        staff_email: user.email
      });

      const acknowledgedDocIds = acknowledgments.map(a => a.document_id);
      return allDocs.filter(doc => !acknowledgedDocIds.includes(doc.id));
    },
    enabled: !!user?.email,
  });

  // Fetch pending forms
  const { data: pendingForms = [] } = useQuery({
    queryKey: ['pendingForms', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.FormAssignmentMetadata.filter({
        assigned_to_email: user.email,
        completion_status: { $in: ['pending', 'in_progress'] }
      }, '-due_date', 50);
    },
    enabled: !!user?.email,
  });

  // Fetch pending SOPs
  const { data: pendingSOPs = [] } = useQuery({
    queryKey: ['pendingSOPs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.SOPCertification.filter({
        staff_email: user.email,
        status: { $in: ['pending', 'in_progress', 'overdue'] }
      }, '-assigned_date', 50);
    },
    enabled: !!user?.email,
  });

  // Fetch my completed items (for history)
  const { data: completedDocs = [] } = useQuery({
    queryKey: ['completedDocuments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const reviews = await base44.entities.DocumentReview.filter({
        staff_email: user.email,
        acknowledged: true
      }, '-acknowledgment_date', 50);
      return reviews;
    },
    enabled: !!user?.email,
  });

  const { data: completedForms = [] } = useQuery({
    queryKey: ['completedForms', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.FormResponse.filter({
        staff_email: user.email,
        status: 'submitted'
      }, '-submitted_at', 50);
    },
    enabled: !!user?.email,
  });

  const { data: completedSOPs = [] } = useQuery({
    queryKey: ['completedSOPs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.SOPCertification.filter({
        staff_email: user.email,
        status: 'completed'
      }, '-completed_date', 50);
    },
    enabled: !!user?.email,
  });

  const totalPending = pendingDocs.length + pendingForms.length + pendingSOPs.length;
  const totalCompleted = completedDocs.length + completedForms.length + completedSOPs.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Documents & Forms Hub</h1>
                <p className="text-gray-600">Unified document, form, and SOP management</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            {isManager && (
              <>
                <Link to={createPageUrl('FormIntelligence')}>
                  <Button className="bg-purple-600 hover:bg-purple-700" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Form
                  </Button>
                </Link>
                <Link to={createPageUrl('DocumentBuilder')}>
                  <Button className="bg-indigo-600 hover:bg-indigo-700" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Document
                  </Button>
                </Link>
                <Link to={createPageUrl('SOPBuilder')}>
                  <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create SOP
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Action</p>
                  <p className="text-3xl font-bold text-red-600">{totalPending}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{totalCompleted}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {totalPending + totalCompleted > 0 
                      ? Math.round((totalCompleted / (totalPending + totalCompleted)) * 100)
                      : 0}%
                  </p>
                </div>
                <Badge className="bg-blue-100 text-blue-800 text-lg px-3 py-1">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[250px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents, forms, SOPs..."
                  className="pl-10"
                />
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="policy">Policies</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending ({totalPending})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed ({totalCompleted})
            </TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending">
            <div className="space-y-6">
              
              {/* Pending Documents */}
              {pendingDocs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Documents to Review ({pendingDocs.length})
                  </h3>
                  <div className="grid gap-3">
                    {pendingDocs.map(doc => (
                      <Card key={doc.id} className="bg-purple-50 border-purple-200 hover:shadow-lg transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                                <div>
                                  <h4 className="font-semibold text-gray-900">{doc.title}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge className="bg-purple-100 text-purple-800">
                                      {doc.category}
                                    </Badge>
                                    {doc.requires_signature && (
                                      <Badge variant="outline">
                                        <PenTool className="w-3 h-3 mr-1" />
                                        Signature Required
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-gray-600">
                                      {doc.department}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Link to={createPageUrl(`DocumentViewer?id=${doc.id}`)}>
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                                Review
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Forms */}
              {pendingForms.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                    Forms to Complete ({pendingForms.length})
                  </h3>
                  <div className="grid gap-3">
                    {pendingForms.map(form => (
                      <Card key={form.id} className="bg-blue-50 border-blue-200 hover:shadow-lg transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <ClipboardList className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                                <div>
                                  <h4 className="font-semibold text-gray-900">{form.form_name}</h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Due: {format(new Date(form.due_date), 'PPp')}
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge className={
                                      form.completion_status === 'overdue'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }>
                                      {form.completion_status}
                                    </Badge>
                                    {form.linked_shift_id && (
                                      <Badge variant="outline">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Shift-based
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Link to={createPageUrl(`FormIntelligence`)}>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                Complete
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending SOPs */}
              {pendingSOPs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    SOPs to Complete ({pendingSOPs.length})
                  </h3>
                  <div className="grid gap-3">
                    {pendingSOPs.map(sop => (
                      <Card key={sop.id} className="bg-indigo-50 border-indigo-200 hover:shadow-lg transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <BookOpen className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                                <div>
                                  <h4 className="font-semibold text-gray-900">{sop.sop_title}</h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Assigned {formatDistanceToNow(new Date(sop.assigned_date), { addSuffix: true })}
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge className={
                                      sop.status === 'overdue'
                                        ? 'bg-red-100 text-red-800'
                                        : sop.status === 'in_progress'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }>
                                      {sop.status}
                                    </Badge>
                                    <Badge variant="outline">
                                      Version {sop.sop_version}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Link to={createPageUrl(`SOPViewer?id=${sop.sop_id}`)}>
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                                View SOP
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {totalPending === 0 && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">You have no pending documents, forms, or SOPs.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed">
            <div className="space-y-6">
              
              {/* Completed Documents */}
              {completedDocs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    Reviewed Documents ({completedDocs.length})
                  </h3>
                  <div className="grid gap-3">
                    {completedDocs.slice(0, 5).map(review => (
                      <Card key={review.id} className="bg-white border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{review.document_title}</h4>
                              <p className="text-sm text-gray-600">
                                Acknowledged {formatDistanceToNow(new Date(review.acknowledgment_date), { addSuffix: true })}
                              </p>
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Forms */}
              {completedForms.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-green-600" />
                    Submitted Forms ({completedForms.length})
                  </h3>
                  <div className="grid gap-3">
                    {completedForms.slice(0, 5).map(response => (
                      <Card key={response.id} className="bg-white border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{response.form_name}</h4>
                              <p className="text-sm text-gray-600">
                                Submitted {formatDistanceToNow(new Date(response.submitted_at), { addSuffix: true })}
                              </p>
                              {response.score && (
                                <Badge className="bg-green-100 text-green-800 mt-2">
                                  Score: {response.score}%
                                </Badge>
                              )}
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed SOPs */}
              {completedSOPs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-green-600" />
                    Completed SOPs ({completedSOPs.length})
                  </h3>
                  <div className="grid gap-3">
                    {completedSOPs.slice(0, 5).map(cert => (
                      <Card key={cert.id} className="bg-white border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{cert.sop_title}</h4>
                              <p className="text-sm text-gray-600">
                                Completed {formatDistanceToNow(new Date(cert.completed_date), { addSuffix: true })}
                              </p>
                              {cert.quiz_score && (
                                <Badge className="bg-green-100 text-green-800 mt-2">
                                  Quiz: {cert.quiz_score}%
                                </Badge>
                              )}
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {totalCompleted === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No completed items yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}