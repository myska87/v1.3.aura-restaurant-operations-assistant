
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCart, Send, Trash2, ArrowLeft, Home, Mail, Truck, Clock } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { logEmailSent } from "../components/ComplianceEmailLogger";
import { safeNumber, toSafeNumber } from "@/utils"; // Updated import

export default function Ordering() {
  const queryClient = useQueryClient();
  const [sendingOrder, setSendingOrder] = useState(null);
  const [deliveryDates, setDeliveryDates] = useState({});

  // Mock user for compliance logging. In a real app, this would come from an authentication context.
  const user = { id: 'current-user-id', email: 'manager@aurarestaurant.com', name: 'Restaurant Manager' };

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date'),
  });

  // Separate orders by status. Only draft orders are displayed in the main view
  const draftOrders = allOrders.filter(o => o.status === 'draft');

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const clearDraftOrdersMutation = new useMutation({
    mutationFn: async () => {
      const drafts = allOrders.filter(o => o.status === 'draft');
      await Promise.all(drafts.map(draft => 
        base44.entities.PurchaseOrder.delete(draft.id)
      ));
      return drafts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      alert(`✅ Successfully cleared ${count} draft order(s)`);
    },
    onError: (error) => {
      console.error('Error clearing drafts:', error);
      alert('❌ Failed to clear draft orders. Please try again.');
    }
  });

  const generateEmailContent = (order, deliveryDate) => {
    const subject = `Purchase Order ${order.order_number} from AURA Restaurant`;
    
    const body = `Dear ${order.supplier_name},

Please find our purchase order details below:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PURCHASE ORDER: ${order.order_number}
📅 Date: ${format(new Date(), "PPP")}
🏪 From: AURA Restaurant Management System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ITEMS ORDERED:
${order.items.map((item, index) => 
  `${index + 1}. ${item.ingredient_name}
   Quantity: ${safeNumber(item.quantity_ordered, 2)} ${item.unit}
   Unit Price: £${safeNumber(item.unit_cost, 2)}
   Line Total: £${safeNumber(item.line_total, 2)}`
).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTALS:
Subtotal: £${safeNumber(order.subtotal, 2)}
VAT (20%): £${safeNumber(order.tax, 2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRAND TOTAL: £${safeNumber(order.total, 2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${deliveryDate ? `📦 Expected Delivery Date: ${format(new Date(deliveryDate), 'PPP')}` : '📦 Expected Delivery Date: Please confirm'}

Please confirm receipt of this order and provide:
1. Order confirmation
2. Expected delivery date (if not specified above)
3. Any changes to pricing or availability

If you have any questions, please contact us immediately.

Thank you for your continued service.

Best regards,
AURA Restaurant Management Team`;

    return { subject, body };
  };

  const handleSendOrder = async (order) => {
    const deliveryDate = deliveryDates[order.id];

    if (!deliveryDate) {
      if (!confirm('⚠️ No delivery date specified. Send order anyway?')) {
        return;
      }
    }

    setSendingOrder(order.id);

    try {
      // Generate email content
      const { subject, body } = generateEmailContent(order, deliveryDate);

      // 🔹 ComplianceCore: Log email before sending
      await logEmailSent({
        emailType: 'order',
        relatedEntity: 'PurchaseOrder',
        relatedRecordId: order.id,
        recipientEmail: order.supplier_email,
        recipientName: order.supplier_name,
        subject: subject,
        bodyPreview: body,
        containsPersonalData: false,
        sentBy: user,
        sentVia: 'manual',
        deliveryStatus: 'sent',
      });

      // Create mailto: link
      const mailtoLink = `mailto:${order.supplier_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // Open email client
      window.location.href = mailtoLink;

      // Wait a moment for email to open, then update status
      setTimeout(async () => {
        try {
          await updateOrderMutation.mutateAsync({
            id: order.id,
            data: {
              status: 'pending_approval',
              expected_delivery_date: deliveryDate || null,
              email_sent_at: new Date().toISOString(),
            }
          });

          alert(`✅ Email opened! Order ${order.order_number} moved to Pending Approval.\n\nPlease send the email from your email program.`);
        } catch (error) {
          console.error("Error updating order:", error);
          alert("⚠️ Email opened but failed to update order status. Please try again.");
        } finally {
          setSendingOrder(null);
        }
      }, 1000);

    } catch (error) {
      console.error("Error sending order:", error);
      alert("Failed to open email. Please try again.");
      setSendingOrder(null);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderMutation.mutateAsync({
      id: orderId,
      data: { status: newStatus }
    });
  };

  const handleDeleteOrder = async (orderId) => {
    if (confirm('Delete this draft order?')) {
      await deleteOrderMutation.mutateAsync(orderId);
    }
  };

  const handleClearAllDrafts = async () => {
    const draftCount = draftOrders.length;
    
    if (draftCount === 0) {
      alert('No draft orders to clear');
      return;
    }

    if (confirm(`⚠️ Are you sure you want to clear all ${draftCount} draft order(s)?\n\nThis action cannot be undone.`)) {
      await clearDraftOrdersMutation.mutateAsync();
    }
  };

  const handleUpdateQuantity = async (orderId, itemIndex, newQuantity) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = [...order.items];
    const qty = toSafeNumber(newQuantity);
    updatedItems[itemIndex].quantity_ordered = qty;
    updatedItems[itemIndex].line_total = qty * toSafeNumber(updatedItems[itemIndex].unit_cost);

    const subtotal = updatedItems.reduce((sum, item) => sum + toSafeNumber(item.line_total), 0);
    const tax = subtotal * 0.2;
    const total = subtotal + tax;

    await updateOrderMutation.mutateAsync({
      id: orderId,
      data: {
        items: updatedItems,
        subtotal: toSafeNumber(subtotal),
        tax: toSafeNumber(tax),
        total: toSafeNumber(total),
      }
    });
  };

  const handleRemoveItem = async (orderId, itemIndex) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.filter((_, idx) => idx !== itemIndex);

    if (updatedItems.length === 0) {
      await handleDeleteOrder(orderId);
      return;
    }

    const subtotal = updatedItems.reduce((sum, item) => sum + toSafeNumber(item.line_total), 0);
    const tax = subtotal * 0.2;
    const total = subtotal + tax;

    await updateOrderMutation.mutateAsync({
      id: orderId,
      data: {
        items: updatedItems,
        subtotal: toSafeNumber(subtotal),
        tax: toSafeNumber(tax),
        total: toSafeNumber(total),
      }
    });
  };

  const OrderCard = ({ order, showActions = true }) => (
    <Card className="bg-white border-none shadow-sm">
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
            {order.email_sent_at && (
              <p className="text-xs text-green-600 mt-1">
                ✉️ Email sent: {format(new Date(order.email_sent_at), 'PPP p')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={
              order.status === 'sent' || order.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
              order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
              order.status === 'partially_received' ? 'bg-purple-100 text-purple-800' :
              order.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              'bg-gray-100 text-gray-800' // Default or other statuses
            }>
              {order.status.replace(/_/g, ' ')}
            </Badge>
            {order.status === 'draft' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteOrder(order.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            )}
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
                  £{safeNumber(item.unit_cost, 2)} per {item.unit}
                </p>
              </div>
              {order.status === 'draft' ? (
                <>
                  <Input
                    type="number"
                    step="0.01"
                    value={toSafeNumber(item.quantity_ordered, 2)}
                    onChange={(e) => handleUpdateQuantity(order.id, index, e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600 w-16">{item.unit}</span>
                  <span className="font-semibold text-gray-900 w-24 text-right">
                    £{safeNumber(item.line_total, 2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(order.id, index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="font-semibold text-gray-900">{safeNumber(item.quantity_ordered, 2)} {item.unit}</span>
                  <span className="font-semibold text-gray-900 w-24 text-right">
                    £{safeNumber(item.line_total, 2)}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium text-gray-900">£{safeNumber(order.subtotal, 2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">VAT (20%):</span>
            <span className="font-medium text-gray-900">£{safeNumber(order.tax, 2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span className="text-gray-900">Total:</span>
            <span className="text-green-700">£{safeNumber(order.total, 2)}</span>
          </div>
        </div>

        {showActions && order.status === 'draft' && (
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
                  <>Opening Email...</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Open Email & Send Order
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {showActions && order.status === 'pending_approval' && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 mb-3">
              ⏳ Awaiting supplier confirmation. Once confirmed, mark as:
            </p>
            <Button
              size="sm"
              onClick={() => handleStatusChange(order.id, 'confirmed')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              ✓ Mark as Confirmed
            </Button>
          </div>
        )}

        {showActions && order.status === 'confirmed' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-3">
              📦 Order confirmed by supplier. Waiting for delivery.
            </p>
            <Button
              size="sm"
              onClick={() => handleStatusChange(order.id, 'partially_received')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Mark as Delivered
            </Button>
          </div>
        )}

        {showActions && order.status === 'partially_received' && (
          <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800 mb-3">
              📋 Delivery received. Go to Order History to verify and complete.
            </p>
            <Link to={createPageUrl('OrderHistory')}>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                Go to Order History →
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );

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
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Orders</h1>
              <p className="text-gray-600">Manage orders through their complete lifecycle</p>
            </div>
            {draftOrders.length > 0 && (
              <Button
                onClick={handleClearAllDrafts}
                variant="outline"
                className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200"
                disabled={clearDraftOrdersMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {clearDraftOrdersMutation.isPending ? 'Clearing...' : `Clear All Drafts (${draftOrders.length})`}
              </Button>
            )}
          </div>

          {draftOrders.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ShoppingCart className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">
                    📋 {draftOrders.length} Draft Order{draftOrders.length !== 1 ? 's' : ''} Ready
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Review quantities and delivery dates, then send to suppliers via email.
                  </p>
                </div>
              </div>
            </div>
          )}
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
              <p className="text-gray-500 mb-4">No draft orders yet</p>
              <p className="text-sm text-gray-400 mb-6">
                Add items to cart from Inventory Management or create orders from Production Planning
              </p>
              <div className="flex gap-3 justify-center">
                <Link to={createPageUrl("InventoryManagement")}>
                  <Button variant="outline">Go to Inventory</Button>
                </Link>
                <Link to={createPageUrl("ProductionPlanning")}>
                  <Button className="bg-green-600 hover:bg-green-700">Production Planning</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Draft Orders ({draftOrders.length})
            </h2>
            {draftOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
