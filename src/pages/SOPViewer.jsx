import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  ArrowLeft,
  Home,
  Edit,
  CheckCircle,
  Clock,
  Users,
  BookOpen,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import SOPSignatureCanvas from '../components/SOPSignatureCanvas';

export default function SOPViewer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showSignature, setShowSignature] = useState(false);
  const [startTime] = useState(new Date());

  const urlParams = new URLSearchParams(window.location.search);
  const sopId = urlParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: sop, isLoading } = useQuery({
    queryKey: ['sop', sopId],
    queryFn: async () => {
      const sops = await base44.entities.SOPDocument.list();
      return sops.find(s => s.id === sopId);
    },
    enabled: !!sopId,
  });

  const { data: mySignature } = useQuery({
    queryKey: ['sopSignature', sopId, user?.email],
    queryFn: async () => {
      const signatures = await base44.entities.SOPSignatureLog.filter({
        sop_id: sopId,
        staff_email: user.email
      });
      return signatures[0];
    },
    enabled: !!sopId && !!user?.email,
  });

  // Increment view count on load
  useEffect(() => {
    if (sop && user) {
      base44.entities.SOPDocument.update(sop.id, {
        view_count: (sop.view_count || 0) + 1
      }).catch(err => console.log('View count update failed:', err));
    }
  }, [sop?.id, user?.email]);

  // Sign SOP mutation with activity logging
  const signSOPMutation = useMutation({
    mutationFn: async (signatureUrl) => {
      const timeSpent = Math.round((new Date() - startTime) / 60000);

      const signature = await base44.entities.SOPSignatureLog.create({
        sop_id: sop.id,
        sop_title: sop.title,
        sop_version: sop.version,
        staff_id: user.id,
        staff_email: user.email,
        staff_name: user.full_name,
        role: user.position,
        signed_at: new Date().toISOString(),
        confirmation_text: 'I have read and understood this SOP',
        digital_signature_url: signatureUrl,
        completion_time_minutes: timeSpent,
      });

      await base44.entities.SOPDocument.update(sop.id, {
        signature_count: (sop.signature_count || 0) + 1
      });

      await base44.entities.ActivityLog.create({
        activity_type: 'sop_signed',
        title: 'SOP Signed',
        description: sop.title,
        user_email: user.email,
        user_name: user.full_name,
        icon: 'check-circle',
        color: 'green',
        related_entity: 'SOPDocument',
        related_entity_id: sop.id,
        is_important: true,
      });

      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sopSignature'] });
      queryClient.invalidateQueries({ queryKey: ['sop'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
      setShowSignature(false);
      alert('✅ SOP Signed Successfully!');
    },
  });

  if (isLoading || !sop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#014D40] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('SOPDashboard')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              SOP Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          {isManager && (
            <Link to={createPageUrl(`SOPBuilder?id=${sop.id}`)}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
        </div>

        {/* SOP Header */}
        <Card className="mb-6 bg-gradient-to-r from-[#014D40] to-emerald-600 text-white border-none">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-white/20 text-white border-white/30">
                    v{sop.version || 1}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 capitalize">
                    {sop.category}
                  </Badge>
                  {mySignature && (
                    <Badge className="bg-green-400 text-green-900">
                      ✓ Signed
                    </Badge>
                  )}
                </div>
                <h1 className="text-4xl font-bold mb-2">{sop.title}</h1>
                <p className="text-emerald-100 text-lg">{sop.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{sop.signature_count || 0} signatures</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>~{sop.total_time_minutes || 15} min read</span>
              </div>
              {sop.view_count > 0 && (
                <div className="flex items-center gap-2">
                  👁️ <span>{sop.view_count} views</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SOP Content */}
        <Card className="mb-6">
          <CardContent className="p-8">
            {sop.content_html ? (
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: sop.content_html }}
              />
            ) : sop.content_markdown ? (
              <div className="prose prose-lg max-w-none whitespace-pre-wrap">
                {sop.content_markdown}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-12">No content available</p>
            )}
          </CardContent>
        </Card>

        {/* Signature Section */}
        {!mySignature && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">
                    📝 Sign to Acknowledge
                  </h3>
                  <p className="text-gray-700 mb-4">
                    By signing, you confirm that you have read and understood this SOP.
                  </p>
                  <Button
                    onClick={() => setShowSignature(true)}
                    className="bg-[#014D40] hover:bg-[#013830]"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Sign SOP
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {mySignature && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-bold text-green-900">You've signed this SOP</p>
                  <p className="text-sm text-green-700">
                    Signed on {format(new Date(mySignature.signed_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Dialog */}
        {showSignature && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader>
                <CardTitle>Sign SOP</CardTitle>
              </CardHeader>
              <CardContent>
                <SOPSignatureCanvas
                  onSave={(signatureUrl) => signSOPMutation.mutate(signatureUrl)}
                  onCancel={() => setShowSignature(false)}
                  isPending={signSOPMutation.isPending}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}