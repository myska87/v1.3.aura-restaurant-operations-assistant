import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Calculator, ShoppingCart, ArrowLeft, Home, Send, MoreVertical, Edit, Trash2, CheckCircle, ChefHat, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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
      setShowForm(false);
      setFormData({
        name: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        menu_items: [],
        status: "planning",
      });
    },
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
      setShowForm(false);
      setEditingPlan(null);
      setFormData({
        name: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        menu_items: [],
        status: "planning",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionPlans'] });
    },
  });

  const addPlanToCart = (plan) => {
    const ingredientsNeeded = plan.ingredients_needed || [];
    const ingredientsToAdd = ingredientsNeeded.filter(ing => ing.to_order > 0);

    if (ingredientsToAdd.length === 0) {
      alert('✅ All ingredients are in stock for this plan!');
      return;
    }

    let addedCount = 0;
    const updatedCart = [...cart];

    ingredientsToAdd.forEach(ing => {
      const inventoryItem = ingredients.find(i => i.id === ing.ingredient_id);
      
      if (!inventoryItem?.supplier_id) {
        console.warn(`Skipping ${ing.ingredient_name} - no supplier assigned`);
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
      addedCount++;
    });

    setCart(updatedCart);
    alert(`✅ Added ${addedCount} ingredient(s) to cart!`);
    setShowCart(true);
  };

  const removeFromCart = (ingredientId) => {
    setCart(cart.filter(item => item.ingredient_id !== ingredientId));
  };

  const updateCartQuantity = (ingredientId, newQuantity) => {
    const parsedQuantity = parseFloat(newQuantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setCart(cart.filter(item => item.ingredient_id !== ingredientId));
      return;
    }

    setCart(cart.map(item =>
      item.ingredient_id === ingredientId
        ? { ...item, quantity: parsedQuantity, line_total: parsedQuantity * item.unit_cost }
        : item
    ));
  };

  const createOrderFromCart = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    const missingSuppliers = cart.filter(item => !item.supplier_id);
    if (missingSuppliers.length > 0) {
      alert(`⚠️ Cannot create order. ${missingSuppliers.length} item(s) missing suppliers:\n${missingSuppliers.map(i => i.ingredient_name).join(', ')}\n\nPlease assign suppliers in Inventory Management.`);
      return;
    }

    setCreatingOrders(true);

    try {
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

      let ordersCreated = 0;
      for (const order of Object.values(ordersBySupplier)) {
        const subtotal = order.items.reduce((sum, item) => sum + item.line_total, 0);
        const tax = subtotal * 0.2;
        const total = subtotal + tax;

        await createOrderMutation.mutateAsync({
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
        ordersCreated++;
      }

      setCart([]);
      setShowCart(false);
      alert(`✅ ${ordersCreated} draft order(s) created! Check the Ordering page.`);
      
    } catch (error) {
      console.error('Error creating orders from cart:', error);
      alert('❌ Failed to create orders from cart. Please try again.');
    }

    setCreatingOrders(false);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.line_total, 0);

  const handleAddMenuItem = () => {
    if (!selectedMenuItem || !portions) return;
    
    const menuItem = menuItems.find(m => m.id === selectedMenuItem);
    if (!menuItem) return;

    const item = {
      menu_item_id: menuItem.id,
      menu_item_name: menuItem.name,
      portions_needed: parseInt(portions),
      sell_price: menuItem.sell_price,
      cost_per_portion: menuItem.total_cost,
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

  const handleCancelPlan = async (planId) => {
    if (confirm('⚠️ Are you sure you want to cancel this production plan?\n\nThis will remove the plan and any associated orders.')) {
      await deletePlanMutation.mutateAsync(planId);
    }
  };

  const handleUpdateStatus = async (planId, newStatus) => {
    await updatePlanMutation.mutateAsync({
      id: planId,
      data: { status: newStatus }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      await updatePlanMutation.mutateAsync({
        id: editingPlan.id,
        data: planData
      });
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
        alert('✅ All required ingredients are already in stock for this plan! No orders needed.');
        setCreatingOrders(false);
        return;
      }

      const missingSuppliers = ingredientsToOrder.filter(ing => {
        const inventoryIngredient = ingredients.find(i => i.id === ing.ingredient_id);
        return !inventoryIngredient?.supplier_id;
      });

      if (missingSuppliers.length > 0) {
        alert(`⚠️ Cannot create orders. ${missingSuppliers.length} ingredient(s) missing suppliers:\n${missingSuppliers.map(i => i.ingredient_name).join(', ')}\n\nPlease assign suppliers in Inventory Management.`);
        setCreatingOrders(false);
        return;
      }

      const ordersBySupplier = {};
      
      ingredientsToOrder.forEach(ing => {
        const inventoryIngredient = ingredients.find(i => i.id === ing.ingredient_id);
        if (inventoryIngredient) {
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
      for (const [supplierId, order] of Object.entries(ordersBySupplier)) {
        const subtotal = order.items.reduce((sum, item) => sum + item.line_total, 0);
        const tax = subtotal * 0.2;
        const total = subtotal + tax;
        
        const poNumber = `PO-${Date.now()}-${supplierId.substring(0, 4)}`;

        await createOrderMutation.mutateAsync({
          order_number: poNumber,
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
          email_sent_at: new Date().toISOString(),
        });

        const emailBody = `
Dear ${order.supplier_name},

Please find our purchase order details below:

📋 Purchase Order: ${poNumber}
📅 Date: ${format(new Date(), 'PPP')}
🏪 From: AURA Restaurant Management System

ITEMS:
${order.items.map(item => 
  `• ${item.ingredient_name}: ${item.quantity_ordered.toFixed(2)} ${item.unit} @ £${item.unit_cost.toFixed(2)} = £${item.line_total.toFixed(2)}`
).join('\n')}

TOTALS:
Subtotal: £${subtotal.toFixed(2)}
VAT (20%): £${tax.toFixed(2)}
TOTAL: £${total.toFixed(2)}

📦 Please confirm receipt of this order and provide expected delivery date.

Thank you,
AURA Restaurant Management
        `;

        await base44.integrations.Core.SendEmail({
          to: order.supplier_email,
          subject: `Purchase Order ${poNumber} from AURA`,
          body: emailBody,
        });

        ordersCreated++;
      }

      if (plan.status === 'planning') {
        await updatePlanMutation.mutateAsync({
          id: plan.id,
          data: { status: 'approved', orders_created: true }
        });
      } else {
        await updatePlanMutation.mutateAsync({
          id: plan.id,
          data: { orders_created: true }
        });
      }

      alert(`✅ Successfully created and emailed ${ordersCreated} purchase order(s)!\n\nCheck the Ordering page to track status.`);
      
    } catch (error) {
      console.error('Error creating purchase orders:', error);
      alert('❌ Failed to create purchase orders. Please try again.');
    }
    
    setCreatingOrders(false);
  };

  const totals = formData.menu_items.length > 0 ? calculatePlanTotals() : null;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
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
            <p className="text-gray-600">Plan portions and automatically generate purchase orders</p>
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
            <Dialog open={showForm} onOpenChange={(isOpen) => {
              setShowForm(isOpen);
              if (!isOpen) {
                setEditingPlan(null);
                setFormData({
                  name: "",
                  date: format(new Date(), 'yyyy-MM-dd'),
                  menu_items: [],
                  status: "planning",
                });
                setSelectedMenuItem("");
                setPortions("");
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Production Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPlan ? 'Edit Production Plan' : 'Create Production Plan'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Plan Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Weekend Service, Catering Event"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Menu Items & Portions</Label>
                    
                    <Card className="bg-gray-50">
                      <CardContent className="p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <select
                              value={selectedMenuItem}
                              onChange={(e) => setSelectedMenuItem(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md"
                            >
                              <option value="">Select menu item...</option>
                              {menuItems.map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.name} - £{item.sell_price?.toFixed(2)} (Cost: £{item.total_cost?.toFixed(2)})
                                </option>
                              ))}
                            </select>
                          </div>
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
                          className="w-full"
                          size="sm"
                          disabled={!selectedMenuItem || !portions}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Plan
                        </Button>
                      </CardContent>
                    </Card>

                    {formData.menu_items.length > 0 && (
                      <div className="space-y-2">
                        {formData.menu_items.map((item, index) => (
                          <Card key={index} className="border border-gray-200">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-gray-900">{item.menu_item_name}</p>
                                  <p className="text-sm text-gray-600">
                                    {item.portions_needed} portions × £{item.sell_price?.toFixed(2)} = £{(item.portions_needed * item.sell_price).toFixed(2)} revenue
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Cost: £{(item.portions_needed * item.cost_per_portion).toFixed(2)}
                                  </p>
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
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {totals && (
                      <div className="space-y-4">
                        <Card className="bg-blue-50 border-blue-200">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">Total Portions:</span>
                              <span className="font-bold">{totals.totalPortions}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">Total Revenue:</span>
                              <span className="font-bold text-green-700">£{totals.totalRevenue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">Total Cost:</span>
                              <span className="font-bold">£{totals.totalCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-blue-300 pt-2">
                              <span className="font-medium">Projected Profit:</span>
                              <span className={`font-bold ${totals.projectedProfit > 0 ? 'text-green-700' : 'text-red-700'}`}>
                                £{totals.projectedProfit.toFixed(2)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>

                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Ingredients Required:</h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {totals.ingredientsNeeded.map((ing, index) => (
                              <Card key={index} className="border border-gray-200">
                                <CardContent className="p-3">
                                  <div className="flex justify-between items-center text-sm">
                                    <div>
                                      <p className="font-medium text-gray-900">{ing.ingredient_name}</p>
                                      <p className="text-xs text-gray-600">
                                        Need: {ing.quantity_needed.toFixed(2)} {ing.unit} | 
                                        Stock: {ing.current_stock.toFixed(2)} {ing.unit}
                                      </p>
                                    </div>
                                    {ing.to_order > 0 && (
                                      <Badge className="bg-amber-100 text-amber-800">
                                        Order: {ing.to_order.toFixed(2)} {ing.unit}
                                      </Badge>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createPlanMutation.isPending || updatePlanMutation.isPending || formData.menu_items.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {editingPlan ? 'Update Plan' : 'Create Plan'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-200 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : plans.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No production plans created yet</p>
              </CardContent>
            </Card>
          ) : (
            plans.map((plan) => {
              const profitMargin = plan.total_revenue > 0 
                ? ((plan.projected_profit / plan.total_revenue) * 100).toFixed(1)
                : 0;

              return (
                <Card key={plan.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {format(new Date(plan.date), "MMM d, yyyy")}
                          </Badge>
                          <Badge className={
                            plan.status === 'planning' ? 'bg-gray-100 text-gray-800' :
                            plan.status === 'approved' ? 'bg-green-100 text-green-800' :
                            plan.status === 'in_production' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }>
                            {plan.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(plan)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Amend Plan
                          </DropdownMenuItem>
                          
                          {plan.status === 'planning' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(plan.id, 'approved')}>
                              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                              Approve Plan
                            </DropdownMenuItem>
                          )}
                          
                          {plan.status === 'approved' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(plan.id, 'in_production')}>
                              <ChefHat className="w-4 h-4 mr-2 text-blue-600" />
                              Start Production
                            </DropdownMenuItem>
                          )}
                          
                          {plan.status === 'in_production' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(plan.id, 'completed')}>
                              <CheckCircle className="w-4 h-4 mr-2 text-purple-600" />
                              Mark Complete
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem 
                            onClick={() => handleCancelPlan(plan.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Cancel Plan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-semibold text-gray-700">Menu Items:</p>
                      {plan.menu_items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                          <span className="text-gray-900">{item.menu_item_name}</span>
                          <span className="text-gray-600">{item.portions_needed} portions</span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-600">Total Portions</p>
                        <p className="text-lg font-bold text-gray-900">{plan.total_portions}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Revenue</p>
                        <p className="text-lg font-bold text-green-700">£{plan.total_revenue?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Cost</p>
                        <p className="text-lg font-bold text-gray-900">£{plan.total_cost?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Profit ({profitMargin}%)</p>
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
                            {creatingOrders ? 'Creating...' : 'Order & Email'}
                          </Button>
                          <Button
                            onClick={() => addPlanToCart(plan)}
                            variant="outline"
                            className="flex-1 bg-blue-50"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add to Cart
                          </Button>
                        </>
                      )}
                      {plan.orders_created && (
                        <Link to={createPageUrl('Ordering')} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full">
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            View Orders
                          </Button>
                        </Link>
                      )}
                      {(plan.status === 'planning' || plan.status === 'approved') && (
                        <Button
                          variant="outline"
                          onClick={() => handleEdit(plan)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Amend
                        </Button>
                      )}
                    </div>

                    {plan.ingredients_needed?.some(ing => ing.to_order > 0) && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-semibold">
                            {plan.ingredients_needed.filter(ing => ing.to_order > 0).length} ingredient(s) need ordering
                          </span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Shopping Cart Dialog */}
        <Dialog open={showCart} onOpenChange={setShowCart}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                Shopping Cart ({cart.length} items)
              </DialogTitle>
            </DialogHeader>

            {cart.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Your cart is empty</p>
                <p className="text-sm text-gray-400 mt-2">Click "Add to Cart" on production plans to add ingredients</p>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {cart.map((item) => (
                  <Card key={item.ingredient_id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.ingredient_name}</p>
                          <p className="text-sm text-gray-600">
                            {item.supplier_name} • £{item.unit_cost.toFixed(2)} per {item.unit}
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
                          value={item.quantity}
                          onChange={(e) => updateCartQuantity(item.ingredient_id, e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-600 w-16">{item.unit}</span>
                        <span className="font-semibold text-gray-900 w-24 text-right">
                          £{item.line_total.toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.ingredient_id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-blue-700">£{cartTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">+ 20% VAT will be added to the draft order</p>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowCart(false)}>
                    Continue Planning
                  </Button>
                  <Button
                    onClick={createOrderFromCart}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={creatingOrders}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {creatingOrders ? 'Creating Orders...' : 'Create Draft Orders'}
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