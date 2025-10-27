import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  FileText,
  Save,
  Eye,
  ArrowLeft,
  Home,
  Sparkles,
  Upload,
  Image,
  Video,
  Link as LinkIcon,
  Plus,
  Trash2,
  BookOpen,
  Send,
  Loader2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function DocumentBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editorContent, setEditorContent] = useState('');
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'sop',
    description: '',
    tags: '',
    linked_role: '',
    department: 'all',
    requires_signature: false,
    status: 'draft',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const createDocumentMutation = useMutation({
    mutationFn: (data) => base44.entities.DocumentBuilder.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documentLibrary'] });
      navigate(createPageUrl(`DocumentViewer?id=${data.id}`));
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      return result.file_url;
    },
  });

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    
    setGeneratingAI(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional SOP and document writer for restaurants. Create a detailed, well-structured document based on this request: "${aiPrompt}". 

Format the output as HTML with proper headings, lists, and paragraphs. Include:
- Clear title and introduction
- Step-by-step instructions if applicable
- Safety notes or warnings if relevant
- Best practices
- Summary or key takeaways

Make it professional, clear, and actionable for restaurant staff.`,
        add_context_from_internet: false,
      });

      setEditorContent(result);
      setShowAIDialog(false);
      setAIPrompt('');
    } catch (error) {
      console.error('AI generation error:', error);
      alert('Failed to generate content. Please try again.');
    }
    setGeneratingAI(false);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFileMutation.mutateAsync(file);
      const imageHtml = `<img src="${url}" alt="Uploaded image" style="max-width: 100%; height: auto;" />`;
      setEditorContent(editorContent + imageHtml);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    }
  };

  const handleSave = async (publishNow = false) => {
    if (!formData.title.trim()) {
      alert('Please enter a document title');
      return;
    }

    if (!editorContent.trim()) {
      alert('Please add some content to the document');
      return;
    }

    try {
      await createDocumentMutation.mutateAsync({
        title: formData.title,
        category: formData.category,
        description: formData.description,
        content_html: editorContent,
        content_json: { raw: editorContent },
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        linked_role: formData.linked_role || null,
        department: formData.department,
        requires_signature: formData.requires_signature,
        status: publishNow ? 'published' : 'draft',
        created_by: user.email,
        created_by_name: user.full_name,
        published_at: publishNow ? new Date().toISOString() : null,
      });
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save document');
    }
  };

  const loadTemplate = (templateType) => {
    const templates = {
      sop: `<h1>Standard Operating Procedure</h1>
<h2>Purpose</h2>
<p>Describe the purpose of this procedure...</p>
<h2>Scope</h2>
<p>Who this applies to and when...</p>
<h2>Procedures</h2>
<ol>
  <li>Step 1</li>
  <li>Step 2</li>
  <li>Step 3</li>
</ol>
<h2>Safety & Compliance</h2>
<p>Important safety information...</p>`,
      
      policy: `<h1>Company Policy</h1>
<h2>Policy Statement</h2>
<p>Clear statement of the policy...</p>
<h2>Scope & Applicability</h2>
<p>Who this policy applies to...</p>
<h2>Responsibilities</h2>
<ul>
  <li>Management responsibilities</li>
  <li>Staff responsibilities</li>
</ul>
<h2>Enforcement</h2>
<p>How this policy will be enforced...</p>`,
      
      training: `<h1>Training Guide</h1>
<h2>Learning Objectives</h2>
<p>What you'll learn...</p>
<h2>Prerequisites</h2>
<p>What you need to know first...</p>
<h2>Training Content</h2>
<ol>
  <li>Module 1</li>
  <li>Module 2</li>
  <li>Module 3</li>
</ol>
<h2>Assessment</h2>
<p>How knowledge will be tested...</p>`,
      
      guide: `<h1>Quick Reference Guide</h1>
<h2>Overview</h2>
<p>Brief introduction...</p>
<h2>Key Steps</h2>
<ol>
  <li>Quick step 1</li>
  <li>Quick step 2</li>
  <li>Quick step 3</li>
</ol>
<h2>Tips & Best Practices</h2>
<ul>
  <li>Tip 1</li>
  <li>Tip 2</li>
</ul>`,
    };

    setEditorContent(templates[templateType] || templates.sop);
    setShowTemplateDialog(false);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-4">Document Builder is only accessible to managers.</p>
            <Link to={createPageUrl('Dashboard')}>
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('DocumentLibrary')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Library
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#014D40]" />
            Document Builder
          </h1>
          <p className="text-gray-600">Create SOPs, policies, guides, and training materials</p>
        </div>

        {/* Document Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Document Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Document Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., How to Clean the Coffee Machine"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sop">📋 SOP</SelectItem>
                    <SelectItem value="policy">📜 Policy</SelectItem>
                    <SelectItem value="training">🎓 Training Material</SelectItem>
                    <SelectItem value="guide">📖 Quick Guide</SelectItem>
                    <SelectItem value="quality">⭐ Quality Standard</SelectItem>
                    <SelectItem value="procedure">🔧 Procedure</SelectItem>
                    <SelectItem value="emergency">🚨 Emergency Protocol</SelectItem>
                    <SelectItem value="customer_service">🤝 Customer Service</SelectItem>
                    <SelectItem value="other">📁 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Brief Description</Label>
              <Textarea
                id="description"
                placeholder="What is this document about?"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={2}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="cleaning, coffee, equipment"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({...formData, department: value})}
                >
                  <SelectTrigger id="department">
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
                <Label htmlFor="role">Linked Role (optional)</Label>
                <Select
                  value={formData.linked_role}
                  onValueChange={(value) => setFormData({...formData, linked_role: value})}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No specific role</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="line_cook">Line Cook</SelectItem>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="bartender">Bartender</SelectItem>
                    <SelectItem value="cleaner">Cleaner</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requires_signature"
                checked={formData.requires_signature}
                onChange={(e) => setFormData({...formData, requires_signature: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="requires_signature" className="cursor-pointer">
                Require staff signature/acknowledgment
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Toolbar */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIDialog(true)}
              >
                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                AI Assist
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateDialog(true)}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Use Template
              </Button>

              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <div>
                    <Image className="w-4 h-4 mr-2" />
                    Insert Image
                  </div>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={createDocumentMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>

                <Button
                  onClick={() => handleSave(true)}
                  disabled={createDocumentMutation.isPending}
                  className="bg-[#014D40] hover:bg-[#013830]"
                >
                  {createDocumentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Publish
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card>
          <CardContent className="p-0">
            <ReactQuill
              theme="snow"
              value={editorContent}
              onChange={setEditorContent}
              modules={quillModules}
              placeholder="Start writing your document here... Use the toolbar above for formatting."
              className="min-h-[500px]"
            />
          </CardContent>
        </Card>

        {/* AI Dialog */}
        <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Content Generator
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="aiPrompt">What would you like to create?</Label>
              <Textarea
                id="aiPrompt"
                placeholder="e.g., Create an SOP for cleaning the espresso machine"
                value={aiPrompt}
                onChange={(e) => setAIPrompt(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAIDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAIGenerate}
                disabled={generatingAI || !aiPrompt.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {generatingAI ? (
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

        {/* Template Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose a Template</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={() => loadTemplate('sop')}
              >
                <div className="text-left">
                  <div className="font-semibold">📋 SOP Template</div>
                  <div className="text-sm text-gray-600">Standard Operating Procedure format</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={() => loadTemplate('policy')}
              >
                <div className="text-left">
                  <div className="font-semibold">📜 Policy Template</div>
                  <div className="text-sm text-gray-600">Company policy structure</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={() => loadTemplate('training')}
              >
                <div className="text-left">
                  <div className="font-semibold">🎓 Training Template</div>
                  <div className="text-sm text-gray-600">Training guide format</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={() => loadTemplate('guide')}
              >
                <div className="text-left">
                  <div className="font-semibold">📖 Quick Guide Template</div>
                  <div className="text-sm text-gray-600">Quick reference guide</div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}