
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
import { Plus, Calculator, ShoppingCart, TrendingUp, ArrowLeft, Home, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProductionPlanning() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [creatingOrders, setCreatingOrders] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    menu_items: [],
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
      });
    },
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductionPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionPlans'] });
    },
  });

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

    // Calculate ingredients needed
    const ingredientsMap = {};
    
    formData.menu_items.forEach(item => {
      const menuItem = menuItems.find(m => m.id === item.menu_item_id);
      if (menuItem?.recipe) {
        menuItem.recipe.forEach(recipeItem => {
          const totalNeeded = recipeItem.quantity * item.portions_needed;
          
          if (ingredientsMap[recipeItem.ingredient_id]) {
            ingredientsMap[recipeItem.ingredient_id].quantity_needed += totalNeeded;
          } else {
            const ingredient = ingredients.find(ing => ing.id === recipeItem.ingredient_id);
            ingredientsMap[recipeItem.ingredient_id] = {
              ingredient_id: recipeItem.ingredient_id,
              ingredient_name: recipeItem.ingredient_name,
              quantity_needed: totalNeeded,
              unit: recipeItem.unit,
              current_stock: ingredient?.current_stock || 0,
              to_order: Math.max(0, totalNeeded - (ingredient?.current_stock || 0)),
              supplier_id: ingredient?.supplier_id,
              supplier_name: ingredient?.supplier_name,
              supplier_email: ingredient?.supplier_email,
              unit_cost: ingredient?.unit_cost || 0,
            };
          }
        });
      }
    });

    const ingredientsNeeded = Object.values(ingredientsMap);

    return { totalPortions, totalRevenue, totalCost, projectedProfit, ingredientsNeeded };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { totalPortions, totalRevenue, totalCost, projectedProfit, ingredientsNeeded } = calculatePlanTotals();

    const data = {
      name: formData.name,
      date: formData.date,
      menu_items: formData.menu_items,
      total_portions: totalPortions,
      total_revenue: totalRevenue,
      total_cost: totalCost,
      projected_profit: projectedProfit,
      ingredients_needed: ingredientsNeeded,
      status: "planning",
    };

    await createPlanMutation.mutateAsync(data);
  };

  const handleCreatePurchaseOrders = async (plan) => {
    setCreatingOrders(true);
    
    try {
      const ingredientsNeeded = plan.ingredients_needed || [];
      
      // Check for missing suppliers
      const missingSuppliers = ingredientsNeeded.filter(ing => ing.to_order > 0 && !ing.supplier_id);
      if (missingSuppliers.length > 0) {
        alert(`⚠️ Cannot create orders. ${missingSuppliers.length} ingredient(s) missing suppliers:\n${missingSuppliers.map(i => i.ingredient_name).join(', ')}\n\nPlease assign suppliers in Inventory Management.`);
        setCreatingOrders(false);
        return;
      }

      // Group by supplier
      const ordersBySupplier = {};
      
      ingredientsNeeded.forEach(ing => {
        if (ing.to_order > 0) {
          if (!ordersBySupplier[ing.supplier_id]) {
            ordersBySupplier[ing.supplier_id] = {
              supplier_id: ing.supplier_id,
              supplier_name: ing.supplier_name,
              supplier_email: ing.supplier_email,
              items: []
            };
          }
          
          ordersBySupplier[ing.supplier_id].items.push({
            ingredient_id: ing.ingredient_id,
            ingredient_name: ing.ingredient_name,
            quantity_ordered: ing.to_order,
            unit: ing.unit,
            unit_cost: ing.unit_cost,
            line_total: ing.to_order * ing.unit_cost,
          });
        }
      });

      if (Object.keys(ordersBySupplier).length === 0) {
        alert('✅ All ingredients are already in stock! No orders needed.');
        setCreatingOrders(false);
        return;
      }

      // Create POs and send emails
      let ordersCreated = 0;
      for (const [supplierId, order] of Object.entries(ordersBySupplier)) {
        const subtotal = order.items.reduce((sum, item) => sum + item.line_total, 0);
        const tax = subtotal * 0.2; // Assuming 20% VAT
        const total = subtotal + tax;
        
        const poNumber = `PO-${Date.now()}-${supplierId.substring(0, 4)}`;

        // Create PO
        await createPurchaseOrderMutation.mutateAsync({
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

        // Send email to supplier
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

      // Update plan status
      await updatePlanMutation.mutateAsync({
        id: plan.id,
        data: { status: 'approved', orders_created: true }
      });

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
        {/* Back Buttons */}
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
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                New Production Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Production Plan</DialogTitle>
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

                {/* Menu Items Selection */}
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

                  {/* Summary */}
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

                      {/* Ingredients Needed */}
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
                    disabled={createPlanMutation.isPending || formData.menu_items.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Create Plan
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plans List */}
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
            plans.map((plan) => (
              <Card key={plan.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                      <p className="text-sm text-gray-600">{format(new Date(plan.date), "PPP")}</p>
                    </div>
                    <Badge className={
                      plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                      plan.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      plan.status === 'in_production' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {plan.status}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Total Portions</p>
                      <p className="text-xl font-bold text-gray-900">{plan.total_portions}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Revenue</p>
                      <p className="text-xl font-bold text-green-700">£{plan.total_revenue?.toFixed(2)}</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Cost</p>
                      <p className="text-xl font-bold text-amber-700">£{plan.total_cost?.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Profit</p>
                      <p className={`text-xl font-bold ${plan.projected_profit > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        £{plan.projected_profit?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {plan.orders_created && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                      <Send className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800 font-medium">
                        Purchase orders created and emailed to suppliers
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!plan.orders_created && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleCreatePurchaseOrders(plan)}
                        disabled={creatingOrders}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {creatingOrders ? 'Creating Orders...' : 'Create & Email Purchase Orders'}
                      </Button>
                    )}
                    {plan.orders_created && (
                      <Link to={createPageUrl('Ordering')}>
                        <Button size="sm" variant="outline">
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          View Orders
                        </Button>
                      </Link>
                    )}
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
