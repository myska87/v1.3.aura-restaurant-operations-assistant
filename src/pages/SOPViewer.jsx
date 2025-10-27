
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Home,
  Volume2,
  Eye,
  CheckCircle,
  Clock,
  User,
  AlertTriangle,
  Wrench,
  BookOpen,
  Edit,
  FileText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import SOPStepTimeline from '../components/SOPStepTimeline';
import SOPSignatureCanvas from '../components/SOPSignatureCanvas';

export default function SOPViewer() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showSignature, setShowSignature] = useState(false);
  const [startTime] = useState(new Date());

  // Get SOP ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const sopId = urlParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

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
      if (!sopId || !user?.email) return null;
      const signatures = await base44.entities.SOPSignatureLog.filter({
        sop_id: sopId,
        staff_email: user.email
      });
      return signatures[0] || null;
    },
    enabled: !!sopId && !!user?.email,
  });

  // Increment view count on load
  useEffect(() => {
    if (sop && user) {
      const incrementView = async () => {
        try {
          await base44.entities.SOPDocument.update(sop.id, {
            view_count: (sop.view_count || 0) + 1
          });
        } catch (error) {
          console.error('Failed to increment view count:', error);
        }
      };
      incrementView();
    }
  }, [sop?.id, user?.id]);

  const signatureMutation = useMutation({
    mutationFn: async (signatureData) => {
      const timeSpent = Math.floor((new Date() - startTime) / 60000); // minutes
      
      return await base44.entities.SOPSignatureLog.create({
        sop_id: sop.id,
        sop_title: sop.title,
        sop_version: sop.version,
        staff_id: user.id,
        staff_email: user.email,
        staff_name: user.full_name,
        role: user.position,
        signed_at: new Date().toISOString(),
        confirmation_text: "I have read and understood this SOP",
        digital_signature_url: signatureData.signatureUrl,
        completion_time_minutes: timeSpent,
        notes: signatureData.notes || ''
      });
    },
    onSuccess: () => {
      // Update SOP signature count
      base44.entities.SOPDocument.update(sop.id, {
        signature_count: (sop.signature_count || 0) + 1
      });
      
      queryClient.invalidateQueries({ queryKey: ['sopSignature'] });
      queryClient.invalidateQueries({ queryKey: ['sop'] });
      setShowSignature(false);
      alert('✅ SOP acknowledged successfully!');
    }
  });

  const handleSign = (signatureDataUrl) => {
    signatureMutation.mutate({
      signatureUrl: signatureDataUrl,
      notes: ''
    });
  };

  const handleVoiceMode = () => {
    navigate(createPageUrl(`SOPVoiceMode?id=${sopId}`));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-emerald-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading SOP...</p>
        </div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">SOP Not Found</h2>
            <p className="text-gray-600 mb-4">The SOP you're looking for doesn't exist or has been removed.</p>
            <Link to={createPageUrl('SOPDashboard')}>
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to SOPs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex gap-3">
          <Link to={createPageUrl("SOPDashboard")}>
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
        </div>

        {/* Hero Section */}
        <Card className="border-none shadow-xl overflow-hidden">
          {sop.hero_image_url && (
            <div className="h-64 bg-gradient-to-br from-gray-900 to-gray-700 relative overflow-hidden">
              <img
                src={sop.hero_image_url}
                alt={sop.title}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <Badge className="bg-white/20 text-white border-white/30 mb-3 capitalize">
                  {sop.category}
                </Badge>
                <h1 className="text-4xl font-bold text-white mb-2">{sop.title}</h1>
                <p className="text-white/90 text-lg">{sop.description}</p>
              </div>
            </div>
          )}

          <CardContent className="p-6">
            {/* Quick Info */}
            <div className="flex flex-wrap gap-3 mb-6">
              {sop.total_time_minutes && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {sop.total_time_minutes} min total
                </Badge>
              )}
              {sop.difficulty_level && (
                <Badge variant="outline" className="capitalize">
                  {sop.difficulty_level}
                </Badge>
              )}
              {sop.frequency && (
                <Badge variant="outline" className="capitalize">
                  {sop.frequency}
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {sop.view_count || 0} views
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {sop.signature_count || 0} signed
              </Badge>
              <Badge variant="outline">
                Version {sop.version}
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                onClick={handleVoiceMode}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Volume2 className="w-5 h-5 mr-2" />
                🎧 Voice Mode
              </Button>

              {!mySignature && sop.requires_signature && (
                <Button
                  onClick={() => setShowSignature(true)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Sign & Acknowledge
                </Button>
              )}

              {mySignature && (
                <Badge className="bg-green-100 text-green-800 px-4 py-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Signed on {format(new Date(mySignature.signed_at), 'PPP')}
                </Badge>
              )}

              {isManager && (
                <Link to={createPageUrl(`SOPBuilder?id=${sop.id}`)}>
                  <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>

            {/* Signature Canvas */}
            {showSignature && (
              <div className="mb-6">
                <SOPSignatureCanvas
                  onSign={handleSign}
                  onCancel={() => setShowSignature(false)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Steps Timeline */}
        {sop.steps && sop.steps.length > 0 && (
          <SOPStepTimeline
            steps={sop.steps}
            readonly={!!mySignature}
          />
        )}

        {/* Additional Info */}
        <div className="grid md:grid-cols-2 gap-6">
          {sop.safety_notes && (
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="w-5 h-5" />
                  Safety Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-amber-800">{sop.safety_notes}</p>
              </CardContent>
            </Card>
          )}

          {sop.hygiene_notes && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  🧼 Hygiene Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-800">{sop.hygiene_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Review Info */}
        {sop.last_reviewed_date && (
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Last Reviewed</p>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(sop.last_reviewed_date), 'PPP')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Next Review Due</p>
                  <p className="font-semibold text-gray-900">
                    {sop.next_review_date ? format(new Date(sop.next_review_date), 'PPP') : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Review Frequency</p>
                  <p className="font-semibold text-gray-900">
                    Every {sop.review_frequency_months} months
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
