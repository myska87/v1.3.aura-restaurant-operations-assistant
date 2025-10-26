
import React, { useState, useEffect } from "react";
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
import { useToast } from "@/components/ui/use-toast";

export default function Ordering() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [sendingOrder, setSendingOrder] = useState(null);
  const [deliveryDates, setDeliveryDates] = useState({});

  // Dummy user object for email logging. In a real app, this would come from an AuthContext or similar.
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

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
      toast({
        title: "✅ Drafts Cleared",
        description: `Successfully cleared ${count} draft order(s)`,
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Error clearing drafts:', error);
      toast({
        title: "❌ Failed to Clear Drafts",
        description: "Please try again",
        variant: "destructive",
        duration: 4000,
      });
    }
  });

  const sendOrderEmailMutation = useMutation({
    mutationFn: async ({ order, deliveryDate, retryCount = 0 }) => {
      // Generate professional HTML email
      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .header { background: linear-gradient(135deg, #014D40 0%, #10b981 100%); color: white; padding: 40px 30px; text-align: center; }
    .logo { font-size: 36px; font-weight: bold; margin-bottom: 10px; letter-spacing: 2px; }
    .tagline { font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 30px; background: #f9fafb; }
    .order-box { background: white; padding: 30px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #014D40; }
    .order-header { border-bottom: 2px solid #014D40; padding-bottom: 20px; margin-bottom: 25px; }
    .order-number { font-size: 28px; font-weight: bold; color: #014D40; margin-bottom: 5px; }
    .order-date { color: #6b7280; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 25px 0; }
    th { background: linear-gradient(135deg, #014D40 0%, #016854 100%); color: white; padding: 15px; text-align: left; font-weight: 600; }
    td { padding: 15px; border-bottom: 1px solid #e5e7eb; }
    .item-name { font-weight: 600; color: #111827; }
    .totals { background: #f3f4f6; padding: 25px; border-radius: 10px; margin-top: 25px; }
    .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; }
    .grand-total { font-size: 28px; font-weight: bold; color: #014D40; border-top: 3px solid #014D40; padding-top: 20px; margin-top: 15px; }
    .delivery-info { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #3b82f6; }
    .action-required { background: #fef3c7; border-left: 4px solid #E0B037; padding: 20px; margin: 25px 0; border-radius: 10px; }
    .footer { background: #014D40; color: white; text-align: center; padding: 30px; margin-top: 30px; }
    .footer-logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #E0B037; }
    .signature-line { border-top: 2px solid #333; width: 300px; margin: 30px auto 10px; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🌟 AURA One Pro</div>
    <p class="tagline" style="margin: 0;">Restaurant Operations Assistant</p>
    <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: 500;">Purchase Order Request</p>
  </div>
  
  <div class="content">
    <div class="order-box">
      <div class="order-header">
        <div class="order-number">Purchase Order: ${order.order_number}</div>
        <div class="order-date">📅 Order Date: ${format(new Date(), "EEEE, MMMM d, yyyy 'at' h:mm a")}</div>
      </div>

      <p style="font-size: 16px; line-height: 1.8;">Dear <strong>${order.supplier_name}</strong>,</p>
      <p style="font-size: 16px; line-height: 1.8;">We are pleased to submit the following purchase order. Please review the details below and confirm receipt at your earliest convenience.</p>

      ${deliveryDate ? `
      <div class="delivery-info">
        <strong style="font-size: 18px;">📦 Requested Delivery Date:</strong><br>
        <span style="font-size: 20px; font-weight: bold; color: #1e40af;">${format(new Date(deliveryDate), 'EEEE, MMMM d, yyyy')}</span>
      </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Item Description</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map((item, index) => `
            <tr style="${index % 2 === 0 ? 'background: #f9fafb;' : ''}">
              <td class="item-name">${item.ingredient_name}</td>
              <td style="text-align: center; font-weight: 600;">${item.quantity_ordered} ${item.unit}</td>
              <td style="text-align: right;">£${item.unit_cost.toFixed(2)}</td>
              <td style="text-align: right;"><strong style="color: #014D40;">£${item.line_total.toFixed(2)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span style="font-weight: 600;">£${order.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>VAT (20%):</span>
          <span style="font-weight: 600;">£${order.tax.toFixed(2)}</span>
        </div>
        <div class="total-row grand-total">
          <span>GRAND TOTAL:</span>
          <span>£${order.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="action-required">
        <strong style="font-size: 18px; color: #92400e;">⚠️ Action Required:</strong>
        <p style="margin: 15px 0 10px 0; font-size: 15px;">Please confirm receipt of this order and provide the following information:</p>
        <ul style="margin: 10px 0 0 20px; font-size: 15px; line-height: 1.8;">
          <li><strong>Order Confirmation Number</strong></li>
          <li><strong>Expected Delivery Date</strong>${deliveryDate ? ' (or confirm requested date above)' : ''}</li>
          <li><strong>Any pricing or availability changes</strong></li>
        </ul>
      </div>

      ${order.notes ? `
      <div style="margin-top: 25px; padding: 20px; background: #f3f4f6; border-radius: 10px; border-left: 4px solid #6b7280;">
        <strong style="font-size: 16px; color: #374151;">📝 Additional Notes:</strong>
        <p style="margin: 10px 0 0 0; font-size: 15px; line-height: 1.8;">${order.notes}</p>
      </div>
      ` : ''}

      <div class="signature-line">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Authorized Signature</p>
      </div>
    </div>

    <div style="background: white; padding: 20px; border-radius: 10px; margin-top: 20px;">
      <p style="font-size: 15px; line-height: 1.8;">Should you have any questions regarding this order, please do not hesitate to contact us.</p>
      <p style="font-size: 15px; line-height: 1.8; margin-top: 15px;"><strong>Thank you for your continued partnership.</strong></p>
      <p style="font-size: 15px; color: #6b7280; margin-top: 10px;">Best regards,<br><strong style="color: #014D40;">AURA One Pro Management Team</strong></p>
    </div>
  </div>

  <div class="footer">
    <div class="footer-logo">AURA One Pro</div>
    <p style="margin: 5px 0; font-size: 13px; opacity: 0.9;">Restaurant Operations Excellence</p>
    <p style="margin: 15px 0 5px 0; font-size: 12px; opacity: 0.8;">This is an automated message from AURA One Pro System</p>
    <p style="margin: 0; font-size: 12px; opacity: 0.8;">Order generated: ${format(new Date(), "PPP 'at' p")}</p>
  </div>
</body>
</html>
      `;

      const emailSubject = `🛒 Purchase Order ${order.order_number} from AURA One Pro`;

      try {
        // Send email using base44 integration
        await base44.integrations.Core.SendEmail({
          from_name: 'AURA One Pro',
          to: order.supplier_email,
          subject: emailSubject,
          body: emailBody,
        });

        // Log the email
        await base44.entities.EmailLog.create({
          email_type: 'purchase_order',
          recipient_email: order.supplier_email,
          recipient_name: order.supplier_name,
          sender_email: user?.email || 'system@aura.com', // Using fetched user
          sender_name: user?.full_name || 'AURA System', // Using fetched user
          subject: emailSubject,
          body_html: emailBody,
          related_order_id: order.id,
          sent_at: new Date().toISOString(),
          status: 'sent',
          metadata: {
            order_number: order.order_number,
            order_total: order.total,
            delivery_date: deliveryDate,
            retry_count: retryCount,
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
        console.error('Email send error:', error);

        // Retry logic - up to 3 attempts
        if (retryCount < 3) {
          console.log(`Retrying email send for order ${order.order_number} (attempt ${retryCount + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds before retrying
          return sendOrderEmailMutation.mutateAsync({ order, deliveryDate, retryCount: retryCount + 1 });
        }

        // Log failed email after all retries
        await base44.entities.EmailLog.create({
          email_type: 'purchase_order',
          recipient_email: order.supplier_email,
          recipient_name: order.supplier_name,
          sender_email: user?.email || 'system@aura.com', // Using fetched user
          sender_name: user?.full_name || 'AURA System', // Using fetched user
          subject: emailSubject,
          body_html: emailBody,
          related_order_id: order.id,
          sent_at: new Date().toISOString(),
          status: 'failed',
          error_message: error.message,
          metadata: {
            order_number: order.order_number,
            retry_count: retryCount,
          }
        });

        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
      setSendingOrder(null);
      toast({
        title: "✅ Order Sent Successfully!",
        description: "Email delivered to supplier with order details",
        duration: 4000,
      });
    },
    onError: (error) => {
      console.error('Failed to send order:', error);
      setSendingOrder(null);
      toast({
        title: "⚠️ Email Failed to Send",
        description: "Please try again or contact the supplier directly",
        variant: "destructive",
        duration: 5000,
      });
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
      toast({
        title: "❌ Missing Supplier Email",
        description: "Please add supplier email before sending",
        variant: "destructive",
        duration: 4000,
      });
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
      toast({
        title: "No Draft Orders",
        description: "There are no draft orders to clear.",
        duration: 2000,
      });
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
      <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
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
                <div className="flex items-center gap-2 mt-2">
                  <Mail className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-green-600 font-medium">
                    Email sent: {format(new Date(order.email_sent_at), 'PPP p')}
                  </p>
                </div>
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
                  className="hover:bg-red-50"
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
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor={`delivery-${order.id}`} className="text-sm text-gray-700 font-medium">
                  Expected Delivery Date
                </Label>
                <Input
                  id={`delivery-${order.id}`}
                  type="date"
                  value={deliveryDates[order.id] || ''}
                  onChange={(e) => setDeliveryDates({ ...deliveryDates, [order.id]: e.target.value })}
                  className="mt-2"
                />
              </div>
              <Button
                onClick={() => handleSendOrder(order)}
                disabled={sendingOrder === order.id || !order.supplier_email}
                className="w-full bg-gradient-to-r from-[#014D40] to-[#016854] hover:from-[#016854] hover:to-[#014D40] text-white font-semibold shadow-lg"
                size="lg"
              >
                {sendingOrder === order.id ? (
                  <>
                    <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Send Order via Email
                  </>
                )}
              </Button>
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
              <Link to={createPageUrl("OrderHistory")}> {/* Assuming OrderHistory is where delivery actions happen */}
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(order.id, 'partially_received')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Mark as Delivered
                </Button>
              </Link>
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
                <Mail className="w-4 h-4 text-[#014D40]" />
                Email Communication Log
              </h4>
              <div className="space-y-2">
                {orderLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded-lg text-sm border ${
                      log.status === 'sent' ? 'bg-green-50 border-green-200' :
                      log.status === 'failed' ? 'bg-red-50 border-red-200' :
                      'bg-gray-50 border-gray-200'
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
                        {log.metadata?.retry_count > 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            🔄 Retried {log.metadata.retry_count} time(s)
                          </p>
                        )}
                      </div>
                      {log.status === 'sent' && (
                        <Badge className="bg-green-100 text-green-800 text-xs border-green-200">
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
