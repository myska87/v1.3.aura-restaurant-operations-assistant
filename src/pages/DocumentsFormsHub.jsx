
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  FileSignature,
  ClipboardList,
  BookOpen,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Plus,
  Home,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EmptyState from '../components/common/EmptyState';

export default function DocumentsFormsHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  // Documents that require signature
  const { data: allDocuments = [] } = useQuery({
    queryKey: ['allDocuments'],
    queryFn: () => base44.entities.DocumentBuilder.filter({ status: 'published' }),
  });

  // My signatures
  const { data: mySignatures = [] } = useQuery({
    queryKey: ['mySignatures', user?.email],
    queryFn: () => base44.entities.DocumentBuilderSignature.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
  });

  // My form responses
  const { data: myFormResponses = [] } = useQuery({
    queryKey: ['myFormResponses', user?.email],
    queryFn: () => base44.entities.FormResponse.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
  });

  // SOPs
  const { data: allSOPs = [] } = useQuery({
    queryKey: ['allSOPs'],
    queryFn: () => base44.entities.SOPDocument.filter({ status: 'active' }),
  });

  // My SOP signatures
  const { data: mySOPSignatures = [] } = useQuery({
    queryKey: ['mySOPSignatures', user?.email],
    queryFn: () => base44.entities.SOPSignatureLog.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
  });

  // My assigned forms
  const { data: myAssignedForms = [] } = useQuery({
    queryKey: ['myAssignedForms', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const assignments = await base44.entities.FormAssignmentMetadata.filter({
        assigned_to_email: user.email,
        completion_status: { $in: ['pending', 'in_progress'] }
      });
      return assignments;
    },
    enabled: !!user?.email,
  });

  // Filter documents that need my signature
  const pendingDocuments = allDocuments.filter(doc => {
    if (!doc.requires_signature) return false;
    
    // Check if for my department
    if (doc.department !== 'all' && doc.department !== user?.department) return false;
    
    // Check if I already signed
    const alreadySigned = mySignatures.some(sig => sig.document_id === doc.id);
    return !alreadySigned;
  });

  // Filter SOPs that need my signature
  const pendingSOPs = allSOPs.filter(sop => {
    if (!sop.requires_signature) return false;
    
    // Check if for my role
    const myRole = user?.position?.toLowerCase();
    if (sop.role_assigned && !sop.role_assigned.includes(myRole) && !sop.role_assigned.includes('all')) {
      return false;
    }
    
    // Check if I already signed
    const alreadySigned = mySOPSignatures.some(sig => sig.sop_id === sop.id);
    return !alreadySigned;
  });

  const signedDocuments = allDocuments.filter(doc => 
    mySignatures.some(sig => sig.document_id === doc.id)
  );

  const signedSOPs = allSOPs.filter(sop => 
    mySOPSignatures.some(sig => sig.sop_id === sop.id)
  );

  const totalPending = pendingDocuments.length + pendingSOPs.length + myAssignedForms.length;

  const filteredPendingDocs = pendingDocuments.filter(doc =>
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPendingSOPs = pendingSOPs.filter(sop =>
    sop.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc);
    setShowDocumentModal(true);
  };

  const handleSOPClick = (sop) => {
    window.location.href = createPageUrl(`SOPViewer?id=${sop.id}`);
  };

  const handleFormClick = (assignment) => {
    window.location.href = createPageUrl('FormIntelligence') + `?openForm=${assignment.form_template_id}&assignmentId=${assignment.id}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Documents & Forms Hub</h1>
          <p className="text-gray-600 text-lg">
            {isManager 
              ? "Create, manage, and track all operational documents"
              : "View documents, complete forms, and acknowledge policies"
            }
          </p>
        </div>

        {/* Pending Alert */}
        {totalPending > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-none shadow-xl mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <AlertCircle className="w-12 h-12" />
                  <div>
                    <h2 className="text-2xl font-bold mb-1">
                      {totalPending} Item{totalPending !== 1 ? 's' : ''} Require Your Action
                    </h2>
                    <p className="text-orange-100">
                      Documents, SOPs, or forms waiting for your signature or completion
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents, SOPs, forms..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
            className={activeTab === 'pending' ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Pending ({totalPending})
          </Button>
          <Button
            variant={activeTab === 'signed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('signed')}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Completed
          </Button>
          {isManager && (
            <>
              <Button
                variant={activeTab === 'manage' ? 'default' : 'outline'}
                onClick={() => setActiveTab('manage')}
              >
                <FileText className="w-4 h-4 mr-2" />
                All Documents
              </Button>
              <Button
                variant={activeTab === 'create' ? 'default' : 'outline'}
                onClick={() => setActiveTab('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New
              </Button>
            </>
          )}
        </div>

        {/* Pending Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {/* Pending Documents */}
            {filteredPendingDocs.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-orange-600" />
                  Documents Requiring Your Signature ({filteredPendingDocs.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredPendingDocs.map((doc) => (
                    <Card 
                      key={doc.id} 
                      className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500 cursor-pointer"
                      onClick={() => handleDocumentClick(doc)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{doc.title}</h3>
                            <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge className="capitalize">{doc.category}</Badge>
                              <Badge variant="outline">{doc.department}</Badge>
                              <Badge className="bg-orange-100 text-orange-800">
                                <FileSignature className="w-3 h-3 mr-1" />
                                Signature Required
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Pending SOPs */}
            {filteredPendingSOPs.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  SOPs Requiring Your Acknowledgment ({filteredPendingSOPs.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredPendingSOPs.map((sop) => (
                    <Card 
                      key={sop.id} 
                      className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500 cursor-pointer"
                      onClick={() => handleSOPClick(sop)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{sop.title}</h3>
                            <p className="text-sm text-gray-600 mb-2">{sop.description}</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge className="capitalize">{sop.category}</Badge>
                              {sop.frequency && (
                                <Badge variant="outline">{sop.frequency}</Badge>
                              )}
                              <Badge className="bg-blue-100 text-blue-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Sign to Acknowledge
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Forms */}
            {myAssignedForms.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-green-600" />
                  Forms to Complete ({myAssignedForms.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {myAssignedForms.map((assignment) => (
                    <Card 
                      key={assignment.id} 
                      className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500 cursor-pointer"
                      onClick={() => handleFormClick(assignment)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {assignment.form_name}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              <Badge className="bg-green-100 text-green-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Due: {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d') : 'ASAP'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {totalPending === 0 && (
              <EmptyState
                icon={CheckCircle}
                title="All Caught Up!"
                description="You have no pending documents, SOPs, or forms to complete"
              />
            )}
          </div>
        )}

        {/* Signed/Completed Tab */}
        {activeTab === 'signed' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Signed Documents ({signedDocuments.length})
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {signedDocuments.map((doc) => {
                  const mySignature = mySignatures.find(sig => sig.document_id === doc.id);
                  return (
                    <Link key={doc.id} to={createPageUrl(`DocumentViewer?id=${doc.id}`)}>
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <h3 className="font-semibold text-gray-900 mb-2">{doc.title}</h3>
                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Signed {mySignature ? format(new Date(mySignature.signed_at), 'MMM d') : ''}
                            </Badge>
                            <Badge className="capitalize">{doc.category}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Acknowledged SOPs ({signedSOPs.length})
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {signedSOPs.map((sop) => {
                  const mySignature = mySOPSignatures.find(sig => sig.sop_id === sop.id);
                  return (
                    <Link key={sop.id} to={createPageUrl(`SOPViewer?id=${sop.id}`)}>
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <h3 className="font-semibold text-gray-900 mb-2">{sop.title}</h3>
                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Signed {mySignature ? format(new Date(mySignature.signed_at), 'MMM d') : ''}
                            </Badge>
                            <Badge className="capitalize">{sop.category}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Manager: All Documents Tab */}
        {isManager && activeTab === 'manage' && (
          <div>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Link to={createPageUrl('DocumentLibrary')}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <FileText className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">Document Library</h3>
                    <p className="text-sm text-gray-600">Policies & guides</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl('SOPDashboard')}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">SOP Library</h3>
                    <p className="text-sm text-gray-600">Standard procedures</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl('FormLibrary')}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <ClipboardList className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">Form Library</h3>
                    <p className="text-sm text-gray-600">Custom forms</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        )}

        {/* Manager: Create New Tab */}
        {isManager && activeTab === 'create' && (
          <div>
            <div className="grid md:grid-cols-3 gap-6">
              <Link to={createPageUrl('DocumentBuilder')}>
                <Card className="hover:shadow-xl transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="p-8 text-center">
                    <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-bold text-xl text-gray-900 mb-2">Create Document</h3>
                    <p className="text-sm text-gray-600">Policies, guides, procedures</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl('SOPBuilder')}>
                <Card className="hover:shadow-xl transition-shadow cursor-pointer bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="p-8 text-center">
                    <BookOpen className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="font-bold text-xl text-gray-900 mb-2">Create SOP</h3>
                    <p className="text-sm text-gray-600">Standard operating procedures</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl('FormBuilder')}>
                <Card className="hover:shadow-xl transition-shadow cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardContent className="p-8 text-center">
                    <ClipboardList className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                    <h3 className="font-bold text-xl text-gray-900 mb-2">Create Form</h3>
                    <p className="text-sm text-gray-600">Custom checklists & forms</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Document Modal */}
      <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.title}</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="py-4">
              <iframe
                src={selectedDocument.document_url}
                className="w-full h-[600px] border rounded-lg"
                title={selectedDocument.title}
              />
              <div className="mt-4 flex gap-3">
                <Link to={createPageUrl(`DocumentViewer?id=${selectedDocument.id}`)}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Eye className="w-4 h-4 mr-2" />
                    Full Document Page
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => setShowDocumentModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
