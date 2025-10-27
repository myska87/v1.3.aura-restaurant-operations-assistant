import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, AlertTriangle, TrendingDown, Edit } from 'lucide-react';

export default function InventoryCard({ item, onEdit, showActions = true }) {
  const isLowStock = item.current_quantity <= item.minimum_quantity;
  const stockPercentage = item.minimum_quantity > 0 
    ? Math.round((item.current_quantity / item.minimum_quantity) * 100) 
    : 100;

  const getCategoryColor = (category) => {
    const colors = {
      produce: 'bg-green-100 text-green-800',
      meat_poultry: 'bg-red-100 text-red-800',
      dairy: 'bg-blue-100 text-blue-800',
      dry_goods: 'bg-amber-100 text-amber-800',
      beverages: 'bg-purple-100 text-purple-800',
      cleaning_supplies: 'bg-cyan-100 text-cyan-800',
      disposables: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow ${isLowStock ? 'border-red-300 bg-red-50' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-lg ${isLowStock ? 'bg-red-100' : 'bg-blue-100'}`}>
              {isLowStock ? (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              ) : (
                <Package className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">{item.item_name}</h3>
              <Badge className={getCategoryColor(item.category)}>
                {item.category?.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {showActions && onEdit && (
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Stock Level</span>
              <span className="font-bold">
                {item.current_quantity} {item.unit}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isLowStock ? 'bg-red-500' : stockPercentage < 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(stockPercentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Minimum</p>
              <p className="font-semibold">{item.minimum_quantity} {item.unit}</p>
            </div>
            <div>
              <p className="text-gray-500">Unit Cost</p>
              <p className="font-semibold">£{item.unit_cost?.toFixed(2)}</p>
            </div>
          </div>

          {item.supplier && (
            <div className="text-sm">
              <p className="text-gray-500">Supplier</p>
              <p className="font-semibold">{item.supplier}</p>
            </div>
          )}

          {isLowStock && (
            <div className="flex items-center gap-2 p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Low Stock - Reorder Soon
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}