import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Save,
  Send,
  Upload,
  ArrowLeft,
  Home,
  Sparkles,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReactQuill from 'react-quill';
import AIDocumentBuilder from '../components/AIDocumentBuilder';

export default function DocumentBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const docId = urlParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: editingDoc } = useQuery({
    queryKey: ['document', docId],
    queryFn: async () => {
      const docs = await base44.entities.DocumentBuilder.list();
      return docs.find(d => d.id === docId);
    },
    enabled: !!docId,
  });

  const [formData, setFormData] = useState({
    title: '',
    category: 'sop',
    description: '',
    content_html: '',
    department: 'all',
    requires_signature: false,
    comments_enabled: true,
    tags: [],
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (editingDoc) {
      setFormData({
        title: editingDoc.title || '',
        category: editingDoc.category || 'sop',
        description: editingDoc.description || '',
        content_html: editingDoc.content_html || '',
        department: editingDoc.department || 'all',
        requires_signature: editingDoc.requires_signature || false,
        comments_enabled: editingDoc.comments_enabled ?? true,
        tags: editingDoc.tags || [],
      });
    }
  }, [editingDoc]);

  const saveDocumentMutation = useMutation({
    mutationFn: async (data) => {
      if (editingDoc) {
        return await base44.entities.DocumentBuilder.update(editingDoc.id, data);
      } else {
        return await base44.entities.DocumentBuilder.create(data);
      }
    },
    onSuccess: async (savedDoc) => {
      queryClient.invalidateQueries({ queryKey: ['documentLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['allDocuments'] });
      
      if (!editingDoc) {
        await base44.entities.ActivityLog.create({
          activity_type: 'document_uploaded',
          title: 'Document Created',
          description: savedDoc.title,
          user_email: user.email,
          user_name: user.full_name,
          icon: 'file-text',
          color: 'blue',
          related_entity: 'DocumentBuilder',
          related_entity_id: savedDoc.id,
          is_important: savedDoc.requires_signature,
        });
      }
      
      alert(editingDoc ? '✅ Document Updated!' : '✅ Document Created!');
      navigate(createPageUrl('DocumentLibrary'));
    },
    onError: (error) => {
      alert(`❌ Save failed: ${error.message}`);
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, hero_image_url: file_url }));
    } catch (error) {
      alert('Failed to upload image');
    }
    setUploading(false);
  };

  const handleAddTag = () => {
    if (!newTag.trim() || formData.tags.includes(newTag.trim())) return;
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()]
    }));
    setNewTag('');
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleAIGenerated = (aiData) => {
    setFormData(prev => ({
      ...prev,
      title: aiData.title,
      category: aiData.category,
      description: aiData.description,
      content_html: aiData.content_html,
      tags: aiData.tags || [],
      department: aiData.department || 'all',
      requires_signature: aiData.requires_signature || false,
    }));
    setShowAI(false);
  };

  const handleSubmit = async (publish = false) => {
    if (!formData.title || !formData.content_html) {
      alert('Please provide title and content');
      return;
    }

    const docData = {
      ...formData,
      status: publish ? 'published' : 'draft',
      created_by: user.email,
      created_by_name: user.full_name,
      updated_by: user.email,
      updated_by_name: user.full_name,
      version: editingDoc?.version || 1,
      view_count: editingDoc?.view_count || 0,
      signature_count: editingDoc?.signature_count || 0,
    };

    if (publish && !editingDoc) {
      docData.published_at = new Date().toISOString();
    }

    await saveDocumentMutation.mutateAsync(docData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('DocumentLibrary')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAI(!showAI)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {showAI ? 'Hide' : 'Show'} AI Helper
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {editingDoc ? 'Edit Document' : 'Create New Document'}
          </h1>
          <p className="text-gray-600">Build professional operational documents</p>
        </div>

        {showAI && (
          <div className="mb-6">
            <AIDocumentBuilder onDocumentGenerated={handleAIGenerated} />
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Document Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Health & Safety Policy"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sop">Standard Operating Procedure</SelectItem>
                      <SelectItem value="policy">Policy</SelectItem>
                      <SelectItem value="training">Training Material</SelectItem>
                      <SelectItem value="guide">Guide</SelectItem>
                      <SelectItem value="quality">Quality Control</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                      <SelectItem value="emergency">Emergency Protocol</SelectItem>
                      <SelectItem value="customer_service">Customer Service</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({...formData, department: value})}
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

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of what this document covers..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Hero Image (Optional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('doc-hero-image').click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <input
                    id="doc-hero-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                {formData.hero_image_url && (
                  <img
                    src={formData.hero_image_url}
                    alt="Hero"
                    className="mt-2 w-full h-48 object-cover rounded-lg"
                  />
                )}
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" onClick={handleAddTag} size="sm">
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requires_signature}
                    onChange={(e) => setFormData({...formData, requires_signature: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label>Require signature</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.comments_enabled}
                    onChange={(e) => setFormData({...formData, comments_enabled: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label>Allow comments</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Content *</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactQuill
                value={formData.content_html}
                onChange={(value) => setFormData({...formData, content_html: value})}
                className="bg-white"
                theme="snow"
                placeholder="Write your document content here..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl('DocumentLibrary'))}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={saveDocumentMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={saveDocumentMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {saveDocumentMutation.isPending ? 'Publishing...' : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Publish Document
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}