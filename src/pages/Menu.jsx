
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
  X,
  Utensils,
  Wheat,
  Info,
  Link as LinkIcon,
  Bell,
  FileText,
  Eye,
  Package,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

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

// Risk level colors (using emerald theme)
const riskColors = {
  none: "bg-emerald-100 text-emerald-800 border-emerald-300",
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
  const [showIngredientInfo, setShowIngredientInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    description: "",
    sell_price: "",
    image_url: "",
    is_active: true,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

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

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  // Audit Trail Mutation
  const logAuditTrail = async (action, itemName, details) => {
    try {
      await base44.integrations.Core.SendEmail({
        to: user?.email,
        subject: `🔔 Menu ${action}: ${itemName}`,
        body: `
Menu Management Audit Log
━━━━━━━━━━━━━━━━━━━━━━━
Action: ${action}
Item: ${itemName}
User: ${user?.full_name} (${user?.email})
Timestamp: ${format(new Date(), 'PPpp')}

Details:
${details}

━━━━━━━━━━━━━━━━━━━━━━━
AURA One Pro - Menu Management System
        `.trim()
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  };

  // Calculate allergens from selected ingredients
  const calculateAllergens = () => {
    const allergens = new Set();
    const ingredientSources = [];

    selectedIngredients.forEach(ingredientId => {
      const ingredient = ingredients.find(i => i.id === ingredientId);
      if (ingredient && ingredient.allergen_tags) {
        ingredient.allergen_tags.forEach(allergen => allergens.add(allergen));
        ingredientSources.push({
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          allergens: ingredient.allergen_tags,
        });
      }
    });

    return { allergens: Array.from(allergens), ingredientSources };
  };

  // Calculate risk level
  const calculateRiskLevel = (allergens) => {
    if (allergens.length === 0) return 'none';
    
    const highRiskAllergens = ['nuts', 'shellfish', 'fish'];
    const hasHighRisk = allergens.some(a => highRiskAllergens.includes(a));
    
    if (hasHighRisk) return 'high';
    if (allergens.length >= 3) return 'medium';
    return 'low';
  };

  // Sync allergy record
  const syncAllergyRecord = async (menuItem) => {
    const { allergens, ingredientSources } = calculateAllergens();
    const riskLevel = calculateRiskLevel(allergens);

    const existingRecord = allergyRecords.find(r => r.menu_item_id === menuItem.id);

    const recordData = {
      menu_item_id: menuItem.id,
      menu_item_name: menuItem.name,
      category: categories.find(c => c.id === menuItem.category_id)?.name || 'Uncategorized',
      allergens_detected: allergens,
      ingredient_sources: ingredientSources,
      auto_generated: true,
      risk_level: riskLevel,
      last_synced: new Date().toISOString(),
    };

    try {
      if (existingRecord) {
        await base44.entities.AllergyRecord.update(existingRecord.id, recordData);
      } else {
        await base44.entities.AllergyRecord.create(recordData);
      }

      // Notify managers of allergen changes
      if (isManager && allergens.length > 0) {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `⚠️ Allergy Data Updated: ${menuItem.name}`,
          body: `
Allergen information has been updated:

Menu Item: ${menuItem.name}
Category: ${recordData.category}
Risk Level: ${riskLevel.toUpperCase()}
Allergens Detected: ${allergens.map(a => `${allergenIcons[a]} ${a}`).join(', ') || 'None'}

Updated: ${format(new Date(), 'PPpp')}

Review the allergy table for full details.

AURA One Pro - Menu Management
          `.trim()
        });
      }

      queryClient.invalidateQueries({ queryKey: ['allergyRecords'] });
    } catch (error) {
      console.error('Allergy sync error:', error);
    }
  };

  const createMenuItemMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuItem.create(data),
    onSuccess: async (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      await syncAllergyRecord(newItem);
      await logAuditTrail('Created', newItem.name, `New menu item added with ${selectedIngredients.length} ingredients`);
      resetForm();
      alert('✅ Menu item created and allergy data synced!');
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: async (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      await syncAllergyRecord(updatedItem);
      await logAuditTrail('Updated', updatedItem.name, `Menu item modified`);
      resetForm();
      alert('✅ Menu item updated and allergy data synced!');
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id) => {
      const item = menuItems.find(i => i.id === id);
      await base44.entities.MenuItem.delete(id);
      
      // Delete associated allergy record
      const allergyRecord = allergyRecords.find(r => r.menu_item_id === id);
      if (allergyRecord) {
        await base44.entities.AllergyRecord.delete(allergyRecord.id);
      }
      
      return item;
    },
    onSuccess: (deletedItem) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', 'allergyRecords'] });
      logAuditTrail('Deleted', deletedItem.name, `Menu item removed from system`);
      alert('✅ Menu item and allergy data deleted!');
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image');
    }
    setUploadingImage(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isManager) {
      alert('⚠️ Only managers can create/edit menu items');
      return;
    }

    if (!formData.name || !formData.category_id || !formData.sell_price) {
      alert('Please fill in all required fields');
      return;
    }

    const { allergens } = calculateAllergens();
    const category = categories.find(c => c.id === formData.category_id);

    const menuItemData = {
      name: formData.name,
      category_id: formData.category_id,
      category_name: category?.name || 'Uncategorized',
      description: formData.description,
      sell_price: parseFloat(formData.sell_price),
      image_url: formData.image_url,
      recipe: selectedIngredients.map(ingredientId => {
        const ingredient = ingredients.find(i => i.id === ingredientId);
        return {
          ingredient_id: ingredientId,
          ingredient_name: ingredient?.name || 'Unknown',
          quantity: 1, // Default quantity
          unit: ingredient?.unit || '',
          cost: ingredient?.unit_cost || 0,
        };
      }),
      allergens: allergens,
      is_active: formData.is_active,
      total_cost: selectedIngredients.reduce((sum, ingredientId) => {
        const ingredient = ingredients.find(i => i.id === ingredientId);
        return sum + (ingredient?.unit_cost || 0);
      }, 0),
    };

    if (editingItem) {
      updateMenuItemMutation.mutate({ id: editingItem.id, data: menuItemData });
    } else {
      createMenuItemMutation.mutate(menuItemData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category_id: item.category_id,
      description: item.description || '',
      sell_price: item.sell_price?.toString() || '',
      image_url: item.image_url || '',
      is_active: item.is_active !== false,
    });
    setSelectedIngredients(item.recipe?.map(r => r.ingredient_id) || []);
    setShowItemDialog(true);
  };

  const resetForm = () => {
    setShowItemDialog(false);
    setEditingItem(null);
    setFormData({
      name: "",
      category_id: "",
      description: "",
      sell_price: "",
      image_url: "",
      is_active: true,
    });
    setSelectedIngredients([]);
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' ? item.is_active !== false : item.is_active === false);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Group by category
  const groupedItems = categories.map(category => ({
    category,
    items: filteredItems.filter(item => item.category_id === category.id)
  })).filter(group => group.items.length > 0);

  const { allergens: currentAllergens } = calculateAllergens();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl">
                <Utensils className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Poppins, Inter, sans-serif' }}>
                  Menu Management 🍽️
                </h1>
                <p className="text-gray-600 text-lg">Manage menu items with automatic allergy tracking</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("Inventory")}>
              <Button variant="outline" size="sm" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Inventory Hub
              </Button>
            </Link>
            <Link to={createPageUrl("AllergyTable")}>
              <Button variant="outline" size="sm" className="border-amber-600 text-amber-700 hover:bg-amber-50">
                <ShieldAlert className="w-4 h-4 mr-2" />
                Allergy Table
              </Button>
            </Link>
            {isManager && (
              <Button 
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg"
                onClick={() => {
                  resetForm();
                  setShowItemDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Menu Item
              </Button>
            )}
          </div>
        </div>

        {/* Integrations Info Banner */}
        <Alert className="mb-6 border-emerald-200 bg-emerald-50">
          <Info className="w-4 h-4 text-emerald-600" />
          <AlertDescription className="text-emerald-900">
            <strong>Connected Systems:</strong> Menu items automatically sync with Inventory, Suppliers, and Allergy Records. Changes are logged and managers are notified.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        <Card className="bg-white border-none shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-52 border-gray-300">
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
                <SelectTrigger className="w-52 border-gray-300">
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

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Total Items</p>
                  <p className="text-3xl font-bold mt-1">{menuItems.length}</p>
                </div>
                <Utensils className="w-12 h-12 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Categories</p>
                  <p className="text-3xl font-bold mt-1">{categories.length}</p>
                </div>
                <Package className="w-12 h-12 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">High Risk Items</p>
                  <p className="text-3xl font-bold mt-1">
                    {allergyRecords.filter(r => r.risk_level === 'high').length}
                  </p>
                </div>
                <ShieldAlert className="w-12 h-12 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-700 to-gray-800 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Ingredients Used</p>
                  <p className="text-3xl font-bold mt-1">{ingredients.length}</p>
                </div>
                <Wheat className="w-12 h-12 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Items by Category */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading menu...</p>
          </div>
        ) : groupedItems.length === 0 ? (
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-12 text-center">
              <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No menu items yet</h3>
              <p className="text-gray-600 mb-6">Start by adding your first menu item</p>
              {isManager && (
                <Button 
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                  onClick={() => setShowItemDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <AnimatePresence mode="wait">
              {groupedItems.map((group, groupIndex) => (
                <motion.div
                  key={group.category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: groupIndex * 0.1 }}
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-1 w-12 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 rounded-full"></div>
                    <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {group.category.name}
                    </h2>
                    <div className="h-1 flex-1 bg-gradient-to-r from-amber-500 via-emerald-600 to-transparent rounded-full"></div>
                  </div>

                  {/* Items Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.items.map((item, itemIndex) => {
                      const allergyRecord = allergyRecords.find(r => r.menu_item_id === item.id);
                      const hasAllergens = allergyRecord?.allergens_detected?.length > 0;

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: itemIndex * 0.05 }}
                          whileHover={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                        >
                          <Card className="bg-white border-none shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
                            {/* Image */}
                            <div className="relative h-48 bg-gray-100 overflow-hidden">
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100">
                                  <Utensils className="w-16 h-16 text-emerald-300" />
                                </div>
                              )}
                              
                              {/* Status Badge */}
                              {item.is_active === false && (
                                <div className="absolute top-2 left-2">
                                  <Badge className="bg-gray-500 text-white">Inactive</Badge>
                                </div>
                              )}

                              {/* Allergen Warning */}
                              {hasAllergens && (
                                <div className="absolute top-2 right-2">
                                  <Badge className={`${riskColors[allergyRecord.risk_level]} border`}>
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {allergyRecord.risk_level.toUpperCase()}
                                  </Badge>
                                </div>
                              )}

                              {/* Manager Actions */}
                              {isManager && (
                                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="bg-white/90 hover:bg-white shadow-md"
                                    onClick={() => handleEdit(item)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="bg-white/90 hover:bg-white shadow-md"
                                    onClick={() => {
                                      if (confirm(`Delete "${item.name}"?`)) {
                                        deleteMenuItemMutation.mutate(item.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <CardContent className="p-5">
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-bold text-gray-900 flex-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                  {item.name}
                                </h3>
                                <span className="text-2xl font-bold text-emerald-600" style={{ color: '#014D40' }}>
                                  £{(item.sell_price || 0).toFixed(2)}
                                </span>
                              </div>

                              {item.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                              )}

                              {/* Allergens */}
                              {allergyRecord?.allergens_detected && allergyRecord.allergens_detected.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-gray-700 mb-1.5">Contains:</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {allergyRecord.allergens_detected.map(allergen => (
                                      <Badge 
                                        key={allergen} 
                                        variant="outline" 
                                        className="text-xs border-amber-300 text-amber-800 bg-amber-50"
                                        style={{ borderColor: '#E0B037', color: '#92400E' }}
                                      >
                                        {allergenIcons[allergen]} {allergen}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recipe Info */}
                              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Package className="w-3.5 h-3.5" />
                                  {item.recipe?.length || 0} ingredients
                                </span>
                                {item.total_cost !== undefined && (
                                  <span>Cost: £{item.total_cost.toFixed(2)}</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Add/Edit Menu Item Dialog */}
        <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <Utensils className="w-6 h-6 text-emerald-600" />
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Item Photo</Label>
                <div className="flex items-center gap-4">
                  {formData.image_url ? (
                    <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-emerald-200">
                      <img src={formData.image_url} alt="Item" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: "" })}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-40 h-40 border-2 border-dashed border-emerald-300 rounded-lg flex items-center justify-center bg-emerald-50">
                      <Camera className="w-12 h-12 text-emerald-400" />
                    </div>
                  )}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('menu-image-upload').click()}
                      disabled={uploadingImage}
                      className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">Recommended: 800x600px</p>
                    <input
                      id="menu-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Masala Chai, Honey Baklava"
                    required
                    className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    required
                  >
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <p>No categories yet</p>
                          <Link to={createPageUrl("MenuManagement")}>
                            <Button variant="link" size="sm">Create Category First</Button>
                          </Link>
                        </div>
                      ) : (
                        categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description for menu display..."
                  className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sell_price">Price (£) *</Label>
                  <Input
                    id="sell_price"
                    type="number"
                    step="0.01"
                    value={formData.sell_price}
                    onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                    required
                    className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2 flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Mark as Active</span>
                  </label>
                </div>
              </div>

              {/* Ingredients Selection */}
              <div className="space-y-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <Label className="text-lg font-semibold text-emerald-900">Select Ingredients</Label>
                </div>
                <p className="text-sm text-emerald-700">Choose ingredients to auto-detect allergens</p>
                
                <ScrollArea className="h-64 bg-white rounded-lg border border-emerald-200">
                  <div className="p-4 space-y-2">
                    {ingredients.map(ingredient => {
                      const supplier = suppliers.find(s => s.id === ingredient.supplier_id);
                      const isSelected = selectedIngredients.includes(ingredient.id);

                      return (
                        <div
                          key={ingredient.id}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-50' 
                              : 'border-gray-200 hover:border-emerald-300 bg-white'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedIngredients(selectedIngredients.filter(id => id !== ingredient.id));
                            } else {
                              setSelectedIngredients([...selectedIngredients, ingredient.id]);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{ingredient.name}</p>
                                {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                              </div>
                              {ingredient.allergen_tags && ingredient.allergen_tags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {ingredient.allergen_tags.map(allergen => (
                                    <span key={allergen} className="text-xs">
                                      {allergenIcons[allergen]}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {supplier && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Supplier: {supplier.name}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-gray-600">
                              £{ingredient.unit_cost?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <p className="text-xs text-emerald-600">
                  ℹ️ {selectedIngredients.length} ingredient(s) selected
                </p>
              </div>

              {/* Allergen Preview */}
              {currentAllergens.length > 0 && (
                <Alert className="border-amber-300 bg-amber-50">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong>Allergens Detected:</strong>{' '}
                    {currentAllergens.map(a => `${allergenIcons[a]} ${a}`).join(', ')}
                    <br />
                    <span className="text-xs">This information will be added to the allergy table automatically.</span>
                  </AlertDescription>
                </Alert>
              )}

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                >
                  {editingItem ? 'Update Item' : 'Create Item'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
