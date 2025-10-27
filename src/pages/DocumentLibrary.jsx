import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  ArrowLeft,
  Home,
  Filter,
  BookOpen,
  Users,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function DocumentLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documentLibrary'],
    queryFn: () => base44.entities.DocumentBuilder.list('-updated_date', 100),
  });

  const { data: mySignatures = [] } = useQuery({
    queryKey: ['myDocumentSignatures', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.DocumentBuilderSignature.filter({
        staff_email: user.email
      });
    },
    enabled: !!user?.email,
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentBuilder.update(id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentLibrary'] });
    },
  });

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus && doc.status !== 'archived';
  });

  // Calculate stats
  const stats = {
    total: documents.filter(d => d.status !== 'archived').length,
    published: documents.filter(d => d.status === 'published').length,
    drafts: documents.filter(d => d.status === 'draft').length,
    mySigned: mySignatures.length,
  };

  const getCategoryIcon = (category) => {
    const icons = {
      sop: '📋',
      policy: '📜',
      training: '🎓',
      guide: '📖',
      quality: '⭐',
      procedure: '🔧',
      emergency: '🚨',
      customer_service: '🤝',
      other: '📁',
    };
    return icons[category] || '📄';
  };

  const getCategoryColor = (category) => {
    const colors = {
      sop: 'bg-blue-100 text-blue-800 border-blue-200',
      policy: 'bg-purple-100 text-purple-800 border-purple-200',
      training: 'bg-green-100 text-green-800 border-green-200',
      guide: 'bg-amber-100 text-amber-800 border-amber-200',
      quality: 'bg-pink-100 text-pink-800 border-pink-200',
      procedure: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      emergency: 'bg-red-100 text-red-800 border-red-200',
      customer_service: 'bg-teal-100 text-teal-800 border-teal-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const hasSignedDocument = (docId) => {
    return mySignatures.some(sig => sig.document_id === docId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xl font-semibold">Loading library...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Document Library</h1>
                <p className="text-gray-600">All your operational documents in one place</p>
              </div>
            </div>
          </div>

          {isManager && (
            <Link to={createPageUrl('DocumentBuilder')}>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Document
              </Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Documents</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{stats.published}</p>
                <p className="text-sm text-gray-600">Published</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{stats.drafts}</p>
                <p className="text-sm text-gray-600">Drafts</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{stats.mySigned}</p>
                <p className="text-sm text-gray-600">I've Signed</p>
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
                  <SelectItem value="sop">SOPs</SelectItem>
                  <SelectItem value="policy">Policies</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="guide">Guides</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                  <SelectItem value="procedure">Procedures</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                </SelectContent>
              </Select>

              {isManager && (
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Drafts</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{getCategoryIcon(doc.category)}</span>
                        <Badge className={`${getCategoryColor(doc.category)} border text-xs`}>
                          {doc.category}
                        </Badge>
                        {doc.status === 'draft' && (
                          <Badge variant="outline" className="text-xs">
                            Draft
                          </Badge>
                        )}
                        {hasSignedDocument(doc.id) && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            ✓ Signed
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors mb-1 line-clamp-2">
                        {doc.title}
                      </h3>
                      {doc.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                    </div>

                    {isManager && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(createPageUrl(`DocumentViewer?id=${doc.id}`))}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(createPageUrl(`DocumentBuilder?id=${doc.id}`))}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm('Archive this document?')) {
                                deleteDocumentMutation.mutate(doc.id);
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {doc.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {doc.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{doc.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
                    <span>v{doc.version || 1}</span>
                    <span>{doc.view_count || 0} views</span>
                    <span>{format(new Date(doc.updated_date || doc.created_date), 'MMM d')}</span>
                  </div>

                  <div className="mt-4">
                    <Button
                      className="w-full"
                      variant={doc.status === 'published' ? 'default' : 'outline'}
                      onClick={() => navigate(createPageUrl(`DocumentViewer?id=${doc.id}`))}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Documents Found
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start by creating your first document'}
              </p>
              {isManager && !searchQuery && filterCategory === 'all' && (
                <Link to={createPageUrl('DocumentBuilder')}>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Document
                  </Button>
                </Link>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}