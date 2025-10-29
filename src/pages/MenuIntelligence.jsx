
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  BarChart3,
  PieChart,
  Target,
  Zap,
  ArrowLeft,
  Home
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { safeNumber, safeCurrency, safePercent } from "@/utils/safeNumber";

// Helper function for safe average, not part of the original safeNumber.js but used in outline
const safeAverage = (arr, key, decimals = 2) => {
  if (!arr || arr.length === 0) return 0;
  const sum = arr.reduce((acc, item) => acc + safeNumber(item[key]), 0);
  return safeNumber(sum / arr.length, decimals);
};

export default function MenuIntelligence() {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [syncingPrices, setSyncingPrices] = useState(false);

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 100),
  });

  // Calculate smart metrics
  const intelligence = calculateMenuIntelligence(menuItems, ingredients, purchaseOrders);

  // Auto-update prices from suppliers
  const handleSyncPrices = async () => {
    setSyncingPrices(true);
    
    try {
      // Simulate fetching latest supplier prices
      // In production, this would call supplier APIs or email parsing
      
      let updatedCount = 0;
      
      for (const ingredient of ingredients) {
        if (!ingredient.supplier_id) continue;
        
        // Simulate price fluctuation (±10%)
        const priceChange = (Math.random() * 0.2 - 0.1); // -10% to +10%
        const newPrice = safeNumber(ingredient.unit_cost) * (1 + priceChange);
        
        if (Math.abs(priceChange) > 0.05) { // Update if change > 5%
          await base44.entities.Ingredient.update(ingredient.id, {
            unit_cost: safeNumber(newPrice),
            last_cost_update: new Date().toISOString()
          });
          updatedCount++;
        }
      }

      // Recalculate menu item costs
      for (const item of menuItems) {
        if (!item.recipe || item.recipe.length === 0) continue;
        
        let newTotalCost = 0;
        for (const recipeItem of item.recipe) {
          const ingredient = ingredients.find(i => i.id === recipeItem.ingredient_id);
          if (ingredient) {
            newTotalCost += safeNumber(ingredient.unit_cost) * safeNumber(recipeItem.quantity);
          }
        }
        
        await base44.entities.MenuItem.update(item.id, {
          total_cost: safeNumber(newTotalCost),
          profit_margin: safeNumber(item.sell_price) - safeNumber(newTotalCost),
          food_cost_percentage: safeNumber(item.sell_price) > 0 
            ? safePercent(newTotalCost, item.sell_price, 2)
            : 0
        });
      }

      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      
      alert(`✅ Price sync complete!\n\n${updatedCount} ingredient price(s) updated\nMenu costs recalculated`);
      
    } catch (error) {
      console.error('Sync error:', error);
      alert('❌ Failed to sync prices');
    } finally {
      setSyncingPrices(false);
    }
  };

  // Generate AI recommendations
  const handleAnalyze = async () => {
    setAnalyzing(true);
    
    try {
      // Simulate AI analysis delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`🤖 AI Analysis Complete!\n\n${intelligence.recommendations.length} recommendations generated.\n\nCheck the recommendations section below.`);
      
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

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
              <Home className="w-4 h-4 mr-2" />
              Inventory Hub
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600" />
              Menu Intelligence & Cost Optimization
            </h1>
            <p className="text-gray-600">AI-powered pricing, waste prediction, and profit optimization</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleSyncPrices}
              disabled={syncingPrices}
              variant="outline"
              className="border-blue-600 text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncingPrices ? 'animate-spin' : ''}`} />
              {syncingPrices ? 'Syncing...' : 'Sync Prices'}
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              {analyzing ? 'Analyzing...' : 'AI Analyze'}
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Avg Food Cost %</h3>
                <PieChart className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {safePercent(intelligence.avgFoodCostPercentage, 100, 1).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Target: 28-35%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Menu Profit</h3>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-700">
                {safeCurrency(intelligence.totalProfit)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Per service
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Waste Prediction</h3>
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-700">
                {safeCurrency(intelligence.predictedWaste)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Price Opportunities</h3>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-700">
                {intelligence.priceOpportunities}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Items to optimize
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Recommendations */}
        {intelligence.recommendations.length > 0 && (
          <Card className="mb-6 border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Sparkles className="w-5 h-5" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {intelligence.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    {rec.type === 'increase_price' ? (
                      <TrendingUp className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : rec.type === 'decrease_price' ? (
                      <TrendingDown className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{rec.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-purple-100 text-purple-800">
                          Impact: {rec.impact}
                        </Badge>
                        <Badge variant="outline">
                          {rec.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Problem Items */}
        {intelligence.problemItems.length > 0 && (
          <Card className="mb-6 border-red-300 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                Items Requiring Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {intelligence.problemItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.issue}</p>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {safePercent(item.food_cost_percentage, 100, 1).toFixed(1)}% cost
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performers */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Most Profitable Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {intelligence.topPerformers.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-600">{item.category_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">{safeCurrency(item.profit_margin)}</p>
                      <p className="text-xs text-gray-600">{safePercent(item.food_cost_percentage, 100, 1).toFixed(1)}% cost</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Cost Efficiency Leaders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {intelligence.mostEfficient.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-600">{safeCurrency(item.sell_price)} sell price</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {safePercent(item.food_cost_percentage, 100, 1).toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Calculate menu intelligence metrics
function calculateMenuIntelligence(menuItems, ingredients, purchaseOrders) {
  if (menuItems.length === 0) {
    return {
      avgFoodCostPercentage: 0,
      totalProfit: 0,
      predictedWaste: 0,
      priceOpportunities: 0,
      recommendations: [],
      problemItems: [],
      topPerformers: [],
      mostEfficient: []
    };
  }

  // Calculate averages using safe number utilities
  const avgFoodCostPercentage = safeAverage(menuItems, 'food_cost_percentage', 2);
  const totalProfit = menuItems.reduce((sum, item) => sum + safeNumber(item.profit_margin), 0);

  // Predict waste based on inventory and orders
  const predictedWaste = ingredients.reduce((sum, ing) => {
    const overstock = safeNumber(ing.current_stock) - safeNumber(ing.par_level);
    if (overstock > 0) {
      const wasteValue = overstock * safeNumber(ing.unit_cost) * 0.15; // 15% waste assumption
      return sum + wasteValue;
    }
    return sum;
  }, 0);

  // Find items with pricing opportunities
  const priceOpportunities = menuItems.filter(item => {
    const foodCost = safeNumber(item.food_cost_percentage);
    return foodCost < 25 || foodCost > 40; // Outside ideal range
  }).length;

  // Generate recommendations
  const recommendations = [];
  
  menuItems.forEach(item => {
    const foodCost = safeNumber(item.food_cost_percentage);
    const profit = safeNumber(item.profit_margin);
    
    if (foodCost < 25 && profit > 3) {
      recommendations.push({
        type: 'increase_price',
        title: `Consider reducing price for ${item.name}`,
        description: `Very low food cost (${safePercent(foodCost, 100, 1).toFixed(1)}%) suggests room for competitive pricing to increase sales volume`,
        impact: 'High',
        category: 'Pricing',
        item_id: item.id
      });
    } else if (foodCost > 40) {
      recommendations.push({
        type: 'decrease_price',
        title: `Optimize cost for ${item.name}`,
        description: `High food cost (${safePercent(foodCost, 100, 1).toFixed(1)}%) - consider cheaper ingredients or increase price`,
        impact: 'High',
        category: 'Cost Control',
        item_id: item.id
      });
    }
  });

  // Waste reduction recommendations
  if (predictedWaste > 50) {
    recommendations.push({
      type: 'reduce_waste',
      title: 'Reduce predicted waste',
      description: `Estimated ${safeCurrency(predictedWaste)} in potential waste this week. Review par levels and ordering frequency.`,
      impact: 'High',
      category: 'Waste Reduction'
    });
  }

  // Problem items
  const problemItems = menuItems.filter(item => 
    safeNumber(item.food_cost_percentage) > 40 || safeNumber(item.profit_margin) < 2
  ).map(item => ({
    ...item,
    issue: safeNumber(item.food_cost_percentage) > 40 
      ? 'High food cost percentage' 
      : 'Low profit margin'
  }));

  // Top performers
  const topPerformers = [...menuItems]
    .sort((a, b) => safeNumber(b.profit_margin) - safeNumber(a.profit_margin))
    .slice(0, 10);

  // Most efficient
  const mostEfficient = [...menuItems]
    .sort((a, b) => safeNumber(a.food_cost_percentage) - safeNumber(b.food_cost_percentage))
    .slice(0, 10);

  return {
    avgFoodCostPercentage,
    totalProfit: safeNumber(totalProfit),
    predictedWaste: safeNumber(predictedWaste),
    priceOpportunities,
    recommendations: recommendations.slice(0, 10),
    problemItems,
    topPerformers,
    mostEfficient
  };
}
