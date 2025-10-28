
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package, 
  CheckCircle, 
  ArrowLeft, 
  Home, 
  Upload,
  AlertTriangle,
  TruckIcon
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const safeNumber = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

export default function OrderHistory() {
  const queryClient = useQueryClient();
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [receivingQuantities, setReceivingQuantities] = useState({});
  const [deliveryNotes, setDeliveryNotes] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date'),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const updateIngredientStockMutation = useMutation({
    mutationFn: ({ id, newStock }) => base44.entities.Ingredient.update(id, { current_stock: newStock }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  // Separate orders by status
  const pendingOrders = allOrders.filter(o => o.status === 'pending_approval');
  const confirmedOrders = allOrders.filter(o => o.status === 'confirmed' || o.status === 'in_delivery');
  const deliveredOrders = allOrders.filter(o => 
    o.status === 'delivered_awaiting_check' || 
    o.status === 'partially_received'
  );
  const completedOrders = allOrders.filter(o => o.status === 'approved_received');

  const handlePhotoUpload = async (orderId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(orderId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const order = allOrders.find(o => o.id === orderId);
      const currentPhotos = order.delivery_photo_urls || [];
      
      await updateOrderMutation.mutateAsync({
        id: orderId,
        data: {
          delivery_photo_urls: [...currentPhotos, file_url],
        }
      });

      alert('✅ Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('❌ Failed to upload photo');
    }
    setUploadingPhoto(null);
  };

  const handleMarkAsDelivered = async (orderId) => {
    await updateOrderMutation.mutateAsync({
      id: orderId,
      data: {
        status: 'delivered_awaiting_check',
        actual_delivery_date: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        received_by: user?.email,
        received_by_name: user?.full_name,
      }
    });
  };

  const handleVerifyDelivery = async (orderId) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    setVerifyingOrder(orderId);

    try {
      // Get received quantities
      const receivedQty = receivingQuantities[orderId] || {};
      
      // Update ingredient stock levels
      const stockUpdatePromises = order.items.map(async (item) => {
        const receivedAmount = safeNumber(receivedQty[item.ingredient_id]) || safeNumber(item.quantity_ordered);
        
        // Fetch current ingredient data
        const ingredients = await base44.entities.Ingredient.filter({ id: item.ingredient_id });
        if (ingredients.length === 0) {
          console.warn(`Ingredient ${item.ingredient_name} not found in inventory`);
          return;
        }

        const ingredient = ingredients[0];
        const currentStock = safeNumber(ingredient.current_stock);
        const newStock = currentStock + receivedAmount;

        console.log(`Updating ${item.ingredient_name}: ${currentStock} + ${receivedAmount} = ${newStock}`);

        // Update stock
        return updateIngredientStockMutation.mutateAsync({
          id: item.ingredient_id,
          newStock: newStock,
        });
      });

      await Promise.all(stockUpdatePromises);

      // Update order items with received quantities
      const updatedItems = order.items.map(item => ({
        ...item,
        quantity_received: safeNumber(receivedQty[item.ingredient_id]) || safeNumber(item.quantity_ordered),
      }));

      // Mark order as verified and received
      await updateOrderMutation.mutateAsync({
        id: orderId,
        data: {
          status: 'approved_received',
          items: updatedItems,
          verified_by: user?.email,
          verified_by_name: user?.full_name,
          verified_at: new Date().toISOString(),
          delivery_notes: deliveryNotes[orderId] || '',
        }
      });

      alert('✅ Delivery verified! Inventory stock updated successfully.');
      
      // Clear form state
      const newQuantities = { ...receivingQuantities };
      delete newQuantities[orderId];
      setReceivingQuantities(newQuantities);
      
      const newNotes = { ...deliveryNotes };
      delete newNotes[orderId];
      setDeliveryNotes(newNotes);

    } catch (error) {
      console.error('Error verifying delivery:', error);
      alert('❌ Failed to verify delivery. Please try again.');
    }
    
    setVerifyingOrder(null);
  };

  const handleUpdateReceivedQuantity = (orderId, ingredientId, value) => {
    setReceivingQuantities({
      ...receivingQuantities,
      [orderId]: {
        ...(receivingQuantities[orderId] || {}),
        [ingredientId]: parseFloat(value) || 0,
      }
    });
  };

  const OrderCard = ({ order, showVerification = false }) => (
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
            {order.actual_delivery_date && (
              <p className="text-xs text-green-600 mt-1">
                📦 Delivered: {format(new Date(order.actual_delivery_date), 'PPP p')}
              </p>
            )}
          </div>
          <Badge className={
            order.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
            order.status === 'confirmed' || order.status === 'in_delivery' ? 'bg-blue-100 text-blue-800' :
            order.status === 'delivered_awaiting_check' || order.status === 'partially_received' ? 'bg-purple-100 text-purple-800' :
            order.status === 'approved_received' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }>
            {order.status.replace(/_/g, ' ')}
          </Badge>
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
              
              {showVerification ? (
                <>
                  <div className="flex flex-col items-center">
                    <Label className="text-xs text-gray-600 mb-1">Ordered</Label>
                    <span className="font-semibold text-gray-900">{item.quantity_ordered} {item.unit}</span>
                  </div>
                  <div className="flex flex-col">
                    <Label className="text-xs text-gray-600 mb-1">Received</Label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={item.quantity_ordered}
                      onChange={(e) => handleUpdateReceivedQuantity(order.id, item.ingredient_id, e.target.value)}
                      className="w-24"
                    />
                  </div>
                  <span className="font-semibold text-gray-900 w-24 text-right">
                    £{item.line_total.toFixed(2)}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-gray-900">
                    {item.quantity_received || item.quantity_ordered} {item.unit}
                  </span>
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

        {/* Delivery Photos */}
        {order.delivery_photo_urls && order.delivery_photo_urls.length > 0 && (
          <div className="mt-4">
            <Label className="text-sm text-gray-700 mb-2">Delivery Photos</Label>
            <div className="flex gap-2 flex-wrap">
              {order.delivery_photo_urls.map((url, idx) => (
                <img key={idx} src={url} alt="Delivery" className="w-24 h-24 object-cover rounded border" />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons Based on Status */}
        {order.status === 'confirmed' && (
          <div className="mt-6 space-y-3">
            <div>
              <Label htmlFor={`photo-${order.id}`}>Upload Delivery Photo (Optional)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id={`photo-${order.id}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(order.id, e)}
                  disabled={uploadingPhoto === order.id}
                />
                <Button
                  onClick={() => handleMarkAsDelivered(order.id)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <TruckIcon className="w-4 h-4 mr-2" />
                  Mark as Delivered
                </Button>
              </div>
            </div>
          </div>
        )}

        {showVerification && (order.status === 'delivered_awaiting_check' || order.status === 'partially_received') && (
          <div className="mt-6 space-y-3">
            <div>
              <Label htmlFor={`notes-${order.id}`}>Delivery Notes</Label>
              <Textarea
                id={`notes-${order.id}`}
                value={deliveryNotes[order.id] || ''}
                onChange={(e) => setDeliveryNotes({ ...deliveryNotes, [order.id]: e.target.value })}
                placeholder="Any issues or notes about this delivery..."
                rows={2}
              />
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                ✅ Verifying this delivery will automatically update your ingredient stock levels
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => handleVerifyDelivery(order.id)}
              disabled={verifyingOrder === order.id}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {verifyingOrder === order.id ? (
                <>Updating Stock...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify & Update Stock
                </>
              )}
            </Button>
          </div>
        )}

        {order.status === 'approved_received' && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              ✅ Delivery verified by {order.verified_by_name || 'Manager'}
            </p>
            {order.verified_at && (
              <p className="text-xs text-green-700 mt-1">
                {format(new Date(order.verified_at), 'PPP p')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("InventoryDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order History</h1>
          <p className="text-gray-600">Track and verify deliveries</p>
        </div>

        <Tabs defaultValue="awaiting" className="space-y-6">
          <TabsList className="bg-white p-1 rounded-lg shadow-sm">
            <TabsTrigger value="awaiting" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Package className="w-4 h-4 mr-2" />
              Awaiting Verification ({deliveredOrders.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              Pending ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="in-transit" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              In Transit ({confirmedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="awaiting" className="space-y-4">
            {deliveredOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No deliveries awaiting verification</p>
                </CardContent>
              </Card>
            ) : (
              deliveredOrders.map(order => (
                <OrderCard key={order.id} order={order} showVerification={true} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No pending orders</p>
                </CardContent>
              </Card>
            ) : (
              pendingOrders.map(order => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>

          <TabsContent value="in-transit" className="space-y-4">
            {confirmedOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No orders in transit</p>
                </CardContent>
              </Card>
            ) : (
              confirmedOrders.map(order => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No completed orders yet</p>
                </CardContent>
              </Card>
            ) : (
              completedOrders.map(order => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
