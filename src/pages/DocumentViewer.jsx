
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  ArrowLeft,
  Home,
  Edit,
  CheckCircle,
  Users,
  MessageCircle,
  Send,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import SOPSignatureCanvas from '../components/SOPSignatureCanvas';

export default function DocumentViewer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showSignature, setShowSignature] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [startTime] = useState(new Date());

  const urlParams = new URLSearchParams(window.location.search);
  const docId = urlParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', docId],
    queryFn: async () => {
      const docs = await base44.entities.DocumentBuilder.filter({ id: docId });
      return docs[0];
    },
    enabled: !!docId,
  });

  const { data: mySignature } = useQuery({
    queryKey: ['documentSignature', docId, user?.email],
    queryFn: async () => {
      if (!user?.email) return null; // Ensure user email is available
      const signatures = await base44.entities.DocumentBuilderSignature.filter({
        document_id: docId,
        staff_email: user.email
      });
      return signatures[0];
    },
    enabled: !!docId && !!user?.email,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['documentComments', docId],
    queryFn: () => base44.entities.DocumentBuilderComment.filter({
      document_id: docId
    }, '-created_date'), // Ordering by created_date descending
    enabled: !!docId && document?.comments_enabled,
  });

  // Increment view count
  useEffect(() => {
    // Only increment if document is loaded and user is authenticated
    if (document && user && docId) {
      // Use a timeout to avoid rapid updates on component mount
      const timeoutId = setTimeout(() => {
        base44.entities.DocumentBuilder.update(document.id, {
          view_count: (document.view_count || 0) + 1
        }).catch(err => console.log('View count update failed:', err));
      }, 1000); // Wait 1 second before incrementing view count

      return () => clearTimeout(timeoutId);
    }
  }, [document?.id, user?.email, docId, document]);


  // Sign document mutation with activity logging
  const signDocumentMutation = useMutation({
    mutationFn: async (signatureUrl) => {
      const timeSpent = Math.round((new Date().getTime() - startTime.getTime()) / 60000); // Calculate time spent in minutes

      const signature = await base44.entities.DocumentBuilderSignature.create({
        document_id: document.id,
        document_title: document.title,
        document_version: document.version || 1, // Ensure version is available
        staff_email: user.email,
        staff_name: user.full_name,
        signature_url: signatureUrl,
        signed_at: new Date().toISOString(),
        acknowledgment_text: 'I have read and understood this document',
        time_spent_minutes: timeSpent,
      });

      await base44.entities.DocumentBuilder.update(document.id, {
        signature_count: (document.signature_count || 0) + 1
      });

      // Log activity
      await base44.entities.ActivityLog.create({
        activity_type: 'document_signed',
        title: 'Document Signed',
        description: document.title,
        user_email: user.email,
        user_name: user.full_name,
        icon: 'check-circle',
        color: 'green',
        related_entity: 'DocumentBuilder',
        related_entity_id: document.id,
        is_important: true,
      });

      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentSignature', docId, user?.email] });
      queryClient.invalidateQueries({ queryKey: ['document', docId] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
      queryClient.invalidateQueries({ queryKey: ['documentLibrary'] }); // Invalidate library for signature counts
      setShowSignature(false);
      alert('✅ Document Signed Successfully!');
    },
    onError: (error) => {
      console.error('Signature error:', error);
      alert('Failed to sign document. Please try again.');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (comment) => base44.entities.DocumentBuilderComment.create({
      document_id: document.id,
      staff_email: user.email,
      staff_name: user.full_name,
      comment,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentComments', docId] });
      setNewComment('');
    },
    onError: (error) => {
      console.error('Comment error:', error);
      alert('Failed to post comment. Please try again.');
    },
  });

  if (isLoading || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('DocumentLibrary')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Document Library
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          {isManager && (
            <Link to={createPageUrl(`DocumentBuilder?id=${document.id}`)}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
        </div>

        {/* Document Header */}
        <Card className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-white/20 text-white border-white/30">
                    v{document.version || 1}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 capitalize">
                    {document.category}
                  </Badge>
                  {mySignature && (
                    <Badge className="bg-green-400 text-green-900">
                      ✓ Signed
                    </Badge>
                  )}
                </div>
                <h1 className="text-4xl font-bold mb-2">{document.title}</h1>
                {document.description && (
                  <p className="text-blue-100 text-lg">{document.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm mt-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{document.signature_count || 0} signatures</span>
              </div>
              <div className="flex items-center gap-2">
                👁️ <span>{document.view_count || 0} views</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Content */}
        <Card className="mb-6">
          <CardContent className="p-8">
            {document.content_html ? (
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: document.content_html }}
              />
            ) : (
              <p className="text-gray-500 text-center py-12">No content available</p>
            )}
          </CardContent>
        </Card>

        {/* Signature Section */}
        {document.requires_signature && !mySignature && (
          <Card className="bg-blue-50 border-blue-200 mb-6">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                📝 Signature Required
              </h3>
              <p className="text-gray-700 mb-4">
                This document requires your acknowledgment and signature.
              </p>
              <Button
                onClick={() => setShowSignature(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Sign Document
              </Button>
            </CardContent>
          </Card>
        )}

        {mySignature && (
          <Card className="bg-green-50 border-green-200 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-bold text-green-900">You've signed this document</p>
                  <p className="text-sm text-green-700">
                    Signed on {format(new Date(mySignature.signed_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        {document.comments_enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Comment List */}
              <div className="space-y-3 mb-4">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-gray-900">{comment.staff_name}</p>
                        <span className="text-xs text-gray-500">
                          {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    if (newComment.trim()) {
                      addCommentMutation.mutate(newComment.trim());
                    }
                  }}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Dialog */}
        {showSignature && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader>
                <CardTitle>Sign Document: {document.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-gray-700">
                    By signing this document, you acknowledge that you have read and understood its contents.
                  </p>
                </div>
                <SOPSignatureCanvas
                  onSign={(signatureUrl) => signDocumentMutation.mutate(signatureUrl)} // Renamed onSave to onSign
                  onCancel={() => setShowSignature(false)}
                  isPending={signDocumentMutation.isPending}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
