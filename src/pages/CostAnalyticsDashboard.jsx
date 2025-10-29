import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingCart,
  AlertCircle,
  Home,
  ArrowLeft,
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CostAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("7days");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAuthorized = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 100),
  });

  const { data: ingredientUsage = [] } = useQuery({
    queryKey: ['ingredientUsage'],
    queryFn: () => base44.entities.IngredientUsage.list('-usage_date', 200),
  });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">
                This page is only accessible to Managers and Administrators.
              </p>
              <Link to={createPageUrl("Dashboard")}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case '7days':
        return { start: subDays(now, 7), end: now };
      case '30days':
        return { start: subDays(now, 30), end: now };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: subDays(now, 7), end: now };
    }
  };

  const dateRange = getDateRange();

  // Calculate total inventory value
  const totalInventoryValue = ingredients.reduce((sum, ing) => {
    return sum + ((ing.current_stock || 0) * (ing.unit_cost || 0));
  }, 0);

  // Calculate total purchases in period
  const recentPurchases = purchaseOrders.filter(po => {
    const orderDate = new Date(po.order_date);
    return orderDate >= dateRange.start && orderDate <= dateRange.end;
  });

  const totalPurchases = recentPurchases.reduce((sum, po) => sum + (po.total || 0), 0);

  // Calculate COGS (Cost of Goods Sold)
  const recentUsage = ingredientUsage.filter(usage => {
    const usageDate = new Date(usage.usage_date);
    return usageDate >= dateRange.start && usageDate <= dateRange.end;
  });

  const totalCOGS = recentUsage.reduce((sum, usage) => sum + (usage.total_cost || 0), 0);

  // Calculate wastage cost
  const wastageUsage = recentUsage.filter(u => u.usage_type === 'wastage');
  const totalWastage = wastageUsage.reduce((sum, usage) => sum + (usage.total_cost || 0), 0);

  // Calculate menu profitability
  const menuProfitability = menuItems.map(item => ({
    name: item.name,
    cost: item.total_cost || 0,
    price: item.sell_price || 0,
    profit: (item.sell_price || 0) - (item.total_cost || 0),
    margin: item.sell_price > 0 ? (((item.sell_price - item.total_cost) / item.sell_price) * 100) : 0,
  })).sort((a, b) => b.profit - a.profit).slice(0, 10);

  // Top ingredients by cost
  const topIngredientsByCost = ingredients
    .map(ing => ({
      name: ing.name,
      value: (ing.current_stock || 0) * (ing.unit_cost || 0),
      stock: ing.current_stock || 0,
      unit_cost: ing.unit_cost || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("Inventory")}>
            <Button variant="outline" size="sm">
              <Package className="w-4 h-4 mr-2" />
              Inventory Hub
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Cost Analytics</h1>
                <p className="text-gray-600">Real-time cost tracking and profitability insights</p>
              </div>
            </div>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none">
            <CardContent className="p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-6 h-6" />
                <p className="text-sm font-medium opacity-90">Inventory Value</p>
              </div>
              <p className="text-3xl font-bold">£{totalInventoryValue.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">Current stock value</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-none">
            <CardContent className="p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingCart className="w-6 h-6" />
                <p className="text-sm font-medium opacity-90">Purchases</p>
              </div>
              <p className="text-3xl font-bold">£{totalPurchases.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">{recentPurchases.length} orders</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-none">
            <CardContent className="p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-6 h-6" />
                <p className="text-sm font-medium opacity-90">COGS</p>
              </div>
              <p className="text-3xl font-bold">£{totalCOGS.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">Cost of goods sold</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 border-none">
            <CardContent className="p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-6 h-6" />
                <p className="text-sm font-medium opacity-90">Wastage</p>
              </div>
              <p className="text-3xl font-bold">£{totalWastage.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">{wastageUsage.length} incidents</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Menu Profitability */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Most Profitable Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={menuProfitability}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={100} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    formatter={(value) => `£${value.toFixed(2)}`}
                  />
                  <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Ingredients by Value */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Ingredients by Stock Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topIngredientsByCost.map((ing, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{ing.name}</p>
                      <p className="text-xs text-gray-600">
                        {ing.stock.toFixed(2)} units @ £{ing.unit_cost.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">£{ing.value.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Item Cost Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {menuProfitability.slice(0, 15).map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    <Badge className={item.margin > 60 ? 'bg-green-100 text-green-800' : item.margin > 40 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}>
                      {item.margin.toFixed(1)}% margin
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Cost</p>
                      <p className="font-semibold text-gray-900">£{item.cost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Price</p>
                      <p className="font-semibold text-gray-900">£{item.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Profit</p>
                      <p className={`font-semibold ${item.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        £{item.profit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}