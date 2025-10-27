
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
  CheckCircle,
  Sparkles,
  Calculator, // Added
  User, // Added
  Shield, // Added
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

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
  const [editingIngredients, setEditingIngredients] = useState(false); // This state is no longer strictly used for a toggle button, but might be useful for other UI states
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [ingredientQty, setIngredientQty] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get menu item ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const menuItemId = urlParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // 🔒 LAZY LOADING - Only fetch when needed
  const { data: menuItem, isLoading } = useQuery({
    queryKey: ['menuItem', menuItemId],
    queryFn: async () => {
      const items = await base44.entities.MenuItem.list();
      const item = items.find(item => item.id === menuItemId);
      
      // 💾 Cache in localStorage for faster loading
      if (item) {
        localStorage.setItem(`menuItem_${menuItemId}`, JSON.stringify(item));
      }
      
      return item;
    },
    enabled: !!menuItemId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    placeholderData: () => {
      // Use cached data while loading
      const cached = localStorage.getItem(`menuItem_${menuItemId}`);
      return cached ? JSON.parse(cached) : undefined;
    },
  });

  // Lazy load ingredients only when Ingredients tab is active
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
    enabled: activeTab === 'ingredients',
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Lazy load SOPs only when SOP tab is active
  const { data: sops = [] } = useQuery({
    queryKey: ['sops'],
    queryFn: () => base44.entities.SOPDocument.list(),
    enabled: activeTab === 'sop',
    staleTime: 10 * 60 * 1000,
  });

  const { data: sopLinks = [] } = useQuery({
    queryKey: ['menuSOPLinks', menuItemId],
    queryFn: async () => {
      if (!menuItemId) return [];
      return await base44.entities.MenuSOPLink.filter({
        menu_item_id: menuItemId,
        is_active: true
      });
    },
    enabled: !!menuItemId && activeTab === 'sop',
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItem', menuItemId] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      setEditingIngredients(false);
      setHasUnsavedChanges(false);
    },
  });

  const createSOPLinkMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuSOPLink.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuSOPLinks', menuItemId] });
    },
  });

  const deleteSOPLinkMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuSOPLink.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuSOPLinks', menuItemId] });
    },
  });

  // 📝 AUDIT TRAIL LOGGER
  const logAudit = async (action, details) => {
    try {
      await base44.entities.ComplianceAudit.create({
        module_name: 'menu',
        action: action,
        action_description: details,
        user_id: user?.id,
        user_email: user?.email,
        user_name: user?.full_name,
        target_entity: 'MenuItem',
        target_record_id: menuItemId,
        severity: 'info',
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  };

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

    // 📝 Log audit trail
    await logAudit('update', `Added ingredient "${ingredient.name}" (${quantity} ${ingredient.unit}) to "${menuItem.name}"`);

    setSelectedIngredient("");
    setIngredientQty("");
  };

  const handleRemoveIngredient = async (ingredientId) => {
    const ingredient = menuItem.recipe.find(r => r.ingredient_id === ingredientId);
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

    // 📝 Log audit trail
    await logAudit('update', `Removed ingredient "${ingredient?.ingredient_name}" from "${menuItem.name}"`);
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
      menu_item_id: menuItem.id,
      menu_item_name: menuItem.name,
      sop_id: sopId,
      sop_title: sop.title,
      sop_version: sop.version,
      linked_by: user?.email,
      linked_by_name: user?.full_name,
      linked_at: new Date().toISOString(),
      auto_update: true,
      link_type: 'preparation',
    });

    // 📝 Log audit trail
    await logAudit('create', `Linked SOP "${sop.title}" v${sop.version} to menu item "${menuItem.name}"`);
  };

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

  // Get responsible role from linked SOP
  const responsibleRole = linkedSOPs[0]?.role_assigned?.[0] || menuItem.category_name;

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

        {/* Header with Smart Link Tree */}
        <Card className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white border-none shadow-xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold mb-2">{menuItem.name}</CardTitle>
                <p className="text-white/90 text-lg mb-4">{menuItem.description}</p>
                
                {/* 🌳 Smart Link Tree */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 font-mono text-sm">
                  <div className="space-y-1 text-white/95">
                    <div className="font-bold">{menuItem.name}</div>
                    {linkedSOPs.length > 0 && (
                      <div className="pl-4">
                        ├── 📚 SOP: {linkedSOPs[0].title} v{linkedSOPs[0].version}
                      </div>
                    )}
                    {menuItem.recipe && menuItem.recipe.length > 0 && (
                      <div className="pl-4">
                        ├── 🧂 Ingredients: {menuItem.recipe.slice(0, 4).map(r => r.ingredient_name).join(', ')}
                        {menuItem.recipe.length > 4 && ` (+${menuItem.recipe.length - 4} more)`}
                      </div>
                    )}
                    <div className="pl-4">
                      └── 👤 Linked Role: {responsibleRole || 'Staff'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 🔒 Manager-Only Edit Button */}
              {isManager && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => navigate(createPageUrl(`MenuManagement`))}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Menu
                </Button>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge className="bg-white/20 text-white border-white/30">
                £{formatPrice(menuItem.sell_price)}
              </Badge>
              {menuItem.prep_time_minutes && (
                <Badge className="bg-white/20 text-white border-white/30">
                  <Clock className="w-3 h-3 mr-1" />
                  {menuItem.prep_time_minutes} min
                </Badge>
              )}
              {menuItem.food_cost_percentage && (
                <Badge className="bg-white/20 text-white border-white/30">
                  {formatPercent(menuItem.food_cost_percentage)}% food cost
                </Badge>
              )}
              {menuItem.category_name && (
                <Badge className="bg-white/20 text-white border-white/30">
                  {menuItem.category_name}
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* 3-Tab System with Icons */}
        <Card className="bg-white shadow-lg">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  🧾 Overview
                </TabsTrigger>
                <TabsTrigger value="ingredients" className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  🧂 Ingredients
                </TabsTrigger>
                <TabsTrigger value="sop" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  🍳 SOP
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Overview */}
              <TabsContent value="overview" className="space-y-6">
                {/* Image */}
                {menuItem.image_url && (
                  <div className="rounded-xl overflow-hidden shadow-lg">
                    <img 
                      src={menuItem.image_url} 
                      alt={menuItem.name}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        Pricing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sell Price:</span>
                        <span className="text-xl font-bold text-green-600">£{formatPrice(menuItem.sell_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Cost:</span>
                        <span className="font-semibold">£{formatPrice(menuItem.total_cost)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600">Profit:</span>
                        <span className={`font-bold ${menuItem.profit_margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          £{formatPrice(menuItem.profit_margin)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        Preparation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prep Time:</span>
                        <span className="font-semibold">{menuItem.prep_time_minutes || 0} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Food Cost %:</span>
                        <Badge className={menuItem.food_cost_percentage < 35 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                          {formatPercent(menuItem.food_cost_percentage)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <Badge variant="outline">{menuItem.category_name}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Allergens */}
                {menuItem.allergen_tags && menuItem.allergen_tags.length > 0 && (
                  <Card className="border-2 border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-red-800">
                        <AlertTriangle className="w-5 h-5" />
                        Allergen Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {menuItem.allergen_tags.map((allergen, idx) => (
                          <Badge key={idx} variant="outline" className="text-red-700 border-red-300 bg-white">
                            {allergen}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 2: Ingredients */}
              <TabsContent value="ingredients" className="space-y-6">
                {/* 🔒 PERMISSION CHECK: Only managers can edit */}
                {isManager && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Plus className="w-5 h-5 text-blue-600" />
                          Add Ingredient
                        </CardTitle>
                        <Badge className="bg-blue-100 text-blue-800">
                          <Shield className="w-3 h-3 mr-1" />
                          Manager Only
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <Select
                            value={selectedIngredient}
                            onValueChange={setSelectedIngredient}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select ingredient" />
                            </SelectTrigger>
                            <SelectContent>
                              {ingredients.map(ing => (
                                <SelectItem key={ing.id} value={ing.id}>
                                  {ing.name} ({ing.unit}) - £{formatPrice(ing.unit_cost)}
                                  {ing.allergen_tags && ing.allergen_tags.length > 0 && (
                                    <span className="text-red-600 ml-2">⚠️</span>
                                  )}
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
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                        disabled={!selectedIngredient || !ingredientQty || updateMenuItemMutation.isPending}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Recipe
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Ingredients List */}
                {menuItem.recipe && menuItem.recipe.length > 0 ? (
                  <div className="space-y-3">
                    {menuItem.recipe.map((item, idx) => {
                      const ingredient = ingredients.find(ing => ing.id === item.ingredient_id);
                      
                      return (
                        <Card key={idx} className="border border-gray-200 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900">{item.ingredient_name}</h4>
                                  {ingredient?.allergen_tags && ingredient.allergen_tags.length > 0 && (
                                    <Badge variant="outline" className="text-red-600 border-red-300 text-xs">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Allergen
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                  <span>{item.quantity} {item.unit}</span>
                                  <span>×</span>
                                  <span>£{formatPrice(item.quantity > 0 ? item.cost / item.quantity : 0)} per {item.unit}</span>
                                  <span>=</span>
                                  <span className="font-semibold text-gray-900">£{formatPrice(item.cost)}</span>
                                </div>
                                {ingredient?.supplier_name && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Supplier: {ingredient.supplier_name}
                                  </p>
                                )}
                              </div>
                              {/* 🔒 Only managers can remove */}
                              {isManager && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm(`Remove ${item.ingredient_name} from recipe?`)) {
                                      handleRemoveIngredient(item.ingredient_id);
                                    }
                                  }}
                                  disabled={updateMenuItemMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="bg-gray-50">
                    <CardContent className="p-12 text-center">
                      <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">No ingredients added yet</p>
                      {isManager ? (
                        <p className="text-sm text-gray-500">Add ingredients above to build the recipe</p>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">
                          <Shield className="w-3 h-3 mr-1" />
                          Manager access required to modify ingredients
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Cost Summary */}
                {menuItem.recipe && menuItem.recipe.length > 0 && (
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                        <Calculator className="w-5 h-5" />
                        Cost Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Total Ingredient Cost:</span>
                        <span className="font-bold text-green-700">£{formatPrice(menuItem.total_cost)}</span>
                      </div>
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Sell Price:</span>
                        <span className="font-bold">£{formatPrice(menuItem.sell_price)}</span>
                      </div>
                      <div className="flex justify-between text-xl border-t border-green-300 pt-3">
                        <span className="font-bold">Profit per Item:</span>
                        <span className={`font-bold ${menuItem.profit_margin > 0 ? 'text-green-700' : 'text-red-700'}`}>
                          £{formatPrice(menuItem.profit_margin)} ({formatPercent((menuItem.profit_margin / menuItem.sell_price) * 100)}%)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 3: SOP / Cooking Instructions */}
              <TabsContent value="sop" className="space-y-6">
                {linkedSOPs.length > 0 ? (
                  <div className="space-y-4">
                    {linkedSOPs.map(sop => {
                      const link = sopLinks.find(l => l.sop_id === sop.id);
                      
                      return (
                        <Card key={sop.id} className="border-2 border-purple-200 bg-purple-50">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-xl text-purple-900 flex items-center gap-2">
                                  <BookOpen className="w-5 h-5" />
                                  {sop.title}
                                </CardTitle>
                                <div className="flex gap-2 mt-2">
                                  <Badge className="bg-purple-100 text-purple-800">
                                    Version {sop.version}
                                  </Badge>
                                  <Badge variant="outline">
                                    {sop.steps?.length || 0} steps
                                  </Badge>
                                  {sop.total_time_minutes && (
                                    <Badge variant="outline">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {sop.total_time_minutes} min
                                    </Badge>
                                  )}
                                </div>
                                {link?.linked_at && (
                                  <p className="text-xs text-purple-600 mt-2">
                                    Linked by {link.linked_by_name} on {format(new Date(link.linked_at), 'PPP')}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(createPageUrl(`SOPViewer?id=${sop.id}`))}
                                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Full SOP
                                </Button>
                                {/* 🔒 Only managers can unlink */}
                                {isManager && link && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={async () => {
                                      if (confirm('Unlink this SOP?')) {
                                        await deleteSOPLinkMutation.mutateAsync(link.id);
                                        await logAudit('delete', `Unlinked SOP "${sop.title}" from "${menuItem.name}"`);
                                      }
                                    }}
                                    disabled={deleteSOPLinkMutation.isPending}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 pt-4"> {/* Adjusted padding */}
                            {/* SOP Preview */}
                            {sop.description && (
                              <p className="text-gray-700 mb-4">{sop.description}</p>
                            )}
                            
                            {/* First 3 Steps Preview */}
                            {sop.steps && sop.steps.length > 0 && (
                              <div className="bg-white rounded-lg p-4 space-y-3 border border-gray-100 shadow-sm">
                                <h4 className="font-semibold text-gray-900 mb-3">Preview: First Steps</h4>
                                {sop.steps.slice(0, 3).map((step, idx) => (
                                  <div key={idx} className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                                      {step.step_number}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">{step.title}</p>
                                      {step.description && (
                                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {sop.steps.length > 3 && (
                                  <p className="text-sm text-gray-500 italic mt-4">
                                    ...and {sop.steps.length - 3} more steps
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Video Preview */}
                            {sop.video_url && (
                              <div className="mt-4">
                                <video 
                                  src={sop.video_url} 
                                  controls 
                                  className="w-full rounded-lg shadow-lg"
                                  style={{ maxHeight: '300px' }}
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="bg-gray-50">
                    <CardContent className="p-12 text-center">
                      <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No SOP linked yet</p>
                      
                      {/* 🔒 Only managers can link SOPs */}
                      {isManager ? (
                        <>
                          <p className="text-sm text-gray-500 mb-4">
                            Link a cooking instruction guide to maintain quality
                          </p>
                          <div className="flex flex-col gap-3 max-w-md mx-auto">
                            <Select onValueChange={handleLinkSOP}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select existing SOP" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="create_new">
                                  <Plus className="w-4 h-4 mr-2 inline" />
                                  Create New SOP
                                </SelectItem>
                                {sops
                                  .filter(s => s.category === 'recipe' || s.category === 'kitchen')
                                  .map(sop => (
                                    <SelectItem key={sop.id} value={sop.id}>
                                      {sop.title} (v{sop.version})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              onClick={() => navigate(createPageUrl(`SOPBuilder?prefill=${encodeURIComponent(menuItem.name)}&type=recipe`))}
                              className="border-purple-300 text-purple-700 hover:bg-purple-50"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create New SOP for "{menuItem.name}"
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">
                          <Shield className="w-3 h-3 mr-1" />
                          Manager access required to link SOPs
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
