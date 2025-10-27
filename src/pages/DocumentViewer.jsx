import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Home,
  Edit,
  MessageCircle,
  CheckCircle,
  Download,
  Share2,
  Eye,
  Users,
  Clock,
  FileText,
  Loader2,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import SOPSignatureCanvas from '../components/SOPSignatureCanvas';

export default function DocumentViewer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const docId = searchParams.get('id');
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [startTime] = useState(Date.now());

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: document, isLoading } = useQuery({
    queryKey: ['documentBuilder', docId],
    queryFn: async () => {
      const docs = await base44.entities.DocumentBuilder.filter({ id: docId });
      const doc = docs[0];
      
      // Increment view count
      if (doc) {
        await base44.entities.DocumentBuilder.update(docId, {
          view_count: (doc.view_count || 0) + 1,
        });
      }
      
      return doc;
    },
    enabled: !!docId,
  });

  const { data: mySignature } = useQuery({
    queryKey: ['myDocSignature', docId, user?.email],
    queryFn: async () => {
      const sigs = await base44.entities.DocumentBuilderSignature.filter({
        document_id: docId,
        staff_email: user.email,
      });
      return sigs[0] || null;
    },
    enabled: !!docId && !!user?.email,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['documentComments', docId],
    queryFn: () => base44.entities.DocumentBuilderComment.filter({
      document_id: docId,
    }, '-created_date'),
    enabled: !!docId,
  });

  const signDocumentMutation = useMutation({
    mutationFn: async (signatureUrl) => {
      const timeSpent = Math.round((Date.now() - startTime) / 60000); // minutes

      const signatureRecord = await base44.entities.DocumentBuilderSignature.create({
        document_id: docId,
        document_title: document.title,
        document_version: document.version || 1,
        staff_email: user.email,
        staff_name: user.full_name,
        signature_url: signatureUrl,
        signed_at: new Date().toISOString(),
        acknowledgment_text: "I have read and understood this document",
        time_spent_minutes: timeSpent,
      });

      // Update signature count
      await base44.entities.DocumentBuilder.update(docId, {
        signature_count: (document.signature_count || 0) + 1,
      });

      return signatureRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDocSignature'] });
      queryClient.invalidateQueries({ queryKey: ['documentBuilder'] });
      queryClient.invalidateQueries({ queryKey: ['documentLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['allDocuments'] });
      setShowSignDialog(false);
      alert('✅ Document signed successfully!');
    },
    onError: (error) => {
      console.error('Signature error:', error);
      alert('Failed to sign document. Please try again.');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (comment) => base44.entities.DocumentBuilderComment.create({
      document_id: docId,
      staff_email: user.email,
      staff_name: user.full_name,
      comment,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentComments'] });
      setCommentText('');
      setShowCommentDialog(false);
    },
    onError: (error) => {
      console.error('Comment error:', error);
      alert('Failed to post comment. Please try again.');
    },
  });

  const handleSignSubmit = async (signatureUrl) => {
    await signDocumentMutation.mutateAsync(signatureUrl);
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) {
      alert('Please enter a comment');
      return;
    }

    await addCommentMutation.mutateAsync(commentText);
  };

  if (isLoading || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('DocumentLibrary')}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="text-xs">v{document.version || 1}</Badge>
                  <span className="text-xs text-gray-500">
                    {document.view_count || 0} views • {document.signature_count || 0} signatures
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {document.requires_signature && !mySignature && (
                <Button
                  onClick={() => setShowSignDialog(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Sign Document
                </Button>
              )}
              
              {mySignature && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  ✓ Signed on {format(new Date(mySignature.signed_at), 'MMM d, yyyy')}
                </Badge>
              )}

              {document.comments_enabled && (
                <Button variant="outline" onClick={() => setShowCommentDialog(true)}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Comment
                </Button>
              )}

              {isManager && (
                <Link to={createPageUrl(`DocumentBuilder?id=${docId}`)}>
                  <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6">
        <Card className="mb-6">
          <CardContent className="p-8">
            {/* Meta Info */}
            <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b">
              <Badge className="text-xs">
                {document.category}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {document.department}
              </Badge>
              {document.linked_role && (
                <Badge variant="outline" className="text-xs">
                  For: {document.linked_role}
                </Badge>
              )}
              {document.requires_signature && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  Signature Required
                </Badge>
              )}
            </div>

            {/* Description */}
            {document.description && (
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-gray-700">{document.description}</p>
              </div>
            )}

            {/* Main Content */}
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: document.content_html }}
            />

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t">
                <p className="text-sm font-semibold text-gray-700 mb-2">Tags:</p>
                <div className="flex flex-wrap gap-1.5">
                  {document.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Info */}
            <div className="mt-8 pt-6 border-t text-sm text-gray-600">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Created by:</strong> {document.created_by_name}</p>
                  <p><strong>Created:</strong> {format(new Date(document.created_date), 'PPP')}</p>
                </div>
                <div>
                  <p><strong>Last updated by:</strong> {document.updated_by_name || document.created_by_name}</p>
                  <p><strong>Updated:</strong> {format(new Date(document.updated_date || document.created_date), 'PPP')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        {document.comments_enabled && comments.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Comments ({comments.length})
              </h3>
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{comment.staff_name}</span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.created_date), 'PPP')}
                      </span>
                    </div>
                    <p className="text-gray-700">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sign Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sign Document: {document.title}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-gray-700">
                By signing this document, you acknowledge that you have read and understood its contents.
              </p>
            </div>

            <SOPSignatureCanvas
              onSign={handleSignSubmit}
              onCancel={() => setShowSignDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts or feedback..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCommentSubmit}
              disabled={!commentText.trim() || addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Comment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}