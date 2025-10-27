import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Save,
  Upload,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  Sparkles,
  Eye,
  Send,
  ArrowLeft,
  Home,
  FileText,
  Loader2,
  Check,
  X,
  Paperclip,
  MessageCircle,
  MoreVertical,
  Copy,
  Download,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function DocumentBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const docId = searchParams.get('id');
  const quillRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'sop',
    description: '',
    content_html: '',
    tags: [],
    department: 'all',
    linked_role: '',
    requires_signature: false,
    comments_enabled: true,
    status: 'draft',
  });

  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiGenerating, setAIGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  const [showAttachDialog, setShowAttachDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Load existing document if editing
  const { data: existingDoc, isLoading } = useQuery({
    queryKey: ['documentBuilder', docId],
    queryFn: async () => {
      if (!docId) return null;
      const docs = await base44.entities.DocumentBuilder.filter({ id: docId });
      return docs[0] || null;
    },
    enabled: !!docId,
  });

  useEffect(() => {
    if (existingDoc) {
      setFormData({
        title: existingDoc.title || '',
        category: existingDoc.category || 'sop',
        description: existingDoc.description || '',
        content_html: existingDoc.content_html || '',
        tags: existingDoc.tags || [],
        department: existingDoc.department || 'all',
        linked_role: existingDoc.linked_role || '',
        requires_signature: existingDoc.requires_signature || false,
        comments_enabled: existingDoc.comments_enabled !== false,
        status: existingDoc.status || 'draft',
      });
    }
  }, [existingDoc]);

  // Auto-save functionality
  useEffect(() => {
    if (!formData.title || !isManager) return;

    const autoSaveTimer = setTimeout(() => {
      handleAutoSave();
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [formData]);

  const handleAutoSave = async () => {
    if (!formData.title || formData.status === 'published') return;

    setAutoSaveStatus('saving');
    try {
      if (docId) {
        await base44.entities.DocumentBuilder.update(docId, {
          ...formData,
          updated_by: user.email,
          updated_by_name: user.full_name,
          updated_date: new Date().toISOString(),
        });
      }
      setAutoSaveStatus('saved');
    } catch (error) {
      console.error('Auto-save error:', error);
      setAutoSaveStatus('error');
    }
  };

  const saveDocumentMutation = useMutation({
    mutationFn: async (publishNow = false) => {
      const docData = {
        ...formData,
        status: publishNow ? 'published' : formData.status,
        published_at: publishNow ? new Date().toISOString() : existingDoc?.published_at,
        updated_by: user.email,
        updated_by_name: user.full_name,
      };

      if (docId) {
        // Update existing
        const currentVersion = existingDoc?.version || 1;
        if (publishNow && formData.status === 'draft') {
          // Publishing for first time or new version
          docData.version = currentVersion + 1;
        }
        return await base44.entities.DocumentBuilder.update(docId, docData);
      } else {
        // Create new
        docData.created_by = user.email;
        docData.created_by_name = user.full_name;
        docData.version = 1;
        return await base44.entities.DocumentBuilder.create(docData);
      }
    },
    onSuccess: (data, publishNow) => {
      queryClient.invalidateQueries({ queryKey: ['documentBuilder'] });
      queryClient.invalidateQueries({ queryKey: ['documentLibrary'] });
      
      if (publishNow) {
        alert('✅ Document published successfully!');
        navigate(createPageUrl('DocumentLibrary'));
      } else {
        alert('💾 Document saved as draft');
        if (!docId) {
          navigate(createPageUrl(`DocumentBuilder?id=${data.id}`));
        }
      }
    },
  });

  const handleSave = () => {
    if (!formData.title) {
      alert('Please add a title before saving');
      return;
    }
    saveDocumentMutation.mutate(false);
  };

  const handlePublish = () => {
    if (!formData.title || !formData.content_html) {
      alert('Please add title and content before publishing');
      return;
    }
    
    if (confirm('Publish this document? It will be visible to all staff.')) {
      saveDocumentMutation.mutate(true);
    }
  };

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }

      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // Insert image into editor
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection();
        quill.insertEmbed(range ? range.index : 0, 'image', file_url);
        
        setUploading(false);
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image');
        setUploading(false);
      }
    };

    input.click();
  };

  const handleVideoUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 50 * 1024 * 1024) {
        alert('Video must be less than 50MB');
        return;
      }

      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // Insert video into editor
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection();
        quill.insertEmbed(range ? range.index : 0, 'video', file_url);
        
        setUploading(false);
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload video');
        setUploading(false);
      }
    };

    input.click();
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setAIGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional technical writer creating restaurant operations documentation. 

Create a detailed, well-structured document for: "${aiPrompt}"

Format the content in HTML with:
- Clear headings (<h2>, <h3>)
- Numbered or bulleted lists where appropriate
- Bold text for key points
- Professional, clear language
- Step-by-step instructions if applicable
- Safety or hygiene notes in highlighted sections if relevant

Make it comprehensive but easy to understand for restaurant staff.`,
        add_context_from_internet: false,
      });

      // Insert AI-generated content
      setFormData({
        ...formData,
        content_html: response,
        ai_generated: true,
      });

      setShowAIDialog(false);
      setAIPrompt('');
      setAIGenerating(false);
    } catch (error) {
      console.error('AI generation error:', error);
      alert('Failed to generate content. Please try again.');
      setAIGenerating(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ],
  };

  if (!isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-6">Only managers can create documents</p>
            <Link to={createPageUrl('DocumentLibrary')}>
              <Button>View Document Library</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('DocumentLibrary')}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {docId ? 'Edit Document' : 'New Document'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  {autoSaveStatus === 'saving' && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Saved
                    </span>
                  )}
                  {autoSaveStatus === 'error' && (
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      Error saving
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saveDocumentMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={handlePublish}
                disabled={saveDocumentMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Publish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Document Settings */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sop">📋 SOP</SelectItem>
                      <SelectItem value="policy">📜 Policy</SelectItem>
                      <SelectItem value="training">🎓 Training</SelectItem>
                      <SelectItem value="guide">📖 Guide</SelectItem>
                      <SelectItem value="quality">⭐ Quality</SelectItem>
                      <SelectItem value="procedure">🔧 Procedure</SelectItem>
                      <SelectItem value="emergency">🚨 Emergency</SelectItem>
                      <SelectItem value="customer_service">🤝 Customer Service</SelectItem>
                      <SelectItem value="other">📁 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(val) => setFormData({ ...formData, department: val })}
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

                <div>
                  <Label className="text-sm font-semibold mb-2">Role</Label>
                  <Select
                    value={formData.linked_role}
                    onValueChange={(val) => setFormData({ ...formData, linked_role: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Roles</SelectItem>
                      <SelectItem value="chef">Chef</SelectItem>
                      <SelectItem value="line_cook">Line Cook</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="bartender">Bartender</SelectItem>
                      <SelectItem value="cleaner">Cleaner</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requires_signature}
                      onChange={(e) => setFormData({ ...formData, requires_signature: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Require Staff Signature</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.comments_enabled}
                      onChange={(e) => setFormData({ ...formData, comments_enabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Enable Comments</span>
                  </label>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    AI Assist
                  </Label>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAIDialog(true)}
                  >
                    Generate Content
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardContent className="p-4">
                <Label className="text-sm font-semibold mb-2">Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag..."
                    className="text-sm"
                  />
                  <Button size="sm" onClick={addTag}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                      <X
                        className="w-3 h-3 ml-1 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Editor */}
          <div className="lg:col-span-3">
            <Card className="min-h-[calc(100vh-180px)]">
              <CardContent className="p-6">
                {!showPreview ? (
                  <div className="space-y-4">
                    {/* Title */}
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Document Title..."
                      className="text-3xl font-bold border-none focus:ring-0 px-0"
                    />

                    {/* Description */}
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description..."
                      rows={2}
                      className="text-gray-600 border-none focus:ring-0 px-0"
                    />

                    {/* Toolbar */}
                    <div className="flex items-center gap-2 py-2 border-y">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleImageUpload}
                        disabled={uploading}
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Image
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleVideoUpload}
                        disabled={uploading}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Video
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAttachDialog(true)}
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        Attach
                      </Button>
                    </div>

                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </div>
                    )}

                    {/* Rich Text Editor */}
                    <div className="prose max-w-none">
                      <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={formData.content_html}
                        onChange={(content) => setFormData({ ...formData, content_html: content })}
                        modules={quillModules}
                        placeholder="Start writing your document..."
                        style={{ minHeight: '400px' }}
                      />
                    </div>
                  </div>
                ) : (
                  /* Preview Mode */
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        {formData.title || 'Untitled Document'}
                      </h1>
                      <p className="text-gray-600">{formData.description}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Badge className="bg-blue-100 text-blue-800">
                          {formData.category}
                        </Badge>
                        <Badge variant="outline">{formData.department}</Badge>
                        {formData.requires_signature && (
                          <Badge className="bg-green-100 text-green-800">
                            Requires Signature
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: formData.content_html }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Generate Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Content Generator
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>What would you like to create?</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAIPrompt(e.target.value)}
                placeholder="e.g., 'Create an SOP for cleaning the coffee machine' or 'Write a customer service policy for handling complaints'"
                rows={4}
                className="mt-2"
              />
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-800">
                💡 Be specific! The more details you provide, the better the AI-generated content will be.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={!aiPrompt.trim() || aiGenerating}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}