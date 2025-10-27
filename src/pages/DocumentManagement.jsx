
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  Eye,
  MoreVertical,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Shield,
  BookOpen,
  ClipboardCheck,
  History,
  Edit,
  Trash2,
  Download,
  Send,
  ArrowLeft,
  Home,
  Filter,
  PenTool,
  X,
  User,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function DocumentManagement() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [showViewerDialog, setShowViewerDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "policy",
    department: "all",
    confidentiality_level: "internal",
    is_mandatory: false,
    requires_signature: false,
    tags: "",
    review_frequency: "none",
  });

  const [assignForm, setAssignForm] = useState({
    assign_to: "all",
    role: "",
    department: "",
    due_date: "",
    priority: "normal",
  });

  const [versionForm, setVersionForm] = useState({
    changelog: "",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: allDocuments = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ['allDocuments'],
    queryFn: () => base44.entities.DocumentBuilder.list('-updated_date', 200),
    staleTime: 0, // Always fetch fresh
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  // Merge both document sources
  const mergedDocuments = React.useMemo(() => {
    const docMap = new Map();
    
    // Add DocumentBuilder documents
    allDocuments.forEach(doc => {
      docMap.set(`builder_${doc.id}`, {
        ...doc,
        id: `builder_${doc.id}`, // Ensure unique ID for mapping
        source: 'builder',
        file_url: null, // Builder docs don't have file_url until finalized
      });
    });
    
    // Add Document entity documents
    documents.forEach(doc => {
      docMap.set(`doc_${doc.id}`, {
        ...doc,
        id: `doc_${doc.id}`, // Ensure unique ID for mapping
        source: 'document',
      });
    });
    
    return Array.from(docMap.values());
  }, [allDocuments, documents]);


  const { data: documentTasks = [] } = useQuery({
    queryKey: ['documentTasks'],
    queryFn: () => base44.entities.DocumentTask.list('-assigned_at'),
  });

  const { data: documentReviews = [] } = useQuery({
    queryKey: ['documentReviews'],
    queryFn: () => base44.entities.DocumentReview.list('-opened_at'),
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.list(),
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, metadata }) => {
      setUploadProgress(30);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploadProgress(70);
      const documentData = {
        ...metadata,
        file_url,
        file_type: file.type.includes('pdf') ? 'pdf' : 
                   file.type.includes('image') ? 'image' : 
                   file.type.includes('video') ? 'video' :
                   file.type.includes('wordprocessingml') || file.type.includes('msword') ? 'docx' : 'other',
        file_size: file.size,
        uploaded_by: user.email,
        uploaded_by_name: user.full_name,
        version_number: 1,
        tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()) : [],
        last_updated: new Date().toISOString(),
      };

      const document = await base44.entities.Document.create(documentData);
      
      // Create initial version record
      await base44.entities.DocumentVersion.create({
        document_id: document.id,
        document_title: document.title,
        version_number: 1,
        file_url: document.file_url,
        file_size: document.file_size,
        changelog: "Initial upload",
        updated_by: user.email,
        updated_by_name: user.full_name,
        is_current: true,
      });

      setUploadProgress(100);
      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] }); // Invalidate original documents query
      setTimeout(() => {
        setShowUploadDialog(false);
        setUploadProgress(0);
        setUploadForm({
          title: "",
          description: "",
          category: "policy",
          department: "all",
          confidentiality_level: "internal",
          is_mandatory: false,
          requires_signature: false,
          tags: "",
          review_frequency: "none",
        });
      }, 500);
    },
  });

  const updateDocumentVersionMutation = useMutation({
    mutationFn: async ({ documentId, file, changelog }) => {
      // Find the actual Document entity, not the merged one
      const actualDocument = documents.find(d => `doc_${d.id}` === documentId);
      if (!actualDocument) throw new Error("Document not found for version update.");

      const newVersionNumber = (actualDocument.version_number || 1) + 1;

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Update document
      await base44.entities.Document.update(actualDocument.id, {
        file_url,
        version_number: newVersionNumber,
        file_size: file.size,
        last_updated: new Date().toISOString(),
        file_type: file.type.includes('pdf') ? 'pdf' : 
                   file.type.includes('image') ? 'image' : 
                   file.type.includes('video') ? 'video' :
                   file.type.includes('wordprocessingml') || file.type.includes('msword') ? 'docx' : 'other',
      });

      // Mark previous version as not current
      const previousVersions = await base44.entities.DocumentVersion.filter({
        document_id: actualDocument.id,
        is_current: true,
      });
      
      for (const v of previousVersions) {
        await base44.entities.DocumentVersion.update(v.id, { is_current: false });
      }

      // Create new version record
      await base44.entities.DocumentVersion.create({
        document_id: actualDocument.id,
        document_title: actualDocument.title,
        version_number: newVersionNumber,
        file_url,
        file_size: file.size,
        changelog: changelog || `Updated to version ${newVersionNumber}`,
        updated_by: user.email,
        updated_by_name: user.full_name,
        replaced_version: actualDocument.version_number,
        is_current: true,
      });

      // Create tasks for staff who haven't acknowledged latest version
      const staffToNotify = allStaff.filter(s => {
        const hasAcknowledged = documentReviews.some(
          r => r.document_id === actualDocument.id && 
               r.staff_email === s.email && 
               r.acknowledged && 
               r.version_viewed === newVersionNumber
        );
        return !hasAcknowledged;
      });

      for (const staff of staffToNotify) {
        await base44.entities.DocumentTask.create({
          document_id: actualDocument.id,
          document_title: actualDocument.title,
          document_category: actualDocument.category,
          assigned_to_email: staff.email,
          assigned_to_name: staff.full_name,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high',
          status: 'pending',
          assigned_by: user.email,
          assigned_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documentTasks'] });
      setShowVersionDialog(false);
      setSelectedDocument(null);
    },
  });

  const assignDocumentMutation = useMutation({
    mutationFn: async () => {
      // Ensure selectedDocument is a proper Document entity (not a builder draft)
      const actualDocumentId = selectedDocument.id.replace('doc_', '');
      if (selectedDocument.source !== 'document' || !actualDocumentId) {
        throw new Error("Cannot assign a draft document.");
      }

      const dueDate = assignForm.due_date || 
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let staffToAssign = [];

      if (assignForm.assign_to === 'all') {
        staffToAssign = allStaff;
      } else if (assignForm.assign_to === 'role') {
        staffToAssign = allStaff.filter(s => s.position === assignForm.role);
      } else if (assignForm.assign_to === 'department') {
        staffToAssign = allStaff.filter(s => s.department === assignForm.department);
      }

      const tasks = await Promise.all(
        staffToAssign.map(staff =>
          base44.entities.DocumentTask.create({
            document_id: actualDocumentId,
            document_title: selectedDocument.title,
            document_category: selectedDocument.category,
            assigned_to_email: staff.email,
            assigned_to_name: staff.full_name,
            due_date: dueDate,
            priority: assignForm.priority,
            status: 'pending',
            assigned_by: user.email,
            assigned_at: new Date().toISOString(),
          })
        )
      );

      return tasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTasks'] });
      setShowAssignDialog(false);
      setSelectedDocument(null);
      setAssignForm({
        assign_to: "all",
        role: "",
        department: "",
        due_date: "",
        priority: "normal",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (mergedId) => {
      const actualId = mergedId.replace('doc_', '');
      if (mergedId.startsWith('builder_')) {
         // This mutation is for Document entities. DocumentBuilder deletion would need a separate mutation.
         throw new Error("Cannot delete a builder document using Document deletion mutation.");
      }
      return base44.entities.Document.update(actualId, { is_active: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      await uploadDocumentMutation.mutateAsync({
        file,
        metadata: uploadForm,
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleVersionUpdate = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocument || selectedDocument.source !== 'document') return; // Only allow updates for actual documents

    try {
      await updateDocumentVersionMutation.mutateAsync({
        documentId: selectedDocument.id, // This is the merged ID 'doc_X'
        file,
        changelog: versionForm.changelog,
      });
    } catch (error) {
      console.error('Error updating version:', error);
      alert('Failed to update document version');
    }
  };

  const handleViewDocument = (doc) => {
    setSelectedDocument(doc);
    setShowViewerDialog(true);
    
    // Track view for analytics only for finalized documents
    if (doc.source === 'document' && doc.id) {
      const actualDocumentId = doc.id.replace('doc_', '');
      base44.entities.DocumentReview.create({
        document_id: actualDocumentId,
        document_title: doc.title,
        staff_email: user?.email,
        staff_name: user?.full_name,
        version_viewed: doc.version_number,
        opened_at: new Date().toISOString(),
      }).catch(err => console.error('Error logging view:', err));
    }
  };

  // Filter documents
  const filteredDocuments = mergedDocuments.filter(doc => {
    // For 'document' source, respect 'is_active'. For 'builder' source, assume they are "active" drafts.
    if (doc.source === 'document' && !doc.is_active) return false;
    
    const matchesSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesDepartment = filterDepartment === 'all' || doc.department === filterDepartment;
    
    if (activeTab === 'policies') {
      return matchesSearch && matchesCategory && matchesDepartment && doc.is_mandatory;
    }
    
    return matchesSearch && matchesCategory && matchesDepartment;
  });

  // Calculate statistics (based on finalized documents only)
  const totalDocuments = documents.filter(d => d.is_active).length;
  const mandatoryDocs = documents.filter(d => d.is_active && d.is_mandatory).length;
  const pendingTasks = documentTasks.filter(t => t.status === 'pending').length;
  const overdueTasks = documentTasks.filter(t => {
    if (t.status !== 'pending') return false;
    const due = new Date(t.due_date);
    return due < new Date();
  }).length;

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'policy': return Shield;
      case 'training': return BookOpen;
      case 'hr': return Users;
      case 'compliance': return ClipboardCheck;
      case 'safety': return AlertTriangle;
      default: return FileText;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'policy': return 'from-emerald-500 to-emerald-600';
      case 'training': return 'from-blue-500 to-blue-600';
      case 'hr': return 'from-purple-500 to-purple-600';
      case 'compliance': return 'from-orange-500 to-orange-600';
      case 'safety': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getConfidentialityBadge = (level) => {
    const colors = {
      public: 'bg-green-100 text-green-800',
      internal: 'bg-blue-100 text-blue-800',
      confidential: 'bg-yellow-100 text-yellow-800',
      restricted: 'bg-red-100 text-red-800',
    };
    return colors[level] || colors.internal;
  };

  if (!isManager) {
    return (
      <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Card className="border-[#014D40] border-2">
            <CardContent className="p-8 text-center">
              <Shield className="w-16 h-16 text-[#014D40] mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Document Management</h3>
              <p className="text-gray-600 mb-6">This area is restricted to managers and administrators.</p>
              <div className="flex gap-3 justify-center">
                <Link to={createPageUrl("Dashboard")}>
                  <Button variant="outline">
                    <Home className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl("DocumentSignatureReport")}>
            <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50">
              <FileText className="w-4 h-4 mr-2" />
              Signature Report
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#014D40] to-emerald-700 rounded-xl">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Document Management</h1>
                <p className="text-lg text-gray-600">Secure storage, version control & policy acknowledgment</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowUploadDialog(true)}
              className="bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013d33] hover:to-emerald-700 text-white shadow-lg"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-8 h-8 text-[#014D40]" />
                  <Badge variant="outline" className="text-xs">Total</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalDocuments}</p>
                <p className="text-sm text-gray-600 mt-1">All Documents</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Shield className="w-8 h-8 text-[#E0B037]" />
                  <Badge variant="outline" className="text-xs">Policies</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{mandatoryDocs}</p>
                <p className="text-sm text-gray-600 mt-1">Mandatory Docs</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <Badge variant="outline" className="text-xs">Pending</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{pendingTasks}</p>
                <p className="text-sm text-gray-600 mt-1">Pending Reviews</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <Badge variant="outline" className="text-xs">Urgent</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{overdueTasks}</p>
                <p className="text-sm text-gray-600 mt-1">Overdue Tasks</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters & Search */}
        <Card className="mb-6 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Department" />
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
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab("all")}
            variant={activeTab === "all" ? "default" : "outline"}
            className={activeTab === "all" ? "bg-[#014D40]" : ""}
          >
            <FileText className="w-4 h-4 mr-2" />
            All Documents
          </Button>
          <Button
            onClick={() => setActiveTab("policies")}
            variant={activeTab === "policies" ? "default" : "outline"}
            className={activeTab === "policies" ? "bg-[#014D40]" : ""}
          >
            <Shield className="w-4 h-4 mr-2" />
            Policies & Compliance
          </Button>
        </div>

        {/* Documents Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredDocuments.map((doc, index) => {
              const Icon = getCategoryIcon(doc.category);
              const categoryColor = getCategoryColor(doc.category);
              
              // Document tasks and acknowledgments are only relevant for finalized documents
              const docTasks = doc.source === 'document' ? documentTasks.filter(t => t.document_id === doc.id.replace('doc_', '')) : [];
              const acknowledgedCount = docTasks.filter(t => t.status === 'acknowledged').length;
              const totalAssigned = docTasks.length;
              const acknowledgmentRate = totalAssigned > 0 ? Math.round((acknowledgedCount / totalAssigned) * 100) : 0;

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                    <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${categoryColor}`} />
                    
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 bg-gradient-to-br ${categoryColor} rounded-xl`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDocument(doc)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Document
                            </DropdownMenuItem>
                            {doc.source === 'document' && (
                              <>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedDocument(doc);
                                  setShowAssignDialog(true);
                                }}>
                                  <Send className="w-4 h-4 mr-2" />
                                  Assign to Staff
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedDocument(doc);
                                  setShowVersionDialog(true);
                                }}>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Update Version
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(createPageUrl(`DocumentHistory?id=${doc.id.replace('doc_', '')}`))}>
                                  <History className="w-4 h-4 mr-2" />
                                  Version History
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this document? This will archive it.')) {
                                      deleteDocumentMutation.mutate(doc.id);
                                    }
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Document
                                </DropdownMenuItem>
                              </>
                            )}
                            {doc.source === 'builder' && (
                              <>
                                <DropdownMenuItem onClick={() => navigate(createPageUrl(`DocumentBuilderEdit?id=${doc.id.replace('builder_', '')}`))} className="text-[#014D40]">
                                  <PenTool className="w-4 h-4 mr-2" />
                                  Edit Draft
                                </DropdownMenuItem>
                                {/* Implement delete functionality for DocumentBuilder if needed */}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                        {doc.title} {doc.source === 'builder' && <Badge variant="secondary" className="ml-2 bg-gray-200 text-gray-700">Draft</Badge>}
                      </h3>
                      
                      {doc.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {doc.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className={getConfidentialityBadge(doc.confidentiality_level)}>
                          {doc.confidentiality_level}
                        </Badge>
                        {doc.is_mandatory && (
                          <Badge className="bg-[#E0B037] text-gray-900">
                            <PenTool className="w-3 h-3 mr-1" />
                            Requires Signature
                          </Badge>
                        )}
                        {doc.source === 'document' && (
                          <Badge variant="outline" className="capitalize">
                            v{doc.version_number}
                          </Badge>
                        )}
                      </div>

                      {doc.source === 'document' && totalAssigned > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Acknowledgment Rate</span>
                            <span className="font-medium">{acknowledgmentRate}%</span>
                          </div>
                          <Progress value={acknowledgmentRate} className="h-2" />
                          <p className="text-xs text-gray-500">
                            {acknowledgedCount} / {totalAssigned} staff acknowledged
                          </p>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                        <span>By {doc.uploaded_by_name || doc.created_by_name || 'N/A'}</span>
                        <span>{doc.created_date ? format(new Date(doc.created_date), 'MMM d, yyyy') : 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredDocuments.length === 0 && (
          <Card className="border-none shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Documents Found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterCategory !== 'all' || filterDepartment !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Upload your first document to get started'}
              </p>
              {!searchQuery && filterCategory === 'all' && filterDepartment === 'all' && (
                <Button 
                  onClick={() => setShowUploadDialog(true)}
                  className="bg-[#014D40] hover:bg-[#013d33]"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        if (!uploading) setShowUploadDialog(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Upload className="w-6 h-6 text-[#014D40]" />
              Upload New Document
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>Document Title *</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g., Food Safety Policy 2024"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Brief description of this document..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select
                  value={uploadForm.category}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="menu">Menu</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Department</Label>
                <Select
                  value={uploadForm.department}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, department: value })}
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
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Confidentiality Level</Label>
                <Select
                  value={uploadForm.confidentiality_level}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, confidentiality_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="confidential">Confidential</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Review Frequency</Label>
                <Select
                  value={uploadForm.review_frequency}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, review_frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Tags (comma separated)</Label>
              <Input
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                placeholder="e.g., hygiene, safety, certification"
              />
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_mandatory"
                  checked={uploadForm.is_mandatory}
                  onChange={(e) => setUploadForm({ ...uploadForm, is_mandatory: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_mandatory" className="cursor-pointer">
                  📋 Mandatory Document (requires staff acknowledgment)
                </Label>
              </div>

              {uploadForm.is_mandatory && (
                <div className="flex items-center gap-2 ml-6">
                  <input
                    type="checkbox"
                    id="requires_signature"
                    checked={uploadForm.requires_signature}
                    onChange={(e) => setUploadForm({ ...uploadForm, requires_signature: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="requires_signature" className="cursor-pointer">
                    ✍️ Requires Digital Signature
                  </Label>
                </div>
              )}
            </div>

            <div>
              <Label>Select File *</Label>
              <input
                type="file"
                id="document-upload"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => document.getElementById('document-upload').click()}
                disabled={uploading || !uploadForm.title}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Choose File'}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Supported: PDF, Word, Images, Videos (Max 50MB)
              </p>
            </div>

            {uploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Uploading...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </motion.div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowUploadDialog(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Document Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-[#014D40]" />
              Assign Document to Staff
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>Assign To</Label>
              <Select
                value={assignForm.assign_to}
                onValueChange={(value) => setAssignForm({ ...assignForm, assign_to: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  <SelectItem value="role">By Role</SelectItem>
                  <SelectItem value="department">By Department</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignForm.assign_to === 'role' && (
              <div>
                <Label>Select Role</Label>
                <Select
                  value={assignForm.role}
                  onValueChange={(value) => setAssignForm({ ...assignForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="line_cook">Line Cook</SelectItem>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="bartender">Bartender</SelectItem>
                    <SelectItem value="cleaner">Cleaner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignForm.assign_to === 'department' && (
              <div>
                <Label>Select Department</Label>
                <Select
                  value={assignForm.department}
                  onValueChange={(value) => setAssignForm({ ...assignForm, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="front_of_house">Front of House</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={assignForm.due_date}
                onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-500 mt-1">Default: 14 days from now</p>
            </div>

            <div>
              <Label>Priority</Label>
              <Select
                value={assignForm.priority}
                onValueChange={(value) => setAssignForm({ ...assignForm, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => assignDocumentMutation.mutate()}
              disabled={assignDocumentMutation.isPending || selectedDocument?.source === 'builder'}
              className="bg-[#014D40] hover:bg-[#013d33]"
            >
              {assignDocumentMutation.isPending ? 'Assigning...' : 'Assign Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Version Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#014D40]" />
              Update Document Version
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900 font-medium">
                Current Version: v{selectedDocument?.version_number}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Updating will create v{(selectedDocument?.version_number || 0) + 1} and notify all staff
              </p>
            </div>

            <div>
              <Label>Changelog / What Changed?</Label>
              <Textarea
                value={versionForm.changelog}
                onChange={(e) => setVersionForm({ ...versionForm, changelog: e.target.value })}
                placeholder="e.g., Updated safety procedures based on new regulations"
                rows={4}
              />
            </div>

            <div>
              <Label>Upload New File *</Label>
              <input
                type="file"
                id="version-upload"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4"
                onChange={handleVersionUpdate}
              />
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => document.getElementById('version-upload').click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowVersionDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Dialog - COMPREHENSIVE FIX */}
      <Dialog open={showViewerDialog} onOpenChange={setShowViewerDialog}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b flex-shrink-0 bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <DialogTitle className="text-xl font-bold">{selectedDocument?.title}</DialogTitle>
                {selectedDocument?.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedDocument.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={getConfidentialityBadge(selectedDocument?.confidentiality_level)}>
                    {selectedDocument?.confidentiality_level}
                  </Badge>
                  {selectedDocument?.source === 'document' && (
                    <Badge variant="outline">v{selectedDocument?.version_number}</Badge>
                  )}
                  {selectedDocument?.file_type && selectedDocument?.source === 'document' && (
                    <Badge variant="outline" className="capitalize">
                      {selectedDocument?.file_type}
                    </Badge>
                  )}
                  {selectedDocument?.source === 'builder' && (
                    <Badge variant="secondary" className="bg-gray-200 text-gray-700">Draft Document</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedDocument?.file_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedDocument?.file_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowViewerDialog(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-gray-50">
            {selectedDocument && selectedDocument.file_url ? (
              <div className="h-full w-full flex items-center justify-center p-4">
                {/* PDF Viewer - Using object tag for better compatibility */}
                {selectedDocument.file_type === 'pdf' && (
                  <div className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
                    <object
                      data={selectedDocument.file_url}
                      type="application/pdf"
                      className="w-full h-full"
                      style={{ minHeight: '70vh' }}
                    >
                      <iframe
                        src={`${selectedDocument.file_url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                        className="w-full h-full border-0"
                        title={selectedDocument.title}
                        style={{ minHeight: '70vh' }}
                      >
                        <div className="p-8 text-center">
                          <p className="text-gray-700 mb-4">
                            Unable to display PDF in browser.
                          </p>
                          <Button
                            onClick={() => window.open(selectedDocument.file_url, '_blank')}
                            className="bg-[#014D40] hover:bg-[#013830]"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Open PDF in New Tab
                          </Button>
                        </div>
                      </iframe>
                    </object>
                  </div>
                )}

                {/* Image Viewer */}
                {selectedDocument.file_type === 'image' && (
                  <div className="max-w-full max-h-full flex items-center justify-center">
                    <img
                      src={selectedDocument.file_url}
                      alt={selectedDocument.title}
                      className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div class="p-8 text-center bg-white rounded-lg shadow-lg">
                            <p class="text-gray-700 mb-4">Unable to display image.</p>
                            <a href="${selectedDocument.file_url}" target="_blank" class="text-blue-600 hover:underline">
                              Open Image in New Tab
                            </a>
                          </div>
                        `;
                      }}
                    />
                  </div>
                )}

                {/* Video Viewer */}
                {selectedDocument.file_type === 'video' && (
                  <div className="max-w-full max-h-full flex items-center justify-center bg-black rounded-lg">
                    <video
                      src={selectedDocument.file_url}
                      controls
                      className="max-w-full max-h-[80vh] rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div class="p-8 text-center bg-white rounded-lg">
                            <p class="text-gray-700 mb-4">Unable to play video.</p>
                            <a href="${selectedDocument.file_url}" target="_blank" class="text-blue-600 hover:underline">
                              Open Video in New Tab
                            </a>
                          </div>
                        `;
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* DOCX/Word Documents - Multiple fallback options */}
                {selectedDocument.file_type === 'docx' && (
                  <div className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
                    <iframe
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(selectedDocument.file_url)}`}
                      className="w-full h-full border-0"
                      title={selectedDocument.title}
                      style={{ minHeight: '70vh' }}
                      onError={(e) => {
                        // Fallback to Google Docs viewer
                        console.log('Office viewer failed, trying Google Docs viewer');
                        e.target.src = `https://docs.google.com/gview?url=${encodeURIComponent(selectedDocument.file_url)}&embedded=true`;
                        
                        // If that fails too, show download option
                        setTimeout(() => {
                          if (!e.target.contentWindow || e.target.contentWindow.document.body.innerHTML === "") { // simple check for empty iframe content
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `
                              <div class="p-8 text-center">
                                <p class="text-gray-700 mb-4">
                                  Unable to display Word document in browser.
                                </p>
                                <a href="${selectedDocument.file_url}" download class="inline-flex items-center px-4 py-2 bg-[#014D40] text-white rounded-lg hover:bg-[#013830]">
                                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a 3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                  </svg>
                                  Download Document
                                </a>
                              </div>
                            `;
                          }
                        }, 5000); // Give some time for the Google viewer to load
                      }}
                    />
                  </div>
                )}

                {/* Other File Types - With comprehensive fallbacks */}
                {selectedDocument.file_type === 'other' && (
                  <div className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(selectedDocument.file_url)}&embedded=true`}
                      className="w-full h-full border-0"
                      title={selectedDocument.title}
                      style={{ minHeight: '70vh' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div class="p-8 text-center">
                            <div class="mb-6">
                              <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                              </svg>
                              <p class="text-gray-700 text-lg font-semibold mb-2">
                                ${selectedDocument.title}
                              </p>
                              <p class="text-gray-600 mb-4">
                                This file type cannot be previewed in the browser.
                              </p>
                            </div>
                            <a 
                              href="${selectedDocument.file_url}" 
                              download
                              class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#014D40] to-emerald-600 text-white rounded-lg hover:from-[#013830] hover:to-emerald-700 font-medium shadow-lg"
                            >
                              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                              </svg>
                              Download to View
                            </a>
                          </div>
                        `;
                      }}
                    />
                  </div>
                )}
              </div>
            ) : selectedDocument && selectedDocument.source === 'builder' ? (
              <div className="h-full w-full flex items-center justify-center p-4">
                <div className="p-8 text-center bg-white rounded-lg shadow-lg max-w-sm">
                  <BookOpen className="w-16 h-16 text-[#014D40] mx-auto mb-4" />
                  <p className="text-xl font-bold text-gray-900 mb-2">Draft Document</p>
                  <p className="text-gray-600 mb-4">
                    This document is currently being built and does not have a finalized file attached yet.
                  </p>
                  <Button
                    onClick={() => {
                      setShowViewerDialog(false);
                      navigate(createPageUrl(`DocumentBuilderEdit?id=${selectedDocument.id.replace('builder_', '')}`));
                    }}
                    className="bg-[#014D40] hover:bg-[#013d33]"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit in Builder
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center p-4">
                <div className="p-8 text-center bg-white rounded-lg shadow-lg max-w-sm">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-bold text-gray-900 mb-2">No File Available</p>
                  <p className="text-gray-600 mb-4">
                    The file for this document could not be loaded or is not available.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Document Info Footer */}
          <div className="p-3 border-t bg-white flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-600 flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                {(selectedDocument?.uploaded_by_name || selectedDocument?.created_by_name) && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedDocument.uploaded_by_name || selectedDocument.created_by_name}
                  </span>
                )}
                {(selectedDocument?.created_date || selectedDocument?.last_updated) && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(selectedDocument.created_date || selectedDocument.last_updated), 'PPP')}
                    </span>
                  </>
                )}
                {selectedDocument?.file_size && (selectedDocument.source === 'document') && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span>{(selectedDocument.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  </>
                )}
              </div>
              {selectedDocument?.file_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(selectedDocument?.file_url, '_blank', 'noopener,noreferrer')}
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Open in New Tab
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
