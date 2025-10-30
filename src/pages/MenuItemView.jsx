
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SOPStepTimeline from '../components/SOPStepTimeline';

export default function MenuItemView() {
  const queryClient = useQueryClient();
  const [showSOPModal, setShowSOPModal] = useState(false);
  const [showLinkSOPDialog, setShowLinkSOPDialog] = useState(false);
  const [selectedSOPId, setSelectedSOPId] = useState('');
  const [itemId, setItemId] = useState(null);

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

        {/* Hero Image */}
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

            {/* SOP Linking Section */}
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

        {/* Cost Analysis */}
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

        {/* Recipe & Ingredients */}
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

        {/* Cooking Instructions */}
        {item.cooking_instructions && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-green-600" />
                Cooking Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{item.cooking_instructions}</p>
              </div>
              {item.prep_time_minutes && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    ⏱️ Prep Time: {item.prep_time_minutes} minutes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SOP Preview Modal */}
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

        {/* Link SOP Dialog */}
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
