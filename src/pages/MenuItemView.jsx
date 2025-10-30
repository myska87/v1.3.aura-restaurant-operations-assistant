import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Home,
  Utensils,
  DollarSign,
  Calculator,
  AlertCircle,
  BookOpen,
  Eye,
  Edit,
  Package,
  Link2,
  Plus,
  Save,
  X,
  Printer,
  Image as ImageIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SOPStepTimeline from '../components/SOPStepTimeline';
import ReactQuill from 'react-quill';

export default function MenuItemView() {
  const queryClient = useQueryClient();
  const [showSOPModal, setShowSOPModal] = useState(false);
  const [showLinkSOPDialog, setShowLinkSOPDialog] = useState(false);
  const [selectedSOPId, setSelectedSOPId] = useState('');
  const [itemId, setItemId] = useState(null);
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState('');
  const [uploadingInstructionImage, setUploadingInstructionImage] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    setItemId(id);
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: item } = useQuery({
    queryKey: ['menuItem', itemId],
    queryFn: async () => {
      const items = await base44.entities.MenuItem.filter({ id: itemId });
      return items[0] || null;
    },
    enabled: !!itemId,
  });

  const { data: linkedSOP } = useQuery({
    queryKey: ['menuItemSOP', itemId],
    queryFn: async () => {
      if (!item?.linked_sop_id) return null;
      const sops = await base44.entities.SOPDocument.filter({ id: item.linked_sop_id });
      return sops[0] || null;
    },
    enabled: !!item?.linked_sop_id,
  });

  const { data: allSOPs = [] } = useQuery({
    queryKey: ['allSOPs'],
    queryFn: () => base44.entities.SOPDocument.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const linkSOPMutation = useMutation({
    mutationFn: async ({ menuItemId, sopId }) => {
      const selectedSOP = allSOPs.find(s => s.id === sopId);
      return await base44.entities.MenuItem.update(menuItemId, {
        linked_sop_id: sopId,
        linked_sop_title: selectedSOP?.title || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItem'] });
      queryClient.invalidateQueries({ queryKey: ['menuItemSOP'] });
      setShowLinkSOPDialog(false);
      setSelectedSOPId('');
      alert('✅ SOP linked successfully!');
    },
  });

  const unlinkSOPMutation = useMutation({
    mutationFn: async (menuItemId) => {
      return await base44.entities.MenuItem.update(menuItemId, {
        linked_sop_id: null,
        linked_sop_title: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItem'] });
      queryClient.invalidateQueries({ queryKey: ['menuItemSOP'] });
      alert('✅ SOP unlinked successfully!');
    },
  });

  const updateInstructionsMutation = useMutation({
    mutationFn: async (instructionsHtml) => {
      return await base44.entities.MenuItem.update(item.id, {
        cooking_instructions: instructionsHtml
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItem'] });
      setIsEditingInstructions(false);
      alert('✅ Instructions updated successfully!');
    },
  });

  const handleLinkSOP = () => {
    if (!selectedSOPId) {
      alert('Please select an SOP');
      return;
    }
    linkSOPMutation.mutate({ menuItemId: item.id, sopId: selectedSOPId });
  };

  const handleUnlinkSOP = () => {
    if (confirm('Unlink this SOP from the menu item?')) {
      unlinkSOPMutation.mutate(item.id);
    }
  };

  const handleEditInstructions = () => {
    setEditedInstructions(item.cooking_instructions || '');
    setIsEditingInstructions(true);
  };

  const handleSaveInstructions = () => {
    updateInstructionsMutation.mutate(editedInstructions);
  };

  const handleCancelEdit = () => {
    setIsEditingInstructions(false);
    setEditedInstructions('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingInstructionImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Insert image into editor at cursor position
      const imageHtml = `<img src="${file_url}" alt="Instruction step" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" />`;
      setEditedInstructions(prev => prev + imageHtml);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    }
    setUploadingInstructionImage(false);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${item.name} - Cooking Instructions</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
            }
            h1 {
              color: #014D40;
              border-bottom: 3px solid #10B981;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .header-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
              padding: 15px;
              background: #f8fafc;
              border-radius: 8px;
            }
            .info-item {
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #475569;
              font-size: 14px;
            }
            .info-value {
              color: #0f172a;
              font-size: 16px;
            }
            .instructions {
              margin-top: 30px;
            }
            .instructions h2 {
              color: #014D40;
              margin-top: 20px;
            }
            img {
              max-width: 100%;
              height: auto;
              margin: 15px 0;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              color: #64748b;
              font-size: 12px;
            }
            @media print {
              body {
                margin: 20px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <h1>${item.name}</h1>
          
          <div class="header-info">
            <div>
              <div class="info-item">
                <div class="info-label">Category</div>
                <div class="info-value">${item.category_name || 'Uncategorized'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Prep Time</div>
                <div class="info-value">${item.prep_time_minutes || 'N/A'} minutes</div>
              </div>
            </div>
            <div>
              <div class="info-item">
                <div class="info-label">Sell Price</div>
                <div class="info-value">£${formatPrice(item.sell_price)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Food Cost</div>
                <div class="info-value">£${formatPrice(item.total_cost)}</div>
              </div>
            </div>
          </div>

          ${item.recipe && item.recipe.length > 0 ? `
            <h2>Ingredients</h2>
            <ul>
              ${item.recipe.map(r => `
                <li><strong>${r.ingredient_name}</strong>: ${safeNumber(r.quantity).toFixed(2)} ${r.unit}</li>
              `).join('')}
            </ul>
          ` : ''}

          <div class="instructions">
            <h2>Cooking Instructions</h2>
            ${item.cooking_instructions || '<p>No instructions provided</p>'}
          </div>

          <div class="footer">
            <p>AURA Restaurant Operations | Printed: ${new Date().toLocaleString()}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';
  const isChef = user?.position === 'chef' || user?.position === 'sous_chef';

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Menu Item Not Found</h2>
            <Link to={createPageUrl('Menu')}>
              <Button>Back to Menu</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const safeNumber = (val) => parseFloat(val) || 0;
  const formatPrice = (price) => safeNumber(price).toFixed(2);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Menu')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <Card className="mb-6 overflow-hidden">
          <div className="h-80 bg-gray-200 relative">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Utensils className="w-24 h-24 text-gray-400" />
              </div>
            )}
            <div className="absolute top-4 right-4">
              <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                £{formatPrice(item.sell_price)}
              </Badge>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{item.name}</h1>
                <Badge variant="outline">{item.category_name || 'Uncategorized'}</Badge>
              </div>
              {(isManager || isChef) && (
                <Link to={createPageUrl(`MenuManagement`)}>
                  <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
            {item.description && (
              <p className="text-gray-700 mb-4">{item.description}</p>
            )}

            {linkedSOP ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <p className="font-semibold text-blue-900">Linked SOP</p>
                  </div>
                  <Badge className="bg-blue-600">{linkedSOP.category}</Badge>
                </div>
                <p className="text-blue-800 mb-3">{linkedSOP.title}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setShowSOPModal(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Steps
                  </Button>
                  <Link to={createPageUrl(`SOPViewer?id=${linkedSOP.id}`)}>
                    <Button size="sm" variant="outline">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Full SOP
                    </Button>
                  </Link>
                  {(isManager || isChef) && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowLinkSOPDialog(true)}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Change
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleUnlinkSOP}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Unlink
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="text-sm text-amber-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  No preparation SOP linked to this dish yet.
                </p>
                {(isManager || isChef) && (
                  <div className="flex gap-2">
                    <Link to={createPageUrl(`SOPBuilder?menuItem=${item.id}&menuItemName=${encodeURIComponent(item.name)}`)}>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New SOP
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowLinkSOPDialog(true)}
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Link Existing SOP
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Sell Price</p>
                  <p className="text-2xl font-bold text-green-600">£{formatPrice(item.sell_price)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Food Cost</p>
                  <p className="text-2xl font-bold text-orange-600">£{formatPrice(item.total_cost)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calculator className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Profit Margin</p>
                  <p className={`text-2xl font-bold ${safeNumber(item.profit_margin) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    £{formatPrice(item.profit_margin)}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Food Cost %</span>
                  <Badge className={
                    safeNumber(item.food_cost_percentage) < 30 ? 'bg-green-100 text-green-800' :
                    safeNumber(item.food_cost_percentage) < 40 ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }>
                    {safeNumber(item.food_cost_percentage, 1).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {item.recipe && item.recipe.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Recipe Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {item.recipe.map((recipeItem, idx) => {
                  const ingredient = ingredients.find(ing => ing.id === recipeItem.ingredient_id);
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{recipeItem.ingredient_name}</p>
                          {ingredient && (
                            <p className="text-xs text-gray-500">
                              Stock: {safeNumber(ingredient.current_stock).toFixed(1)} {ingredient.unit}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {safeNumber(recipeItem.quantity).toFixed(2)} {recipeItem.unit}
                        </p>
                        <p className="text-sm text-gray-600">£{formatPrice(recipeItem.cost)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-green-600" />
                Cooking Instructions
              </CardTitle>
              <div className="flex gap-2">
                {item.cooking_instructions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                )}
                {(isManager || isChef) && !isEditingInstructions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditInstructions}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isEditingInstructions ? (
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('instruction-image-upload').click()}
                    disabled={uploadingInstructionImage}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {uploadingInstructionImage ? 'Uploading...' : 'Add Image'}
                  </Button>
                  <input
                    id="instruction-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 self-center">
                    Add step-by-step photos to your instructions
                  </p>
                </div>

                <ReactQuill
                  value={editedInstructions}
                  onChange={setEditedInstructions}
                  modules={quillModules}
                  className="bg-white rounded-lg"
                  style={{ minHeight: '300px' }}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveInstructions}
                    disabled={updateInstructionsMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateInstructionsMutation.isPending ? 'Saving...' : 'Save Instructions'}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {item.cooking_instructions ? (
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: item.cooking_instructions }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No cooking instructions added yet</p>
                    {(isManager || isChef) && (
                      <Button
                        onClick={handleEditInstructions}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Add Instructions
                      </Button>
                    )}
                  </div>
                )}
                {item.prep_time_minutes && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      ⏱️ Prep Time: {item.prep_time_minutes} minutes
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showSOPModal} onOpenChange={setShowSOPModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Preparation SOP: {linkedSOP?.title}
              </DialogTitle>
            </DialogHeader>
            {linkedSOP && linkedSOP.procedure_steps && (
              <div className="py-4">
                <SOPStepTimeline steps={linkedSOP.procedure_steps} readonly={true} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showLinkSOPDialog} onOpenChange={setShowLinkSOPDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-600" />
                Link SOP to Menu Item
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select SOP Document
                </label>
                <Select value={selectedSOPId} onValueChange={setSelectedSOPId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an SOP..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {allSOPs.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <p className="mb-2">No SOPs available</p>
                        <Link to={createPageUrl('SOPBuilder')}>
                          <Button size="sm" variant="outline">
                            Create SOP First
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      allSOPs.map(sop => (
                        <SelectItem key={sop.id} value={sop.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{sop.title}</span>
                            {sop.category && (
                              <span className="text-xs text-gray-500 capitalize">{sop.category}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-900">
                  💡 <strong>Tip:</strong> Link the SOP that describes how to prepare "{item.name}". 
                  This will help staff follow the correct procedure.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLinkSOPDialog(false);
                    setSelectedSOPId('');
                  }}
                >
                  Cancel
                </Button>
                <Link to={createPageUrl(`SOPBuilder?menuItem=${item.id}&menuItemName=${encodeURIComponent(item.name)}`)}>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New
                  </Button>
                </Link>
                <Button
                  onClick={handleLinkSOP}
                  disabled={!selectedSOPId || linkSOPMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  {linkSOPMutation.isPending ? 'Linking...' : 'Link SOP'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}