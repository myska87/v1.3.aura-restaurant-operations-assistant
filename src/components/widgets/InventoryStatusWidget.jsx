import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, AlertCircle, TrendingDown, ShoppingCart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function InventoryStatusWidget({ user }) {
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list('-current_stock', 100),
  });

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['pendingOrders'],
    queryFn: async () => {
      const orders = await base44.entities.PurchaseOrder.filter({
        status: { $in: ['draft', 'pending_approval', 'in_delivery'] }
      });
      return orders;
    },
  });

  const lowStock = ingredients.filter(i => i.current_stock <= (i.reorder_point || 0));
  const criticalStock = ingredients.filter(i => i.current_stock === 0);
  const stockValue = ingredients.reduce((sum, i) => sum + (i.current_stock * (i.unit_cost || 0)), 0);

  return (
    <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Inventory Status
          </span>
          <Link to={createPageUrl('InventoryDashboard')}>
            <Button variant="ghost" size="sm">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stock Value */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Stock Value</p>
            <p className="text-2xl font-bold text-gray-900">£{stockValue.toFixed(2)}</p>
          </div>

          {/* Low Stock */}
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Low Stock</span>
            </div>
            <span className="text-lg font-bold text-amber-600">{lowStock.length}</span>
          </div>

          {/* Critical Stock */}
          {criticalStock.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">Out of Stock</span>
              </div>
              <span className="text-lg font-bold text-red-600">{criticalStock.length}</span>
            </div>
          )}

          {/* Pending Orders */}
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Pending Orders</span>
            </div>
            <span className="text-lg font-bold text-purple-600">{pendingOrders.length}</span>
          </div>

          {/* Quick Action */}
          {lowStock.length > 0 && (
            <Link to={createPageUrl('Ordering')}>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="sm">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}