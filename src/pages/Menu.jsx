
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Utensils,
  ChefHat,
  Search,
  TrendingUp,
  DollarSign,
  Package,
  Settings,
  Calculator,
  ShoppingCart,
  FileText,
  Home,
  Plus,
  Eye,
  Edit,
  Grid3x3,
  List,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const safeNumber = (value, decimals = 2) => {
  const num = parseFloat(value);
  return isNaN(num) || num === null || num === undefined ? 0 : parseFloat(num.toFixed(decimals));
};

const formatPrice = (price) => safeNumber(price, 2).toFixed(2);

export default function Menu() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';
  const isChef = user?.position === 'chef' || user?.position === 'sous_chef';

  const filteredMenuItems = menuItems
    .filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const catA = categories.find(c => c.id === a.category_id);
      const catB = categories.find(c => c.id === b.category_id);
      const orderA = catA?.display_order || 999;
      const orderB = catB?.display_order || 999;
      return orderA - orderB;
    });

  const totalMenuValue = menuItems.reduce((sum, item) => sum + safeNumber(item.sell_price), 0);
  const avgFoodCost = menuItems.length > 0 
    ? menuItems.reduce((sum, item) => sum + safeNumber(item.food_cost_percentage), 0) / menuItems.length
    : 0;
  const lowStockIngredients = ingredients.filter(ing => 
    safeNumber(ing.current_stock) <= safeNumber(ing.reorder_point)
  ).length;

  const getProfitColor = (percentage) => {
    if (percentage < 20) return 'bg-red-100 text-red-800 border-red-300';
    if (percentage < 30) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (percentage < 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center gap-3">
            <Utensils className="w-10 h-10 text-green-600" />
            Menu Hub
          </h1>
          <p className="text-gray-600 text-lg">
            Your complete menu with recipes, costs, and profitability
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Menu Items</p>
                  <p className="text-3xl font-bold text-green-600">{menuItems.length}</p>
                </div>
                <Utensils className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Categories</p>
                  <p className="text-3xl font-bold text-blue-600">{categories.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Food Cost %</p>
                  <p className="text-3xl font-bold text-purple-600">{safeNumber(avgFoodCost, 1).toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
                  <p className="text-3xl font-bold text-orange-600">{lowStockIngredients}</p>
                </div>
                <Package className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {(isManager || isChef) && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link to={createPageUrl('MenuManagement')}>
              <Card className="hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6 text-center">
                  <Edit className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Manage Menu</h3>
                  <p className="text-sm text-gray-600">Add items, recipes & photos</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('AllergyTable')}>
              <Card className="hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-6 text-center">
                  <FileText className="w-12 h-12 text-red-600 mx-auto mb-3" />
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Allergen Info</h3>
                  <p className="text-sm text-gray-600">View allergen matrix</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('MenuAnalysis')}>
              <Card className="hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6 text-center">
                  <Calculator className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Cost Analysis</h3>
                  <p className="text-sm text-gray-600">Profit & costing tools</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('InventoryDashboard')}>
              <Card className="hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6 text-center">
                  <Package className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Inventory</h3>
                  <p className="text-sm text-gray-600">Stock & ingredients</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  className="pl-10"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white text-gray-900"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredMenuItems.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Menu Items Found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery ? 'Try adjusting your search' : 'Start by adding your first menu item'}
                  </p>
                  {(isManager || isChef) && (
                    <Link to={createPageUrl('MenuManagement')}>
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Menu Item
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredMenuItems.map(item => (
              viewMode === 'grid' ? (
                <Link key={item.id} to={createPageUrl(`MenuItemView?id=${item.id}`)}>
                  <Card className="hover:shadow-xl transition-all cursor-pointer overflow-hidden group">
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Utensils className="w-16 h-16 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-600">
                          £{formatPrice(item.sell_price)}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="mb-3">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {item.category_name || 'Uncategorized'}
                        </Badge>
                      </div>

                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Food Cost:</span>
                          <span className="font-semibold">£{formatPrice(item.total_cost)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Profit:</span>
                          <span className={`font-semibold ${safeNumber(item.profit_margin) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            £{formatPrice(item.profit_margin)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-gray-600">Food Cost %:</span>
                          <Badge className={getProfitColor(safeNumber(item.food_cost_percentage))}>
                            {safeNumber(item.food_cost_percentage, 1).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t text-xs text-gray-500">
                        {item.recipe?.length || 0} ingredients • {item.prep_time_minutes || 0} min prep
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <Card key={item.id} className="hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Utensils className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                            <Badge variant="outline" className="text-xs mt-1">
                              {item.category_name || 'Uncategorized'}
                            </Badge>
                          </div>
                          <Badge className="bg-green-600 text-lg px-3 py-1">
                            £{formatPrice(item.sell_price)}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        )}
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Cost: </span>
                            <span className="font-semibold">£{formatPrice(item.total_cost)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Profit: </span>
                            <span className={`font-semibold ${safeNumber(item.profit_margin) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              £{formatPrice(item.profit_margin)}
                            </span>
                          </div>
                          <Badge className={getProfitColor(safeNumber(item.food_cost_percentage))}>
                            {safeNumber(item.food_cost_percentage, 1).toFixed(1)}% Food Cost
                          </Badge>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Link to={createPageUrl(`MenuItemView?id=${item.id}`)}>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          {(isManager || isChef) && (
                            <Link to={createPageUrl('MenuManagement')}>
                              <Button size="sm" variant="outline">
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            ))
          )}
        </div>

        {(isManager || isChef) && (
          <div className="fixed bottom-6 right-6 flex flex-col gap-3">
            <Link to={createPageUrl('MenuManagement')}>
              <Button size="lg" className="bg-green-600 hover:bg-green-700 shadow-2xl">
                <Settings className="w-5 h-5 mr-2" />
                Manage Menu
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
