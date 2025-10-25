
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ChefHat, Camera, Image as ImageIcon, Folder, Calculator, ShoppingCart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MenuManagement() {
  const queryClient = useQueryClient();
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showProfitCalculator, setShowProfitCalculator] = useState(false);
  const [calculatorItem, setCalculatorItem] = useState(null);
  const [servings, setServings] = useState(1);
  const [wastePercentage, setWastePercentage] = useState(0);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  const [itemFormData, setItemFormData] = useState({
    name: "",
    category_id: "",
    description: "",
    sell_price: "",
    image_url: "",
    recipe: [],
    prep_time_minutes: "",
    cooking_instructions: "",
    allergens: [],
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    display_order: "",
  });

  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [ingredientQty, setIngredientQty] = useState("");

  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const createMenuItemMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      resetItemForm();
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      resetItemForm();
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
      resetCategoryForm();
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      resetCategoryForm();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
    },
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      alert('✅ Draft order created successfully! Check Orders page.');
    },
  });

  const resetItemForm = () => {
    setShowItemForm(false);
    setEditingItem(null);
    setItemFormData({
      name: "",
      category_id: "",
      description: "",
      sell_price: "",
      image_url: "",
      recipe: [],
      prep_time_minutes: "",
      cooking_instructions: "",
      allergens: [],
    });
  };

  const resetCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryFormData({
      name: "",
      description: "",
      display_order: "",
    });
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      category_id: item.category_id,
      description: item.description || "",
      sell_price: item.sell_price.toString(),
      image_url: item.image_url || "",
      recipe: item.recipe || [],
      prep_time_minutes: item.prep_time_minutes?.toString() || "",
      cooking_instructions: item.cooking_instructions || "",
      allergens: item.allergens || [],
    });
    setShowItemForm(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
      display_order: category.display_order?.toString() || "",
    });
    setShowCategoryForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setItemFormData({ ...itemFormData, image_url: file_url });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    }
    setUploadingImage(false);
  };

  const handleAddIngredient = () => {
    if (!selectedIngredient || !ingredientQty) return;
    
    const ingredient = ingredients.find(i => i.id === selectedIngredient);
    if (!ingredient) return;

    const quantity = parseFloat(ingredientQty);
    const cost = (ingredient.unit_cost * quantity);

    const recipeItem = {
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.name,
      quantity: quantity,
      unit: ingredient.unit,
      cost: cost,
    };

    setItemFormData({
      ...itemFormData,
      recipe: [...itemFormData.recipe, recipeItem]
    });

    setSelectedIngredient("");
    setIngredientQty("");
  };

  const handleRemoveIngredient = (ingredientId) => {
    setItemFormData({
      ...itemFormData,
      recipe: itemFormData.recipe.filter(r => r.ingredient_id !== ingredientId)
    });
  };

  const calculateTotals = () => {
    const totalCost = itemFormData.recipe.reduce((sum, r) => sum + r.cost, 0);
    const sellPrice = parseFloat(itemFormData.sell_price) || 0;
    const profitMargin = sellPrice - totalCost;
    const foodCostPercentage = sellPrice > 0 ? (totalCost / sellPrice) * 100 : 0;

    return { totalCost, profitMargin, foodCostPercentage };
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    const { totalCost, profitMargin, foodCostPercentage } = calculateTotals();
    const category = categories.find(c => c.id === itemFormData.category_id);

    const data = {
      name: itemFormData.name,
      category_id: itemFormData.category_id,
      category_name: category?.name,
      description: itemFormData.description,
      sell_price: parseFloat(itemFormData.sell_price),
      image_url: itemFormData.image_url,
      recipe: itemFormData.recipe,
      total_cost: totalCost,
      profit_margin: profitMargin,
      food_cost_percentage: foodCostPercentage,
      prep_time_minutes: itemFormData.prep_time_minutes ? parseInt(itemFormData.prep_time_minutes) : null,
      cooking_instructions: itemFormData.cooking_instructions,
      allergens: itemFormData.allergens,
      is_active: true,
    };

    if (editingItem) {
      await updateMenuItemMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await createMenuItemMutation.mutateAsync(data);
    }
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    const data = {
      name: categoryFormData.name,
      description: categoryFormData.description,
      display_order: categoryFormData.display_order ? parseInt(categoryFormData.display_order) : categories.length + 1,
      is_active: true,
    };

    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({ id: editingCategory.id, data });
    } else {
      await createCategoryMutation.mutateAsync(data);
    }
  };

  const openProfitCalculator = (item) => {
    setCalculatorItem(item);
    setServings(1);
    setWastePercentage(0);
    setShowProfitCalculator(true);
  };

  const calculateProfitMetrics = () => {
    if (!calculatorItem) return null;

    const recipe = calculatorItem.recipe || [];
    const sellPricePerServing = parseFloat(calculatorItem.sell_price || 0);
    
    // Calculate cost per serving with waste
    const costPerServing = recipe.reduce((sum, item) => {
      const ingredientDetail = ingredients.find(ing => ing.id === item.ingredient_id);
      if (!ingredientDetail) return sum;

      const individualCost = ingredientDetail.unit_cost * item.quantity;
      return sum + individualCost;
    }, 0);

    const costPerServingWithWaste = costPerServing * (1 + wastePercentage / 100);

    // Calculate totals for multiple servings
    const totalCost = costPerServingWithWaste * servings;
    const totalRevenue = sellPricePerServing * servings;
    const profitPerServing = sellPricePerServing - costPerServingWithWaste;
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = sellPricePerServing > 0 
      ? (profitPerServing / sellPricePerServing) * 100 
      : 0;

    // Calculate ingredient quantities needed for servings
    const ingredientsNeeded = recipe.map(item => {
      const ingredientDetail = ingredients.find(ing => ing.id === item.ingredient_id);
      if (!ingredientDetail) return null;

      const quantityNeededRaw = item.quantity * servings;
      const quantityNeededWithWaste = quantityNeededRaw * (1 + wastePercentage / 100);
      const totalIngredientCost = quantityNeededWithWaste * ingredientDetail.unit_cost;

      return {
        ingredient_id: item.ingredient_id,
        ingredient_name: ingredientDetail.name,
        quantity_needed: quantityNeededWithWaste,
        unit: ingredientDetail.unit,
        unit_cost: ingredientDetail.unit_cost,
        total_cost: totalIngredientCost,
        supplier_id: ingredientDetail.supplier_id,
        supplier_name: ingredientDetail.supplier_name,
        supplier_email: ingredientDetail.supplier_email,
      };
    }).filter(Boolean);

    return {
      costPerServing: costPerServingWithWaste,
      totalCost,
      totalRevenue,
      profitPerServing,
      totalProfit,
      profitMargin,
      ingredientsNeeded,
    };
  };

  const handleOrderIngredients = async () => {
    const metrics = calculateProfitMetrics();
    if (!metrics || !calculatorItem) return;

    const { ingredientsNeeded } = metrics;

    if (ingredientsNeeded.length === 0) {
      alert('No ingredients found to order!');
      return;
    }

    // Group by supplier
    const ordersBySupplier = {};

    for (const recipeItem of ingredientsNeeded) {
      if (!recipeItem.supplier_id) {
        console.warn(`Ingredient ${recipeItem.ingredient_name} has no supplier_id assigned and will not be ordered.`);
        continue;
      }

      const supplierId = recipeItem.supplier_id;

      if (!ordersBySupplier[supplierId]) {
        ordersBySupplier[supplierId] = {
          supplier_id: recipeItem.supplier_id,
          supplier_name: recipeItem.supplier_name,
          supplier_email: recipeItem.supplier_email,
          items: [],
        };
      }

      ordersBySupplier[supplierId].items.push({
        ingredient_id: recipeItem.ingredient_id,
        ingredient_name: recipeItem.ingredient_name,
        quantity_ordered: recipeItem.quantity_needed,
        unit: recipeItem.unit,
        unit_cost: recipeItem.unit_cost,
        line_total: recipeItem.total_cost,
      });
    }

    if (Object.keys(ordersBySupplier).length === 0) {
      alert('⚠️ No suppliers assigned to ingredients found in this recipe. Please ensure all recipe ingredients are linked to inventory items, and those inventory items have an assigned supplier.');
      return;
    }

    // Create draft orders for each supplier
    try {
      for (const order of Object.values(ordersBySupplier)) {
        const subtotal = order.items.reduce((sum, item) => sum + item.line_total, 0);
        const tax = subtotal * 0.2; // Assuming 20% tax
        const total = subtotal + tax;

        await createPurchaseOrderMutation.mutateAsync({
          order_number: `PO-MENU-${Date.now()}-${order.supplier_id.substring(0, 4)}`,
          supplier_id: order.supplier_id,
          supplier_name: order.supplier_name,
          supplier_email: order.supplier_email,
          status: 'draft',
          items: order.items,
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax: parseFloat(tax.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          order_date: new Date().toISOString(),
          notes: `Order for ${calculatorItem.name} (${servings} servings) - Generated from Profit Calculator`,
        });
      }
      setShowProfitCalculator(false);
    } catch (error) {
      console.error("Failed to create purchase order(s):", error);
      alert("Failed to create purchase order(s). Please try again.");
    }
  };

  const metrics = calculatorItem ? calculateProfitMetrics() : null;

  const getProfitColor = (margin) => {
    if (margin >= 70) return 'border-green-300 text-green-700 bg-green-50';
    if (margin >= 50) return 'border-blue-300 text-blue-700 bg-blue-50';
    if (margin >= 30) return 'border-amber-300 text-amber-700 bg-amber-50';
    return 'border-red-300 text-red-700 bg-red-50';
  };

  const filteredMenuItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.category_id === selectedCategory);

  const totals = calculateTotals();

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Menu Management</h1>
            <p className="text-gray-600">Manage menu categories and items with recipes</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="border-green-600 text-green-700 hover:bg-green-50"
              onClick={() => setShowCategoryForm(true)}
            >
              <Folder className="w-4 h-4 mr-2" />
              Manage Categories
            </Button>

            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowItemForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Menu Item
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Menu Items Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingMenu ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-32 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredMenuItems.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No menu items created yet</p>
                  <Button 
                    className="mt-4 bg-green-600 hover:bg-green-700"
                    onClick={() => setShowItemForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Menu Item
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredMenuItems.map((item) => (
              <Card key={item.id} className="bg-white border-none shadow-sm hover:shadow-lg transition-shadow overflow-hidden group">
                {/* Dish Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="bg-white/90 hover:bg-white shadow-md"
                      onClick={() => handleEditItem(item)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="bg-white/90 hover:bg-white shadow-md"
                      onClick={() => {
                        if (confirm('Delete this menu item?')) {
                          deleteMenuItemMutation.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="mb-3">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      {item.category_name}
                    </Badge>
                  </div>

                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sell Price:</span>
                      <span className="text-xl font-bold text-gray-900">£{item.sell_price?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Cost:</span>
                      <span className="font-semibold text-gray-900">£{item.total_cost?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Profit:</span>
                      <span className={`font-semibold ${item.profit_margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        £{item.profit_margin?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                      <span className="text-gray-600">Food Cost %:</span>
                      <Badge variant="outline" className={item.food_cost_percentage < 35 ? 'text-green-700 border-green-300' : 'text-amber-700 border-amber-300'}>
                        {item.food_cost_percentage?.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                    {item.recipe?.length || 0} ingredients • {item.prep_time_minutes || 0} min prep
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    onClick={() => openProfitCalculator(item)}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Profit Calculator
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Add Menu Item Dialog */}
        <Dialog open={showItemForm} onOpenChange={(open) => {
          if (!open) resetItemForm();
          setShowItemForm(open);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Create Menu Item'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitItem} className="space-y-6 mt-4">
              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>Dish Photo</Label>
                <div className="flex items-center gap-4">
                  {itemFormData.image_url ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                      <img src={itemFormData.image_url} alt="Dish" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setItemFormData({ ...itemFormData, image_url: "" })}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('dish-photo-upload').click()}
                      disabled={uploadingImage}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">Recommended: 800x600px</p>
                    <input
                      id="dish-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    placeholder="e.g., Margherita Pizza"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={itemFormData.category_id}
                    onValueChange={(value) => setItemFormData({ ...itemFormData, category_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <p>No categories yet</p>
                          <Button 
                            variant="link" 
                            size="sm"
                            onClick={() => {
                              setShowItemForm(false);
                              setShowCategoryForm(true);
                            }}
                          >
                            Create Category First
                          </Button>
                        </div>
                      ) : (
                        categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sell_price">Sell Price (£)</Label>
                  <Input
                    id="sell_price"
                    type="number"
                    step="0.01"
                    value={itemFormData.sell_price}
                    onChange={(e) => setItemFormData({ ...itemFormData, sell_price: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prep_time">Prep Time (minutes)</Label>
                  <Input
                    id="prep_time"
                    type="number"
                    value={itemFormData.prep_time_minutes}
                    onChange={(e) => setItemFormData({ ...itemFormData, prep_time_minutes: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description for the menu..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Cooking Instructions</Label>
                <Textarea
                  id="instructions"
                  value={itemFormData.cooking_instructions}
                  onChange={(e) => setItemFormData({ ...itemFormData, cooking_instructions: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Recipe Builder */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Recipe / Ingredients</Label>
                  <span className="text-sm text-gray-500">{itemFormData.recipe.length} ingredients</span>
                </div>

                <Card className="bg-gray-50">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
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
                                {ing.name} ({ing.unit}) - £{ing.unit_cost?.toFixed(2)}
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
                      type="button" 
                      onClick={handleAddIngredient} 
                      className="w-full"
                      size="sm"
                      disabled={!selectedIngredient || !ingredientQty}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Ingredient
                    </Button>
                  </CardContent>
                </Card>

                {itemFormData.recipe.length > 0 && (
                  <div className="space-y-2">
                    {itemFormData.recipe.map((item, index) => (
                      <Card key={index} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.ingredient_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {item.quantity} {item.unit} × £{(item.cost / item.quantity).toFixed(2)} = £{item.cost.toFixed(2)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveIngredient(item.ingredient_id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Cost Summary */}
                {itemFormData.recipe.length > 0 && itemFormData.sell_price && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Total Cost:</span>
                        <span className="font-bold">£{totals.totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Sell Price:</span>
                        <span className="font-bold">£{parseFloat(itemFormData.sell_price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-blue-300 pt-2">
                        <span className="font-medium">Profit Margin:</span>
                        <span className={`font-bold ${totals.profitMargin > 0 ? 'text-green-700' : 'text-red-700'}`}>
                          £{totals.profitMargin.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Food Cost %:</span>
                        <span className={`font-bold ${totals.foodCostPercentage < 35 ? 'text-green-700' : 'text-amber-700'}`}>
                          {totals.foodCostPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetItemForm}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending || itemFormData.recipe.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {editingItem ? 'Update Item' : 'Create Item'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Category Management Dialog */}
        <Dialog open={showCategoryForm} onOpenChange={(open) => {
          if (!open) resetCategoryForm();
          setShowCategoryForm(open);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitCategory} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="cat_name">Category Name</Label>
                <Input
                  id="cat_name"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="e.g., Starters, Mains, Desserts"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat_desc">Description</Label>
                <Textarea
                  id="cat_desc"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat_order">Display Order</Label>
                <Input
                  id="cat_order"
                  type="number"
                  value={categoryFormData.display_order}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, display_order: e.target.value })}
                  placeholder="1, 2, 3..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetCategoryForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {editingCategory ? 'Update' : 'Create'} Category
                </Button>
              </div>
            </form>

            {categories.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Existing Categories</h4>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium text-gray-900">{cat.name}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditCategory(cat)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            if (confirm(`Delete category "${cat.name}"?`)) {
                              deleteCategoryMutation.mutate(cat.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Profit Calculator Dialog */}
        <Dialog open={showProfitCalculator} onOpenChange={setShowProfitCalculator}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                Profit Calculator: {calculatorItem?.name}
              </DialogTitle>
            </DialogHeader>

            {metrics && (
              <div className="space-y-6 mt-4">
                {/* Input Controls */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Servings</Label>
                    <Input
                      type="number"
                      min="1"
                      value={servings}
                      onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                      className="text-lg font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sale Price per Serving</Label>
                    <div className="text-2xl font-bold text-gray-900">
                      £{parseFloat(calculatorItem?.sell_price || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Waste Factor (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={wastePercentage}
                      onChange={(e) => setWastePercentage(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Profit Summary */}
                <Card className={`border-2 ${getProfitColor(metrics.profitMargin)}`}>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Cost/Serving</p>
                        <p className="text-2xl font-bold">£{metrics.costPerServing.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Profit/Serving</p>
                        <p className="text-2xl font-bold">£{metrics.profitPerServing.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Profit Margin</p>
                        <p className="text-2xl font-bold">{metrics.profitMargin.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Total Profit ({servings}x)</p>
                        <p className="text-2xl font-bold">£{metrics.totalProfit.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ingredients Breakdown */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Ingredients Needed ({servings} servings)</h4>
                  {metrics.ingredientsNeeded.length === 0 ? (
                    <Card className="bg-amber-50 border-amber-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-amber-800">⚠️ No ingredients found or no ingredients linked to suppliers.</p>
                        <p className="text-amber-700 text-sm mt-2">Ensure all recipe ingredients are linked to inventory items, and those inventory items have an assigned supplier.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {metrics.ingredientsNeeded.map((item, index) => (
                        <Card key={index} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-gray-900">{item.ingredient_name}</p>
                                <p className="text-sm text-gray-600">
                                  {item.quantity_needed.toFixed(2)} {item.unit} × £{item.unit_cost?.toFixed(2)}
                                  {wastePercentage > 0 && (
                                    <span className="text-amber-600 ml-1"> (+{wastePercentage}% waste)</span>
                                  )}
                                </p>
                                {item.supplier_name && (
                                  <p className="text-xs text-gray-500">Supplier: {item.supplier_name}</p>
                                )}
                              </div>
                              <span className="font-semibold text-gray-900">
                                £{item.total_cost.toFixed(2)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals Summary */}
                <Card className="bg-gray-50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Ingredients Cost:</span>
                      <span className="font-bold">£{metrics.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Revenue:</span>
                      <span className="font-bold text-green-700">£{metrics.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg border-t border-gray-300 pt-2">
                      <span className="font-semibold">Total Profit:</span>
                      <span className="font-bold text-indigo-700">£{metrics.totalProfit.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProfitCalculator(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleOrderIngredients}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={createPurchaseOrderMutation.isPending || metrics.ingredientsNeeded.length === 0}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {createPurchaseOrderMutation.isPending ? 'Creating Order...' : 'Order Ingredients Now'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
