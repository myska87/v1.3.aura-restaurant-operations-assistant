import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChefHat, Search, Filter, ArrowLeft, Home, Leaf, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Menu() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAllergen, setSelectedAllergen] = useState("all");

  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list(),
  });

  // Common allergens to filter by
  const commonAllergens = [
    "milk", "nuts", "gluten", "soy", "egg", "fish", 
    "shellfish", "sesame", "celery", "mustard", "sulphites", "lupin"
  ];

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || 
      item.category_id === selectedCategory;

    const matchesAllergen = selectedAllergen === "all" || 
      !item.allergens?.includes(selectedAllergen);

    return matchesSearch && matchesCategory && matchesAllergen;
  });

  // Group items by category
  const groupedItems = categories
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .map(category => ({
      ...category,
      items: filteredItems.filter(item => item.category_id === category.id)
    }))
    .filter(category => category.items.length > 0);

  // Safe number formatting
  const formatPrice = (price) => {
    const num = parseFloat(price);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const formatPercent = (percent) => {
    const num = parseFloat(percent);
    return isNaN(num) ? '0.0' : num.toFixed(1);
  };

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
              <Home className="w-4 h-4 mr-2" />
              Inventory Hub
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ChefHat className="w-10 h-10 text-emerald-600" />
            <h1 className="text-4xl font-bold text-gray-900">Menu</h1>
          </div>
          <p className="text-lg text-gray-600">Browse our complete menu with allergen information</p>
        </div>

        {/* Filters */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
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

          <Select value={selectedAllergen} onValueChange={setSelectedAllergen}>
            <SelectTrigger>
              <Leaf className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter Allergens" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              {commonAllergens.map(allergen => (
                <SelectItem key={allergen} value={allergen}>
                  Exclude {allergen}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {(loadingMenu || loadingCategories) && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading menu...</p>
          </div>
        )}

        {/* Empty State */}
        {!loadingMenu && !loadingCategories && filteredItems.length === 0 && (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No menu items found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        )}

        {/* Menu Items by Category */}
        <div className="space-y-12">
          {groupedItems.map((category) => (
            <div key={category.id}>
              {/* Category Header */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{category.name}</h2>
                {category.description && (
                  <p className="text-gray-600">{category.description}</p>
                )}
              </div>

              {/* Menu Items Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.items.map((item) => {
                  const sellPrice = formatPrice(item.sell_price);
                  const totalCost = formatPrice(item.total_cost);
                  const profitMargin = formatPrice(item.profit_margin);
                  const foodCostPercentage = formatPercent(item.food_cost_percentage);

                  return (
                    <Card key={item.id} className="bg-white border-none shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                      {/* Image */}
                      {item.image_url ? (
                        <div className="h-48 overflow-hidden">
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
                          <ChefHat className="w-16 h-16 text-gray-300" />
                        </div>
                      )}

                      <CardContent className="p-6">
                        {/* Title & Description */}
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                        )}

                        {/* Price */}
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-2xl font-bold text-emerald-600">£{sellPrice}</span>
                          {item.prep_time_minutes && (
                            <Badge variant="outline" className="text-xs">
                              {item.prep_time_minutes} min
                            </Badge>
                          )}
                        </div>

                        {/* Allergens */}
                        {item.allergens && item.allergens.length > 0 && (
                          <div className="mb-4 pb-4 border-b border-gray-100">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">Contains:</p>
                                <div className="flex flex-wrap gap-1">
                                  {item.allergens.map((allergen, idx) => (
                                    <Badge 
                                      key={idx} 
                                      className="bg-amber-100 text-amber-800 text-xs"
                                    >
                                      {allergen}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Costing Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">Cost:</p>
                            <p className="font-semibold text-gray-900">£{totalCost}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Profit:</p>
                            <p className="font-semibold text-emerald-600">£{profitMargin}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Food Cost %:</p>
                            <Badge variant="outline" className={parseFloat(foodCostPercentage) < 35 ? 'text-green-700 border-green-300' : 'text-amber-700 border-amber-300'}>
                              {foodCostPercentage}%
                            </Badge>
                          </div>
                          <div>
                            <p className="text-gray-500">Ingredients:</p>
                            <p className="font-semibold text-gray-900">{item.recipe?.length || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}