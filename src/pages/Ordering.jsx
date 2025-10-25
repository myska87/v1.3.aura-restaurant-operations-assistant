import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Send, Trash2, ArrowLeft, Home } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Ordering() {
  const queryClient = useQueryClient();
  const [sendingOrder, setSendingOrder] = useState(null);
  const [deliveryDates, setDeliveryDates] = useState({});

  const { data: draftOrders = [], isLoading } = useQuery({
    queryKey: ['draftOrders'],
    queryFn: async () => {
      const allOrders = await base44.entities.PurchaseOrder.list('-order_date');
      return allOrders.filter(order => order.status === 'draft');
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draftOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draftOrders'] });
    },
  });

  const calculateOrderTotal = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const tax = subtotal * 0.2; // 20% VAT
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSendOrder = async (order) => {
    setSendingOrder(order.id);

    const deliveryDate = deliveryDates[order.id] || null;

    try {
      await updateOrderMutation.mutateAsync({
        id: order.id,
        data: {
          status: 'sent',
          expected_delivery_date: deliveryDate,
        }
      });

      // Send email
      const emailBody = `
Order Number: ${order.order_number}
Date: ${format(new Date(), "PPP")}

Items:
${order.items.map(item => `- ${item.ingredient_name}: ${item.quantity_ordered} ${item.unit} @ £${item.unit_cost.toFixed(2)} = £${item.line_total.toFixed(2)}`).join('\n')}

Subtotal: £${order.subtotal.toFixed(2)}
VAT (20%): £${order.tax.toFixed(2)}
Total: £${order.total.toFixed(2)}

Expected Delivery: ${deliveryDate ? format(new Date(deliveryDate), "PPP") : 'TBD'}

Please confirm receipt of this order.
      `;

      await base44.integrations.Core.SendEmail({
        to: order.supplier_email,
        subject: `Purchase Order ${order.order_number}`,
        body: emailBody,
      });

      alert(`✅ Order ${order.order_number} sent successfully to ${order.supplier_name}!`);
    } catch (error) {
      console.error("Error sending order:", error);
      alert("Failed to send order. Please try again.");
    } finally {
      setSendingOrder(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (confirm('Delete this draft order?')) {
      await deleteOrderMutation.mutateAsync(orderId);
    }
  };

  const handleUpdateQuantity = async (orderId, itemIndex, newQuantity) => {
    const order = draftOrders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = [...order.items];
    updatedItems[itemIndex].quantity_ordered = parseFloat(newQuantity);
    updatedItems[itemIndex].line_total = updatedItems[itemIndex].quantity_ordered * updatedItems[itemIndex].unit_cost;

    const { subtotal, tax, total } = calculateOrderTotal(updatedItems);

    await updateOrderMutation.mutateAsync({
      id: orderId,
      data: {
        items: updatedItems,
        subtotal,
        tax,
        total,
      }
    });
  };

  const handleRemoveItem = async (orderId, itemIndex) => {
    const order = draftOrders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.filter((_, idx) => idx !== itemIndex);

    if (updatedItems.length === 0) {
      await handleDeleteOrder(orderId);
      return;
    }

    const { subtotal, tax, total } = calculateOrderTotal(updatedItems);

    await updateOrderMutation.mutateAsync({
      id: orderId,
      data: {
        items: updatedItems,
        subtotal,
        tax,
        total,
      }
    });
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Inventory")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inventory
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping Cart & Draft Orders</h1>
          <p className="text-gray-600">Review and send orders to suppliers</p>
        </div>

        {isLoading ? (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <div className="animate-pulse">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Loading orders...</p>
              </div>
            </CardContent>
          </Card>
        ) : draftOrders.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No draft orders. Add items from Inventory Management or Menu Builder.</p>
              <Link to={createPageUrl("InventoryManagement")}>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  Go to Inventory Management
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {draftOrders.map((order) => (
              <Card key={order.id} className="bg-white border-none shadow-sm">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">
                        {order.supplier_name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{order.supplier_email}</p>
                      <p className="text-xs text-gray-500 mt-1">Order #{order.order_number}</p>
                      {order.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">{order.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-800">Draft</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 mb-6">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
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
                          onChange={(e) => handleUpdateQuantity(order.id, index, e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-600 w-16">{item.unit}</span>
                        <span className="font-semibold text-gray-900 w-24 text-right">
                          £{item.line_total.toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(order.id, index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">£{order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">VAT (20%):</span>
                      <span className="font-medium text-gray-900">£{order.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-green-700">£{order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor={`delivery-${order.id}`} className="text-sm text-gray-700">
                        Expected Delivery Date
                      </Label>
                      <Input
                        id={`delivery-${order.id}`}
                        type="date"
                        value={deliveryDates[order.id] || ''}
                        onChange={(e) => setDeliveryDates({ ...deliveryDates, [order.id]: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => handleSendOrder(order)}
                        disabled={sendingOrder === order.id || !order.supplier_email}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {sendingOrder === order.id ? (
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}