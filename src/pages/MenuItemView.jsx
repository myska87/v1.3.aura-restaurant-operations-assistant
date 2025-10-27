
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
  Home,
  Edit,
  ChefHat,
  DollarSign,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  ShoppingCart,
  BookOpen,
  Eye,
  FileText,
  CheckCircle, // Added
  Sparkles // Added
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns"; // Added

const safeNumber = (value, decimals = 2) => {
  const num = parseFloat(value);
  return isNaN(num) || num === null || num === undefined ? 0 : parseFloat(num.toFixed(decimals));
};

const formatPrice = (price) => safeNumber(price, 2).toFixed(2);
const formatPercent = (percent) => safeNumber(percent, 1).toFixed(1);

export default function MenuItemView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingIngredients, setEditingIngredients] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [ingredientQty, setIngredientQty] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Added

  // Get menu item ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const menuItemId = urlParams.get('id');

  const { data: menuItem, isLoading } = useQuery({
    queryKey: ['menuItem', menuItemId],
    queryFn: async () => {
      const items = await base44.entities.MenuItem.list();
      return items.find(item => item.id === menuItemId);
    },
    enabled: !!menuItemId,
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: sops = [] } = useQuery({
    queryKey: ['sops'],
    queryFn: () => base44.entities.SOPDocument.list(),
  });

  const { data: sopLinks = [] } = useQuery({
    queryKey: ['sopLinks', menuItemId],
    queryFn: async () => {
      if (!menuItemId) return [];
      return await base44.entities.SOPLinkMap.filter({
        linked_entity: 'menu_item',
        linked_id: menuItemId
      });
    },
    enabled: !!menuItemId,
  });

  const { data: user } = useQuery({ // Added
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItem', menuItemId] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      setEditingIngredients(false);
      setHasUnsavedChanges(false); // Added
    },
  });

  const createSOPLinkMutation = useMutation({
    mutationFn: (data) => base44.entities.SOPLinkMap.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sopLinks', menuItemId] });
    },
  });

  const deleteSOPLinkMutation = useMutation({
    mutationFn: (id) => base44.entities.SOPLinkMap.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sopLinks', menuItemId] });
    },
  });

  if (isLoading || !menuItem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading menu item...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddIngredient = async () => {
    const quantity = safeNumber(ingredientQty);
    if (!selectedIngredient || quantity <= 0) {
      alert("Please select an ingredient and enter a valid quantity greater than 0.");
      return;
    }
    
    const ingredient = ingredients.find(i => i.id === selectedIngredient);
    if (!ingredient) {
      alert("Selected ingredient not found in inventory.");
      return;
    }

    // Check if ingredient already exists in recipe
    const currentRecipe = menuItem.recipe || [];
    if (currentRecipe.some(r => r.ingredient_id === ingredient.id)) {
      alert("This ingredient is already in the recipe. Please edit the existing entry.");
      return;
    }

    const cost = safeNumber(ingredient.unit_cost) * quantity;

    const newRecipeItem = {
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.name,
      quantity: quantity,
      unit: ingredient.unit,
      cost: safeNumber(cost), // ingredient_cost × quantity
    };

    const updatedRecipe = [...currentRecipe, newRecipeItem];
    
    // Auto-update allergens
    const existingAllergens = menuItem.allergen_tags || [];
    const newAllergens = ingredient.allergen_tags || [];
    const combinedAllergens = [...new Set([...existingAllergens, ...newAllergens])];

    // ✅ SMART CALCULATIONS - Exact Formula
    // total_cost = sum(ingredient_cost × quantity)
    const totalCost = updatedRecipe.reduce((sum, r) => sum + safeNumber(r.cost), 0);
    
    // profit = sell_price - total_cost
    const profitMargin = safeNumber(menuItem.sell_price) - totalCost;
    
    // margin = (profit / sell_price) × 100
    const foodCostPercentage = menuItem.sell_price > 0 
      ? ((totalCost / menuItem.sell_price) * 100) 
      : 0;

    // AUTO-SAVE: Update immediately
    await updateMenuItemMutation.mutateAsync({
      id: menuItem.id,
      data: {
        recipe: updatedRecipe,
        allergen_tags: combinedAllergens,
        total_cost: safeNumber(totalCost),
        profit_margin: safeNumber(profitMargin),
        food_cost_percentage: safeNumber(foodCostPercentage),
      }
    });

    setSelectedIngredient("");
    setIngredientQty("");
  };

  const handleRemoveIngredient = async (ingredientId) => {
    const updatedRecipe = menuItem.recipe.filter(r => r.ingredient_id !== ingredientId);
    
    // Recalculate allergens from remaining ingredients
    const remainingIngredientIds = updatedRecipe.map(r => r.ingredient_id);
    const newAllergens = new Set();
    remainingIngredientIds.forEach(id => {
      const ing = ingredients.find(i => i.id === id);
      if (ing?.allergen_tags) {
        ing.allergen_tags.forEach(a => newAllergens.add(a));
      }
    });

    // ✅ SMART CALCULATIONS - Exact Formula
    const totalCost = updatedRecipe.reduce((sum, r) => sum + safeNumber(r.cost), 0);
    const profitMargin = safeNumber(menuItem.sell_price) - totalCost;
    const foodCostPercentage = menuItem.sell_price > 0 
      ? ((totalCost / menuItem.sell_price) * 100) 
      : 0;

    // AUTO-SAVE: Update immediately
    await updateMenuItemMutation.mutateAsync({
      id: menuItem.id,
      data: {
        recipe: updatedRecipe,
        allergen_tags: Array.from(newAllergens),
        total_cost: safeNumber(totalCost),
        profit_margin: safeNumber(profitMargin),
        food_cost_percentage: safeNumber(foodCostPercentage),
      }
    });
  };

  const handleLinkSOP = async (sopId) => {
    if (sopId === 'create_new') {
      // Redirect to SOP Builder with pre-filled data
      navigate(createPageUrl(`SOPBuilder?prefill=${encodeURIComponent(menuItem.name)}&type=recipe&return=${menuItemId}`));
      return;
    }

    const sop = sops.find(s => s.id === sopId);
    if (!sop) return;

    await createSOPLinkMutation.mutateAsync({
      sop_id: sopId,
      sop_title: sop.title,
      linked_entity: 'menu_item',
      linked_id: menuItem.id,
      linked_name: menuItem.name,
      link_type: 'preparation',
      created_by: user?.email, // Updated
      created_by_name: user?.full_name, // Updated
    });

    // Also update the menu item with linked_sop_id
    await updateMenuItemMutation.mutateAsync({
      id: menuItem.id,
      data: {
        linked_sop_id: sopId,
        linked_sop_title: sop.title,
      }
    });
  };

  const linkedSOPs = sopLinks
    .map(link => sops.find(s => s.id === link.sop_id))
    .filter(Boolean);

  const getProfitColor = (margin) => {
    if (margin >= 70) return 'text-green-600';
    if (margin >= 50) return 'text-blue-600';
    if (margin >= 30) return 'text-amber-600';
    return 'text-red-600';
  };

  const getFoodCostColor = (percent) => {
    if (percent <= 25) return 'bg-green-100 text-green-800 border-green-300';
    if (percent <= 35) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (percent <= 45) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

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
          <Link to={createPageUrl("MenuManagement")}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Manage Menu
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header Card */}
        <Card className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white border-none shadow-xl">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Image */}
              <div className="w-48 h-48 bg-white/20 rounded-xl overflow-hidden flex-shrink-0">
                {menuItem.image_url ? (
                  <img 
                    src={menuItem.image_url} 
                    alt={menuItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ChefHat className="w-16 h-16 text-white/50" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{menuItem.name}</h1>
                <p className="text-white/90 text-lg mb-4">{menuItem.description}</p>
                
                <div className="flex flex-wrap gap-3 mb-4">
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    {menuItem.category_name || "Uncategorized"}
                  </Badge>
                  {menuItem.allergen_tags && menuItem.allergen_tags.length > 0 && menuItem.allergen_tags.map((allergen, idx) => (
                    <Badge key={idx} className="bg-red-100 text-red-800 border-red-300">
                      {allergen}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-white/70 text-sm">Sell Price</p>
                    <p className="text-3xl font-bold">£{formatPrice(menuItem.sell_price)}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Cost</p>
                    <p className="text-2xl font-bold">£{formatPrice(menuItem.total_cost)}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Profit</p>
                    <p className={`text-2xl font-bold ${getProfitColor(menuItem.profit_margin)}`}>
                      £{formatPrice(menuItem.profit_margin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Food Cost %</p>
                    <p className="text-2xl font-bold">{formatPercent(menuItem.food_cost_percentage)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card className="bg-white border-none shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="overview" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-6 py-3"
              >
                <Eye className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="ingredients"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-6 py-3"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Ingredients ({menuItem.recipe?.length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="sop"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-6 py-3"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Preparation SOPs
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview */}
            <TabsContent value="overview" className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Pricing & Profitability
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Sell Price:</span>
                      <span className="text-2xl font-bold text-gray-900">£{formatPrice(menuItem.sell_price)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="text-xl font-semibold text-gray-900">£{formatPrice(menuItem.total_cost)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Profit per Serving:</span>
                      <span className={`text-xl font-bold ${getProfitColor(menuItem.profit_margin)}`}>
                        £{formatPrice(menuItem.profit_margin)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Food Cost %:</span>
                      <Badge className={`text-lg px-3 py-1 ${getFoodCostColor(menuItem.food_cost_percentage)}`}>
                        {formatPercent(menuItem.food_cost_percentage)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Preparation Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Prep Time:</span>
                      <span className="text-xl font-semibold text-gray-900">
                        {menuItem.prep_time_minutes || 0} minutes
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Ingredients:</span>
                      <span className="text-xl font-semibold text-gray-900">
                        {menuItem.recipe?.length || 0} items
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Linked SOPs:</span>
                      <span className="text-xl font-semibold text-gray-900">
                        {linkedSOPs.length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {menuItem.cooking_instructions && (
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Cooking Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{menuItem.cooking_instructions}</p>
                  </CardContent>
                </Card>
              )}

              {menuItem.allergen_tags && menuItem.allergen_tags.length > 0 && (
                <Card className="border-2 border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Allergen Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {menuItem.allergen_tags.map((allergen, idx) => (
                        <Badge key={idx} className="bg-red-100 text-red-800 border-red-300 text-sm px-3 py-1">
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab 2: Ingredients */}
            <TabsContent value="ingredients" className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Recipe Ingredients</h3>
                <div className="flex gap-2"> {/* Added div for badge */}
                  {updateMenuItemMutation.isPending && (
                    <Badge className="bg-blue-100 text-blue-800">
                      Auto-saving...
                    </Badge>
                  )}
                  <Button
                    onClick={() => setEditingIngredients(!editingIngredients)}
                    variant={editingIngredients ? "secondary" : "default"}
                    className={editingIngredients ? "" : "bg-emerald-600 hover:bg-emerald-700"}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {editingIngredients ? "Done Editing" : "Edit Ingredients"}
                  </Button>
                </div>
              </div>

              {editingIngredients && (
                <Card className="border-2 border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4">
                    <Label className="mb-3 block font-semibold">Add Ingredient</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ingredient" />
                          </SelectTrigger>
                          <SelectContent>
                            {ingredients.map(ing => (
                              <SelectItem key={ing.id} value={ing.id}>
                                {ing.name} ({ing.unit}) - £{formatPrice(ing.unit_cost)}/unit
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Quantity"
                        value={ingredientQty}
                        onChange={(e) => setIngredientQty(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handleAddIngredient}
                      className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700"
                      disabled={!selectedIngredient || safeNumber(ingredientQty) <= 0 || updateMenuItemMutation.isPending}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {updateMenuItemMutation.isPending ? 'Adding...' : 'Add Ingredient'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {menuItem.recipe && menuItem.recipe.length > 0 ? (
                <div className="space-y-3">
                  {menuItem.recipe.map((item, index) => {
                    const ingredient = ingredients.find(i => i.id === item.ingredient_id);
                    const unitCost = safeNumber(item.quantity) > 0 ? safeNumber(item.cost) / safeNumber(item.quantity) : 0;

                    return (
                      <Card key={index} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-bold text-gray-900 text-lg">{item.ingredient_name}</h4>
                                {ingredient?.allergen_tags && ingredient.allergen_tags.length > 0 && (
                                  <Badge className="bg-red-100 text-red-800 text-xs">
                                    Contains allergens
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">Quantity:</p>
                                  <p className="font-semibold text-gray-900">{item.quantity} {item.unit}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Unit Cost:</p>
                                  <p className="font-semibold text-gray-900">£{formatPrice(unitCost)} per {item.unit}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Total Cost:</p>
                                  <p className="font-semibold text-green-600">£{formatPrice(item.cost)}</p>
                                </div>
                                {ingredient?.supplier_name && (
                                  <div>
                                    <p className="text-gray-600">Supplier:</p>
                                    <p className="font-semibold text-gray-900">{ingredient.supplier_name}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            {editingIngredients && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm(`Remove ${item.ingredient_name} from recipe?`)) {
                                    handleRemoveIngredient(item.ingredient_id);
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                disabled={updateMenuItemMutation.isPending}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Card className="border-2 border-emerald-200 bg-emerald-50">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Total Ingredient Cost:</p>
                          <p className="text-2xl font-bold text-emerald-700">£{formatPrice(menuItem.total_cost)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Profit per Serving:</p>
                          <p className={`text-2xl font-bold ${getProfitColor(menuItem.profit_margin)}`}>
                            £{formatPrice(menuItem.profit_margin)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-2 border-gray-200">
                  <CardContent className="p-12 text-center">
                    <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No ingredients added yet</p>
                    <p className="text-sm text-gray-500">Click "Edit Ingredients" to start building the recipe</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab 3: SOP / Cooking Instruction - ENHANCED VERSION */}
            <TabsContent value="sop" className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Preparation Procedures</h3>
                  <p className="text-sm text-gray-600 mt-1">Standard Operating Procedures for preparing this dish</p>
                </div>
                <Button
                  onClick={() => navigate(createPageUrl(`SOPBuilder?prefill=${encodeURIComponent(menuItem.name)}&type=recipe&menuItem=${menuItemId}`))}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New SOP
                </Button>
              </div>

              {linkedSOPs.length > 0 ? (
                <div className="space-y-4">
                  {linkedSOPs.map((sop) => (
                    <Card key={sop.id} className="border-2 border-purple-200 overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-purple-600" />
                              {sop.title}
                            </CardTitle>
                            <p className="text-sm text-gray-600 mt-2">{sop.description}</p>
                          </div>
                          <Badge className="ml-2 bg-purple-600 text-white">
                            v{sop.version}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6 space-y-6">
                        {/* SOP Info Row */}
                        <div className="flex flex-wrap gap-3">
                          <Badge variant="outline" className="capitalize">
                            <FileText className="w-3 h-3 mr-1" />
                            {sop.category}
                          </Badge>
                          {sop.total_time_minutes && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {sop.total_time_minutes} min total
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {sop.steps?.length || 0} steps
                          </Badge>
                          {sop.last_reviewed_date && (
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Reviewed {format(new Date(sop.last_reviewed_date), 'MMM yyyy')}
                            </Badge>
                          )}
                        </div>

                        {/* Hero Image or Video */}
                        {(sop.hero_image_url || sop.video_url) && (
                          <div className="rounded-lg overflow-hidden bg-gray-100">
                            {sop.video_url ? (
                              <video
                                src={sop.video_url}
                                controls
                                className="w-full max-h-64 object-cover"
                                poster={sop.hero_image_url}
                              >
                                Your browser does not support video.
                              </video>
                            ) : (
                              <img
                                src={sop.hero_image_url}
                                alt={sop.title}
                                className="w-full max-h-64 object-cover"
                              />
                            )}
                          </div>
                        )}

                        {/* Step Preview */}
                        {sop.steps && sop.steps.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-600" />
                              Quick Preview - First 3 Steps
                            </h4>
                            <div className="space-y-3">
                              {sop.steps.slice(0, 3).map((step, idx) => (
                                <div key={idx} className="flex gap-3">
                                  <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {step.step_number}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">{step.title}</p>
                                    <p className="text-sm text-gray-600 line-clamp-2">{step.description}</p>
                                    {step.time_estimate_minutes && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        ⏱️ {step.time_estimate_minutes} minutes
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {sop.steps.length > 3 && (
                              <p className="text-sm text-gray-500 mt-3 text-center">
                                + {sop.steps.length - 3} more steps...
                              </p>
                            )}
                          </div>
                        )}

                        {/* Safety & Hygiene Notes */}
                        {(sop.safety_notes || sop.hygiene_notes) && (
                          <div className="grid md:grid-cols-2 gap-4">
                            {sop.safety_notes && (
                              <Card className="bg-amber-50 border-amber-200">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-semibold text-amber-900 mb-1">Safety Notes</p>
                                      <p className="text-sm text-amber-800">{sop.safety_notes}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                            {sop.hygiene_notes && (
                              <Card className="bg-blue-50 border-blue-200">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-2">
                                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-semibold text-blue-900 mb-1">Hygiene Notes</p>
                                      <p className="text-sm text-blue-800">{sop.hygiene_notes}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t">
                          <Link to={createPageUrl(`SOPViewer?id=${sop.id}`)} className="flex-1">
                            <Button className="w-full bg-purple-600 hover:bg-purple-700">
                              <Eye className="w-4 h-4 mr-2" />
                              View Full SOP
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const link = sopLinks.find(l => l.sop_id === sop.id);
                              if (link && confirm('Unlink this SOP from this menu item?')) {
                                deleteSOPLinkMutation.mutate(link.id);
                              }
                            }}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Unlink
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-2 border-dashed border-gray-300">
                  <CardContent className="p-12 text-center">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      No Preparation SOP Linked
                    </h4>
                    <p className="text-gray-600 mb-6">
                      Add a Standard Operating Procedure to ensure this dish is prepared consistently every time.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => navigate(createPageUrl(`SOPBuilder?prefill=${encodeURIComponent(menuItem.name)}&type=recipe&menuItem=${menuItemId}`))}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create New SOP with AI
                      </Button>
                      <span className="text-gray-500 self-center">or</span>
                      <Button variant="outline" onClick={() => setActiveTab("sop")}> {/* Keep it on this tab */}
                        <BookOpen className="w-4 h-4 mr-2" />
                        Link Existing SOP
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Link Existing SOP Section */}
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Link Existing SOP
                  </h4>
                  <div className="flex gap-3">
                    <Select onValueChange={handleLinkSOP}>
                      <SelectTrigger className="flex-1 bg-white">
                        <SelectValue placeholder="Select an SOP to link..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="create_new">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold">✨ Create New SOP with AI</span>
                          </div>
                        </SelectItem>
                        {sops
                          .filter(sop => !linkedSOPs.find(linked => linked.id === sop.id))
                          .map(sop => (
                            <SelectItem key={sop.id} value={sop.id}>
                              {sop.title} ({sop.category})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-sm text-blue-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Pro Tip:</strong> Linking SOPs helps maintain quality consistency and trains new staff faster. 
                      Each dish should have a preparation SOP for best results.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
