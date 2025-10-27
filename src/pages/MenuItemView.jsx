import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Home,
  Edit,
  Save,
  Plus,
  Trash2,
  ChefHat,
  DollarSign,
  Clock,
  AlertTriangle,
  BookOpen,
  Package,
  Eye,
  X,
  Upload,
  Camera
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const safeNumber = (value, decimals = 2) => {
  const num = parseFloat(value);
  return isNaN(num) || num === null || num === undefined ? 0 : parseFloat(num.toFixed(decimals));
};

const formatPrice = (price) => safeNumber(price, 2).toFixed(2);
const formatPercent = (percent) => safeNumber(percent, 1).toFixed(1);

export default function MenuItemView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');

  const [editMode, setEditMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [ingredientQuantity, setIngredientQuantity] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sell_price: "",
    prep_time_minutes: "",
    image_url: "",
    recipe: [],
    allergen_tags: [],
    linked_sop_id: "",
  });

  const { data: menuItem, isLoading } = useQuery({
    queryKey: ['menuItem', itemId],
    queryFn: async () => {
      const items = await base44.entities.MenuItem.list();
      return items.find(i => i.id === itemId);
    },
    enabled: !!itemId,
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list('name', 200),
  });

  const { data: sops = [] } = useQuery({
    queryKey: ['sops'],
    queryFn: () => base44.entities.SOPDocument.filter({ category: 'recipe' }),
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItem', itemId] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      setEditMode(false);
      alert('✅ Menu item updated successfully!');
    },
  });

  // Load initial data when menuItem is fetched
  React.useEffect(() => {
    if (menuItem && !editMode) {
      setFormData({
        name: menuItem.name || "",
        description: menuItem.description || "",
        sell_price: safeNumber(menuItem.sell_price).toString(),
        prep_time_minutes: safeNumber(menuItem.prep_time_minutes).toString(),
        image_url: menuItem.image_url || "",
        recipe: menuItem.recipe || [],
        allergen_tags: menuItem.allergen_tags || [],
        linked_sop_id: menuItem.linked_sop_id || "",
      });
    }
  }, [menuItem, editMode]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    }
    setUploadingImage(false);
  };

  const handleAddIngredient = () => {
    if (!selectedIngredient || !ingredientQuantity) {
      alert("Please select an ingredient and enter quantity");
      return;
    }

    const ingredient = ingredients.find(i => i.id === selectedIngredient);
    if (!ingredient) return;

    const quantity = parseFloat(ingredientQuantity);
    const cost = safeNumber(ingredient.unit_cost) * quantity;

    const newIngredient = {
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.name,
      quantity: quantity,
      unit: ingredient.unit,
      cost: cost,
    };

    setFormData({
      ...formData,
      recipe: [...formData.recipe, newIngredient],
    });

    // Update allergens
    if (ingredient.allergen_tags) {
      const newAllergens = new Set([...formData.allergen_tags, ...ingredient.allergen_tags]);
      setFormData(prev => ({
        ...prev,
        allergen_tags: Array.from(newAllergens),
      }));
    }

    setSelectedIngredient("");
    setIngredientQuantity("");
    setShowAddIngredient(false);
  };

  const handleRemoveIngredient = (ingredientId) => {
    setFormData({
      ...formData,
      recipe: formData.recipe.filter(r => r.ingredient_id !== ingredientId),
    });

    // Recalculate allergens
    const remainingIngredientIds = formData.recipe
      .filter(r => r.ingredient_id !== ingredientId)
      .map(r => r.ingredient_id);
    
    const remainingAllergens = new Set();
    remainingIngredientIds.forEach(id => {
      const ing = ingredients.find(i => i.id === id);
      if (ing?.allergen_tags) {
        ing.allergen_tags.forEach(a => remainingAllergens.add(a));
      }
    });

    setFormData(prev => ({
      ...prev,
      allergen_tags: Array.from(remainingAllergens),
    }));
  };

  const calculateTotals = () => {
    const totalCost = formData.recipe.reduce((sum, r) => sum + safeNumber(r.cost), 0);
    const sellPrice = safeNumber(formData.sell_price);
    const profitMargin = sellPrice - totalCost;
    const foodCostPercentage = sellPrice > 0 ? (totalCost / sellPrice) * 100 : 0;

    return {
      totalCost: safeNumber(totalCost),
      profitMargin: safeNumber(profitMargin),
      foodCostPercentage: safeNumber(foodCostPercentage),
    };
  };

  const handleSave = async () => {
    const totals = calculateTotals();
    const category = menuItem?.category_id;

    const data = {
      ...menuItem,
      name: formData.name,
      description: formData.description,
      sell_price: safeNumber(formData.sell_price),
      prep_time_minutes: safeNumber(formData.prep_time_minutes) || null,
      image_url: formData.image_url,
      recipe: formData.recipe,
      total_cost: totals.totalCost,
      profit_margin: totals.profitMargin,
      food_cost_percentage: totals.foodCostPercentage,
      allergen_tags: formData.allergen_tags,
      linked_sop_id: formData.linked_sop_id || null,
      linked_sop_title: formData.linked_sop_id ? sops.find(s => s.id === formData.linked_sop_id)?.title : null,
    };

    updateMenuItemMutation.mutate({ id: itemId, data });
  };

  if (isLoading || !menuItem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading menu item...</p>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex gap-3">
          <Link to={createPageUrl("Menu")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <Card className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white border-none shadow-xl">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-bold mb-2">
                  {editMode ? "Edit Menu Item" : menuItem.name}
                </CardTitle>
                <p className="text-white/90">
                  {menuItem.category_name} • £{formatPrice(menuItem.sell_price)}
                </p>
              </div>
              {!editMode ? (
                <Button 
                  variant="secondary"
                  onClick={() => setEditMode(true)}
                  className="bg-white text-emerald-700 hover:bg-gray-100"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Item
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      setEditMode(false);
                      setFormData({
                        name: menuItem.name || "",
                        description: menuItem.description || "",
                        sell_price: safeNumber(menuItem.sell_price).toString(),
                        prep_time_minutes: safeNumber(menuItem.prep_time_minutes).toString(),
                        image_url: menuItem.image_url || "",
                        recipe: menuItem.recipe || [],
                        allergen_tags: menuItem.allergen_tags || [],
                        linked_sop_id: menuItem.linked_sop_id || "",
                      });
                    }}
                    className="bg-white text-gray-700 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={updateMenuItemMutation.isPending}
                    className="bg-white text-emerald-700 hover:bg-gray-100"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMenuItemMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Ingredients
            </TabsTrigger>
            <TabsTrigger value="sop" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              SOP Integration
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Image Section */}
                  <div>
                    <Label>Dish Photo</Label>
                    <div className="mt-2">
                      {formData.image_url || menuItem.image_url ? (
                        <div className="relative">
                          <img 
                            src={editMode ? formData.image_url : menuItem.image_url}
                            alt={menuItem.name}
                            className="w-full h-64 object-cover rounded-lg"
                          />
                          {editMode && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => document.getElementById('image-upload').click()}
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Change Photo
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
                          <ChefHat className="w-12 h-12 text-gray-400 mb-2" />
                          {editMode && (
                            <Button
                              variant="outline"
                              onClick={() => document.getElementById('image-upload').click()}
                              disabled={uploadingImage}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                            </Button>
                          )}
                        </div>
                      )}
                      {editMode && (
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      )}
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="space-y-4">
                    {editMode ? (
                      <>
                        <div>
                          <Label htmlFor="name">Item Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="sell_price">Sell Price (£)</Label>
                            <Input
                              id="sell_price"
                              type="number"
                              step="0.01"
                              value={formData.sell_price}
                              onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="prep_time">Prep Time (min)</Label>
                            <Input
                              id="prep_time"
                              type="number"
                              value={formData.prep_time_minutes}
                              onChange={(e) => setFormData({ ...formData, prep_time_minutes: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label className="text-gray-600">Description</Label>
                          <p className="text-gray-900 mt-1">{menuItem.description || "No description available"}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-600">Category</Label>
                            <p className="text-gray-900 mt-1">{menuItem.category_name}</p>
                          </div>

                          <div>
                            <Label className="text-gray-600">Prep Time</Label>
                            <p className="text-gray-900 mt-1 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {menuItem.prep_time_minutes || 0} minutes
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-600">Sell Price</Label>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">
                              £{formatPrice(menuItem.sell_price)}
                            </p>
                          </div>

                          <div>
                            <Label className="text-gray-600">Food Cost %</Label>
                            <Badge variant="outline" className={`mt-2 ${
                              safeNumber(menuItem.food_cost_percentage) < 30 
                                ? 'text-green-700 border-green-300' 
                                : 'text-amber-700 border-amber-300'
                            }`}>
                              {formatPercent(menuItem.food_cost_percentage)}%
                            </Badge>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Allergens */}
                    <div>
                      <Label className="text-gray-600">Allergen Information</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(editMode ? formData.allergen_tags : menuItem.allergen_tags || []).length > 0 ? (
                          (editMode ? formData.allergen_tags : menuItem.allergen_tags).map((allergen, idx) => (
                            <Badge key={idx} variant="outline" className="text-red-600 border-red-300">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {allergen}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No allergens detected</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Summary */}
            <Card className="bg-gradient-to-br from-blue-50 to-green-50 border-blue-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Cost Analysis
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-xl font-bold text-gray-900">
                      £{formatPrice(editMode ? totals.totalCost : menuItem.total_cost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sell Price</p>
                    <p className="text-xl font-bold text-gray-900">
                      £{formatPrice(editMode ? formData.sell_price : menuItem.sell_price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Profit Margin</p>
                    <p className={`text-xl font-bold ${(editMode ? totals.profitMargin : menuItem.profit_margin) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      £{formatPrice(editMode ? totals.profitMargin : menuItem.profit_margin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Food Cost %</p>
                    <p className={`text-xl font-bold ${(editMode ? totals.foodCostPercentage : menuItem.food_cost_percentage) < 30 ? 'text-green-600' : 'text-amber-600'}`}>
                      {formatPercent(editMode ? totals.foodCostPercentage : menuItem.food_cost_percentage)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Ingredients */}
          <TabsContent value="ingredients" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Recipe Ingredients</CardTitle>
                  {editMode && (
                    <Button 
                      onClick={() => setShowAddIngredient(true)}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Ingredient
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(editMode ? formData.recipe : menuItem.recipe || []).length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No ingredients added yet</p>
                    {editMode && (
                      <Button 
                        onClick={() => setShowAddIngredient(true)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Ingredient
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(editMode ? formData.recipe : menuItem.recipe).map((ing, idx) => {
                      const ingredientDetail = ingredients.find(i => i.id === ing.ingredient_id);
                      return (
                        <Card key={idx} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-semibold text-gray-900">{ing.ingredient_name}</p>
                                    {ingredientDetail?.supplier_name && (
                                      <p className="text-xs text-gray-500">from {ingredientDetail.supplier_name}</p>
                                    )}
                                  </div>
                                  {editMode && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveIngredient(ing.ingredient_id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-600">Quantity</p>
                                    <p className="font-medium">{ing.quantity} {ing.unit}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Unit Cost</p>
                                    <p className="font-medium">£{formatPrice(ing.quantity > 0 ? ing.cost / ing.quantity : 0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Total Cost</p>
                                    <p className="font-bold text-gray-900">£{formatPrice(ing.cost)}</p>
                                  </div>
                                </div>

                                {ingredientDetail?.allergen_tags && ingredientDetail.allergen_tags.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {ingredientDetail.allergen_tags.map((allergen, aIdx) => (
                                      <Badge key={aIdx} variant="outline" className="text-xs text-red-600 border-red-300">
                                        {allergen}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: SOP Integration */}
          <TabsContent value="sop" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Preparation SOP</CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="sop">Link Preparation SOP</Label>
                      <Select
                        value={formData.linked_sop_id}
                        onValueChange={(value) => setFormData({ ...formData, linked_sop_id: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select SOP..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>No SOP</SelectItem>
                          {sops.map(sop => (
                            <SelectItem key={sop.id} value={sop.id}>
                              {sop.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.linked_sop_id && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          ✅ SOP will be linked. Staff can view preparation instructions directly from this menu item.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {menuItem.linked_sop_id ? (
                      <div className="space-y-4">
                        <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg mb-1">
                                {menuItem.linked_sop_title}
                              </h3>
                              <p className="text-sm text-gray-600">Preparation Instructions</p>
                            </div>
                            <Badge className="bg-purple-100 text-purple-800">
                              Recipe SOP
                            </Badge>
                          </div>

                          <div className="flex gap-3">
                            <Button
                              onClick={() => navigate(createPageUrl(`SOPViewer?id=${menuItem.linked_sop_id}`))}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <BookOpen className="w-4 h-4 mr-2" />
                              View Full SOP
                            </Button>
                            <Button
                              onClick={() => navigate(createPageUrl(`SOPVoiceMode?id=${menuItem.linked_sop_id}`))}
                              variant="outline"
                              className="border-purple-300 text-purple-700 hover:bg-purple-50"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Voice Mode
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">No SOP linked to this menu item</p>
                        <p className="text-sm text-gray-400 mb-4">
                          Link a preparation SOP to provide step-by-step cooking instructions
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Ingredient Dialog */}
        <Dialog open={showAddIngredient} onOpenChange={setShowAddIngredient}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Ingredient</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="ingredient">Select Ingredient</Label>
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose ingredient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.map(ing => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit}) - £{formatPrice(ing.unit_cost)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={ingredientQuantity}
                  onChange={(e) => setIngredientQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="mt-1"
                />
              </div>

              {selectedIngredient && ingredientQuantity && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    Cost for this ingredient: £
                    {formatPrice(
                      safeNumber(ingredients.find(i => i.id === selectedIngredient)?.unit_cost) *
                      parseFloat(ingredientQuantity)
                    )}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddIngredient(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddIngredient}
                  disabled={!selectedIngredient || !ingredientQuantity}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}