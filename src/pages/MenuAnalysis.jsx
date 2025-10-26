import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Safe number helpers
const safeNumber = (value, decimals = 2) => {
  const num = parseFloat(value);
  return isNaN(num) || num === null || num === undefined ? 0 : parseFloat(num.toFixed(decimals));
};

const formatPrice = (price) => safeNumber(price, 2).toFixed(2);
const formatPercent = (percent) => safeNumber(percent, 1).toFixed(1);

export default function MenuAnalysis() {
  const [wastage, setWastage] = useState(6);
  const [overhead, setOverhead] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const calculateAdjustedCosts = (item) => {
    const baseCost = safeNumber(item.total_cost);
    const wastageAmount = baseCost * (safeNumber(wastage) / 100);
    const overheadAmount = baseCost * (safeNumber(overhead) / 100);
    const adjustedCost = baseCost + wastageAmount + overheadAmount;
    const sellPrice = safeNumber(item.sell_price);
    const profit = sellPrice - adjustedCost;
    const margin = sellPrice > 0 ? ((profit / sellPrice) * 100) : 0;
    
    return {
      baseCost: safeNumber(baseCost),
      wastageAmount: safeNumber(wastageAmount),
      overheadAmount: safeNumber(overheadAmount),
      adjustedCost: safeNumber(adjustedCost),
      profit: safeNumber(profit),
      margin: safeNumber(margin),
    };
  };

  const filteredItems = categoryFilter === "all"
    ? menuItems
    : menuItems.filter(item => item.category === categoryFilter);

  const sortedByMargin = [...filteredItems]
    .map(item => ({ ...item, ...calculateAdjustedCosts(item) }))
    .sort((a, b) => b.margin - a.margin);

  const topPerformers = sortedByMargin.slice(0, 5);
  const poorPerformers = sortedByMargin.slice(-5).reverse();

  const totalInventoryValue = ingredients.reduce(
    (sum, ing) => sum + (safeNumber(ing.current_stock) * safeNumber(ing.unit_cost)),
    0
  );

  const lowStockCount = ingredients.filter(
    ing => safeNumber(ing.current_stock) <= safeNumber(ing.reorder_point)
  ).length;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Menu Costing Analysis</h1>
            <p className="text-gray-600">Profitability and cost breakdown</p>
          </div>
          <Link to={createPageUrl('ProductionPlanning')}>
            <Button className="bg-green-600 hover:bg-green-700">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Plan Production
            </Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Menu Items</p>
                  <p className="text-2xl font-bold text-gray-900">{menuItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Inventory Value</p>
                  <p className="text-2xl font-bold text-gray-900">£{formatPrice(totalInventoryValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Adjustment Settings */}
        <Card className="bg-white border-none shadow-sm mb-8">
          <CardHeader>
            <CardTitle>Cost Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Wastage %</label>
                <Input
                  type="number"
                  value={wastage}
                  onChange={(e) => setWastage(parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Overhead %</label>
                <Input
                  type="number"
                  value={overhead}
                  onChange={(e) => setOverhead(parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top/Poor Performers */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Top 5 Most Profitable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No menu items found</p>
                ) : (
                  topPerformers.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-600">
                          Cost: £{formatPrice(item.adjustedCost)} | Sell: £{formatPrice(item.sell_price)}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        {formatPercent(item.margin)}%
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                Bottom 5 Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {poorPerformers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No menu items found</p>
                ) : (
                  poorPerformers.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-600">
                          Cost: £{formatPrice(item.adjustedCost)} | Sell: £{formatPrice(item.sell_price)}
                        </p>
                      </div>
                      <Badge className="bg-red-100 text-red-800">
                        {formatPercent(item.margin)}%
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Items */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Menu Items</CardTitle>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="appetizers">Appetizers</SelectItem>
                  <SelectItem value="mains">Mains</SelectItem>
                  <SelectItem value="desserts">Desserts</SelectItem>
                  <SelectItem value="beverages">Beverages</SelectItem>
                  <SelectItem value="sides">Sides</SelectItem>
                  <SelectItem value="specials">Specials</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedByMargin.length === 0 ? (
                <p className="text-center text-gray-500 py-12">No menu items found</p>
              ) : (
                sortedByMargin.map((item) => (
                  <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        <Badge className="mt-1">
                          {item.category || 'Uncategorized'}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">£{formatPrice(item.sell_price)}</p>
                        <Badge className={item.margin > 60 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                          {formatPercent(item.margin)}% margin
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Base Cost</p>
                        <p className="font-semibold text-gray-900">£{formatPrice(item.baseCost)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Wastage</p>
                        <p className="font-semibold text-gray-900">£{formatPrice(item.wastageAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Overhead</p>
                        <p className="font-semibold text-gray-900">£{formatPrice(item.overheadAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Profit</p>
                        <p className={`font-semibold ${item.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          £{formatPrice(item.profit)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}