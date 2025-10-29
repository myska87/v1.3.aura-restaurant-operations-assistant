import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Upload,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Download,
  Send,
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  Search,
  Plus,
  Filter,
  Home,
  ArrowLeft,
  Clock,
  Shield,
  Lock,
  Unlock,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    title: '',
    category: 'sop',
    description: '',
    content_html: '',
    department: 'all',
    requires_signature: false,
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["allDocuments"],
    queryFn: () => base44.entities.DocumentBuilder.list("-updated_date"),
  });

  const { data: documentSignatures = [] } = useQuery({
    queryKey: ["documentSignatures"],
    queryFn: () => base44.entities.DocumentBuilderSignature.list(),
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DocumentBuilder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
      setShowEditDialog(false);
      setSelectedDocument(null);
      alert("✅ Document updated successfully!");
    },
    onError: (error) => {
      console.error("Update error:", error);
      alert("Failed to update document. Please try again.");
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentBuilder.update(id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
    },
  });

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    if (doc.status === 'archived') return false;
    
    const matchesTab = activeTab === "all" || doc.status === activeTab;
    const matchesSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || doc.category === filterCategory;
    const matchesDepartment = filterDepartment === "all" || doc.department === filterDepartment;

    return matchesTab && matchesSearch && matchesCategory && matchesDepartment;
  });

  const handleEditDocument = (doc) => {
    setSelectedDocument(doc);
    setEditFormData({
      title: doc.title || '',
      category: doc.category || 'sop',
      description: doc.description || '',
      content_html: doc.content_html || '',
      department: doc.department || 'all',
      requires_signature: doc.requires_signature || false,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData.title.trim()) {
      alert('Please enter a document title');
      return;
    }

    const updateData = {
      ...editFormData,
      content_json: {
        html: editFormData.content_html,
        plainText: editFormData.content_html.replace(/<[^>]*>/g, ''),
      },
      updated_by: user.email,
      updated_by_name: user.full_name,
      version: (selectedDocument.version || 1) + 1,
    };

    await updateDocumentMutation.mutateAsync({
      id: selectedDocument.id,
      data: updateData,
    });
  };

  const handleViewDocument = (doc) => {
    navigate(createPageUrl(`DocumentViewer?id=${doc.id}`));
  };

  const handleDeleteDocument = async (doc) => {
    if (!window.confirm(`Are you sure you want to archive "${doc.title}"?`)) {
      return;
    }
    await deleteDocumentMutation.mutateAsync(doc.id);
  };

  const getSignatureCount = (docId) => {
    return documentSignatures.filter(sig => sig.document_id === docId).length;
  };

  // Rich text editor configuration with better paste support
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean'],
      ['code-block'],
    ],
    clipboard: {
      matchVisual: false, // Better paste from Word/external sources
    }
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'color', 'background',
    'align',
    'link', 'image',
    'code-block',
  ];

  const stats = {
    total: documents.filter(d => d.status !== 'archived').length,
    published: documents.filter(d => d.status === 'published').length,
    drafts: documents.filter(d => d.status === 'draft').length,
    requiresSignature: documents.filter(d => d.requires_signature && d.status === 'published').length,
  };

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-700 mb-6">
                Document Management is only accessible to managers and administrators.
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

        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Document Management</h1>
              <p className="text-lg text-gray-600">Manage policies, procedures, and training materials</p>
            </div>
            <Link to={createPageUrl('DocumentBuilder')}>
              <Button className="bg-[#014D40] hover:bg-[#013830]">
                <Plus className="w-4 h-4 mr-2" />
                Create Document
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Documents</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stats.published}</p>
              <p className="text-sm text-gray-600">Published</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stats.drafts}</p>
              <p className="text-sm text-gray-600">Drafts</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stats.requiresSignature}</p>
              <p className="text-sm text-gray-600">Require Signature</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: "all", label: "All Documents", count: stats.total },
            { key: "published", label: "Published", count: stats.published },
            { key: "draft", label: "Drafts", count: stats.drafts },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? "bg-[#014D40]" : ""}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-2">
                {tab.count}
              </Badge>
            </Button>
          ))}
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
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Department" />
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
          </CardContent>
        </Card>

        {/* Documents List */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-600 mb-6">Create your first document to get started</p>
              <Link to={createPageUrl('DocumentBuilder')}>
                <Button className="bg-[#014D40] hover:bg-[#013830]">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Document
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {doc.title}
                        </h3>
                        {doc.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDocument(doc)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditDocument(doc)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteDocument(doc)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="text-xs capitalize">
                        {doc.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {doc.department}
                      </Badge>
                      {doc.status === 'published' && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Published
                        </Badge>
                      )}
                      {doc.status === 'draft' && (
                        <Badge className="bg-gray-100 text-gray-800 text-xs">
                          Draft
                        </Badge>
                      )}
                      {doc.requires_signature && (
                        <Badge className="bg-purple-100 text-purple-800 text-xs">
                          Requires Signature
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {doc.view_count || 0}
                        </span>
                        {doc.requires_signature && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {getSignatureCount(doc.id)}
                          </span>
                        )}
                      </div>
                      <span>
                        {format(new Date(doc.updated_date || doc.created_date), 'MMM d')}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDocument(doc)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditDocument(doc)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Edit Document Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Document: {selectedDocument?.title}</DialogTitle>
              <DialogDescription>
                Make changes to the document. Content will auto-format when pasted from Word or other sources.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                    placeholder="Document title"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={editFormData.category}
                    onValueChange={(value) => setEditFormData({...editFormData, category: value})}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sop">SOP</SelectItem>
                      <SelectItem value="policy">Policy</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="guide">Guide</SelectItem>
                      <SelectItem value="quality">Quality</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="customer_service">Customer Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  placeholder="Brief description"
                  rows={2}
                />
              </div>

              <div>
                <Label>Content</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={editFormData.content_html}
                    onChange={(value) => setEditFormData({...editFormData, content_html: value})}
                    modules={quillModules}
                    formats={quillFormats}
                    style={{ minHeight: '400px', background: 'white' }}
                    placeholder="Start typing or paste content from Word, Google Docs, etc..."
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip: You can paste formatted content directly from Word, Google Docs, or any website. Formatting will be preserved!
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-department">Department</Label>
                  <Select
                    value={editFormData.department}
                    onValueChange={(value) => setEditFormData({...editFormData, department: value})}
                  >
                    <SelectTrigger id="edit-department">
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

                <div className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    id="edit-signature"
                    checked={editFormData.requires_signature}
                    onChange={(e) => setEditFormData({...editFormData, requires_signature: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="edit-signature" className="cursor-pointer">
                    Require staff signature
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateDocumentMutation.isPending}
                className="bg-[#014D40] hover:bg-[#013830]"
              >
                {updateDocumentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}