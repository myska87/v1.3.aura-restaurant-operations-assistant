
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  FileText,
  Save,
  Send,
  Eye,
  ArrowLeft,
  Home,
  Upload,
  Image,
  Video,
  Link as LinkIcon,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  Book,
  Loader2,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom'; // Added useParams
import { createPageUrl } from '@/utils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { motion } from 'framer-motion';
import { format } from 'date-fns'; // Added format import for date-fns

export default function DocumentBuilder() {
  const navigate = useNavigate();
  const { docId } = useParams(); // Get document ID from URL params
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedDocument, setSavedDocument] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [isAIGenerated, setIsAIGenerated] = useState(false); // To track if content is AI generated
  const [editingDoc, setEditingDoc] = useState(null); // To store the document being edited

  const [formData, setFormData] = useState({
    title: '',
    category: 'sop',
    description: '',
    tags: [],
    department: 'all',
    linked_role: '',
    requires_signature: false,
    status: 'draft',
  });

  const [tagInput, setTagInput] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Query to fetch document data if docId is present (for editing)
  const { data: documentToEdit, isLoading: isLoadingDocument } = useQuery({
    queryKey: ['document', docId],
    queryFn: () => base44.entities.DocumentBuilder.getById(docId),
    enabled: !!docId, // Only run this query if docId exists
  });

  // Populate form data when documentToEdit is loaded
  useEffect(() => {
    if (documentToEdit) {
      setEditingDoc(documentToEdit); // Set the editing document
      setFormData({
        title: documentToEdit.title || '',
        category: documentToEdit.category || 'sop',
        description: documentToEdit.description || '',
        tags: documentToEdit.tags || [],
        department: documentToEdit.department || 'all',
        linked_role: documentToEdit.linked_role || '',
        requires_signature: documentToEdit.requires_signature || false,
        status: documentToEdit.status || 'draft',
      });
      setContent(documentToEdit.content_html || '');
      setIsAIGenerated(documentToEdit.ai_generated || false);
    }
  }, [documentToEdit]);

  // ✅ ENHANCED: Add activity logging on document creation and handle updates
  const saveDocumentMutation = useMutation({
    mutationFn: async (data) => {
      if (editingDoc) {
        // If editing an existing document, call the update API
        return await base44.entities.DocumentBuilder.update(editingDoc.id, data);
      } else {
        // Otherwise, create a new document
        return await base44.entities.DocumentBuilder.create(data);
      }
    },
    onSuccess: async (savedDoc) => {
      queryClient.invalidateQueries({ queryKey: ['documentLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['allDocuments'] });
      
      // ✨ Log activity for new documents only
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
      
      alert(editingDoc ? `✅ Document "${savedDoc.title}" Updated!` : `✅ Document "${savedDoc.title}" Created!`);
      navigate(createPageUrl('DocumentLibrary')); // Navigate directly after save/update
    },
    onError: (error) => {
      console.error('Save error:', error);
      alert(`Failed to ${editingDoc ? 'update' : 'save'} document. Please try again.`);
    },
  });

  const publishDocumentMutation = useMutation({
    mutationFn: async (data) => {
      const docData = {
        ...data,
        status: 'published',
        published_at: new Date().toISOString(),
      };
      if (editingDoc) {
        // If editing, update and publish
        return await base44.entities.DocumentBuilder.update(editingDoc.id, docData);
      } else {
        // Otherwise, create and publish
        return await base44.entities.DocumentBuilder.create(docData);
      }
    },
    onSuccess: (savedDoc) => {
      queryClient.invalidateQueries({ queryKey: ['documentLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['allDocuments'] });
      setSavedDocument(savedDoc);
      setShowSuccessDialog(true);
    },
    onError: (error) => {
      console.error('Publish error:', error);
      alert(`Failed to ${editingDoc ? 'update and publish' : 'publish'} document. Please try again.`);
    },
  });

  const generateWithAIMutation = useMutation({
    mutationFn: async (prompt) => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert restaurant operations consultant. Create a detailed document based on this request: "${prompt}"

Generate professional content with:
- Clear title
- Well-structured sections with headers
- Bullet points where appropriate
- Step-by-step instructions if relevant
- Safety notes and best practices
- Professional formatting in HTML

Make it practical, specific, and ready to use in a restaurant setting.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            category: { type: "string" },
            description: { type: "string" },
            content_html: { type: "string" },
            tags: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });
      return response;
    },
    onSuccess: (data) => {
      setFormData((prev) => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        tags: data.tags || prev.tags,
      }));
      setContent(data.content_html || '');
      setIsAIGenerated(true); // Mark as AI generated
      setShowAIDialog(false);
      setAiPrompt('');
      setGeneratingAI(false);
    },
    onError: (error) => {
      console.error('AI generation error:', error);
      alert('Failed to generate content. Please try again.');
      setGeneratingAI(false);
      setIsAIGenerated(false); // Reset if generation fails
    }
  });

  const improveWithAIMutation = useMutation({
    mutationFn: async () => {
      setGeneratingAI(true); // Set generating AI to true for improvement as well
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Improve and enhance this restaurant operations document. Make it more professional, clear, and actionable. Ensure the output is valid HTML:

Title: ${formData.title}
Current Content: ${content.replace(/<[^>]*>/g, '')}

Provide:
1. Enhanced content with better structure
2. Additional relevant details
3. Safety notes if applicable
4. Professional formatting in HTML`,
        response_json_schema: {
          type: "object",
          properties: {
            improved_content: { type: "string" },
            suggestions: { type: "string" }
          }
        }
      });
      return response;
    },
    onSuccess: (data) => {
      setContent(data.improved_content || content);
      if (data.suggestions) {
        // Optionally display suggestions to the user
        // alert(`AI Suggestions: ${data.suggestions}`);
      }
      setGeneratingAI(false);
    },
    onError: (error) => {
      console.error('AI improvement error:', error);
      alert('Failed to improve content. Please try again.');
      setGeneratingAI(false);
    }
  });


  // Auto-save every 2 minutes
  useEffect(() => {
    // Only auto-save if there's a title and content, and not currently published (unless editing a published doc)
    if (!formData.title || !content || formData.status === 'published' && !editingDoc) return;

    const autoSaveTimer = setTimeout(() => {
      handleAutoSave();
    }, 120000); // 2 minutes

    return () => clearTimeout(autoSaveTimer);
  }, [content, formData, editingDoc]);

  const handleAutoSave = async () => {
    if (!formData.title.trim() || !content.trim()) return;

    setAutoSaving(true);
    try {
      const docData = prepareDocumentData('draft');
      // Using saveDocumentMutation.mutateAsync, which now handles both create and update
      await saveDocumentMutation.mutateAsync(docData);
      setLastSaved(new Date()); // Update last saved timestamp on success
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
    setAutoSaving(false);
  };

  const prepareDocumentData = (status) => {
    return {
      title: formData.title.trim(),
      category: formData.category,
      description: formData.description.trim(),
      content_html: content,
      content_json: {
        html: content,
        plainText: content.replace(/<[^>]*>/g, ''),
      },
      tags: formData.tags,
      department: formData.department,
      linked_role: formData.linked_role || null,
      requires_signature: formData.requires_signature,
      status: status,
      created_by: editingDoc?.created_by || user.email, // Preserve original creator if editing
      created_by_name: editingDoc?.created_by_name || user.full_name, // Preserve original creator if editing
      updated_by: user.email,
      updated_by_name: user.full_name,
      ai_generated: isAIGenerated, // Use the state variable
      media_urls: [], // Placeholder, add logic if needed
      attachments: [], // Placeholder, add logic if needed
      comments_enabled: true,
      version: editingDoc ? editingDoc.version + 1 : 1, // Increment version on update
    };
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a document title');
      return;
    }

    if (!content.trim()) {
      alert('Please add some content to your document');
      return;
    }

    const docData = prepareDocumentData('draft');
    await saveDocumentMutation.mutateAsync(docData);
  };

  const handlePublish = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a document title');
      return;
    }

    if (!content.trim()) {
      alert('Please add some content to your document');
      return;
    }

    if (!window.confirm(`Publish this document? It will be visible to all team members.${editingDoc ? ' This will also update the existing document.' : ''}`)) {
      return;
    }

    const docData = prepareDocumentData('published');
    await publishDocumentMutation.mutateAsync(docData);
  };

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        // Get the current content and insert image at cursor position if possible
        const quill = document.querySelector('.ql-editor');
        let currentContent = content;
        if (quill) {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(range.cloneContents());
            const selectedHtml = tempDiv.innerHTML;
            
            // Check if selection is within the quill editor
            if (quill.contains(range.commonAncestorContainer)) {
              const editor = document.querySelector('.ql-editor');
              const editorHtml = editor.innerHTML;
              const cursorPosition = editor.selectionStart; // This doesn't work for contenteditable
              
              // A more robust way to insert at cursor in ReactQuill
              const quillEditor = document.querySelector('.ql-container .ql-editor');
              const range = quillEditor.__quill.getSelection(true);
              if (range) {
                quillEditor.__quill.insertEmbed(range.index, 'image', file_url);
                quillEditor.__quill.setSelection(range.index + 1); // Move cursor after the image
                setContent(quillEditor.__quill.root.innerHTML); // Update React state
              } else {
                setContent(prev => prev + `<img src="${file_url}" alt="Uploaded image" style="max-width: 100%; height: auto;" />`);
              }
            } else {
              setContent(prev => prev + `<img src="${file_url}" alt="Uploaded image" style="max-width: 100%; height: auto;" />`);
            }
          } else {
            setContent(prev => prev + `<img src="${file_url}" alt="Uploaded image" style="max-width: 100%; height: auto;" />`);
          }
        } else {
          setContent(prev => prev + `<img src="${file_url}" alt="Uploaded image" style="max-width: 100%; height: auto;" />`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image');
      }
      setUploading(false);
    };

    input.click();
  };


  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      alert('Please describe what document you want to create');
      return;
    }

    setGeneratingAI(true);
    await generateWithAIMutation.mutateAsync(aiPrompt);
  };

  const handleAIImprove = async () => {
    if (!content.trim()) {
      alert('Please add some content first before using AI improvement');
      return;
    }

    setGeneratingAI(true); // Start loading state for AI Improve
    await improveWithAIMutation.mutateAsync();
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-700 mb-6">
                Only managers and administrators can create documents.
              </p>
              <Link to={createPageUrl('DocumentLibrary')}>
                <Button>
                  <Book className="w-4 h-4 mr-2" />
                  View Document Library
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (docId && isLoadingDocument) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="ml-3 text-lg text-gray-700">Loading document for editing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-10 h-10 text-blue-600" />
              <div>
                <h1 className="text-4xl font-bold text-gray-900">{editingDoc ? 'Edit Document' : 'Document Builder'}</h1>
                <p className="text-gray-600 text-lg">{editingDoc ? 'Make changes to your document' : 'Create SOPs, policies, guides, and training materials'}</p>
              </div>
            </div>
            
            {/* AI Quick Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAIDialog(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                disabled={generatingAI}
              >
                {generatingAI && generateWithAIMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                AI Generate
              </Button>
              <Button
                onClick={handleAIImprove}
                disabled={generatingAI || !content} // Disable if any AI process is running or no content
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                {generatingAI && improveWithAIMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                AI Improve
              </Button>
            </div>
          </div>
          
          {lastSaved && (
            <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Last saved: {format(lastSaved, 'h:mm a')}
            </p>
          )}
          {autoSaving && (
            <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Auto-saving...
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Document Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Opening Checklist Procedure"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="text-lg"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
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
                        <SelectItem value="sop">SOP</SelectItem>
                        <SelectItem value="policy">Policy</SelectItem>
                        <SelectItem value="training">Training Material</SelectItem>
                        <SelectItem value="guide">Guide</SelectItem>
                        <SelectItem value="quality">Quality</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                        <SelectItem value="emergency">Emergency Response</SelectItem>
                        <SelectItem value="customer_service">Customer Service</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                </div>

                <div>
                  <Label htmlFor="description">Brief Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Short summary of what this document covers..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Content Editor */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Content</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleImageUpload}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Image className="w-4 h-4 mr-2" />
                      )}
                      Add Image
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  className="bg-white"
                  style={{ minHeight: '400px' }}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSaveDraft}
                disabled={saveDocumentMutation.isPending || !formData.title || !content}
                variant="outline"
                className="flex-1"
              >
                {saveDocumentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingDoc ? 'Updating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingDoc ? 'Update Draft' : 'Save Draft'}
                  </>
                )}
              </Button>

              <Button
                onClick={handlePublish}
                disabled={publishDocumentMutation.isPending || !formData.title || !content}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {publishDocumentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingDoc ? 'Updating & Publishing...' : 'Publishing...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {editingDoc ? 'Update & Publish' : 'Publish Document'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button onClick={handleAddTag} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="role">Link to Position (optional)</Label>
                  <Select
                    value={formData.linked_role}
                    onValueChange={(value) => setFormData({...formData, linked_role: value})}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem> {/* Changed to empty string for null */}
                      <SelectItem value="chef">Chef</SelectItem>
                      <SelectItem value="sous_chef">Sous Chef</SelectItem>
                      <SelectItem value="line_cook">Line Cook</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="bartender">Bartender</SelectItem>
                      <SelectItem value="cleaner">Cleaner</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="signature"
                    checked={formData.requires_signature}
                    onChange={(e) => setFormData({...formData, requires_signature: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="signature" className="cursor-pointer">
                    Require staff signature
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Help */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Tips</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Use headers to organize sections</li>
                  <li>• Add images for visual steps</li>
                  <li>• Tag documents for easy search</li>
                  <li>• Save drafts frequently</li>
                  <li>• Auto-save runs every 2 minutes</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Generation Dialog */}
        <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="w-6 h-6 text-purple-600" />
                AI Document Generator
              </DialogTitle>
              <DialogDescription>
                Describe what document you want to create, and AI will generate it for you instantly.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>What do you want to create?</Label>
                <Textarea
                  placeholder="e.g., 'Opening checklist for kitchen', 'Customer complaint handling procedure', 'Food safety policy for deep frying'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">💡 Examples:</h4>
                <div className="space-y-1 text-sm text-purple-800">
                  <button 
                    onClick={() => setAiPrompt('Create a detailed cleaning checklist for the bar area')}
                    className="block hover:underline text-left"
                  >
                    • "Create a detailed cleaning checklist for the bar area"
                  </button>
                  <button 
                    onClick={() => setAiPrompt('Write a customer service guide for handling complaints')}
                    className="block hover:underline text-left"
                  >
                    • "Write a customer service guide for handling complaints"
                  </button>
                  <button 
                    onClick={() => setAiPrompt('Generate an emergency response procedure for kitchen fires')}
                    className="block hover:underline text-left"
                  >
                    • "Generate an emergency response procedure for kitchen fires"
                  </button>
                  <button 
                    onClick={() => setAiPrompt('Create a training guide for new servers')}
                    className="block hover:underline text-left"
                  >
                    • "Create a training guide for new servers"
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAIDialog(false);
                  setAiPrompt('');
                }}
                disabled={generatingAI}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAIGenerate}
                disabled={generatingAI || !aiPrompt.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {generatingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Document
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-6 h-6" />
                Document Saved Successfully!
              </DialogTitle>
              <DialogDescription>
                Your document has been {formData.status === 'published' ? 'published' : 'saved as draft'} and is now available in the Document Library and Document Management.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowSuccessDialog(false);
                  navigate(createPageUrl('DocumentLibrary'));
                }}
                className="w-full"
              >
                <Book className="w-4 h-4 mr-2" />
                Go to Document Library
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessDialog(false);
                  navigate(createPageUrl('DocumentManagement'));
                }}
                variant="outline"
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Go to Document Management
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessDialog(false);
                  // Reset form for new document
                  setFormData({
                    title: '',
                    category: 'sop',
                    description: '',
                    tags: [],
                    department: 'all',
                    linked_role: '',
                    requires_signature: false,
                    status: 'draft',
                  });
                  setContent('');
                  setSavedDocument(null);
                  setIsAIGenerated(false); // Reset AI generated status
                  setEditingDoc(null); // Reset editing doc status
                  navigate(createPageUrl('DocumentBuilder')); // Navigate to empty builder page
                }}
                variant="outline"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Another Document
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
