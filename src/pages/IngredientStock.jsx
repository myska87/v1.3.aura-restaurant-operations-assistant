import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Package, AlertTriangle, ShoppingCart, ArrowLeft, Home, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function IngredientStock() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    category: "produce",
    unit: "",
    current_stock: "",
    par_level: "",
    reorder_point: "",
    supplier_id: "",
    unit_cost: "",
    pack_size: "",
    storage_location: "",
  });

  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createIngredientMutation = useMutation({
    mutationFn: (data) => base44.entities.Ingredient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      resetForm();
    },
  });

  const updateIngredientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ingredient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      resetForm();
    },
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingIngredient(null);
    setFormData({
      name: "",
      category: "produce",
      unit: "",
      current_stock: "",
      par_level: "",
      reorder_point: "",
      supplier_id: "",
      unit_cost: "",
      pack_size: "",
      storage_location: "",
    });
  };

  const handleEdit = (ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      current_stock: ingredient.current_stock?.toString() || "",
      par_level: ingredient.par_level?.toString() || "",
      reorder_point: ingredient.reorder_point?.toString() || "",
      supplier_id: ingredient.supplier_id || "",
      unit_cost: ingredient.unit_cost?.toString() || "",
      pack_size: ingredient.pack_size || "",
      storage_location: ingredient.storage_location || "",
    });
    setShowForm(true);
  };

  const handleStockUpdate = async (ingredientId, newStock, ingredient) => {
    await updateIngredientMutation.mutateAsync({
      id: ingredientId,
      data: { current_stock: parseFloat(newStock) }
    });

    // Check if auto-order should trigger
    if (parseFloat(newStock) <= (ingredient.reorder_point || 0) && ingredient.supplier_id) {
      await checkAndCreateAutoOrder(ingredient, parseFloat(newStock));
    }
  };

  const checkAndCreateAutoOrder = async (ingredient, currentStock) => {
    const supplier = suppliers.find(s => s.id === ingredient.supplier_id);
    if (!supplier) return;

    const quantityToOrder = (ingredient.par_level || ingredient.reorder_point * 2) - currentStock;
    if (quantityToOrder <= 0) return;

    const orderNumber = `AUTO-PO-${Date.now()}`;
    const lineTotal = quantityToOrder * ingredient.unit_cost;
    const subtotal = lineTotal;
    const tax = subtotal * 0.2;
    const total = subtotal + tax;

    const orderData = {
      order_number: orderNumber,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      supplier_email: supplier.email,
      status: "draft",
      items: [{
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.name,
        quantity_ordered: quantityToOrder,
        unit: ingredient.unit,
        unit_cost: ingredient.unit_cost,
        line_total: lineTotal,
      }],
      subtotal,
      tax,
      total,
      order_date: new Date().toISOString(),
      created_by: user?.email || "system",
      notes: `AUTO-GENERATED: Stock below reorder point (${currentStock} ${ingredient.unit})`,
    };

    try {
      await createPurchaseOrderMutation.mutateAsync(orderData);
      
      // Send notification email
      await base44.integrations.Core.SendEmail({
        to: user?.email || supplier.email,
        subject: `🔔 AUTO-ORDER CREATED: ${ingredient.name}`,
        body: `
AUTOMATIC PURCHASE ORDER GENERATED

Item: ${ingredient.name}
Current Stock: ${currentStock} ${ingredient.unit}
Reorder Point: ${ingredient.reorder_point} ${ingredient.unit}
Quantity to Order: ${quantityToOrder} ${ingredient.unit}

Order Number: ${orderNumber}
Supplier: ${supplier.name}
Total: £${total.toFixed(2)}

This order has been created automatically and is pending review in the Ordering page.
        `
      });

      alert(`✅ Auto-order created for ${ingredient.name}! Check Ordering page to review.`);
    } catch (error) {
      console.error("Error creating auto-order:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const supplier = suppliers.find(s => s.id === formData.supplier_id);
    
    const data = {
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      current_stock: parseFloat(formData.current_stock) || 0,
      par_level: formData.par_level ? parseFloat(formData.par_level) : null,
      reorder_point: formData.reorder_point ? parseFloat(formData.reorder_point) : null,
      supplier_id: formData.supplier_id || null,
      supplier_name: supplier?.name || null,
      unit_cost: parseFloat(formData.unit_cost),
      pack_size: formData.pack_size || null,
      storage_location: formData.storage_location || null,
      last_cost_update: new Date().toISOString().split('T')[0],
    };

    if (editingIngredient) {
      await updateIngredientMutation.mutateAsync({ id: editingIngredient.id, data });
    } else {
      await createIngredientMutation.mutateAsync(data);
    }
  };

  const handleAutoOrderAll = async () => {
    const lowStockItems = ingredients.filter(ing => 
      ing.current_stock <= (ing.reorder_point || 0) && ing.supplier_id
    );

    if (lowStockItems.length === 0) {
      alert("No items need reordering!");
      return;
    }

    for (const ingredient of lowStockItems) {
      await checkAndCreateAutoOrder(ingredient, ingredient.current_stock);
    }

    alert(`✅ Created ${lowStockItems.length} auto-orders! Check Ordering page.`);
  };

  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || ing.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = ingredients.filter(ing => 
    ing.current_stock <= (ing.reorder_point || 0)
  );

  const criticalStockItems = ingredients.filter(ing =>
    ing.current_stock <= ((ing.reorder_point || 0) * 0.5)
  );

  const totalStockValue = ingredients.reduce((sum, ing) => 
    sum + (ing.current_stock * (ing.unit_cost || 0)), 0
  );

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Inventory")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon">
              <Home className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ingredient Stock</h1>
            <p className="text-gray-600">Live stock count and automated ordering</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{ingredients.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-amber-600">{lowStockItems.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-red-600">{criticalStockItems.length}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Stock Value</p>
                  <p className="text-2xl font-bold text-green-600">£{totalStockValue.toFixed(2)}</p>
                </div>
                <Package className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Alert className="bg-red-50 border-red-200 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-red-900">Low Stock Alert</p>
                <p className="text-sm text-red-800">
                  {lowStockItems.length} ingredient(s) need reordering
                </p>
              </div>
              <Button 
                onClick={handleAutoOrderAll}
                className="bg-red-600 hover:bg-red-700"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Auto-Order All
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ingredient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingIngredient ? 'Edit Ingredient' : 'Add Ingredient'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Ingredient Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="produce">Produce</SelectItem>
                          <SelectItem value="meat_poultry">Meat & Poultry</SelectItem>
                          <SelectItem value="seafood">Seafood</SelectItem>
                          <SelectItem value="dairy">Dairy</SelectItem>
                          <SelectItem value="dry_goods">Dry Goods</SelectItem>
                          <SelectItem value="spices">Spices</SelectItem>
                          <SelectItem value="beverages">Beverages</SelectItem>
                          <SelectItem value="packaging">Packaging</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Input
                        id="unit"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        placeholder="kg, g, liters, pieces..."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current_stock">Current Stock</Label>
                      <Input
                        id="current_stock"
                        type="number"
                        step="0.01"
                        value={formData.current_stock}
                        onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="par_level">Par Level (Target Stock)</Label>
                      <Input
                        id="par_level"
                        type="number"
                        step="0.01"
                        value={formData.par_level}
                        onChange={(e) => setFormData({ ...formData, par_level: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reorder_point">Reorder Point (Auto-Order Trigger)</Label>
                      <Input
                        id="reorder_point"
                        type="number"
                        step="0.01"
                        value={formData.reorder_point}
                        onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supplier_id">Supplier</Label>
                      <Select
                        value={formData.supplier_id}
                        onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map(sup => (
                            <SelectItem key={sup.id} value={sup.id}>
                              {sup.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit_cost">Unit Cost (£)</Label>
                      <Input
                        id="unit_cost"
                        type="number"
                        step="0.01"
                        value={formData.unit_cost}
                        onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pack_size">Pack Size</Label>
                      <Input
                        id="pack_size"
                        value={formData.pack_size}
                        onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                        placeholder="e.g., 2kg pack"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="storage_location">Storage Location</Label>
                      <Input
                        id="storage_location"
                        value={formData.storage_location}
                        onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                      />
                    </div>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-sm text-blue-900">
                      💡 <strong>Auto-Ordering:</strong> When stock drops below the Reorder Point, the system will automatically create a purchase order for review.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      {editingIngredient ? 'Update' : 'Add Ingredient'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline"
              onClick={() => navigate(createPageUrl("Ordering"))}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              View Orders
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:w-64"
          />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="produce">Produce</SelectItem>
              <SelectItem value="meat_poultry">Meat & Poultry</SelectItem>
              <SelectItem value="seafood">Seafood</SelectItem>
              <SelectItem value="dairy">Dairy</SelectItem>
              <SelectItem value="dry_goods">Dry Goods</SelectItem>
              <SelectItem value="spices">Spices</SelectItem>
              <SelectItem value="beverages">Beverages</SelectItem>
              <SelectItem value="packaging">Packaging</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ingredients List */}
        <div className="space-y-2">
          {isLoading ? (
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-200 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredIngredients.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No ingredients found</p>
              </CardContent>
            </Card>
          ) : (
            filteredIngredients.map((ingredient) => {
              const isLowStock = ingredient.current_stock <= (ingredient.reorder_point || 0);
              const isCritical = ingredient.current_stock <= ((ingredient.reorder_point || 0) * 0.5);
              const stockValue = ingredient.current_stock * (ingredient.unit_cost || 0);
              
              return (
                <Card key={ingredient.id} className={`bg-white border-none shadow-sm hover:shadow-md transition-shadow ${isCritical ? 'ring-2 ring-red-400' : isLowStock ? 'ring-2 ring-amber-300' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900">{ingredient.name}</h3>
                          {isCritical && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              CRITICAL
                            </Badge>
                          )}
                          {isLowStock && !isCritical && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{ingredient.category.replace('_', ' ')}</span>
                          <span>£{ingredient.unit_cost?.toFixed(2)}/{ingredient.unit}</span>
                          {ingredient.supplier_name && <span>Supplier: {ingredient.supplier_name}</span>}
                          <span className="text-green-600 font-medium">Value: £{stockValue.toFixed(2)}</span>
                        </div>
                        {ingredient.reorder_point && (
                          <div className="text-xs text-gray-500 mt-1">
                            Par: {ingredient.par_level || 'N/A'} {ingredient.unit} | Reorder at: {ingredient.reorder_point} {ingredient.unit}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={ingredient.current_stock}
                              onChange={(e) => handleStockUpdate(ingredient.id, e.target.value, ingredient)}
                              className="w-24 text-right"
                            />
                            <span className="text-sm text-gray-600 whitespace-nowrap">
                              {ingredient.unit}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            In Stock
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(ingredient)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}