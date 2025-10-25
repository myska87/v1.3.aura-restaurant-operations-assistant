
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  ShoppingCart, 
  Plus,
  Pencil,
  ArrowLeft,
  Home,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function InventoryManagement() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    category: "produce",
    unit: "",
    current_stock: "",
    par_level: "",
    reorder_point: "",
    supplier_id: "",
    unit_cost: "",
    auto_order_enabled: true,
    auto_order_quantity: "",
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const updateIngredientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ingredient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  const createIngredientMutation = useMutation({
    mutationFn: (data) => base44.entities.Ingredient.create(data),
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
    setEditingItem(null);
    setFormData({
      name: "",
      category: "produce",
      unit: "",
      current_stock: "",
      par_level: "",
      reorder_point: "",
      supplier_id: "",
      unit_cost: "",
      auto_order_enabled: true,
      auto_order_quantity: "",
    });
  };

  const handleEdit = (ingredient) => {
    setEditingItem(ingredient);
    setFormData({
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      current_stock: ingredient.current_stock?.toString() || "",
      par_level: ingredient.par_level?.toString() || "",
      reorder_point: ingredient.reorder_point?.toString() || "",
      supplier_id: ingredient.supplier_id || "",
      unit_cost: ingredient.unit_cost?.toString() || "",
      auto_order_enabled: ingredient.auto_order_enabled !== false,
      auto_order_quantity: ingredient.auto_order_quantity?.toString() || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.supplier_id) {
      alert('⚠️ Please select a supplier for this item. This is required for auto-ordering.');
      return;
    }
    
    const supplier = suppliers.find(s => s.id === formData.supplier_id);
    
    const data = {
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      current_stock: parseFloat(formData.current_stock) || 0,
      par_level: formData.par_level ? parseFloat(formData.par_level) : null,
      reorder_point: formData.reorder_point ? parseFloat(formData.reorder_point) : null,
      supplier_id: formData.supplier_id,
      supplier_name: supplier?.name || null,
      supplier_email: supplier?.email || null,
      supplier_phone: supplier?.phone || null,
      unit_cost: parseFloat(formData.unit_cost),
      auto_order_enabled: formData.auto_order_enabled,
      auto_order_quantity: formData.auto_order_quantity ? parseFloat(formData.auto_order_quantity) : null,
      last_cost_update: new Date().toISOString().split('T')[0],
    };

    if (editingItem) {
      await updateIngredientMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await createIngredientMutation.mutateAsync(data);
    }
  };

  const handleStockUpdate = async (ingredientId, newStock) => {
    const ingredient = ingredients.find(ing => ing.id === ingredientId);
    await updateIngredientMutation.mutateAsync({
      id: ingredientId,
      data: { current_stock: parseFloat(newStock) }
    });

    if (ingredient.auto_order_enabled && parseFloat(newStock) <= (ingredient.reorder_point || 0)) {
      await triggerAutoOrder(ingredient);
    }
  };

  const triggerAutoOrder = async (ingredient) => {
    const supplier = suppliers.find(s => s.id === ingredient.supplier_id);
    if (!supplier) {
      alert(`No supplier configured for ${ingredient.name}`);
      return;
    }

    const orderQuantity = ingredient.auto_order_quantity || (ingredient.par_level - ingredient.current_stock) || 10;
    const lineTotal = orderQuantity * ingredient.unit_cost;

    const poData = {
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      status: "pending",
      order_date: new Date().toISOString().split('T')[0],
      items: [{
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.name,
        quantity_ordered: orderQuantity,
        unit: ingredient.unit,
        unit_cost: ingredient.unit_cost,
        line_total: lineTotal,
      }],
      total_amount: lineTotal,
      notes: `AUTO-GENERATED: ${ingredient.name} fell below reorder point`,
      auto_generated: true,
    };

    await createPurchaseOrderMutation.mutateAsync(poData);
    alert(`✅ Auto-order created for ${ingredient.name} (${orderQuantity} ${ingredient.unit})`);
  };

  const checkAllAutoOrders = async () => {
    const lowStockItems = ingredients.filter(ing => 
      ing.auto_order_enabled && 
      ing.current_stock <= (ing.reorder_point || 0) &&
      ing.supplier_id
    );

    for (const item of lowStockItems) {
      await triggerAutoOrder(item);
    }

    if (lowStockItems.length === 0) {
      alert('✅ All stock levels are adequate');
    }
  };

  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || ing.category === filterCategory;
    const matchesSupplier = filterSupplier === 'all' || ing.supplier_id === filterSupplier;
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  const lowStockItems = ingredients.filter(ing => ing.current_stock <= (ing.reorder_point || 0));
  const totalValue = ingredients.reduce((sum, ing) => sum + (ing.current_stock * ing.unit_cost), 0);
  const categories = [...new Set(ingredients.map(ing => ing.category))];
  const itemsWithoutSupplier = ingredients.filter(ing => !ing.supplier_id).length;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Inventory")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inventory Hub
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
            <p className="text-gray-600">Track stock levels with automated reordering</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={checkAllAutoOrders} variant="outline" className="bg-blue-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Auto-Orders
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Alert for items without supplier */}
        {itemsWithoutSupplier > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Supplier Assignment Required</p>
                <p className="text-sm text-amber-700">
                  {itemsWithoutSupplier} item(s) don't have a supplier assigned. Auto-ordering won't work without a supplier.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
              <Package className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{ingredients.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Low Stock Alerts</CardTitle>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{lowStockItems.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Inventory Value</CardTitle>
              <TrendingDown className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">£{totalValue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">No Supplier</CardTitle>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{itemsWithoutSupplier}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1">
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="flex gap-3">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map(sup => (
                      <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold text-gray-700">Item Name</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Category</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Current Stock</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Reorder Point</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Supplier</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Unit Cost</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Total Value</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Auto-Order</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIngredients.map((ingredient) => {
                    const isLowStock = ingredient.current_stock <= (ingredient.reorder_point || 0);
                    const totalValue = ingredient.current_stock * ingredient.unit_cost;
                    const hasSupplier = !!ingredient.supplier_id;
                    
                    return (
                      <tr key={ingredient.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {ingredient.name}
                            {isLowStock && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                            {!hasSupplier && <AlertTriangle className="w-4 h-4 text-red-500" title="No supplier assigned" />}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{ingredient.category}</Badge>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={ingredient.current_stock}
                            onChange={(e) => handleStockUpdate(ingredient.id, e.target.value)}
                            className="w-24"
                          />
                          <span className="text-sm text-gray-500 ml-2">{ingredient.unit}</span>
                        </td>
                        <td className="p-3">
                          <span className={isLowStock ? "text-amber-600 font-semibold" : ""}>
                            {ingredient.reorder_point || '-'} {ingredient.unit}
                          </span>
                        </td>
                        <td className="p-3">
                          {hasSupplier ? (
                            <div>
                              <p className="font-medium text-gray-900">{ingredient.supplier_name}</p>
                              {ingredient.supplier_phone && (
                                <p className="text-xs text-gray-500">{ingredient.supplier_phone}</p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              Not Assigned
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">£{ingredient.unit_cost.toFixed(2)}</td>
                        <td className="p-3">£{totalValue.toFixed(2)}</td>
                        <td className="p-3">
                          {ingredient.auto_order_enabled && hasSupplier ? (
                            <Badge className="bg-green-100 text-green-800">ON</Badge>
                          ) : !hasSupplier ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              No Supplier
                            </Badge>
                          ) : (
                            <Badge variant="outline">OFF</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(ingredient)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Inventory Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Item Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="produce">Produce</SelectItem>
                      <SelectItem value="meat">Meat</SelectItem>
                      <SelectItem value="dairy">Dairy</SelectItem>
                      <SelectItem value="dry_goods">Dry Goods</SelectItem>
                      <SelectItem value="beverages">Beverages</SelectItem>
                      <SelectItem value="cleaning">Cleaning Supplies</SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Current Stock *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({...formData, current_stock: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Unit *</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    placeholder="kg, L, pcs"
                    required
                  />
                </div>
                <div>
                  <Label>Unit Cost (£) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Par Level</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.par_level}
                    onChange={(e) => setFormData({...formData, par_level: e.target.value})}
                    placeholder="Maximum stock level"
                  />
                </div>
                <div>
                  <Label>Reorder Point *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.reorder_point}
                    onChange={(e) => setFormData({...formData, reorder_point: e.target.value})}
                    placeholder="Trigger for reorder"
                    required
                  />
                </div>
              </div>

              {/* ENHANCED SUPPLIER SELECTION */}
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <Label className="text-lg font-semibold text-blue-900">Supplier Selection *</Label>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  This supplier will be used when auto-ordering this item. Make sure the supplier is correct.
                </p>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData, 
                      supplier_id: value
                    });
                  }}
                  required
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="⚠️ Select a supplier (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <p>No suppliers available</p>
                        <Link to={createPageUrl("SupplierManagement")}>
                          <Button variant="link" size="sm">Add Supplier First</Button>
                        </Link>
                      </div>
                    ) : (
                      suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <div className="flex flex-col">
                            <span className="font-semibold">{supplier.name}</span>
                            <span className="text-xs text-gray-500">
                              {supplier.email} • {supplier.phone || 'No phone'}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                
                {formData.supplier_id && (
                  <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                    <p className="text-sm font-medium text-gray-700">Selected Supplier:</p>
                    <p className="text-lg font-bold text-blue-900">
                      {suppliers.find(s => s.id === formData.supplier_id)?.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      📧 {suppliers.find(s => s.id === formData.supplier_id)?.email}
                    </p>
                    {suppliers.find(s => s.id === formData.supplier_id)?.phone && (
                      <p className="text-xs text-gray-600">
                        📞 {suppliers.find(s => s.id === formData.supplier_id)?.phone}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Auto-Order Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.auto_order_enabled}
                      onChange={(e) => setFormData({...formData, auto_order_enabled: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label>Enable automatic ordering when stock is low</Label>
                  </div>
                  {formData.auto_order_enabled && (
                    <div>
                      <Label>Auto-Order Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.auto_order_quantity}
                        onChange={(e) => setFormData({...formData, auto_order_quantity: e.target.value})}
                        placeholder="Leave empty to order to par level"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        If empty, system will order enough to reach par level
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  {editingItem ? 'Update' : 'Create'} Item
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
