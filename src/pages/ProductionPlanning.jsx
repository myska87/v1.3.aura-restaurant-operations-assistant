import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Calculator, ShoppingCart, ArrowLeft, Home, Send, MoreVertical, Edit, Trash2, AlertTriangle, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ProductionPlanning() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [creatingOrders, setCreatingOrders] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    menu_items: [],
    status: "planning",
  });
  const [selectedMenuItem, setSelectedMenuItem] = useState("");
  const [portions, setPortions] = useState("");

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['productionPlans'],
    queryFn: () => base44.entities.ProductionPlan.list("-date"),
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionPlans'] });
      resetForm();
      alert('✅ Production plan created successfully!');
    },
    onError: (error) => {
      console.error('Error creating plan:', error);
      alert('❌ Failed to create plan. Please try again.');
    }
  });

  const createOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['productionPlans'] });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductionPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionPlans'] });
      resetForm();
      alert('✅ Production plan updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating plan:', error);
      alert('❌ Failed to update plan. Please try again.');
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionPlans'] });
      alert('✅ Production plan deleted successfully!');
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingPlan(null);
    setFormData({
      name: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      menu_items: [],
      status: "planning",
    });
    setSelectedMenuItem("");
    setPortions("");
  };

  const addPlanToCart = (plan) => {
    if (!plan || !plan.ingredients_needed) {
      alert('⚠️ No ingredients data found for this plan!');
      return;
    }

    const ingredientsNeeded = plan.ingredients_needed || [];
    const ingredientsToAdd = ingredientsNeeded.filter(ing => ing.to_order > 0);

    if (ingredientsToAdd.length === 0) {
      alert('✅ All ingredients are in stock for this plan!');
      return;
    }

    const updatedCart = [...cart];

    ingredientsToAdd.forEach(ing => {
      const inventoryItem = ingredients.find(i => i.id === ing.ingredient_id);
      
      if (!inventoryItem) {
        console.warn(`Ingredient ${ing.ingredient_name} not found in inventory`);
        return;
      }

      if (!inventoryItem.supplier_id) {
        console.warn(`Ingredient ${ing.ingredient_name} has no supplier`);
        return;
      }

      const existingIndex = updatedCart.findIndex(item => item.ingredient_id === ing.ingredient_id);

      if (existingIndex !== -1) {
        updatedCart[existingIndex].quantity += ing.to_order;
        updatedCart[existingIndex].line_total = updatedCart[existingIndex].quantity * (inventoryItem.unit_cost || 0);
      } else {
        updatedCart.push({
          ingredient_id: ing.ingredient_id,
          ingredient_name: ing.ingredient_name,
          quantity: ing.to_order,
          unit: ing.unit,
          unit_cost: inventoryItem.unit_cost || 0,
          supplier_id: inventoryItem.supplier_id,
          supplier_name: inventoryItem.supplier_name || 'Unknown',
          supplier_email: inventoryItem.supplier_email || null,
          line_total: ing.to_order * (inventoryItem.unit_cost || 0),
          from_plan: plan.name,
        });
      }
    });

    setCart(updatedCart);
    alert(`✅ Added ${ingredientsToAdd.length} ingredients to cart!`);
    setShowCart(true);
  };

  const removeFromCart = (ingredientId) => {
    setCart(cart.filter(item => item.ingredient_id !== ingredientId));
  };

  const updateCartQuantity = (ingredientId, newQuantity) => {
    const parsedQuantity = parseFloat(newQuantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      removeFromCart(ingredientId);
      return;
    }

    setCart(cart.map(item =>
      item.ingredient_id === ingredientId
        ? { ...item, quantity: parsedQuantity, line_total: parsedQuantity * item.unit_cost }
        : item
    ));
  };

  const createOrderFromCart = async () => {
    // Validation 1: Check if cart is empty
    if (!cart || cart.length === 0) {
      alert('⚠️ Cart is empty! Please add ingredients first.');
      return;
    }

    // Validation 2: Check for missing suppliers
    const missingSuppliers = cart.filter(item => !item.supplier_id);
    if (missingSuppliers.length > 0) {
      alert(`⚠️ Cannot create order. The following ingredients are missing suppliers:\n\n${
        missingSuppliers.map(i => `• ${i.ingredient_name}`).join('\n')
      }\n\nPlease assign suppliers in Inventory Management.`);
      return;
    }

    setCreatingOrders(true);

    try {
      // Group items by supplier
      const ordersBySupplier = {};

      cart.forEach(item => {
        if (!ordersBySupplier[item.supplier_id]) {
          ordersBySupplier[item.supplier_id] = {
            supplier_id: item.supplier_id,
            supplier_name: item.supplier_name,
            supplier_email: item.supplier_email,
            items: []
          };
        }

        ordersBySupplier[item.supplier_id].items.push({
          ingredient_id: item.ingredient_id,
          ingredient_name: item.ingredient_name,
          quantity_ordered: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          line_total: item.line_total,
        });
      });

      // Create orders for each supplier
      let ordersCreated = 0;
      const orderPromises = [];

      for (const order of Object.values(ordersBySupplier)) {
        const subtotal = order.items.reduce((sum, item) => sum + item.line_total, 0);
        const tax = subtotal * 0.2;
        const total = subtotal + tax;

        const orderPromise = createOrderMutation.mutateAsync({
          order_number: `PO-CART-${Date.now()}-${order.supplier_id.substring(0, 4)}`,
          supplier_id: order.supplier_id,
          supplier_name: order.supplier_name,
          supplier_email: order.supplier_email,
          status: 'draft',
          items: order.items,
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax: parseFloat(tax.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          order_date: new Date().toISOString(),
          notes: 'Created from Production Planning cart',
        });

        orderPromises.push(orderPromise);
        ordersCreated++;
      }

      await Promise.all(orderPromises);

      // Success: Clear cart and close dialog
      setCart([]);
      setShowCart(false);
      alert(`✅ Successfully created ${ordersCreated} draft order(s)!\n\nView them in the Ordering page.`);
      
    } catch (error) {
      console.error('Error creating orders:', error);
      alert('❌ Failed to create orders. Please try again.');
    } finally {
      setCreatingOrders(false);
    }
  };

  const handleAddMenuItem = () => {
    if (!selectedMenuItem || !portions) {
      alert('⚠️ Please select a menu item and enter portions');
      return;
    }
    
    const menuItem = menuItems.find(m => m.id === selectedMenuItem);
    if (!menuItem) {
      alert('⚠️ Menu item not found');
      return;
    }

    const item = {
      menu_item_id: menuItem.id,
      menu_item_name: menuItem.name,
      portions_needed: parseInt(portions),
      sell_price: menuItem.sell_price || 0,
      cost_per_portion: menuItem.total_cost || 0,
    };

    setFormData({
      ...formData,
      menu_items: [...formData.menu_items, item]
    });

    setSelectedMenuItem("");
    setPortions("");
  };

  const calculatePlanTotals = () => {
    const totalPortions = formData.menu_items.reduce((sum, item) => sum + item.portions_needed, 0);
    const totalRevenue = formData.menu_items.reduce((sum, item) => sum + (item.sell_price * item.portions_needed), 0);
    const totalCost = formData.menu_items.reduce((sum, item) => sum + (item.cost_per_portion * item.portions_needed), 0);
    const projectedProfit = totalRevenue - totalCost;

    const ingredientsMap = new Map();

    formData.menu_items.forEach(planItem => {
      const menuItem = menuItems.find(m => m.id === planItem.menu_item_id);
      if (!menuItem?.recipe) return;

      menuItem.recipe.forEach(recipeItem => {
        const quantityNeeded = recipeItem.quantity * planItem.portions_needed;
        const existingIngredient = ingredientsMap.get(recipeItem.ingredient_id);

        if (existingIngredient) {
          existingIngredient.quantity_needed += quantityNeeded;
        } else {
          const inventoryItem = ingredients.find(i => i.id === recipeItem.ingredient_id);
          ingredientsMap.set(recipeItem.ingredient_id, {
            ingredient_id: recipeItem.ingredient_id,
            ingredient_name: recipeItem.ingredient_name,
            quantity_needed: quantityNeeded,
            unit: recipeItem.unit,
            current_stock: inventoryItem?.current_stock || 0,
            to_order: Math.max(0, quantityNeeded - (inventoryItem?.current_stock || 0)),
          });
        }
      });
    });

    const ingredientsNeeded = Array.from(ingredientsMap.values());

    return { totalPortions, totalRevenue, totalCost, projectedProfit, ingredientsNeeded };
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      date: plan.date,
      menu_items: plan.menu_items || [],
      status: plan.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.date) {
      alert('⚠️ Please enter plan name and date');
      return;
    }

    if (formData.menu_items.length === 0) {
      alert('⚠️ Please add at least one menu item');
      return;
    }

    const { totalPortions, totalRevenue, totalCost, projectedProfit, ingredientsNeeded } = calculatePlanTotals();

    const planData = {
      ...formData,
      total_portions: totalPortions,
      total_revenue: totalRevenue,
      total_cost: totalCost,
      projected_profit: projectedProfit,
      ingredients_needed: ingredientsNeeded,
    };

    if (editingPlan) {
      await updatePlanMutation.mutateAsync({ id: editingPlan.id, data: planData });
    } else {
      await createPlanMutation.mutateAsync(planData);
    }
  };

  const handleOrderIngredients = async (plan) => {
    setCreatingOrders(true);
    
    try {
      const ingredientsNeeded = plan.ingredients_needed || [];
      const ingredientsToOrder = ingredientsNeeded.filter(ing => ing.to_order > 0);

      if (ingredientsToOrder.length === 0) {
        alert('✅ All ingredients in stock!');
        setCreatingOrders(false);
        return;
      }

      const ordersBySupplier = {};
      
      ingredientsToOrder.forEach(ing => {
        const inventoryIngredient = ingredients.find(i => i.id === ing.ingredient_id);
        if (inventoryIngredient && inventoryIngredient.supplier_id) {
          if (!ordersBySupplier[inventoryIngredient.supplier_id]) {
            ordersBySupplier[inventoryIngredient.supplier_id] = {
              supplier_id: inventoryIngredient.supplier_id,
              supplier_name: inventoryIngredient.supplier_name,
              supplier_email: inventoryIngredient.supplier_email,
              items: []
            };
          }
          
          ordersBySupplier[inventoryIngredient.supplier_id].items.push({
            ingredient_id: ing.ingredient_id,
            ingredient_name: ing.ingredient_name,
            quantity_ordered: ing.to_order,
            unit: ing.unit,
            unit_cost: inventoryIngredient.unit_cost || 0,
            line_total: ing.to_order * (inventoryIngredient.unit_cost || 0),
          });
        }
      });

      let ordersCreated = 0;
      for (const order of Object.values(ordersBySupplier)) {
        const subtotal = order.items.reduce((sum, item) => sum + item.line_total, 0);
        const tax = subtotal * 0.2;
        const total = subtotal + tax;

        await createOrderMutation.mutateAsync({
          order_number: `PO-${Date.now()}-${order.supplier_id.substring(0, 4)}`,
          supplier_id: order.supplier_id,
          supplier_name: order.supplier_name,
          supplier_email: order.supplier_email,
          status: 'pending_approval',
          items: order.items,
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax: parseFloat(tax.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          order_date: new Date().toISOString(),
          linked_production_plan_id: plan.id,
          linked_production_plan_name: plan.name,
          notes: `Auto-generated from Production Plan: ${plan.name}`,
        });

        ordersCreated++;
      }

      await updatePlanMutation.mutateAsync({
        id: plan.id,
        data: { status: 'approved', orders_created: true }
      });

      alert(`✅ Created ${ordersCreated} order(s)!`);
      
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to create orders');
    }
    
    setCreatingOrders(false);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.line_total, 0);
  const cartTax = cartTotal * 0.2;
  const cartGrandTotal = cartTotal + cartTax;
  const totals = formData.menu_items.length > 0 ? calculatePlanTotals() : null;

  // Group cart items by supplier for display
  const cartBySupplier = cart.reduce((acc, item) => {
    const supplierId = item.supplier_id || 'no_supplier';
    if (!acc[supplierId]) {
      acc[supplierId] = {
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name || 'No Supplier',
        supplier_email: item.supplier_email,
        items: []
      };
    }
    acc[supplierId].items.push(item);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("Inventory")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Inventory Hub
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Production Planning</h1>
            <p className="text-gray-600">Plan portions and generate purchase orders</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCart(true)}
              variant="outline"
              className="bg-blue-50 relative"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Cart
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              New Production Plan
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-200 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : plans.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No production plans yet</p>
              </CardContent>
            </Card>
          ) : (
            plans.map((plan) => (
              <Card key={plan.id} className="bg-white">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <Badge className="bg-blue-100 text-blue-800">
                        {format(new Date(plan.date), "MMM d, yyyy")}
                      </Badge>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEdit(plan)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deletePlanMutation.mutate(plan.id)}>
                          <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600">Total Portions</p>
                      <p className="text-lg font-bold">{plan.total_portions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Revenue</p>
                      <p className="text-lg font-bold text-green-700">£{plan.total_revenue?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Cost</p>
                      <p className="text-lg font-bold">£{plan.total_cost?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Profit</p>
                      <p className="text-lg font-bold text-emerald-700">£{plan.projected_profit?.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {plan.status === 'approved' && !plan.orders_created && (
                      <>
                        <Button
                          onClick={() => handleOrderIngredients(plan)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={creatingOrders}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {creatingOrders ? 'Creating...' : 'Order Ingredients'}
                        </Button>
                        <Button
                          onClick={() => addPlanToCart(plan)}
                          variant="outline"
                          className="flex-1"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </Button>
                      </>
                    )}
                  </div>

                  {plan.ingredients_needed?.some(ing => ing.to_order > 0) && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                      <p className="text-sm text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {plan.ingredients_needed.filter(ing => ing.to_order > 0).length} ingredient(s) need ordering
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Production Plan Form Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Edit' : 'Create'} Production Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Plan Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Add Menu Items</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <select
                    value={selectedMenuItem}
                    onChange={(e) => setSelectedMenuItem(e.target.value)}
                    className="col-span-2 p-2 border rounded"
                  >
                    <option value="">Select menu item...</option>
                    {menuItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} - £{item.sell_price?.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    placeholder="Portions"
                    value={portions}
                    onChange={(e) => setPortions(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddMenuItem}
                  className="w-full mt-2"
                  size="sm"
                  disabled={!selectedMenuItem || !portions}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {formData.menu_items.length > 0 && (
                <div className="space-y-2">
                  {formData.menu_items.map((item, index) => (
                    <Card key={index} className="border border-gray-200">
                      <CardContent className="p-4 flex justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.menu_item_name}
                          </p>
                          <p className="text-sm text-gray-600">{item.portions_needed} portions</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({
                            ...formData,
                            menu_items: formData.menu_items.filter((_, i) => i !== index)
                          })}
                        >
                          Remove
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {totals && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-xs">Portions</p>
                        <p className="font-bold">{totals.totalPortions}</p>
                      </div>
                      <div>
                        <p className="text-xs">Revenue</p>
                        <p className="font-bold text-green-700">£{totals.totalRevenue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs">Cost</p>
                        <p className="font-bold">£{totals.totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs">Profit</p>
                        <p className="font-bold text-emerald-700">£{totals.projectedProfit.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-600" disabled={formData.menu_items.length === 0}>
                  {editingPlan ? 'Update' : 'Create'} Plan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Shopping Cart Dialog - FULLY COMPLETED */}
        <Dialog open={showCart} onOpenChange={setShowCart}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Shopping Cart ({cart.length} items)</span>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Clear all items from cart?')) {
                        setCart([]);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Cart
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>

            {cart.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Your cart is empty</p>
                <p className="text-sm text-gray-400">Add ingredients from production plans</p>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {/* Validation Warnings */}
                {cart.some(item => !item.supplier_id) && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Some items are missing suppliers. Please assign suppliers in Inventory Management before ordering.
                    </AlertDescription>
                  </Alert>
                )}

                <ScrollArea className="h-[400px] pr-4">
                  {/* Group by Supplier */}
                  {Object.values(cartBySupplier).map((supplierGroup) => (
                    <div key={supplierGroup.supplier_id} className="mb-6">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-gray-200">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <h3 className="font-bold text-gray-900">{supplierGroup.supplier_name}</h3>
                        {supplierGroup.supplier_email && (
                          <Badge variant="outline" className="text-xs">
                            {supplierGroup.supplier_email}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        {supplierGroup.items.map((item) => (
                          <Card key={item.ingredient_id}>
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="flex-1">
                                <p className="font-medium">{item.ingredient_name}</p>
                                <p className="text-sm text-gray-600">
                                  £{item.unit_cost.toFixed(2)} per {item.unit}
                                </p>
                                {item.from_plan && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    From: {item.from_plan}
                                  </p>
                                )}
                              </div>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={item.quantity}
                                onChange={(e) => updateCartQuantity(item.ingredient_id, e.target.value)}
                                className="w-24"
                              />
                              <span className="text-sm w-16">{item.unit}</span>
                              <span className="font-semibold w-24 text-right">
                                £{item.line_total.toFixed(2)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromCart(item.ingredient_id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>

                {/* Cart Summary */}
                <Card className="bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-200">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">£{cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">VAT (20%):</span>
                        <span className="font-medium">£{cartTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-300">
                        <span>Total:</span>
                        <span className="text-blue-700">£{cartGrandTotal.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {Object.keys(cartBySupplier).length} supplier(s) • {cart.length} item(s)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowCart(false)}>
                    Continue Planning
                  </Button>
                  <Button
                    onClick={createOrderFromCart}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={creatingOrders || cart.some(item => !item.supplier_id)}
                  >
                    {creatingOrders ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Creating Orders...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Create Draft Orders ({Object.keys(cartBySupplier).length})
                      </>
                    )}
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