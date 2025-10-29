
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
  Home,
  ArrowLeft,
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { safeNumber, toSafeNumber, safeCurrency } from "@/utils";

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

  // Renamed purchaseOrders to orders for consistency with outline's calculations
  const { data: orders = [] } = useQuery({
    queryKey: ['purchaseOrders'], // Keep original query key if API entity name hasn't changed
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 100),
  });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              {/* Removed AlertCircle icon as per outline */}
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

  // Calculate totals - WITH SAFE NUMBERS
  const totalOrderValue = orders.reduce((sum, o) => sum + toSafeNumber(o.total), 0);
  const totalIngredientCost = ingredients.reduce((sum, i) =>
    sum + (toSafeNumber(i.current_stock) * toSafeNumber(i.unit_cost)), 0
  );

  // Daily spending trend - WITH SAFE NUMBERS
  const getDays = () => {
    switch (timeRange) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      default: return 7;
    }
  };

  const dateRange = Array.from({ length: getDays() }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (getDays() - 1 - i));
    return date;
  });

  const spendingTrend = dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOrders = orders.filter(o => {
      // Ensure order_date exists and is a string for startsWith
      return typeof o.order_date === 'string' && o.order_date.startsWith(dateStr);
    });
    const dayTotal = dayOrders.reduce((sum, o) => sum + toSafeNumber(o.total), 0);

    return {
      date: format(date, 'MMM d'),
      spending: toSafeNumber(dayTotal, 0),
    };
  });

  // Category breakdown - WITH SAFE NUMBERS
  const categorySpending = ingredients.reduce((acc, ing) => {
    const category = ing.category || 'Other'; // Capitalize 'Other' for display
    const value = toSafeNumber(ing.current_stock) * toSafeNumber(ing.unit_cost);

    const existing = acc.find(c => c.name === category);
    if (existing) {
      existing.value += value;
    } else {
      acc.push({
        name: category.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), // Capitalize words and replace underscores
        value: toSafeNumber(value, 0)
      });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value).slice(0, 5); // Take top 5 categories

  // Supplier spending - WITH SAFE NUMBERS
  const supplierSpending = orders.reduce((acc, order) => {
    const supplier = order.supplier_name || 'Unknown';
    const existing = acc.find(s => s.name === supplier);

    if (existing) {
      existing.value += toSafeNumber(order.total);
    } else {
      acc.push({
        name: supplier,
        value: toSafeNumber(order.total, 0)
      });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value).slice(0, 5); // Take top 5 suppliers

  // Menu item profitability - WITH SAFE NUMBERS, adjusted for existing JSX
  const menuProfitability = menuItems
    .map(item => {
      const cost = toSafeNumber(item.total_cost);
      const price = toSafeNumber(item.sell_price);
      const profit = price - cost;
      const margin = price > 0 ? (profit / price) * 100 : 0;

      return {
        name: item.name,
        cost: cost,
        price: price,
        profit: profit,
        margin: margin,
        // foodCostPercent: toSafeNumber(item.food_cost_percentage), // Not directly used by current JSX
      };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  // Top ingredients by cost - WITH SAFE NUMBERS
  const topIngredientsByCost = ingredients
    .map(ing => {
      const stock = toSafeNumber(ing.current_stock);
      const unitCost = toSafeNumber(ing.unit_cost);
      return {
        name: ing.name,
        value: stock * unitCost,
        stock: stock,
        unit_cost: unitCost,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);


  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Cost Analytics</h1>
            <p className="text-gray-600">Track spending and profitability</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards - WITH SAFE NUMBERS */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-gray-700">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700">£{safeNumber(totalOrderValue, 2)}</p>
              <p className="text-sm text-gray-600 mt-1">{orders.length} orders</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-gray-700">Inventory Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">£{safeNumber(totalIngredientCost, 2)}</p>
              <p className="text-sm text-gray-600 mt-1">{ingredients.length} ingredients</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-gray-700">Avg. Menu Item Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-700">
                £{safeNumber(menuItems.reduce((sum, m) => sum + (toSafeNumber(m.sell_price) - toSafeNumber(m.total_cost)), 0) / Math.max(1, menuItems.length), 2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">avg per item</p>
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
                  <YAxis tickFormatter={(value) => `£${value.toFixed(0)}`} tick={{ fontSize: 12 }} />
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

        {/* Daily Spending Trend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Daily Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `£${value.toFixed(0)}`} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value) => `£${value.toFixed(2)}`}
                />
                <Line type="monotone" dataKey="spending" stroke="#8884d8" activeDot={{ r: 8 }} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Category Spending Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Category Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categorySpending.map((cat, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{cat.name}</p>
                    <p className="text-lg font-bold text-gray-900">£{safeNumber(cat.value, 2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Supplier Spending Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Supplier Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {supplierSpending.map((supplier, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{supplier.name}</p>
                    <p className="text-lg font-bold text-gray-900">£{safeNumber(supplier.value, 2)}</p>
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
