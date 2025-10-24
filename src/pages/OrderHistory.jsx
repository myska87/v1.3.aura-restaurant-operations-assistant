import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Camera, Check, Package, FileText } from "lucide-react";
import { format } from "date-fns";

export default function OrderHistory() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkInData, setCheckInData] = useState({
    delivery_notes: "",
    delivery_photo_urls: [],
    items_received: {},
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list("-order_date"),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setShowCheckIn(false);
      setSelectedOrder(null);
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCheckInData(prev => ({
        ...prev,
        delivery_photo_urls: [...prev.delivery_photo_urls, file_url]
      }));
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
    setUploading(false);
  };

  const handleCheckIn = (order) => {
    setSelectedOrder(order);
    const itemsReceived = {};
    order.items.forEach(item => {
      itemsReceived[item.ingredient_id] = item.quantity_ordered;
    });
    setCheckInData({
      delivery_notes: "",
      delivery_photo_urls: [],
      items_received: itemsReceived,
    });
    setShowCheckIn(true);
  };

  const handleSubmitCheckIn = async () => {
    if (!selectedOrder) return;

    // Update order status
    const updatedItems = selectedOrder.items.map(item => ({
      ...item,
      quantity_received: parseFloat(checkInData.items_received[item.ingredient_id] || 0),
    }));

    const allReceived = updatedItems.every(
      item => item.quantity_received === item.quantity_ordered
    );

    const orderUpdate = {
      status: allReceived ? "received" : "partially_received",
      items: updatedItems,
      actual_delivery_date: new Date().toISOString(),
      delivery_notes: checkInData.delivery_notes,
      delivery_photo_urls: checkInData.delivery_photo_urls,
      received_by: user?.email,
    };

    await updateOrderMutation.mutateAsync({
      id: selectedOrder.id,
      data: orderUpdate
    });

    // Update ingredient stock levels
    for (const item of updatedItems) {
      if (item.quantity_received > 0) {
        const { data: ingredients } = await base44.entities.Ingredient.filter({
          id: item.ingredient_id
        });
        
        if (ingredients[0]) {
          const currentStock = ingredients[0].current_stock || 0;
          const newStock = currentStock + item.quantity_received;
          
          await base44.entities.Ingredient.update(item.ingredient_id, {
            current_stock: newStock
          });
        }
      }
    }

    alert('Delivery checked in successfully! Stock levels updated.');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'partially_received':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'received':
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order History</h1>
          <p className="text-gray-600">Track purchase orders and deliveries</p>
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
          ) : orders.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No orders yet</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg font-bold text-gray-900">
                          {order.order_number}
                        </CardTitle>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{order.supplier_name}</p>
                      <p className="text-xs text-gray-500">
                        Ordered: {format(new Date(order.order_date), "PPP")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">£{order.total?.toFixed(2)}</p>
                      {order.expected_delivery_date && (
                        <p className="text-xs text-gray-600 mt-1">
                          Expected: {format(new Date(order.expected_delivery_date), "PPP")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2 mb-4">
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-900">{item.ingredient_name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">
                            {item.quantity_ordered} {item.unit}
                          </span>
                          {item.quantity_received !== undefined && (
                            <span className="text-green-600 font-medium">
                              Received: {item.quantity_received} {item.unit}
                            </span>
                          )}
                          <span className="font-medium text-gray-900 w-20 text-right">
                            £{item.line_total?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.delivery_notes && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <p className="text-xs text-gray-600 mb-1">Delivery Notes:</p>
                      <p className="text-sm text-gray-900">{order.delivery_notes}</p>
                    </div>
                  )}

                  {order.delivery_photo_urls?.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {order.delivery_photo_urls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt="Delivery"
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  {(order.status === 'sent' || order.status === 'confirmed') && (
                    <Button
                      onClick={() => handleCheckIn(order)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Check In Delivery
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Check-In Dialog */}
        <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Check In Delivery - {selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="space-y-3">
                <Label>Received Quantities</Label>
                {selectedOrder?.items?.map((item) => (
                  <div key={item.ingredient_id} className="flex items-center gap-4">
                    <span className="flex-1 text-sm text-gray-900">{item.ingredient_name}</span>
                    <span className="text-sm text-gray-600">Ordered: {item.quantity_ordered} {item.unit}</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={checkInData.items_received[item.ingredient_id] || ""}
                      onChange={(e) => setCheckInData({
                        ...checkInData,
                        items_received: {
                          ...checkInData.items_received,
                          [item.ingredient_id]: e.target.value
                        }
                      })}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600 w-12">{item.unit}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Delivery Notes</Label>
                <Textarea
                  value={checkInData.delivery_notes}
                  onChange={(e) => setCheckInData({ ...checkInData, delivery_notes: e.target.value })}
                  placeholder="Any issues, damages, or observations..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Photos</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('delivery-photo-upload').click()}
                    disabled={uploading}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Add Photo'}
                  </Button>
                  <input
                    id="delivery-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {checkInData.delivery_photo_urls.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {checkInData.delivery_photo_urls.length} photo(s) added
                    </span>
                  )}
                </div>
                {checkInData.delivery_photo_urls.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {checkInData.delivery_photo_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="Delivery"
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCheckIn(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitCheckIn}
                  disabled={updateOrderMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {updateOrderMutation.isPending ? 'Processing...' : 'Confirm Check-In'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}