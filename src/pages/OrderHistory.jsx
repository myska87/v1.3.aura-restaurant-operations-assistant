import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Package, CheckCircle, XCircle, Clock, Camera, ArrowLeft, Home, Truck } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function OrderHistory() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [verificationData, setVerificationData] = useState({
    photo_url: "",
    notes: "",
    all_verified: false,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date'),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const updateIngredientStockMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ingredient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVerificationData({ ...verificationData, photo_url: file_url });
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo");
    }
    setUploadingPhoto(false);
  };

  const handleStartVerification = (order) => {
    setVerifyingOrder(order);
    setVerificationData({
      photo_url: "",
      notes: "",
      all_verified: false,
    });
    setShowVerificationDialog(true);
  };

  const handleCompleteVerification = async () => {
    if (!verifyingOrder) return;

    if (!verificationData.photo_url || !verificationData.notes || !verificationData.all_verified) {
      alert("⚠️ Please complete all verification steps:\n• Upload delivery photo\n• Add notes/comments\n• Confirm all items verified");
      return;
    }

    try {
      // Update order status
      await updateOrderMutation.mutateAsync({
        id: verifyingOrder.id,
        data: {
          status: 'approved_received',
          actual_delivery_date: new Date().toISOString(),
          delivery_photo_urls: [verificationData.photo_url],
          delivery_notes: verificationData.notes,
          verified_by: user?.email,
          verified_by_name: user?.full_name,
          verified_at: new Date().toISOString(),
        }
      });

      // Update stock levels for each ingredient
      for (const item of verifyingOrder.items) {
        const ingredient = ingredients.find(ing => ing.id === item.ingredient_id);
        if (ingredient) {
          const newStock = ingredient.current_stock + item.quantity_ordered;
          await updateIngredientStockMutation.mutateAsync({
            id: ingredient.id,
            data: {
              current_stock: newStock,
              last_order_date: new Date().toISOString(),
            }
          });
        }
      }

      alert(`✅ Delivery verified successfully by ${user?.full_name}!\n\nStock levels have been updated automatically.`);
      setShowVerificationDialog(false);
      setVerifyingOrder(null);
      
    } catch (error) {
      console.error("Error completing verification:", error);
      alert("Failed to complete verification. Please try again.");
    }
  };

  const handleStatusChange = async (order, newStatus) => {
    const updateData = {
      status: newStatus,
    };

    // Add timestamps and user tracking based on status
    switch (newStatus) {
      case 'pending_approval':
        updateData.sent_at = new Date().toISOString();
        break;
      case 'in_delivery':
        updateData.in_delivery_at = new Date().toISOString();
        break;
      case 'delivered_awaiting_check':
        updateData.delivered_at = new Date().toISOString();
        updateData.received_by = user?.email;
        updateData.received_by_name = user?.full_name;
        break;
    }

    try {
      await updateOrderMutation.mutateAsync({
        id: order.id,
        data: updateData
      });

      alert(`✅ Order status updated to "${newStatus.replace(/_/g, ' ')}" by ${user?.full_name}`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending_approval':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'in_delivery':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered_awaiting_check':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'approved_received':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order History</h1>
            <p className="text-gray-600">Track all purchase orders and verify deliveries</p>
          </div>
        </div>

        {/* Filter */}
        <Card className="bg-white mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="in_delivery">In Delivery</SelectItem>
                  <SelectItem value="delivered_awaiting_check">Awaiting Check</SelectItem>
                  <SelectItem value="approved_received">Approved & Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-200 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No orders found</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="bg-white border-none shadow-sm">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        Order #{order.order_number}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{order.supplier_name}</p>
                      <div className="text-xs text-gray-500 mt-2 space-y-1">
                        <p>📅 Ordered: {format(new Date(order.order_date), "PPP")}</p>
                        {order.sent_at && (
                          <p>✉️ Sent: {format(new Date(order.sent_at), "PPP p")}</p>
                        )}
                        {order.in_delivery_at && (
                          <p>🚚 In Delivery: {format(new Date(order.in_delivery_at), "PPP p")}</p>
                        )}
                        {order.delivered_at && (
                          <p>📦 Delivered: {format(new Date(order.delivered_at), "PPP p")}</p>
                        )}
                        {order.received_by_name && (
                          <p>👤 Received by: {order.received_by_name}</p>
                        )}
                        {order.verified_at && (
                          <p className="text-green-600">✅ Verified: {format(new Date(order.verified_at), "PPP p")} by {order.verified_by_name}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Items */}
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.ingredient_name} ({item.quantity_ordered} {item.unit})
                        </span>
                        <span className="font-semibold text-gray-900">
                          £{item.line_total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t border-gray-200 pt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">£{order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">VAT:</span>
                      <span className="font-medium">£{order.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                      <span>Total:</span>
                      <span className="text-green-700">£{order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Delivery Photos */}
                  {order.delivery_photo_urls?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Delivery Photos:</p>
                      <div className="flex gap-2">
                        {order.delivery_photo_urls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Delivery"
                            className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Notes */}
                  {order.delivery_notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">Delivery Notes:</p>
                      <p className="text-sm text-gray-600">{order.delivery_notes}</p>
                    </div>
                  )}

                  {/* Status Actions */}
                  {order.status === 'pending_approval' && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800 mb-3">⏳ Awaiting supplier confirmation</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(order, 'in_delivery')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Mark as In Delivery
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(order, 'cancelled')}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          Cancel Order
                        </Button>
                      </div>
                    </div>
                  )}

                  {order.status === 'in_delivery' && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 mb-3">🚚 Order is on the way</p>
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(order, 'delivered_awaiting_check')}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Mark as Delivered - Needs Check
                      </Button>
                    </div>
                  )}

                  {order.status === 'delivered_awaiting_check' && (
                    <div className="mt-4">
                      <Button
                        onClick={() => handleStartVerification(order)}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Delivery Verification
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Verification Dialog */}
        <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Delivery Verification: {verifyingOrder?.order_number}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Photo Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  1. Upload Delivery Photo *
                </Label>
                <div className="flex items-center gap-4">
                  {verificationData.photo_url ? (
                    <img 
                      src={verificationData.photo_url} 
                      alt="Delivery" 
                      className="w-32 h-32 object-cover rounded-lg border-2 border-green-200"
                    />
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('verification-photo').click()}
                    disabled={uploadingPhoto}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploadingPhoto ? 'Uploading...' : verificationData.photo_url ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <input
                    id="verification-photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  2. Add Comments / Notes *
                </Label>
                <Textarea
                  id="notes"
                  value={verificationData.notes}
                  onChange={(e) => setVerificationData({ ...verificationData, notes: e.target.value })}
                  placeholder="E.g., All items received in good condition, packaging intact..."
                  rows={4}
                />
              </div>

              {/* Verification Checkbox */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  3. Confirm Verification *
                </Label>
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="all-verified"
                    checked={verificationData.all_verified}
                    onChange={(e) => setVerificationData({ ...verificationData, all_verified: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="all-verified" className="text-sm font-medium text-blue-900 cursor-pointer">
                    ☑ All items verified and received in good condition
                  </label>
                </div>
              </div>

              {/* User Info */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-sm text-indigo-800">
                  👤 Signing as: <strong>{user?.full_name}</strong> ({user?.email})
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  🕐 Timestamp: {format(new Date(), "PPP p")}
                </p>
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Order Summary:</p>
                <div className="space-y-1">
                  {verifyingOrder?.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.ingredient_name}: {item.quantity_ordered} {item.unit}
                      </span>
                      <span className="font-medium text-gray-900">
                        Stock will increase to: {
                          (ingredients.find(ing => ing.id === item.ingredient_id)?.current_stock || 0) + 
                          item.quantity_ordered
                        } {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowVerificationDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCompleteVerification}
                  disabled={!verificationData.photo_url || !verificationData.notes || !verificationData.all_verified}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Verification & Update Stock
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}