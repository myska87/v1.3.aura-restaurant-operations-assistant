import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Send, Trash2, Plus, Check } from "lucide-react";
import { format } from "date-fns";

export default function Ordering() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [draftOrders, setDraftOrders] = useState({});
  const [sendingOrder, setSendingOrder] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState("");

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const createOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  useEffect(() => {
    const plan = location.state?.plan;
    if (plan?.ingredients_needed) {
      generateDraftOrders(plan.ingredients_needed);
    }
  }, [location.state]);

  const generateDraftOrders = (ingredientsNeeded) => {
    const ordersBySupplier = {};

    ingredientsNeeded.forEach(ing => {
      if (ing.to_order > 0) {
        const ingredient = ingredients.find(i => i.id === ing.ingredient_id);
        const supplierId = ingredient?.supplier_id;
        
        if (supplierId) {
          if (!ordersBySupplier[supplierId]) {
            const supplier = suppliers.find(s => s.id === supplierId);
            ordersBySupplier[supplierId] = {
              supplier_id: supplierId,
              supplier_name: supplier?.name || 'Unknown',
              supplier_email: supplier?.email || '',
              items: [],
            };
          }

          ordersBySupplier[supplierId].items.push({
            ingredient_id: ing.ingredient_id,
            ingredient_name: ing.ingredient_name,
            quantity_ordered: ing.to_order,
            unit: ing.unit,
            unit_cost: ingredient?.unit_cost || 0,
            line_total: ing.to_order * (ingredient?.unit_cost || 0),
          });
        }
      }
    });

    setDraftOrders(ordersBySupplier);
  };

  const calculateOrderTotal = (items) => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const tax = subtotal * 0.2; // 20% VAT
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSendOrder = async (supplierId) => {
    const order = draftOrders[supplierId];
    if (!order) return;

    setSendingOrder(supplierId);

    const { subtotal, tax, total } = calculateOrderTotal(order.items);
    const orderNumber = `PO${Date.now()}`;

    const orderData = {
      order_number: orderNumber,
      supplier_id: order.supplier_id,
      supplier_name: order.supplier_name,
      supplier_email: order.supplier_email,
      status: "sent",
      items: order.items,
      subtotal,
      tax,
      total,
      order_date: new Date().toISOString(),
      expected_delivery_date: deliveryDate || null,
      created_by: (await base44.auth.me()).email,
    };

    try {
      await createOrderMutation.mutateAsync(orderData);

      // Send email
      const emailBody = `
Order Number: ${orderNumber}
Date: ${format(new Date(), "PPP")}

Items:
${order.items.map(item => `- ${item.ingredient_name}: ${item.quantity_ordered} ${item.unit} @ £${item.unit_cost.toFixed(2)} = £${item.line_total.toFixed(2)}`).join('\n')}

Subtotal: £${subtotal.toFixed(2)}
VAT (20%): £${tax.toFixed(2)}
Total: £${total.toFixed(2)}

Expected Delivery: ${deliveryDate ? format(new Date(deliveryDate), "PPP") : 'TBD'}

Please confirm receipt of this order.
      `;

      await base44.integrations.Core.SendEmail({
        to: order.supplier_email,
        subject: `Purchase Order ${orderNumber}`,
        body: emailBody,
      });

      // Remove from draft orders
      const newDrafts = { ...draftOrders };
      delete newDrafts[supplierId];
      setDraftOrders(newDrafts);

      alert(`Order ${orderNumber} sent successfully to ${order.supplier_name}!`);
    } catch (error) {
      console.error("Error sending order:", error);
      alert("Failed to send order. Please try again.");
    } finally {
      setSendingOrder(null);
    }
  };

  const handleRemoveItem = (supplierId, ingredientId) => {
    const newDrafts = { ...draftOrders };
    newDrafts[supplierId].items = newDrafts[supplierId].items.filter(
      item => item.ingredient_id !== ingredientId
    );
    if (newDrafts[supplierId].items.length === 0) {
      delete newDrafts[supplierId];
    }
    setDraftOrders(newDrafts);
  };

  const handleUpdateQuantity = (supplierId, ingredientId, newQuantity) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    const newDrafts = { ...draftOrders };
    const item = newDrafts[supplierId].items.find(i => i.ingredient_id === ingredientId);
    if (item) {
      item.quantity_ordered = parseFloat(newQuantity);
      item.line_total = item.quantity_ordered * item.unit_cost;
    }
    setDraftOrders(newDrafts);
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Draft Orders</h1>
          <p className="text-gray-600">Review and send orders to suppliers</p>
        </div>

        {Object.keys(draftOrders).length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No draft orders. Add items from Production Planning or Menu Analysis.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(draftOrders).map(([supplierId, order]) => {
              const { subtotal, tax, total } = calculateOrderTotal(order.items);
              
              return (
                <Card key={supplierId} className="bg-white border-none shadow-sm">
                  <CardHeader className="border-b border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">
                          {order.supplier_name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{order.supplier_email}</p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800">Draft</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3 mb-6">
                      {order.items.map((item) => (
                        <div key={item.ingredient_id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.ingredient_name}</p>
                            <p className="text-sm text-gray-600">
                              £{item.unit_cost.toFixed(2)} per {item.unit}
                            </p>
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity_ordered}
                            onChange={(e) => handleUpdateQuantity(supplierId, item.ingredient_id, e.target.value)}
                            className="w-24"
                          />
                          <span className="text-sm text-gray-600 w-16">{item.unit}</span>
                          <span className="font-semibold text-gray-900 w-24 text-right">
                            £{item.line_total.toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(supplierId, item.ingredient_id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium text-gray-900">£{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">VAT (20%):</span>
                        <span className="font-medium text-gray-900">£{tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-green-700">£{total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-4">
                      <div className="flex-1">
                        <Label htmlFor={`delivery-${supplierId}`} className="text-sm text-gray-700">
                          Expected Delivery Date
                        </Label>
                        <Input
                          id={`delivery-${supplierId}`}
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={() => handleSendOrder(supplierId)}
                          disabled={sendingOrder === supplierId || !order.supplier_email}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {sendingOrder === supplierId ? (
                            <>Sending...</>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Order
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}