import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Home,
  Search,
  Filter,
  Edit,
  Eye,
  Plus,
  TrendingUp,
  DollarSign,
  Package,
  ChefHat,
  Sparkles
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const safeNumber = (value, decimals = 2) => {
  const num = parseFloat(value);
  return isNaN(num) || num === null || num === undefined ? 0 : parseFloat(num.toFixed(decimals));
};

const formatPrice = (price) => safeNumber(price, 2).toFixed(2);
const formatPercent = (percent) => safeNumber(percent, 1).toFixed(1);

export default function Menu() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list('-created_date', 200),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list('display_order', 100),
  });

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory && item.is_active !== false;
  });

  // Calculate stats
  const totalItems = menuItems.filter(i => i.is_active !== false).length;
  const avgPrice = menuItems.length > 0 
    ? menuItems.reduce((sum, item) => sum + safeNumber(item.sell_price), 0) / menuItems.length 
    : 0;
  const avgFoodCost = menuItems.length > 0
    ? menuItems.reduce((sum, item) => sum + safeNumber(item.food_cost_percentage), 0) / menuItems.length
    : 0;
  const itemsWithSOP = menuItems.filter(i => i.linked_sop_id).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex gap-3">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl("MenuManagement")}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Manage Menu
            </Button>
          </Link>
        </div>

        {/* Header */}
        <Card className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-3">
              <ChefHat className="w-8 h-8" />
              Menu
            </CardTitle>
            <p className="text-white/90 text-lg mt-2">
              Browse our delicious menu items with full ingredient transparency
            </p>
          </CardHeader>
        </Card>

        {/* Stats Row */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Package className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Price</p>
                  <p className="text-2xl font-bold text-gray-900">£{formatPrice(avgPrice)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Food Cost</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPercent(avgFoodCost)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Sparkles className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">With SOP</p>
                  <p className="text-2xl font-bold text-gray-900">{itemsWithSOP}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-64">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="bg-white">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-32 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No menu items found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className="bg-white border-none shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
                onClick={() => navigate(createPageUrl(`MenuItemView?id=${item.id}`))}
              >
                {/* Image */}
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                      {item.category_name || "Uncategorized"}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-5">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                    {item.name}
                  </h3>

                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Allergens */}
                  {item.allergen_tags && item.allergen_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.allergen_tags.slice(0, 3).map((allergen, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs text-red-600 border-red-300">
                          {allergen}
                        </Badge>
                      ))}
                      {item.allergen_tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.allergen_tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Price & Stats */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">
                        £{formatPrice(item.sell_price)}
                      </p>
                      {item.total_cost && (
                        <p className="text-xs text-gray-500">
                          Cost: £{formatPrice(item.total_cost)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {item.prep_time_minutes && (
                        <p className="text-sm text-gray-600">
                          {item.prep_time_minutes} min prep
                        </p>
                      )}
                      {item.food_cost_percentage !== undefined && (
                        <Badge variant="outline" className={
                          safeNumber(item.food_cost_percentage) < 30 
                            ? 'text-green-700 border-green-300' 
                            : 'text-amber-700 border-amber-300'
                        }>
                          {formatPercent(item.food_cost_percentage)}% cost
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* View Button */}
                  <Button 
                    className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(createPageUrl(`MenuItemView?id=${item.id}`));
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}