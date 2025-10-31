
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  ArrowLeft,
  Home,
  Filter,
  Package,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

// Safe number helpers
const safeNumber = (value, decimals = 2) => {
  const num = parseFloat(value);
  return isNaN(num) || num === null || num === undefined ? 0 : parseFloat(num.toFixed(decimals));
};

const formatPrice = (price) => safeNumber(price, 2).toFixed(2);
const formatPercent = (percent) => safeNumber(percent, 1).toFixed(1);

export default function MenuAnalysis() {
  const [selectedRecipe, setSelectedRecipe] = useState("all");
  const [compareMode, setCompareMode] = useState(false);
  const [compareRecipes, setCompareRecipes] = useState([]);

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: categories = [] } = useQuery({ // Unused in this updated component, but kept as it was in the outline
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list(),
  });

  // Save last selected to localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('aura-last-selected-recipe');
    if (saved && saved !== 'all' && menuItems.some(item => item.id === saved)) { // Ensure item still exists
      setSelectedRecipe(saved);
    }
  }, [menuItems]); // Depend on menuItems to ensure it's loaded before checking for saved ID

  React.useEffect(() => {
    if (selectedRecipe) {
      localStorage.setItem('aura-last-selected-recipe', selectedRecipe);
    }
  }, [selectedRecipe]);

  const handleCompareToggle = (recipeId) => {
    if (compareRecipes.includes(recipeId)) {
      setCompareRecipes(compareRecipes.filter(id => id !== recipeId));
    } else if (compareRecipes.length < 3) {
      setCompareRecipes([...compareRecipes, recipeId]);
    } else {
      alert('You can compare up to 3 recipes at once');
    }
  };

  const filteredItems = useMemo(() => {
    if (compareMode && compareRecipes.length > 0) {
      return menuItems.filter(item => compareRecipes.includes(item.id));
    }
    if (selectedRecipe === "all") return menuItems;
    return menuItems.filter(item => item.id === selectedRecipe);
  }, [menuItems, selectedRecipe, compareMode, compareRecipes]);

  const itemsWithCosts = useMemo(() => {
    return filteredItems.map(item => ({
      ...item,
      totalCost: safeNumber(item.total_cost),
      sellPrice: safeNumber(item.sell_price),
      profitMargin: safeNumber(item.sell_price) - safeNumber(item.total_cost),
      foodCostPercentage: safeNumber(item.sell_price) > 0 ? ((safeNumber(item.total_cost) / safeNumber(item.sell_price)) * 100) : 0,
    }));
  }, [filteredItems]);

  const sortedByProfit = [...itemsWithCosts].sort((a, b) => b.profitMargin - a.profitMargin);
  const topPerformers = sortedByProfit.slice(0, 5);
  const bottomPerformers = sortedByProfit.slice(-5).reverse();

  const avgFoodCost = itemsWithCosts.length > 0
    ? itemsWithCosts.reduce((sum, item) => sum + item.foodCostPercentage, 0) / itemsWithCosts.length
    : 0;

  const totalRevenuePotential = itemsWithCosts.reduce((sum, item) => sum + item.sellPrice, 0);
  const totalCostBasis = itemsWithCosts.reduce((sum, item) => sum + item.totalCost, 0);

  const chartData = itemsWithCosts.map(item => ({
    name: item.name,
    cost: parseFloat(safeNumber(item.totalCost).toFixed(2)),
    price: parseFloat(safeNumber(item.sellPrice).toFixed(2)),
    profit: parseFloat(safeNumber(item.profitMargin).toFixed(2)),
  }));

  const pieData = [
    { name: 'Total Cost', value: parseFloat(safeNumber(totalCostBasis).toFixed(2)), color: '#ef4444' },
    { name: 'Total Profit', value: parseFloat(safeNumber(totalRevenuePotential - totalCostBasis).toFixed(2)), color: '#10b981' },
  ];

  // Original calculations for inventory cards (kept)
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
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("MenuManagement")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Menu Management
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Menu Cost Analysis</h1>
          <p className="text-gray-600">Analyze recipe costs, profit margins, and pricing strategy</p>
        </div>

        {/* Recipe Filter & Compare Mode */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1 w-full md:w-auto">
                <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filter Recipe
                </label>
                <Select value={selectedRecipe} onValueChange={(value) => {
                  setSelectedRecipe(value);
                  setCompareMode(false);
                  setCompareRecipes([]);
                }}>
                  <SelectTrigger className="w-full md:w-80">
                    <SelectValue placeholder="Select recipe..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📋 All Recipes ({menuItems.length})</SelectItem>
                    {menuItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} - £{formatPrice(item.sell_price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 items-center">
                <Button
                  variant={compareMode ? "default" : "outline"}
                  onClick={() => {
                    setCompareMode(!compareMode);
                    if (!compareMode) {
                      setSelectedRecipe("all");
                      setCompareRecipes([]);
                    }
                  }}
                  className={compareMode ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
                >
                  {compareMode ? '✓ Compare Mode' : 'Compare Recipes'}
                </Button>
                
                {compareMode && (
                  <Badge className="bg-purple-100 text-purple-800">
                    {compareRecipes.length}/3 selected
                  </Badge>
                )}
              </div>
            </div>

            {compareMode && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-semibold text-purple-900 mb-3">
                  Select up to 3 recipes to compare:
                </p>
                <div className="flex flex-wrap gap-2">
                  {menuItems.map(item => (
                    <Button
                      key={item.id}
                      size="sm"
                      variant={compareRecipes.includes(item.id) ? "default" : "outline"}
                      onClick={() => handleCompareToggle(item.id)}
                      className={compareRecipes.includes(item.id) ? "bg-purple-600 text-white hover:bg-purple-700" : "hover:bg-gray-100"}
                    >
                      {compareRecipes.includes(item.id) && '✓ '}
                      {item.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-pulse">
                <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Loading analysis...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {/* Total Recipes */}
              <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Target className="w-6 h-6 text-green-700" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Recipes</p>
                      <p className="text-2xl font-bold text-gray-900">{menuItems.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Avg Food Cost % */}
              <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Calculator className="w-6 h-6 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Food Cost %</p>
                      <p className="text-2xl font-bold text-gray-900">{formatPercent(avgFoodCost)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Revenue Potential */}
              <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-purple-700" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue Potential</p>
                      <p className="text-2xl font-bold text-gray-900">£{formatPrice(totalRevenuePotential)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Total Cost Basis */}
              <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-red-700" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Cost Basis</p>
                      <p className="text-2xl font-bold text-gray-900">£{formatPrice(totalCostBasis)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Inventory Value */}
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

              {/* Low Stock Items */}
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

            {/* Cost vs Price Chart */}
            <Card className="mb-6 shadow-lg">
              <CardHeader>
                <CardTitle>
                  {compareMode && compareRecipes.length > 0 
                    ? `Recipe Comparison (${compareRecipes.length} Recipes)` 
                    : selectedRecipe === 'all' 
                    ? 'All Menu Items - Cost vs Price & Profit' 
                    : `${filteredItems[0]?.name || 'Selected Item'} - Cost vs Price & Profit`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <p className="text-center text-gray-500 py-12">No data available for chart.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
                      <YAxis />
                      <Tooltip formatter={(value) => `£${formatPrice(value)}`} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="cost" fill="#ef4444" name="Cost (£)" />
                      <Bar dataKey="price" fill="#3b82f6" name="Sell Price (£)" />
                      <Bar dataKey="profit" fill="#10b981" name="Profit (£)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Profit Distribution Pie Chart */}
            <Card className="mb-6 shadow-lg">
              <CardHeader>
                <CardTitle>Profit vs Cost Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `£${formatPrice(value)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-12">No profit/cost data to display.</p>
                )}
              </CardContent>
            </Card>

            {/* Top & Bottom Performers - Visible when "All Recipes" or no recipes selected for compare */}
            {(selectedRecipe === 'all' || (compareMode && compareRecipes.length === 0)) && (
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                {/* Top 5 Most Profitable */}
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
                        topPerformers.map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-600">
                                Cost: £{formatPrice(item.totalCost)} | Sell: £{formatPrice(item.sellPrice)}
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              {formatPercent(item.sellPrice > 0 ? (item.profitMargin / item.sellPrice * 100) : 0)}%
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Bottom 5 Performers */}
                <Card className="bg-white border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      Bottom 5 Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {bottomPerformers.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No menu items found</p>
                      ) : (
                        bottomPerformers.map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-600">
                                Cost: £{formatPrice(item.totalCost)} | Sell: £{formatPrice(item.sellPrice)}
                              </p>
                            </div>
                            <Badge className="bg-red-100 text-red-800">
                              {formatPercent(item.sellPrice > 0 ? (item.profitMargin / item.sellPrice * 100) : 0)}%
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
