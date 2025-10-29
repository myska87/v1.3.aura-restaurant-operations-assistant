import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  User,
  Calendar,
  MessageSquare,
  ThumbsUp,
  Save,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function DocumentViewer() {
  const queryClient = useQueryClient();
  const [documentId, setDocumentId] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [readStartTime] = useState(Date.now());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) setDocumentId(id);
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const docs = await base44.entities.DocumentBuilder.filter({ id: documentId });
      return docs[0] || null;
    },
    enabled: !!documentId,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ['documentSignatures', documentId],
    queryFn: () => base44.entities.DocumentBuilderSignature.filter({ document_id: documentId }),
    enabled: !!documentId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['documentComments', documentId],
    queryFn: () => base44.entities.DocumentBuilderComment.filter({ document_id: documentId }),
    enabled: !!documentId,
  });

  const signDocumentMutation = useMutation({
    mutationFn: async () => {
      const timeSpent = Math.floor((Date.now() - readStartTime) / 1000 / 60); // minutes

      return await base44.entities.DocumentBuilderSignature.create({
        document_id: documentId,
        document_title: document.title,
        document_version: document.version,
        staff_email: user.email,
        staff_name: user.full_name,
        signed_at: new Date().toISOString(),
        acknowledgment_text: 'I have read and understood this document',
        time_spent_minutes: timeSpent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentSignatures'] });
      alert('✅ Document signed successfully!');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (comment) => base44.entities.DocumentBuilderComment.create({
      document_id: documentId,
      staff_email: user.email,
      staff_name: user.full_name,
      comment: comment,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentComments'] });
      setNewComment('');
    },
  });

  const hasUserSigned = signatures.some(s => s.staff_email === user?.email);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <LoadingSpinner message="Loading document..." />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Document Not Found</h2>
              <Link to={createPageUrl('DocumentLibrary')}>
                <Button>Back to Library</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('DocumentLibrary')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Button>
          </Link>
        </div>

        {/* Document Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-3">{document.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge className="capitalize">{document.category}</Badge>
                  <Badge variant="outline">{document.department}</Badge>
                  <Badge className={
                    document.status === 'published' ? 'bg-green-100 text-green-800' :
                    document.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    'bg-amber-100 text-amber-800'
                  }>
                    {document.status}
                  </Badge>
                  <Badge variant="outline">v{document.version}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {document.document_url && (
                  <a href={document.document_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </a>
                )}
                {document.requires_signature && !hasUserSigned && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => signDocumentMutation.mutate()}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Sign Document
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 text-sm mb-6">
              <div>
                <p className="text-gray-600 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Created by
                </p>
                <p className="font-semibold text-gray-900">{document.created_by_name}</p>
              </div>
              <div>
                <p className="text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Published
                </p>
                <p className="font-semibold text-gray-900">
                  {document.published_at ? format(new Date(document.published_at), 'MMM d, yyyy') : 'Draft'}
                </p>
              </div>
              <div>
                <p className="text-gray-600 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Views
                </p>
                <p className="font-semibold text-gray-900">{document.view_count || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Signatures
                </p>
                <p className="font-semibold text-gray-900">{signatures.length}</p>
              </div>
            </div>

            {/* Document Content */}
            <div className="prose max-w-none bg-white p-8 rounded-lg border">
              {document.content_html ? (
                <div dangerouslySetInnerHTML={{ __html: document.content_html }} />
              ) : (
                <p className="text-gray-600">No content available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Signatures */}
        {signatures.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Signatures ({signatures.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {signatures.map(sig => (
                  <div key={sig.id} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-gray-900">{sig.staff_name}</p>
                        <p className="text-xs text-gray-600">
                          {format(new Date(sig.signed_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        {document.comments_enabled && (
          <Card>
            <CardHeader>
              <CardTitle>Comments ({comments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {comments.map(comment => (
                  <div key={comment.id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-gray-500 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{comment.staff_name}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700">{comment.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={() => addCommentMutation.mutate(newComment)}
                  disabled={!newComment.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Post
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}