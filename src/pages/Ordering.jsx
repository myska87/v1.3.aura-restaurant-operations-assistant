
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Send, Trash2, ArrowLeft, Home, Mail, Truck, Clock } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Ordering() {
  const queryClient = useQueryClient();
  const [sendingOrder, setSendingOrder] = useState(null);
  const [deliveryDates, setDeliveryDates] = useState({});

  // Dummy user object for email logging. In a real app, this would come from an AuthContext or similar.
  const user = { email: 'admin@aurarestaurant.com', full_name: 'AURA Admin' };

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date'),
  });

  // Add query for email logs
  const { data: emailLogs = [] } = useQuery({
    queryKey: ['emailLogs'],
    queryFn: () => base44.entities.EmailLog.list('-sent_at', 100),
    staleTime: 2 * 60 * 1000,
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

  const clearDraftOrdersMutation = useMutation({
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

  const sendOrderEmailMutation = useMutation({
    mutationFn: async ({ order, deliveryDate }) => {
      // Generate professional HTML email
      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #014D40 0%, #10b981 100%); color: white; padding: 30px; text-align: center; }
    .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
    .content { padding: 30px; background: #f9fafb; }
    .order-box { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .order-header { border-bottom: 2px solid #014D40; padding-bottom: 15px; margin-bottom: 20px; }
    .order-number { font-size: 24px; font-weight: bold; color: #014D40; }
    .order-date { color: #6b7280; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .item-name { font-weight: 500; color: #111827; }
    .totals { background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .grand-total { font-size: 24px; font-weight: bold; color: #014D40; border-top: 2px solid #014D40; padding-top: 15px; margin-top: 10px; }
    .delivery-info { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .action-required { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🌟 AURA Restaurant</div>
    <p style="margin: 0; font-size: 18px;">Purchase Order Request</p>
  </div>
  
  <div class="content">
    <div class="order-box">
      <div class="order-header">
        <div class="order-number">Purchase Order: ${order.order_number}</div>
        <div class="order-date">Order Date: ${format(new Date(), "PPP 'at' p")}</div>
      </div>

      <p>Dear <strong>${order.supplier_name}</strong>,</p>
      <p>Please find our purchase order details below. We kindly request you to confirm receipt and provide expected delivery information.</p>

      ${deliveryDate ? `
      <div class="delivery-info">
        <strong>📦 Requested Delivery Date:</strong> ${format(new Date(deliveryDate), 'EEEE, MMMM d, yyyy')}
      </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td class="item-name">${item.ingredient_name}</td>
              <td style="text-align: center;">${item.quantity_ordered} ${item.unit}</td>
              <td style="text-align: right;">£${item.unit_cost.toFixed(2)}</td>
              <td style="text-align: right;"><strong>£${item.line_total.toFixed(2)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span><strong>£${order.subtotal.toFixed(2)}</strong></span>
        </div>
        <div class="total-row">
          <span>VAT (20%):</span>
          <span><strong>£${order.tax.toFixed(2)}</strong></span>
        </div>
        <div class="total-row grand-total">
          <span>GRAND TOTAL:</span>
          <span>£${order.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="action-required">
        <strong>⚠️ Action Required:</strong>
        <p style="margin: 10px 0 0 0;">Please confirm receipt of this order and provide:</p>
        <ul style="margin: 10px 0 0 20px;">
          <li>Order confirmation number</li>
          <li>Expected delivery date${deliveryDate ? ' (or confirm requested date above)' : ''}</li>
          <li>Any changes to pricing or availability</li>
        </ul>
      </div>

      ${order.notes ? `
      <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
        <strong>Additional Notes:</strong>
        <p style="margin: 10px 0 0 0;">${order.notes}</p>
      </div>
      ` : ''}
    </div>

    <p>If you have any questions or concerns about this order, please contact us immediately.</p>
    
    <p>Thank you for your continued service.</p>
    
    <p><strong>Best regards,</strong><br>
    AURA Restaurant Management Team</p>
  </div>

  <div class="footer">
    <p>This is an automated message from AURA Restaurant Operations System.</p>
    <p>Order generated at ${format(new Date(), "PPP 'at' p")}</p>
  </div>
</body>
</html>
      `;

      const emailSubject = `Purchase Order ${order.order_number} from AURA Restaurant`;

      // Send email using base44 integration
      try {
        await base44.integrations.Core.SendEmail({
          from_name: 'AURA Restaurant',
          to: order.supplier_email,
          subject: emailSubject,
          body: emailBody,
        });

        // Log the email
        await base44.entities.EmailLog.create({
          email_type: 'purchase_order',
          recipient_email: order.supplier_email,
          recipient_name: order.supplier_name,
          sender_email: user.email, // Assuming 'user' object is available from context/auth
          sender_name: user.full_name, // Assuming 'user' object is available from context/auth
          subject: emailSubject,
          body_html: emailBody,
          related_order_id: order.id,
          sent_at: new Date().toISOString(),
          status: 'sent',
          metadata: {
            order_number: order.order_number,
            order_total: order.total,
            delivery_date: deliveryDate,
          }
        });

        // Update order status
        await updateOrderMutation.mutateAsync({
          id: order.id,
          data: {
            status: 'pending_approval',
            expected_delivery_date: deliveryDate || null,
            email_sent_at: new Date().toISOString(),
            sent_at: new Date().toISOString(),
          }
        });

        return { success: true };
      } catch (error) {
        // Log failed email
        await base44.entities.EmailLog.create({
          email_type: 'purchase_order',
          recipient_email: order.supplier_email,
          recipient_name: order.supplier_name,
          sender_email: user.email, // Assuming 'user' object is available
          sender_name: user.full_name, // Assuming 'user' object is available
          subject: emailSubject,
          body_html: emailBody,
          related_order_id: order.id,
          sent_at: new Date().toISOString(),
          status: 'failed',
          error_message: error.message,
          metadata: {
            order_number: order.order_number,
          }
        });

        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
      setSendingOrder(null);
      alert('✅ Order sent successfully to supplier!');
    },
    onError: (error) => {
      console.error('Failed to send order:', error);
      setSendingOrder(null);
      alert('❌ Failed to send order. Please try again or contact the supplier directly.');
    }
  });

  const handleSendOrder = async (order) => {
    const deliveryDate = deliveryDates[order.id];

    if (!deliveryDate) {
      if (!confirm('⚠️ No delivery date specified. Send order anyway?')) {
        return;
      }
    }

    if (!order.supplier_email) {
      alert('❌ Supplier email not found. Please add supplier email before sending.');
      return;
    }

    setSendingOrder(order.id);
    
    try {
      await sendOrderEmailMutation.mutateAsync({ order, deliveryDate });
    } catch (error) {
      console.error('Error:', error);
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
    updatedItems[itemIndex].quantity_ordered = parseFloat(newQuantity);
    updatedItems[itemIndex].line_total = updatedItems[itemIndex].quantity_ordered * updatedItems[itemIndex].unit_cost;

    const subtotal = updatedItems.reduce((sum, item) => sum + item.line_total, 0);
    const tax = subtotal * 0.2;
    const total = subtotal + tax;

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
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.filter((_, idx) => idx !== itemIndex);

    if (updatedItems.length === 0) {
      await handleDeleteOrder(orderId);
      return;
    }

    const subtotal = updatedItems.reduce((sum, item) => sum + item.line_total, 0);
    const tax = subtotal * 0.2;
    const total = subtotal + tax;

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

  const getOrderEmailLogs = (orderId) => {
    return emailLogs.filter(log => log.related_order_id === orderId);
  };

  const OrderCard = ({ order, showActions = true }) => {
    const orderLogs = getOrderEmailLogs(order.id);

    return (
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
                    £{item.unit_cost.toFixed(2)} per {item.unit}
                  </p>
                </div>
                {order.status === 'draft' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-gray-900">{item.quantity_ordered} {item.unit}</span>
                    <span className="font-semibold text-gray-900 w-24 text-right">
                      £{item.line_total.toFixed(2)}
                    </span>
                  </>
                )}
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
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Order via Email
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

          {/* Email Logs Section */}
          {orderLogs.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Communication Log
              </h4>
              <div className="space-y-2">
                {orderLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded-lg text-sm ${
                      log.status === 'sent' ? 'bg-green-50 border border-green-200' :
                      log.status === 'failed' ? 'bg-red-50 border border-red-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {log.status === 'sent' && '✅ '}
                          {log.status === 'failed' && '❌ '}
                          {log.status === 'pending' && '⏳ '}
                          {log.subject}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          To: {log.recipient_email}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Sent by {log.sender_name} on {format(new Date(log.sent_at), 'PPP p')}
                        </p>
                        {log.error_message && (
                          <p className="text-xs text-red-600 mt-1">
                            Error: {log.error_message}
                          </p>
                        )}
                      </div>
                      {log.status === 'sent' && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Delivered
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
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
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <ShoppingCart className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">
                    📋 {draftOrders.length} Draft Order{draftOrders.length !== 1 ? 's' : ''} Ready
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Review quantities and delivery dates. Orders will be sent automatically via email to suppliers.
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
