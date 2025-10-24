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
import { Plus, Pencil, Trash2, ChefHat, DollarSign } from "lucide-react";

export default function MenuManagement() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "mains",
    sell_price: "",
    recipe: [],
    prep_time_minutes: "",
    cooking_instructions: "",
  });
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [ingredientQty, setIngredientQty] = useState("");

  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const createMenuItemMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      resetForm();
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      resetForm();
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({
      name: "",
      category: "mains",
      sell_price: "",
      recipe: [],
      prep_time_minutes: "",
      cooking_instructions: "",
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      sell_price: item.sell_price.toString(),
      recipe: item.recipe || [],
      prep_time_minutes: item.prep_time_minutes?.toString() || "",
      cooking_instructions: item.cooking_instructions || "",
    });
    setShowForm(true);
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

    setFormData({
      ...formData,
      recipe: [...formData.recipe, recipeItem]
    });

    setSelectedIngredient("");
    setIngredientQty("");
  };

  const handleRemoveIngredient = (ingredientId) => {
    setFormData({
      ...formData,
      recipe: formData.recipe.filter(r => r.ingredient_id !== ingredientId)
    });
  };

  const calculateTotals = () => {
    const totalCost = formData.recipe.reduce((sum, r) => sum + r.cost, 0);
    const sellPrice = parseFloat(formData.sell_price) || 0;
    const profitMargin = sellPrice - totalCost;
    const foodCostPercentage = sellPrice > 0 ? (totalCost / sellPrice) * 100 : 0;

    return { totalCost, profitMargin, foodCostPercentage };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { totalCost, profitMargin, foodCostPercentage } = calculateTotals();

    const data = {
      name: formData.name,
      category: formData.category,
      sell_price: parseFloat(formData.sell_price),
      recipe: formData.recipe,
      total_cost: totalCost,
      profit_margin: profitMargin,
      food_cost_percentage: foodCostPercentage,
      prep_time_minutes: formData.prep_time_minutes ? parseInt(formData.prep_time_minutes) : null,
      cooking_instructions: formData.cooking_instructions,
      is_active: true,
    };

    if (editingItem) {
      await updateMenuItemMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await createMenuItemMutation.mutateAsync(data);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      appetizers: 'bg-amber-100 text-amber-800',
      mains: 'bg-green-100 text-green-800',
      desserts: 'bg-pink-100 text-pink-800',
      beverages: 'bg-blue-100 text-blue-800',
      sides: 'bg-purple-100 text-purple-800',
      specials: 'bg-red-100 text-red-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Menu & Recipe Management</h1>
            <p className="text-gray-600">Create menu items with ingredient recipes</p>
          </div>
          <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Create Menu Item'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Margherita Pizza"
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
                        <SelectItem value="appetizers">Appetizers</SelectItem>
                        <SelectItem value="mains">Mains</SelectItem>
                        <SelectItem value="desserts">Desserts</SelectItem>
                        <SelectItem value="beverages">Beverages</SelectItem>
                        <SelectItem value="sides">Sides</SelectItem>
                        <SelectItem value="specials">Specials</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sell_price">Sell Price (£)</Label>
                    <Input
                      id="sell_price"
                      type="number"
                      step="0.01"
                      value={formData.sell_price}
                      onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prep_time">Prep Time (minutes)</Label>
                    <Input
                      id="prep_time"
                      type="number"
                      value={formData.prep_time_minutes}
                      onChange={(e) => setFormData({ ...formData, prep_time_minutes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Cooking Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.cooking_instructions}
                    onChange={(e) => setFormData({ ...formData, cooking_instructions: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Recipe Builder */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Recipe / Ingredients</Label>
                    <span className="text-sm text-gray-500">{formData.recipe.length} ingredients</span>
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

                  {formData.recipe.length > 0 && (
                    <div className="space-y-2">
                      {formData.recipe.map((item, index) => (
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
                  {formData.recipe.length > 0 && formData.sell_price && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Total Cost:</span>
                          <span className="font-bold">£{totals.totalCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Sell Price:</span>
                          <span className="font-bold">£{parseFloat(formData.sell_price).toFixed(2)}</span>
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
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending || formData.recipe.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {editingItem ? 'Update Item' : 'Create Item'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Menu Items Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingMenu ? (
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
          ) : menuItems.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No menu items created yet</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            menuItems.map((item) => (
              <Card key={item.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                        {item.name}
                      </CardTitle>
                      <Badge className={getCategoryColor(item.category)}>
                        {item.category}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
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
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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
                      <Badge variant="outline" className={item.food_cost_percentage < 35 ? 'text-green-700' : 'text-amber-700'}>
                        {item.food_cost_percentage?.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {item.recipe?.length || 0} ingredients
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}