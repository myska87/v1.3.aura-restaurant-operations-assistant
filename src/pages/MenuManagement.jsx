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
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ChefHat, Camera, Image as ImageIcon, Folder, Calculator, ShoppingCart, ArrowLeft, Home, Send, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns"; // Added for date formatting in email

// Safe number formatting helper
const safeNumber = (value, decimals = -1) => {
  const num = parseFloat(value);
  if (isNaN(num) || num === null || num === undefined) {
    return 0;
  }
  return decimals >= 0 ? parseFloat(num.toFixed(decimals)) : num;
};

const formatPrice = (price) => {
  return safeNumber(price, 2).toFixed(2);
};

const formatPercent = (percent) => {
  return safeNumber(percent, 1).toFixed(1);
};

export default function MenuManagement() {
  const queryClient = useQueryClient();
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showProfitCalculator, setShowProfitCalculator] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderModalData, setOrderModalData] = useState(null);
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
    allergen_tags: [],
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
      queryClient.invalidateQueries({ queryKey: ['menuItems'] }); // Invalidate menu items as their category_name might change
      resetCategoryForm();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] }); // Invalidate menu items as some might lose categories
    },
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
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
      allergen_tags: [],
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
      sell_price: safeNumber(item.sell_price).toString() || "", // Ensure it's a string for input
      image_url: item.image_url || "",
      recipe: item.recipe || [],
      prep_time_minutes: safeNumber(item.prep_time_minutes).toString() || "",
      cooking_instructions: item.cooking_instructions || "",
      allergen_tags: item.allergen_tags || [],
    });
    setShowItemForm(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
      display_order: safeNumber(category.display_order).toString() || "", // Ensure it's a string for input
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
    if (itemFormData.recipe.some(r => r.ingredient_id === ingredient.id)) {
      alert("This ingredient is already in the recipe. Please edit the existing entry.");
      return;
    }

    const cost = safeNumber(ingredient.unit_cost) * quantity;

    const recipeItem = {
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.name,
      quantity: quantity,
      unit: ingredient.unit,
      cost: safeNumber(cost), // This is the total cost for this specific quantity of ingredient for ONE serving
    };

    setItemFormData({
      ...itemFormData,
      recipe: [...itemFormData.recipe, recipeItem]
    });

    // Auto-update allergens from ingredient
    if (ingredient.allergen_tags && ingredient.allergen_tags.length > 0) {
      const newAllergens = new Set([...itemFormData.allergen_tags, ...ingredient.allergen_tags]);
      setItemFormData(prev => ({
        ...prev,
        allergen_tags: Array.from(newAllergens)
      }));
    }

    setSelectedIngredient("");
    setIngredientQty("");
  };

  const handleRemoveIngredient = (ingredientId) => {
    setItemFormData({
      ...itemFormData,
      recipe: itemFormData.recipe.filter(r => r.ingredient_id !== ingredientId)
    });

    // Recalculate allergens from remaining ingredients
    const remainingIngredientIds = itemFormData.recipe
      .filter(r => r.ingredient_id !== ingredientId)
      .map(r => r.ingredient_id);
    
    const newAllergens = new Set();
    remainingIngredientIds.forEach(id => {
      const ing = ingredients.find(i => i.id === id);
      if (ing?.allergen_tags) {
        ing.allergen_tags.forEach(a => newAllergens.add(a));
      }
    });

    setItemFormData(prev => ({
      ...prev,
      allergen_tags: Array.from(newAllergens)
    }));
  };

  const calculateTotals = () => {
    const totalCost = itemFormData.recipe.reduce((sum, r) => sum + safeNumber(r.cost), 0);
    const sellPrice = safeNumber(itemFormData.sell_price);
    const profitMargin = sellPrice - totalCost;
    const foodCostPercentage = sellPrice > 0 ? (totalCost / sellPrice) * 100 : 0;

    return { 
      totalCost: safeNumber(totalCost), 
      profitMargin: safeNumber(profitMargin), 
      foodCostPercentage: safeNumber(foodCostPercentage) 
    };
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    const { totalCost, profitMargin, foodCostPercentage } = calculateTotals();
    const category = categories.find(c => c.id === itemFormData.category_id);

    // Validate essential fields
    if (!itemFormData.name || !itemFormData.category_id || safeNumber(itemFormData.sell_price) <= 0) {
        alert("Please fill in item name, category, and a valid sell price.");
        return;
    }
    if (itemFormData.recipe.length === 0) {
        alert("Please add at least one ingredient to the recipe.");
        return;
    }

    const data = {
      name: itemFormData.name,
      category_id: itemFormData.category_id,
      category_name: category?.name || "Uncategorized", // Default if category not found for some reason
      description: itemFormData.description,
      sell_price: safeNumber(itemFormData.sell_price),
      image_url: itemFormData.image_url,
      recipe: itemFormData.recipe,
      total_cost: totalCost,
      profit_margin: profitMargin,
      food_cost_percentage: foodCostPercentage,
      prep_time_minutes: safeNumber(itemFormData.prep_time_minutes) > 0 ? safeNumber(itemFormData.prep_time_minutes) : null,
      cooking_instructions: itemFormData.cooking_instructions,
      allergen_tags: itemFormData.allergen_tags,
      is_active: true, // Assuming new items are active by default
    };

    try {
      if (editingItem) {
        await updateMenuItemMutation.mutateAsync({ id: editingItem.id, data });
      } else {
        await createMenuItemMutation.mutateAsync(data);
      }
      alert(`✅ Menu item ${editingItem ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error("Failed to save menu item:", error);
      alert(`❌ Failed to save menu item. ${error.message || ''}`);
    }
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.name) {
        alert("Category name is required.");
        return;
    }

    const data = {
      name: categoryFormData.name,
      description: categoryFormData.description,
      display_order: safeNumber(categoryFormData.display_order) > 0 ? safeNumber(categoryFormData.display_order) : (categories.length > 0 ? Math.max(...categories.map(c => safeNumber(c.display_order))) + 1 : 1),
      is_active: true, // Assuming new categories are active by default
    };

    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({ id: editingCategory.id, data });
      } else {
        await createCategoryMutation.mutateAsync(data);
      }
      alert(`✅ Category ${editingCategory ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error("Failed to save category:", error);
      alert(`❌ Failed to save category. ${error.message || ''}`);
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
    const sellPricePerServing = safeNumber(calculatorItem.sell_price);
    
    let costPerServingBeforeWaste = 0;
    const ingredientsNeededDetails = recipe.map(recipeItem => {
      let ingredientDetail = ingredients.find(ing => ing.id === recipeItem.ingredient_id);
      
      if (!ingredientDetail) {
        ingredientDetail = ingredients.find(ing => ing.name === recipeItem.ingredient_name);
        if (ingredientDetail) {
          console.warn(`Ingredient "${recipeItem.ingredient_name}" (ID: ${recipeItem.ingredient_id}) not found by ID, matched by name. Using inventory data.`);
        }
      }
      
      let effectiveUnitCost = 0;
      let individualServingCost = 0;
      let isMissingFromInventory = false;

      if (ingredientDetail) {
        effectiveUnitCost = safeNumber(ingredientDetail.unit_cost) > 0 
          ? safeNumber(ingredientDetail.unit_cost) 
          : (safeNumber(recipeItem.quantity) > 0 ? safeNumber(recipeItem.cost) / safeNumber(recipeItem.quantity) : 0); // Fallback to recipe cost if inventory unit_cost is zero/invalid
        individualServingCost = effectiveUnitCost * safeNumber(recipeItem.quantity); // Cost for this ingredient for ONE serving
        costPerServingBeforeWaste += individualServingCost;
      } else {
        isMissingFromInventory = true;
        // If ingredient is not found in inventory at all, use the cost stored in the recipe.
        // This is a fallback to ensure some cost is calculated, even if not fully up-to-date.
        individualServingCost = safeNumber(recipeItem.cost); 
        costPerServingBeforeWaste += individualServingCost;
        console.error(`Ingredient "${recipeItem.ingredient_name}" (ID: ${recipeItem.ingredient_id}) not found in inventory! Using stored recipe cost: £${formatPrice(individualServingCost)}`);
      }

      return {
        ...recipeItem, // Keep original recipe item data
        ingredientDetail: ingredientDetail, // Attach the found inventory detail
        effectiveUnitCost: effectiveUnitCost,
        individualServingCost: safeNumber(individualServingCost), // Cost for this ingredient for ONE serving
        missingFromInventory: isMissingFromInventory,
      };
    });

    const costPerServingWithWaste = safeNumber(costPerServingBeforeWaste * (1 + safeNumber(wastePercentage) / 100));

    const totalCost = safeNumber(costPerServingWithWaste * servings);
    const totalRevenue = safeNumber(sellPricePerServing * servings);
    const profitPerServing = safeNumber(sellPricePerServing - costPerServingWithWaste);
    const totalProfit = safeNumber(totalRevenue - totalCost);
    const profitMargin = sellPricePerServing > 0 
      ? safeNumber((profitPerServing / sellPricePerServing) * 100) 
      : 0;

    // Calculate ingredient quantities needed for all servings, with waste
    const ingredientsNeeded = ingredientsNeededDetails.map(itemDetail => {
      const { ingredient_id, ingredient_name, quantity, unit, cost, ingredientDetail, missingFromInventory } = itemDetail;

      const quantityNeededRaw = safeNumber(quantity) * servings;
      const quantityNeededWithWaste = safeNumber(quantityNeededRaw * (1 + safeNumber(wastePercentage) / 100));

      // Unit cost for reporting should reflect what we're basing the total cost on.
      let unitCostToReport = missingFromInventory 
        ? (safeNumber(quantity) > 0 ? safeNumber(cost) / safeNumber(quantity) : 0) 
        : safeNumber(ingredientDetail?.unit_cost);
      
      const totalIngredientCostWithWaste = safeNumber(quantityNeededWithWaste * unitCostToReport);

      return {
        ingredient_id: ingredient_id,
        ingredient_name: ingredient_name,
        quantity_needed: quantityNeededWithWaste,
        unit: unit,
        unit_cost: unitCostToReport, 
        total_cost: totalIngredientCostWithWaste,
        supplier_id: ingredientDetail?.supplier_id || null,
        supplier_name: ingredientDetail?.supplier_name || "⚠️ No Supplier", 
        supplier_email: ingredientDetail?.supplier_email || null,
        missing: missingFromInventory,
      };
    });

    return {
      costPerServing: safeNumber(costPerServingWithWaste),
      totalCost: safeNumber(totalCost),
      totalRevenue: safeNumber(totalRevenue),
      profitPerServing: safeNumber(profitPerServing),
      totalProfit: safeNumber(totalProfit),
      profitMargin: safeNumber(profitMargin),
      ingredientsNeeded,
    };
  };

  const generatePONumber = () => {
    return `PO-MENU-${Date.now().toString().slice(-8)}`;
  };

  const generateOrderEmail = (order, poNumber) => {
    const subject = `Purchase Order ${poNumber} - AURA Restaurant`;
    const body = `Dear ${order.supplier_name},

Please find our purchase order details below:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PURCHASE ORDER: ${poNumber}
📅 Date: ${format(new Date(), 'PPP')}
🏪 AURA Restaurant
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ITEMS ORDERED:
${order.items.map((item, i) => 
`${i+1}. ${item.ingredient_name}
   Quantity: ${item.quantity_ordered} ${item.unit}
   Unit Price: £${formatPrice(item.unit_cost)}
   Total: £${formatPrice(item.line_total)}`
).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal: £${formatPrice(order.subtotal)}
VAT (20%): £${formatPrice(order.tax)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: £${formatPrice(order.total)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please confirm receipt and expected delivery date.

Thank you,
AURA Restaurant Team`;

    return { subject, body };
  };

  const handleOrderNowClick = (item, metrics) => {
    setOrderModalData({ item, metrics });
    setShowOrderModal(true);
  };

  const handleSendEmailOrder = async () => {
    if (!orderModalData) return;

    const { metrics } = orderModalData;
    const { ingredientsNeeded } = metrics;

    const missingIngredients = ingredientsNeeded.filter(ing => ing.missing);
    if (missingIngredients.length > 0) {
      alert(`⚠️ Cannot create order. The following ingredient(s) are not found in your Inventory:\n\n${
        missingIngredients.map(i => `• ${i.ingredient_name}`).join('\n')
      }\n\nPlease add these ingredients to Inventory Management first.`);
      return;
    }

    const ingredientsWithoutSuppliers = ingredientsNeeded.filter(ing => !ing.supplier_id && !ing.missing);
    if (ingredientsWithoutSuppliers.length > 0) {
      const errorMessage = `⚠️ Cannot create order. The following ingredients need suppliers:\n\n${
        ingredientsWithoutSuppliers.map(item => `• ${item.ingredient_name}`).join('\n')
      }\n\nPlease go to Inventory Management and assign suppliers to these ingredients.`;
      
      alert(errorMessage);
      return;
    }

    const ordersBySupplier = {};

    for (const item of ingredientsNeeded) {
      if (item.missing || !item.supplier_id) continue; 

      if (!ordersBySupplier[item.supplier_id]) {
        ordersBySupplier[item.supplier_id] = {
          supplier_id: item.supplier_id,
          supplier_name: item.supplier_name,
          supplier_email: item.supplier_email,
          items: [],
        };
      }

      ordersBySupplier[item.supplier_id].items.push({
        ingredient_id: item.ingredient_id,
        ingredient_name: item.ingredient_name,
        quantity_ordered: safeNumber(item.quantity_needed, 2),
        unit: item.unit,
        unit_cost: safeNumber(item.unit_cost, 2),
        line_total: safeNumber(item.total_cost, 2),
      });
    }

    if (Object.keys(ordersBySupplier).length === 0) {
      alert('⚠️ No valid ingredients with suppliers to order. Please check your recipes and inventory.');
      return;
    }

    try {
      let ordersCreated = 0;
      const orderEmails = [];

      for (const order of Object.values(ordersBySupplier)) {
        const subtotal = safeNumber(order.items.reduce((sum, item) => sum + safeNumber(item.line_total), 0));
        const taxRate = 0.20; // 20% tax
        const tax = safeNumber(subtotal * taxRate);
        const total = safeNumber(subtotal + tax);
        const poNumber = generatePONumber();

        await createPurchaseOrderMutation.mutateAsync({
          order_number: poNumber,
          supplier_id: order.supplier_id,
          supplier_name: order.supplier_name,
          supplier_email: order.supplier_email,
          status: 'draft',
          items: order.items,
          subtotal: subtotal,
          tax: tax,
          total: total,
          order_date: new Date().toISOString(),
          notes: `Order for ${calculatorItem.name} (${servings} servings) - Generated from Menu Management`,
        });
        ordersCreated++;
        
        const emailData = generateOrderEmail({ ...order, subtotal, tax, total }, poNumber);
        orderEmails.push({
          supplier_email: order.supplier_email,
          supplier_name: order.supplier_name,
          poNumber,
          ...emailData,
        });
      }

      setShowOrderModal(false);
      setShowProfitCalculator(false);

      // Open first supplier email
      if (orderEmails.length > 0) {
        const firstEmail = orderEmails[0];
        const mailtoLink = `mailto:${firstEmail.supplier_email}?subject=${encodeURIComponent(firstEmail.subject)}&body=${encodeURIComponent(firstEmail.body)}`;
        window.open(mailtoLink);
      }

      alert(`✅ ${ordersCreated} draft order(s) created successfully!\n\nPO Numbers: ${orderEmails.map(e => e.poNumber).join(', ')}\n\n${orderEmails.length > 0 ? 'Email opened for the first supplier. ' : ''}Check the Ordering page for all orders.`);
      
    } catch (error) {
      console.error("Failed to create purchase order(s):", error);
      alert("❌ Failed to create purchase order(s). Please try again.");
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
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
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

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Menu Management</h1>
            <p className="text-gray-600">Manage menu categories and items with recipes</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="border-green-600 text-green-700 hover:bg-green-50"
              onClick={() => {
                resetCategoryForm(); // Clear form if opening fresh
                setShowCategoryForm(true);
              }}
            >
              <Folder className="w-4 h-4 mr-2" />
              Manage Categories
            </Button>

            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                resetItemForm(); // Clear form if opening fresh
                setShowItemForm(true);
              }}
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
                    onClick={() => {
                      resetItemForm();
                      setShowItemForm(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Menu Item
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredMenuItems.map((item) => {
              const sellPrice = safeNumber(item.sell_price);
              const totalCost = safeNumber(item.total_cost);
              const profitMargin = safeNumber(item.profit_margin);
              const foodCostPercentage = safeNumber(item.food_cost_percentage);

              return (
                <Card key={item.id} className="bg-white border-none shadow-sm hover:shadow-lg transition-shadow overflow-hidden group">
                  {/* Dish Image */}
                  <Link to={createPageUrl(`MenuItemView?id=${item.id}`)}>
                    <div className="relative h-48 bg-gray-100 overflow-hidden cursor-pointer">
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
                      <div className="absolute top-2 right-2 flex gap-1 z-10">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="bg-white/90 hover:bg-white shadow-md"
                          onClick={(e) => {
                            e.preventDefault();
                            handleEditItem(item);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="bg-white/90 hover:bg-white shadow-md"
                          onClick={(e) => {
                            e.preventDefault();
                            if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                              deleteMenuItemMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Link>

                  <CardContent className="p-4">
                    <div className="mb-3">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        {item.category_name || "Uncategorized"}
                      </Badge>
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Sell Price:</span>
                        <span className="text-xl font-bold text-gray-900">£{formatPrice(sellPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Cost:</span>
                        <span className="font-semibold text-gray-900">£{formatPrice(totalCost)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Profit:</span>
                        <span className={`font-semibold ${profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          £{formatPrice(profitMargin)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                        <span className="text-gray-600">Food Cost %:</span>
                        <Badge variant="outline" className={foodCostPercentage < 35 ? 'text-green-700 border-green-300' : 'text-amber-700 border-amber-300'}>
                          {formatPercent(foodCostPercentage)}%
                        </Badge>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                      {(item.recipe?.length || 0)} ingredients • {(item.prep_time_minutes || 0)} min prep
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
              );
            })
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
                              resetCategoryForm(); // Clear form if opening fresh
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
                                {ing.name} ({ing.unit}) - £{formatPrice(ing.unit_cost)}
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
                      disabled={!selectedIngredient || safeNumber(ingredientQty) <= 0}
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
                                {item.quantity} {item.unit} × £{formatPrice(safeNumber(item.quantity) > 0 ? (safeNumber(item.cost) / safeNumber(item.quantity)) : 0)} = £{formatPrice(item.cost)}
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
                {itemFormData.recipe.length > 0 && safeNumber(itemFormData.sell_price) > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Total Cost:</span>
                        <span className="font-bold">£{formatPrice(totals.totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Sell Price:</span>
                        <span className="font-bold">£{formatPrice(itemFormData.sell_price)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-blue-300 pt-2">
                        <span className="font-medium">Profit Margin:</span>
                        <span className={`font-bold ${totals.profitMargin > 0 ? 'text-green-700' : 'text-red-700'}`}>
                          £{formatPrice(totals.profitMargin)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Food Cost %:</span>
                        <span className={`font-bold ${totals.foodCostPercentage < 35 ? 'text-green-700' : 'text-amber-700'}`}>
                          {formatPercent(totals.foodCostPercentage)}%
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
                  disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending || itemFormData.recipe.length === 0 || safeNumber(itemFormData.sell_price) <= 0 || !itemFormData.name || !itemFormData.category_id}
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
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={!categoryFormData.name}>
                  {editingCategory ? 'Update' : 'Create'} Category
                </Button>
              </div>
            </form>

            {categories.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Existing Categories</h4>
                <div className="space-y-2">
                  {categories.sort((a, b) => safeNumber(a.display_order) - safeNumber(b.display_order)).map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium text-gray-900">{cat.name} ({safeNumber(cat.display_order) || '-'})</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditCategory(cat)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete category "${cat.name}"? This cannot be undone.`)) {
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
                      onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))} // Ensure at least 1 serving
                      className="text-lg font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sale Price per Serving</Label>
                    <div className="text-2xl font-bold text-gray-900">
                      £{formatPrice(calculatorItem?.sell_price)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Waste Factor (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100" // Waste can theoretically be up to 100%
                      value={wastePercentage}
                      onChange={(e) => setWastePercentage(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    />
                  </div>
                </div>

                {/* Profit Summary */}
                <Card className={`border-2 ${getProfitColor(metrics.profitMargin)}`}>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Cost/Serving</p>
                        <p className="text-2xl font-bold">£{formatPrice(metrics.costPerServing)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Profit/Serving</p>
                        <p className="text-2xl font-bold">£{formatPrice(metrics.profitPerServing)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Profit Margin</p>
                        <p className="text-2xl font-bold">{formatPercent(metrics.profitMargin)}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Total Profit ({servings}x)</p>
                        <p className="text-2xl font-bold">£{formatPrice(metrics.totalProfit)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ingredients Breakdown */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Ingredients Needed ({servings} servings)
                    {calculatorItem?.recipe?.length > 0 && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({calculatorItem.recipe.length} unique ingredients in recipe)
                      </span>
                    )}
                  </h4>
                  {metrics.ingredientsNeeded.length === 0 && calculatorItem?.recipe?.length === 0 ? (
                    <Card className="bg-amber-50 border-amber-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-amber-800">⚠️ No ingredients found in recipe for this item.</p>
                        <p className="text-sm text-amber-600 mt-2">
                          Please edit the menu item to add ingredients to its recipe.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {metrics.ingredientsNeeded.map((item, index) => {
                        const hasSupplier = item.supplier_id && !item.missing;
                        
                        return (
                          <Card 
                            key={index} 
                            className={`border ${
                              item.missing 
                                ? 'border-red-300 bg-red-50' 
                                : hasSupplier 
                                  ? 'border-gray-200' 
                                  : 'border-amber-200 bg-amber-50'
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{item.ingredient_name}</p>
                                    {item.missing && (
                                      <Badge className="bg-red-100 text-red-800 text-xs">
                                        Not in Inventory
                                      </Badge>
                                    )}
                                    {!hasSupplier && !item.missing && (
                                      <Badge className="bg-amber-100 text-amber-800 text-xs">
                                        No Supplier
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {formatPrice(item.quantity_needed)} {item.unit} × £{formatPrice(item.unit_cost)}
                                    {wastePercentage > 0 && (
                                      <span className="text-amber-600 ml-1"> (+{formatPercent(wastePercentage)}% waste)</span>
                                    )}
                                  </p>
                                  {!item.missing && item.supplier_name && (
                                    <p className="text-xs text-gray-500">Supplier: {item.supplier_name}</p>
                                  )}
                                  {item.missing && (
                                    <p className="text-xs text-red-600 mt-1">
                                      ⚠️ Please add this ingredient to Inventory Management.
                                    </p>
                                  )}
                                  {!hasSupplier && !item.missing && (
                                    <p className="text-xs text-amber-600 mt-1">
                                      ⚠️ Please assign a supplier in Inventory Management for ordering.
                                    </p>
                                  )}
                                </div>
                                <span className="font-semibold text-gray-900">
                                  £{formatPrice(item.total_cost)}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Totals Summary */}
                <Card className="bg-gray-50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Ingredients Cost:</span>
                      <span className="font-bold">£{formatPrice(metrics.totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Revenue:</span>
                      <span className="font-bold text-green-700">£{formatPrice(metrics.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-lg border-t border-gray-300 pt-2">
                      <span className="font-semibold">Total Profit:</span>
                      <span className="font-bold text-indigo-700">£{formatPrice(metrics.totalProfit)}</span>
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
                    onClick={() => handleOrderNowClick(calculatorItem, metrics)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    disabled={metrics.ingredientsNeeded.length === 0 || metrics.ingredientsNeeded.some(ing => ing.missing || !ing.supplier_id)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Order Ingredients Now
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Order Method Selection Modal */}
        <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Choose Order Method</DialogTitle>
              <DialogDescription>
                How would you like to order these ingredients?
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {/* Email Order Option */}
              <Card className="border-2 border-blue-300 cursor-pointer hover:shadow-xl transition-shadow group">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Mail className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Send Email Order
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Opens your email client with pre-filled order details and PO number
                  </p>
                  <Button
                    onClick={handleSendEmailOrder}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email Now
                  </Button>
                </CardContent>
              </Card>

              {/* Save as Draft Option */}
              <Card className="border-2 border-emerald-300 cursor-pointer hover:shadow-xl transition-shadow group">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Save as Draft
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Create draft purchase order in Ordering page for review later
                  </p>
                  <Button
                    onClick={async () => {
                      await handleSendEmailOrder(); // Per outline, this still triggers the email as well
                      setShowOrderModal(false);
                    }}
                    variant="outline"
                    className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                </CardContent>
              </Card>
            </div>

            {orderModalData && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-2">Order Summary:</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>• Item: {orderModalData.item.name}</p>
                  <p>• Servings: {servings}</p>
                  <p>• Total Cost: £{formatPrice(orderModalData.metrics.totalCost)}</p>
                  <p>• Ingredients: {orderModalData.metrics.ingredientsNeeded.length}</p>
                  <p>• Suppliers: {new Set(orderModalData.metrics.ingredientsNeeded.map(i => i.supplier_name)).size}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}