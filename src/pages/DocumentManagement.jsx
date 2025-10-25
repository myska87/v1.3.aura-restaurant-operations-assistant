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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function DocumentManagement() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "policy",
    department: "all",
    confidentiality_level: "internal",
    is_mandatory: false,
    requires_signature: false,
    tags: "",
  });

  const [assignForm, setAssignForm] = useState({
    assign_to: "all",
    role: "",
    department: "",
    due_date: "",
    priority: "normal",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const { data: documentTasks = [] } = useQuery({
    queryKey: ['documentTasks'],
    queryFn: () => base44.entities.DocumentTask.list('-assigned_at'),
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.list(),
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, metadata }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const documentData = {
        ...metadata,
        file_url,
        file_type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'other',
        file_size: file.size,
        uploaded_by: user.email,
        uploaded_by_name: user.full_name,
        version_number: 1,
        tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()) : [],
        last_updated: new Date().toISOString(),
      };

      const document = await base44.entities.Document.create(documentData);
      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowUploadDialog(false);
      setUploadForm({
        title: "",
        description: "",
        category: "policy",
        department: "all",
        confidentiality_level: "internal",
        is_mandatory: false,
        requires_signature: false,
        tags: "",
      });
    },
  });

  const assignDocumentMutation = useMutation({
    mutationFn: async (assignments) => {
      const tasks = await Promise.all(
        assignments.map(assignment =>
          base44.entities.DocumentTask.create(assignment)
        )
      );
      return tasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTasks'] });
      setShowAssignDialog(false);
      setSelectedDocument(null);
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
    try {
      await uploadDocumentMutation.mutateAsync({
        file,
        metadata: uploadForm,
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document');
    }
    setUploading(false);
  };

  const handleAssignDocument = async () => {
    if (!selectedDocument) return;

    const assignments = [];
    const dueDate = assignForm.due_date;

    if (assignForm.assign_to === 'all') {
      allStaff.forEach(staff => {
        assignments.push({
          document_id: selectedDocument.id,
          document_title: selectedDocument.title,
          document_category: selectedDocument.category,
          assigned_to_email: staff.email,
          assigned_to_name: staff.full_name,
          assigned_to_role: staff.position,
          assigned_to_department: staff.department || 'all',
          due_date: dueDate,
          priority: assignForm.priority,
          assigned_by: user.email,
          assigned_at: new Date().toISOString(),
          status: 'pending',
        });
      });
    } else if (assignForm.assign_to === 'role') {
      allStaff
        .filter(staff => staff.position === assignForm.role)
        .forEach(staff => {
          assignments.push({
            document_id: selectedDocument.id,
            document_title: selectedDocument.title,
            document_category: selectedDocument.category,
            assigned_to_email: staff.email,
            assigned_to_name: staff.full_name,
            assigned_to_role: staff.position,
            assigned_to_department: staff.department || 'all',
            due_date: dueDate,
            priority: assignForm.priority,
            assigned_by: user.email,
            assigned_at: new Date().toISOString(),
            status: 'pending',
          });
        });
    }

    await assignDocumentMutation.mutateAsync(assignments);
  };

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
      case 'policy': return 'bg-red-100 text-red-800 border-red-200';
      case 'training': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'hr': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'compliance': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'safety': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidentialityColor = (level) => {
    switch (level) {
      case 'restricted': return 'bg-red-500 text-white';
      case 'confidential': return 'bg-orange-500 text-white';
      case 'internal': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesDepartment = filterDepartment === 'all' || doc.department === filterDepartment;
    
    if (activeTab === 'policies') {
      return matchesSearch && matchesCategory && matchesDepartment && doc.is_mandatory;
    }
    
    return matchesSearch && matchesCategory && matchesDepartment && doc.is_active;
  });

  const totalDocuments = documents.filter(d => d.is_active).length;
  const totalPolicies = documents.filter(d => d.is_mandatory && d.is_active).length;
  const pendingTasks = documentTasks.filter(t => t.status === 'pending').length;
  const acknowledgedTasks = documentTasks.filter(t => t.status === 'acknowledged').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 Document Management</h1>
          <p className="text-gray-600">Secure document storage, policy tracking & staff acknowledgments</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-3xl font-bold text-gray-900">{totalDocuments}</p>
                </div>
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Policies</p>
                  <p className="text-3xl font-bold text-gray-900">{totalPolicies}</p>
                </div>
                <Shield className="w-10 h-10 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">{pendingTasks}</p>
                </div>
                <Clock className="w-10 h-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Acknowledged</p>
                  <p className="text-3xl font-bold text-gray-900">{acknowledgedTasks}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveTab('all')}
          >
            📂 All Documents
          </Button>
          <Button
            variant={activeTab === 'policies' ? 'default' : 'outline'}
            onClick={() => setActiveTab('policies')}
          >
            📜 Policies & Compliance
          </Button>
          <Button
            variant={activeTab === 'tracking' ? 'default' : 'outline'}
            onClick={() => setActiveTab('tracking')}
          >
            👁 Review Tracking
          </Button>
          {isManager && (
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="ml-auto bg-gradient-to-r from-blue-600 to-green-600"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>

        {/* Filters */}
        {(activeTab === 'all' || activeTab === 'policies') && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="menu">Menu</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[180px]">
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
        )}

        {/* Documents Grid */}
        {(activeTab === 'all' || activeTab === 'policies') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => {
              const CategoryIcon = getCategoryIcon(doc.category);
              const tasksForDoc = documentTasks.filter(t => t.document_id === doc.id);
              const completedTasks = tasksForDoc.filter(t => t.status === 'acknowledged').length;
              const totalTasks = tasksForDoc.length;

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="hover:shadow-lg transition-all group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CategoryIcon className="w-5 h-5 text-gray-600" />
                            <Badge className={getCategoryColor(doc.category)}>
                              {doc.category}
                            </Badge>
                            {doc.is_mandatory && (
                              <Badge className="bg-red-500 text-white">
                                Mandatory
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">{doc.title}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {doc.description || 'No description'}
                          </p>
                        </div>

                        {isManager && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(doc.file_url, '_blank')}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Document
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedDocument(doc);
                                setShowAssignDialog(true);
                              }}>
                                <Users className="w-4 h-4 mr-2" />
                                Assign to Staff
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Department</span>
                          <Badge variant="outline">{doc.department}</Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Confidentiality</span>
                          <Badge className={getConfidentialityColor(doc.confidentiality_level)}>
                            {doc.confidentiality_level}
                          </Badge>
                        </div>

                        {totalTasks > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-gray-600">Staff Completion</span>
                              <span className="font-bold">
                                {completedTasks}/{totalTasks}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                          <span>v{doc.version_number}</span>
                          <span>{format(new Date(doc.created_date), 'MMM d, yyyy')}</span>
                        </div>

                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Document
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Tracking Tab */}
        {activeTab === 'tracking' && (
          <Card>
            <CardHeader>
              <CardTitle>Document Review Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.filter(d => d.is_mandatory).map(doc => {
                  const tasks = documentTasks.filter(t => t.document_id === doc.id);
                  const completed = tasks.filter(t => t.status === 'acknowledged').length;
                  const pending = tasks.filter(t => t.status === 'pending').length;
                  const overdue = tasks.filter(t => t.status === 'overdue').length;

                  return (
                    <div key={doc.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-bold">{doc.title}</h3>
                          <p className="text-sm text-gray-600">{doc.category}</p>
                        </div>
                        <Badge className={getCategoryColor(doc.category)}>
                          {tasks.length} assigned
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-green-600">{completed}</p>
                          <p className="text-xs text-gray-600">Completed</p>
                        </div>

                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <Clock className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-orange-600">{pending}</p>
                          <p className="text-xs text-gray-600">Pending</p>
                        </div>

                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-red-600">{overdue}</p>
                          <p className="text-xs text-gray-600">Overdue</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload New Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
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
                placeholder="Brief description of the document..."
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
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Department *</Label>
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
                <Label>Tags (comma separated)</Label>
                <Input
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  placeholder="e.g., hygiene, training, 2024"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={uploadForm.is_mandatory}
                  onChange={(e) => setUploadForm({ ...uploadForm, is_mandatory: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Mandatory (requires acknowledgment)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={uploadForm.requires_signature}
                  onChange={(e) => setUploadForm({ ...uploadForm, requires_signature: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Requires digital signature</span>
              </label>
            </div>

            <div>
              <Label>Upload File *</Label>
              <Input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.docx,.png,.jpg,.jpeg,.mp4"
                disabled={uploading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported: PDF, DOCX, Images, Videos (Max 50MB)
              </p>
            </div>

            {uploading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Uploading document...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Document to Staff</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
                  <SelectItem value="role">Specific Role</SelectItem>
                  <SelectItem value="department">Specific Department</SelectItem>
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="line_cook">Line Cook</SelectItem>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="bartender">Bartender</SelectItem>
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="front_of_house">Front of House</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
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
              />
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

            <Button
              className="w-full"
              onClick={handleAssignDocument}
              disabled={!assignForm.due_date}
            >
              Assign Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}