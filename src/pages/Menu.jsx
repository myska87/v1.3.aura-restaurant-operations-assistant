import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Camera,
  FileDown,
  ArrowLeft,
  Home,
  FileSpreadsheet,
  ShieldAlert,
  Check,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

// Allergen icons mapping
const allergenIcons = {
  milk: "🥛",
  nuts: "🥜",
  gluten: "🌾",
  soy: "🌱",
  egg: "🥚",
  fish: "🐟",
  shellfish: "🦐",
  sesame: "◉",
  celery: "🥬",
  mustard: "🌼",
  sulphites: "🍷",
  lupin: "🫘"
};

// Risk level colors
const riskColors = {
  none: "bg-green-100 text-green-800 border-green-300",
  low: "bg-blue-100 text-blue-800 border-blue-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  high: "bg-red-100 text-red-800 border-red-300"
};

export default function Menu() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    description: "",
    sell_price: "",
    image_url: "",
    is_active: true,
  });

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list('-updated_date'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list('display_order'),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: allergyRecords = [] } = useQuery({
    queryKey: ['allergyRecords'],
    queryFn: () => base44.entities.AllergyRecord.list('-last_synced'),
  });

  const createMenuItemMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuItem.create(data),
    onSuccess: async (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      await syncAllergyRecord(newItem);
      resetForm();
      alert('✅ Menu item created and allergy data synced!');
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: async (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      await syncAllergyRecord(updatedItem);
      resetForm();
      alert('✅ Menu item updated and allergy data refreshed!');
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['allergyRecords'] });
      alert('✅ Menu item deleted!');
    },
  });

  const createAllergyRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.AllergyRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allergyRecords'] });
    },
  });

  const updateAllergyRecordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AllergyRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allergyRecords'] });
    },
  });

  // Auto-detect allergens from selected ingredients
  const detectAllergens = (ingredientIds) => {
    const allergenSet = new Set();
    const sources = [];

    ingredientIds.forEach(ingredientId => {
      const ingredient = ingredients.find(ing => ing.id === ingredientId);
      if (ingredient && ingredient.allergen_tags && ingredient.allergen_tags.length > 0) {
        const ingAllergens = ingredient.allergen_tags;
        ingAllergens.forEach(allergen => allergenSet.add(allergen));
        
        sources.push({
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          allergens: ingAllergens
        });
      }
    });

    return {
      allergens: Array.from(allergenSet),
      sources: sources
    };
  };

  // Calculate risk level
  const calculateRiskLevel = (allergens) => {
    if (allergens.length === 0) return "none";
    
    const highRiskAllergens = ['nuts', 'shellfish', 'fish', 'egg'];
    const hasHighRisk = allergens.some(a => highRiskAllergens.includes(a));
    
    if (hasHighRisk) return "high";
    if (allergens.length >= 3) return "medium";
    if (allergens.length > 0) return "low";
    return "none";
  };

  // Sync allergy record when menu item changes
  const syncAllergyRecord = async (menuItem) => {
    try {
      const recipe = menuItem.recipe || [];
      const ingredientIds = recipe.map(r => r.ingredient_id);
      const { allergens, sources } = detectAllergens(ingredientIds);
      const riskLevel = calculateRiskLevel(allergens);

      // Check if allergy record exists
      const existingRecords = allergyRecords.filter(r => r.menu_item_id === menuItem.id);
      
      const allergyData = {
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name,
        category: menuItem.category_name || "Uncategorized",
        allergens_detected: allergens,
        ingredient_sources: sources,
        auto_generated: true,
        risk_level: riskLevel,
        last_synced: new Date().toISOString(),
      };

      if (existingRecords.length > 0) {
        await updateAllergyRecordMutation.mutateAsync({
          id: existingRecords[0].id,
          data: allergyData
        });
      } else {
        await createAllergyRecordMutation.mutateAsync(allergyData);
      }
    } catch (error) {
      console.error('Error syncing allergy record:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
    } catch (error) {
      alert('Failed to upload image');
    }
    setUploadingImage(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category_id: item.category_id,
      description: item.description || "",
      sell_price: item.sell_price?.toString() || "",
      image_url: item.image_url || "",
      is_active: item.is_active !== false,
    });
    setSelectedIngredients((item.recipe || []).map(r => r.ingredient_id));
    setShowItemDialog(true);
  };

  const resetForm = () => {
    setShowItemDialog(false);
    setEditingItem(null);
    setSelectedIngredients([]);
    setFormData({
      name: "",
      category_id: "",
      description: "",
      sell_price: "",
      image_url: "",
      is_active: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.category_id || !formData.sell_price) {
      alert('Please fill in all required fields');
      return;
    }

    const category = categories.find(c => c.id === formData.category_id);
    
    // Build recipe from selected ingredients
    const recipe = selectedIngredients.map(ingId => {
      const ing = ingredients.find(i => i.id === ingId);
      return {
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        quantity: 1,
        unit: ing.unit,
        cost: ing.unit_cost || 0,
      };
    });

    const totalCost = recipe.reduce((sum, r) => sum + r.cost, 0);
    const sellPrice = parseFloat(formData.sell_price);
    const profitMargin = sellPrice - totalCost;
    const foodCostPercentage = sellPrice > 0 ? (totalCost / sellPrice) * 100 : 0;

    const data = {
      name: formData.name,
      category_id: formData.category_id,
      category_name: category?.name || "Uncategorized",
      description: formData.description,
      sell_price: sellPrice,
      image_url: formData.image_url,
      recipe: recipe,
      total_cost: totalCost,
      profit_margin: profitMargin,
      food_cost_percentage: foodCostPercentage,
      is_active: formData.is_active,
    };

    if (editingItem) {
      await updateMenuItemMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await createMenuItemMutation.mutateAsync(data);
    }
  };

  const handleIngredientToggle = (ingredientId) => {
    if (selectedIngredients.includes(ingredientId)) {
      setSelectedIngredients(selectedIngredients.filter(id => id !== ingredientId));
    } else {
      setSelectedIngredients([...selectedIngredients, ingredientId]);
    }
  };

  // Get detected allergens for preview
  const detectedAllergens = detectAllergens(selectedIngredients).allergens;
  const currentRiskLevel = calculateRiskLevel(detectedAllergens);

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.category_id === filterCategory;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && item.is_active !== false) ||
      (filterStatus === "inactive" && item.is_active === false);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Group by category
  const groupedItems = categories.map(category => ({
    category,
    items: filteredItems.filter(item => item.category_id === category.id)
  })).filter(group => group.items.length > 0);

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🍽️ Menu Management</h1>
            <p className="text-gray-600">Manage menu items with automatic allergy tracking</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("Inventory")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Inventory Hub
              </Button>
            </Link>
            <Link to={createPageUrl("AllergyTable")}>
              <Button variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100">
                <ShieldAlert className="w-4 h-4 mr-2" />
                Allergy Table
              </Button>
            </Link>
            <Button onClick={() => setShowItemDialog(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Menu Item
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white border-none shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items - Grouped by Category */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading menu...</p>
          </div>
        ) : groupedItems.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No menu items found</p>
              <Button onClick={() => setShowItemDialog(true)} className="mt-4">
                Create Your First Menu Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groupedItems.map(({ category, items }) => (
              <div key={category.id}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  {category.name}
                  <Badge variant="outline" className="ml-2">{items.length} items</Badge>
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map(item => {
                    const allergyRecord = allergyRecords.find(r => r.menu_item_id === item.id);
                    const itemAllergens = allergyRecord?.allergens_detected || [];
                    const riskLevel = allergyRecord?.risk_level || "none";

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className={`bg-white border-2 ${item.is_active === false ? 'opacity-60' : ''} hover:shadow-lg transition-all overflow-hidden`}>
                          {/* Image */}
                          <div className="relative h-48 bg-gray-100">
                            {item.image_url ? (
                              <img 
                                src={item.image_url} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Camera className="w-16 h-16 text-gray-300" />
                              </div>
                            )}
                            {!item.is_active && (
                              <div className="absolute top-2 right-2">
                                <Badge variant="secondary" className="bg-gray-500 text-white">
                                  Inactive
                                </Badge>
                              </div>
                            )}
                            {riskLevel !== "none" && (
                              <div className="absolute top-2 left-2">
                                <Badge className={riskColors[riskLevel]}>
                                  {riskLevel.toUpperCase()} RISK
                                </Badge>
                              </div>
                            )}
                          </div>

                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                              <span className="text-xl font-bold text-green-600">£{(item.sell_price || 0).toFixed(2)}</span>
                            </div>

                            {item.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                            )}

                            {/* Allergens */}
                            {itemAllergens.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Contains:</p>
                                <div className="flex flex-wrap gap-1">
                                  {itemAllergens.map(allergen => (
                                    <Badge key={allergen} variant="outline" className="text-xs">
                                      {allergenIcons[allergen]} {allergen}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Ingredients Count */}
                            <div className="text-xs text-gray-500 mb-3">
                              {(item.recipe?.length || 0)} ingredients • 
                              Food Cost: {(item.food_cost_percentage || 0).toFixed(1)}%
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(item)}
                                className="flex-1"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Delete "${item.name}"?`)) {
                                    deleteMenuItemMutation.mutate(item.id);
                                  }
                                }}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Item Photo</Label>
                <div className="flex items-center gap-4">
                  {formData.image_url ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                      <img src={formData.image_url} alt="Item" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: "" })}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('item-photo-upload').click()}
                    disabled={uploadingImage}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                  </Button>
                  <input
                    id="item-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Masala Chai"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (£) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.sell_price}
                    onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2 flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="active">Active on Menu</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description for the menu..."
                />
              </div>

              {/* Ingredient Selection */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Ingredients & Allergens</Label>
                <Alert className={detectedAllergens.length > 0 ? "bg-amber-50 border-amber-300" : "bg-blue-50 border-blue-300"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {detectedAllergens.length > 0 ? (
                      <div>
                        <p className="font-semibold">⚠️ Contains: {detectedAllergens.map(a => allergenIcons[a] + ' ' + a).join(', ')}</p>
                        <p className="text-xs mt-1">Risk Level: <Badge className={riskColors[currentRiskLevel]}>{currentRiskLevel.toUpperCase()}</Badge></p>
                      </div>
                    ) : (
                      "Select ingredients to auto-detect allergens"
                    )}
                  </AlertDescription>
                </Alert>

                <ScrollArea className="h-64 border rounded-lg p-4">
                  <div className="space-y-2">
                    {ingredients.map(ing => (
                      <div key={ing.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={selectedIngredients.includes(ing.id)}
                          onChange={() => handleIngredientToggle(ing.id)}
                          className="w-4 h-4"
                        />
                        <span className="flex-1">{ing.name}</span>
                        {ing.allergen_tags && ing.allergen_tags.length > 0 && (
                          <div className="flex gap-1">
                            {ing.allergen_tags.map(tag => (
                              <span key={tag} className="text-xs">
                                {allergenIcons[tag]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {editingItem ? 'Update Item' : 'Create Item'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}