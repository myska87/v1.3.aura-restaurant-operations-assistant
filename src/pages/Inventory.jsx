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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, AlertCircle, Pencil, Package } from "lucide-react";
import { format } from "date-fns";

export default function Inventory() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [formData, setFormData] = useState({
    item_name: "",
    category: "produce",
    current_quantity: "",
    unit: "",
    minimum_quantity: "",
    unit_cost: "",
    supplier: "",
    supplier_contact: "",
    storage_location: "",
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.InventoryItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      resetForm();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      resetForm();
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({
      item_name: "",
      category: "produce",
      current_quantity: "",
      unit: "",
      minimum_quantity: "",
      unit_cost: "",
      supplier: "",
      supplier_contact: "",
      storage_location: "",
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category,
      current_quantity: item.current_quantity.toString(),
      unit: item.unit,
      minimum_quantity: item.minimum_quantity?.toString() || "",
      unit_cost: item.unit_cost?.toString() || "",
      supplier: item.supplier || "",
      supplier_contact: item.supplier_contact || "",
      storage_location: item.storage_location || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      current_quantity: parseFloat(formData.current_quantity),
      minimum_quantity: formData.minimum_quantity ? parseFloat(formData.minimum_quantity) : null,
      unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
    };

    if (editingItem) {
      await updateItemMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await createItemMutation.mutateAsync(data);
    }
  };

  const filteredItems = filterCategory === "all"
    ? items
    : items.filter(item => item.category === filterCategory);

  const lowStockItems = items.filter(
    item => item.current_quantity <= (item.minimum_quantity || 0)
  );

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
            <p className="text-gray-600">Track stock levels and manage orders</p>
          </div>
          <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item_name">Item Name</Label>
                    <Input
                      id="item_name"
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
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
                        <SelectItem value="dairy">Dairy</SelectItem>
                        <SelectItem value="dry_goods">Dry Goods</SelectItem>
                        <SelectItem value="beverages">Beverages</SelectItem>
                        <SelectItem value="cleaning_supplies">Cleaning Supplies</SelectItem>
                        <SelectItem value="disposables">Disposables</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_quantity">Current Quantity</Label>
                    <Input
                      id="current_quantity"
                      type="number"
                      step="0.01"
                      value={formData.current_quantity}
                      onChange={(e) => setFormData({ ...formData, current_quantity: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="kg, liters, pieces, etc."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimum_quantity">Minimum Quantity (Alert)</Label>
                    <Input
                      id="minimum_quantity"
                      type="number"
                      step="0.01"
                      value={formData.minimum_quantity}
                      onChange={(e) => setFormData({ ...formData, minimum_quantity: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit_cost">Unit Cost ($)</Label>
                    <Input
                      id="unit_cost"
                      type="number"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier_contact">Supplier Contact</Label>
                    <Input
                      id="supplier_contact"
                      value={formData.supplier_contact}
                      onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="storage_location">Storage Location</Label>
                    <Input
                      id="storage_location"
                      value={formData.storage_location}
                      onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createItemMutation.isPending || updateItemMutation.isPending}>
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="bg-amber-50 border-amber-200 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">Low Stock Alert</p>
                  <p className="text-sm text-amber-800">
                    {lowStockItems.length} item(s) need reordering
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="mb-6">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="produce">Produce</SelectItem>
              <SelectItem value="meat_poultry">Meat & Poultry</SelectItem>
              <SelectItem value="dairy">Dairy</SelectItem>
              <SelectItem value="dry_goods">Dry Goods</SelectItem>
              <SelectItem value="beverages">Beverages</SelectItem>
              <SelectItem value="cleaning_supplies">Cleaning Supplies</SelectItem>
              <SelectItem value="disposables">Disposables</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Items Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No items in inventory</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isLowStock = item.current_quantity <= (item.minimum_quantity || 0);
              return (
                <Card key={item.id} className={`bg-white border-none shadow-sm hover:shadow-md transition-shadow ${isLowStock ? 'ring-2 ring-amber-500' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {item.item_name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                    <Badge className="w-fit mt-1">
                      {item.category.replace(/_/g, ' ')}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Stock:</span>
                        <span className={`font-semibold ${isLowStock ? 'text-amber-600' : 'text-gray-900'}`}>
                          {item.current_quantity} {item.unit}
                        </span>
                      </div>
                      {item.minimum_quantity && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Min. Quantity:</span>
                          <span className="text-gray-900">{item.minimum_quantity} {item.unit}</span>
                        </div>
                      )}
                      {item.unit_cost && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Unit Cost:</span>
                          <span className="text-gray-900">${item.unit_cost}</span>
                        </div>
                      )}
                      {item.supplier && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-gray-600">Supplier: <span className="text-gray-900">{item.supplier}</span></p>
                        </div>
                      )}
                      {isLowStock && (
                        <div className="pt-2">
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Reorder Needed
                          </Badge>
                        </div>
                      )}
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