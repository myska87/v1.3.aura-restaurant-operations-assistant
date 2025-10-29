
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Star, DollarSign, ChefHat, ArrowLeft, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl, safeNumber, toSafeNumber, safeCurrency } from "@/utils";

export default function MenuAnalysis() {
  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list(),
  });

  const { data: ingredients = [] } = useQuery({ // Keeping this query in case other parts of the app use it or future changes
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  // Calculate metrics
  const totalRevenue = menuItems.reduce((sum, item) => sum + toSafeNumber(item.sell_price), 0);
  const totalCost = menuItems.reduce((sum, item) => sum + toSafeNumber(item.total_cost), 0); // Assuming total_cost is now a property of MenuItem
  const totalProfit = totalRevenue - totalCost;
  const avgFoodCost = menuItems.length > 0
    ? menuItems.reduce((sum, item) => sum + toSafeNumber(item.food_cost_percentage), 0) / menuItems.length
    : 0;

  // Profitability ranking
  const profitabilityData = menuItems
    .map(item => ({
      name: item.name,
      profit: toSafeNumber(item.profit_margin), // Assuming profit_margin is now a property of MenuItem
      foodCostPercent: toSafeNumber(item.food_cost_percentage), // Corrected property name for consistency with usage
      sellPrice: toSafeNumber(item.sell_price),
      cost: toSafeNumber(item.total_cost), // Use total_cost as cost for the table
    }))
    .sort((a, b) => b.profit - a.profit);

  const topPerformers = profitabilityData.slice(0, 5);
  const worstPerformers = profitabilityData.slice(-5).reverse();

  // Category analysis
  const categoryAnalysis = categories.map(cat => {
    const catItems = menuItems.filter(m => m.category_id === cat.id); // Assuming menu items have category_id
    const avgProfit = catItems.length > 0
      ? catItems.reduce((sum, item) => sum + toSafeNumber(item.profit_margin), 0) / catItems.length
      : 0;
    const avgFoodCostPct = catItems.length > 0
      ? catItems.reduce((sum, item) => sum + toSafeNumber(item.food_cost_percentage), 0) / catItems.length
      : 0;

    return {
      name: cat.name,
      items: catItems.length,
      avgProfit: toSafeNumber(avgProfit, 0), // toSafeNumber with 0 decimals doesn't make sense, safeNumber for formatting
      avgFoodCost: toSafeNumber(avgFoodCostPct, 0), // Same here
    };
  }).filter(c => c.items > 0);

  // Food cost distribution
  const foodCostDistribution = [
    {
      range: 'Excellent (<30%)',
      count: menuItems.filter(m => toSafeNumber(m.food_cost_percentage) < 30).length
    },
    {
      range: 'Good (30-35%)',
      count: menuItems.filter(m => {
        const fc = toSafeNumber(m.food_cost_percentage);
        return fc >= 30 && fc < 35;
      }).length
    },
    {
      range: 'Fair (35-40%)',
      count: menuItems.filter(m => {
        const fc = toSafeNumber(m.food_cost_percentage);
        return fc >= 35 && fc < 40;
      }).length
    },
    {
      range: 'High (>40%)',
      count: menuItems.filter(m => toSafeNumber(m.food_cost_percentage) >= 40).length
    },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Menu Analysis</h1>
            <p className="text-gray-600">Profitability insights and cost analysis</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('/')}>
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <Link to={createPageUrl('/')}>
              <Button variant="outline" size="icon">
                <Home className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Menu Items</p>
                <ChefHat className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{menuItems.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Avg Food Cost</p>
                <DollarSign className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{safeNumber(avgFoodCost, 1)}%</p>
              <Badge className={`mt-2 ${
                avgFoodCost < 30 ? 'bg-green-100 text-green-800' :
                avgFoodCost < 35 ? 'bg-blue-100 text-blue-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {avgFoodCost < 30 ? 'Excellent' : avgFoodCost < 35 ? 'Good' : 'Review Needed'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-700">£{safeNumber(totalRevenue, 2)}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Profit</p>
                <Star className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-purple-700">£{safeNumber(totalProfit, 2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Top Performers */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Top 5 Most Profitable
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topPerformers.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topPerformers} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => `£${safeNumber(value, 2)}`}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      labelStyle={{ color: '#333' }}
                    />
                    <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No menu items available to analyze.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Needing Review (Worst Performers) */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                Items Needing Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              {worstPerformers.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={worstPerformers} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => `£${safeNumber(value, 2)}`}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      labelStyle={{ color: '#333' }}
                    />
                    <Bar dataKey="profit" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No menu items available to analyze.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category & Food Cost Distribution Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Category Analysis */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-blue-600" />
                Category Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryAnalysis.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryAnalysis} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tick={{ fontSize: 11 }} label={{ value: 'Avg Profit (£)', angle: -90, position: 'insideLeft', offset: -10, style: { textAnchor: 'middle' } }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tick={{ fontSize: 11 }} label={{ value: 'Avg Food Cost (%)', angle: 90, position: 'insideRight', offset: -10, style: { textAnchor: 'middle' } }} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'avgProfit') return [`£${safeNumber(value, 2)}`, 'Avg Profit'];
                        if (name === 'avgFoodCost') return [`${safeNumber(value, 1)}%`, 'Avg Food Cost'];
                        return value;
                      }}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      labelStyle={{ color: '#333' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey="avgProfit" fill="#3b82f6" name="Average Profit" radius={[8, 8, 0, 0]} />
                    <Bar yAxisId="right" dataKey="avgFoodCost" fill="#82ca9d" name="Average Food Cost %" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No categories or menu items available for analysis.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Food Cost Distribution */}
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Food Cost Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {menuItems.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={foodCostDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {foodCostDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [`${value} items`, props.payload.range]}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      labelStyle={{ color: '#333' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No menu items available to analyze food cost.
                </div>
              )}
            </CardContent>
          </Card>
        </div>


        {/* Detailed Profitability Report */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader>
            <CardTitle>Detailed Profitability Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Item</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Sell Price</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Cost</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Profit</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Food Cost %</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profitabilityData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center text-gray-500 py-12">No menu items found for detailed report.</td>
                    </tr>
                  ) : (
                    profitabilityData.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="p-3 text-sm text-right">£{safeNumber(item.sellPrice, 2)}</td>
                        <td className="p-3 text-sm text-right">£{safeNumber(item.cost, 2)}</td>
                        <td className={`p-3 text-sm text-right font-semibold ${
                          item.profit > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          £{safeNumber(item.profit, 2)}
                        </td>
                        <td className="p-3 text-sm text-right">
                          <Badge variant="outline" className={
                            item.foodCostPercent < 30 ? 'text-green-700 border-green-300 bg-green-50' :
                            item.foodCostPercent < 35 ? 'text-blue-700 border-blue-300 bg-blue-50' :
                            'text-amber-700 border-amber-300 bg-amber-50'
                          }>
                            {safeNumber(item.foodCostPercent, 1)}%
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          {item.foodCostPercent < 30 ? (
                            <Badge className="bg-green-100 text-green-800">✓ Excellent</Badge>
                          ) : item.foodCostPercent < 35 ? (
                            <Badge className="bg-blue-100 text-blue-800">Good</Badge>
                          ) : item.foodCostPercent < 40 ? (
                            <Badge className="bg-amber-100 text-amber-800">Review</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Action Needed</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
