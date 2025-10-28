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
  Camera, 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Sparkles,
  Home,
  ArrowLeft,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AIStockVerification() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [recordedStock, setRecordedStock] = useState("");
  const [verifiedStock, setVerifiedStock] = useState("");
  const [notes, setNotes] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: verifications = [] } = useQuery({
    queryKey: ['stockVerifications'],
    queryFn: () => base44.entities.StockVerification.list('-verification_date', 50),
  });

  const createVerificationMutation = useMutation({
    mutationFn: (data) => base44.entities.StockVerification.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockVerifications'] });
      resetForm();
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(file_url);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    }
    setUploading(false);
  };

  const handleAIAnalysis = async () => {
    if (!photoUrl) {
      alert('Please upload a photo first');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this inventory photo and estimate the stock quantity. 
        Describe what items you see and provide a quantity estimate. 
        Be specific about the type of items, their condition, and approximate count or volume.`,
        file_urls: [photoUrl],
      });

      setAiAnalysis(response);
      alert('✅ AI Analysis Complete! Check the results below.');
    } catch (error) {
      console.error('Error analyzing photo:', error);
      alert('Failed to analyze photo with AI');
    }
    setAnalyzing(false);
  };

  const handleSubmitVerification = async () => {
    if (!selectedIngredient || !photoUrl) {
      alert('Please select an ingredient and upload a photo');
      return;
    }

    const ingredient = ingredients.find(i => i.id === selectedIngredient);
    if (!ingredient) return;

    const recorded = parseFloat(recordedStock) || ingredient.current_stock || 0;
    const verified = parseFloat(verifiedStock) || 0;
    const discrepancy = verified - recorded;
    const discrepancyPct = recorded > 0 ? (Math.abs(discrepancy) / recorded) * 100 : 0;

    let status = 'match';
    if (discrepancyPct > 10) status = 'major_discrepancy';
    else if (discrepancyPct > 5) status = 'minor_discrepancy';
    else status = 'match';

    try {
      await createVerificationMutation.mutateAsync({
        verification_type: 'ai_photo',
        verification_date: new Date().toISOString(),
        verified_by_email: user.email,
        verified_by_name: user.full_name,
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.name,
        location: 'Main Storage',
        photo_url: photoUrl,
        recorded_stock: recorded,
        verified_stock: verified,
        discrepancy: discrepancy,
        discrepancy_percentage: discrepancyPct,
        ai_confidence: 85,
        ai_analysis: aiAnalysis,
        status: status,
        action_taken: status === 'major_discrepancy' ? 'investigation_required' : 'no_action',
        notes: notes,
        manager_reviewed: false,
      });

      alert('✅ Stock verification recorded successfully!');
    } catch (error) {
      console.error('Error submitting verification:', error);
      alert('Failed to submit verification');
    }
  };

  const resetForm = () => {
    setSelectedIngredient("");
    setPhotoUrl("");
    setRecordedStock("");
    setVerifiedStock("");
    setNotes("");
    setAiAnalysis("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("Inventory")}>
            <Button variant="outline" size="sm">
              <Package className="w-4 h-4 mr-2" />
              Inventory Hub
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">AI Stock Verification</h1>
              <p className="text-gray-600">Use AI to verify physical stock against system records</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Verification Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                New Stock Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Ingredient</Label>
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose ingredient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.map(ing => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name} ({ing.current_stock || 0} {ing.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Upload Stock Photo</Label>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('stock-photo-upload').click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <input
                    id="stock-photo-upload"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                {photoUrl && (
                  <div className="mt-3">
                    <img src={photoUrl} alt="Stock" className="w-full h-48 object-cover rounded-lg border-2 border-gray-200" />
                  </div>
                )}
              </div>

              {photoUrl && (
                <Button
                  onClick={handleAIAnalysis}
                  disabled={analyzing}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {analyzing ? 'Analyzing with AI...' : 'Analyze Photo with AI'}
                </Button>
              )}

              {aiAnalysis && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-semibold text-purple-900 mb-2">🤖 AI Analysis:</p>
                  <p className="text-sm text-purple-800">{aiAnalysis}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>System Stock</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={recordedStock}
                    onChange={(e) => setRecordedStock(e.target.value)}
                    placeholder="Current system stock"
                  />
                </div>
                <div>
                  <Label>Verified Stock</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={verifiedStock}
                    onChange={(e) => setVerifiedStock(e.target.value)}
                    placeholder="Actual counted stock"
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any observations or notes..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitVerification}
                  disabled={createVerificationMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Verification
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Verifications */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Verifications</CardTitle>
            </CardHeader>
            <CardContent>
              {verifications.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No verifications yet</p>
                  <p className="text-sm text-gray-400 mt-1">Upload a photo to get started</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {verifications.map((verification) => {
                    const discrepancyPct = Math.abs(verification.discrepancy_percentage || 0);
                    return (
                      <div key={verification.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{verification.ingredient_name}</p>
                            <p className="text-xs text-gray-600">
                              {format(new Date(verification.verification_date), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          <Badge className={
                            verification.status === 'match' ? 'bg-green-100 text-green-800' :
                            verification.status === 'minor_discrepancy' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {verification.status === 'match' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : verification.status === 'minor_discrepancy' ? (
                              <AlertTriangle className="w-3 h-3 mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            {discrepancyPct.toFixed(1)}% diff
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          <div>
                            <p className="text-gray-600">System:</p>
                            <p className="font-medium">{verification.recorded_stock?.toFixed(2) || 0}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Verified:</p>
                            <p className="font-medium">{verification.verified_stock?.toFixed(2) || 0}</p>
                          </div>
                        </div>
                        {verification.photo_url && (
                          <img 
                            src={verification.photo_url} 
                            alt="Stock verification" 
                            className="w-full h-32 object-cover rounded mt-2"
                          />
                        )}
                        {verification.ai_analysis && (
                          <p className="text-xs text-purple-700 bg-purple-50 p-2 rounded mt-2">
                            🤖 {verification.ai_analysis.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}