import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Utensils,
  Search,
  ChefHat,
  Star,
  Clock,
  DollarSign,
  Edit,
  ArrowLeft,
  Settings,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Menu() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const { data: menuItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group items by category
  const itemsByCategory = categories.map(category => ({
    ...category,
    items: filteredItems.filter(item => item.category_id === category.id),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Utensils className="w-8 h-8 text-emerald-600" />
                Restaurant Menu
              </h1>
              <p className="text-gray-600">Browse dishes, recipes, and allergen information</p>
            </div>
            {isManager && (
              <Link to={createPageUrl('MenuManagement')}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Menu
                </Button>
              </Link>
            )}
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                size="sm"
              >
                All Items
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat.id)}
                  size="sm"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {(loadingItems || loadingCategories) && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-0">
                  <div className="h-48 bg-gray-200 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loadingItems && !loadingCategories && filteredItems.length === 0 && (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No menu items found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery ? 'Try a different search term' : 'Start building your menu'}
              </p>
              {isManager && !searchQuery && (
                <Link to={createPageUrl('MenuManagement')}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Settings className="w-4 h-4 mr-2" />
                    Add Menu Items
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Menu Items by Category */}
        {!loadingItems && !loadingCategories && itemsByCategory.length > 0 && (
          <div className="space-y-12">
            {itemsByCategory.map(category => (
              <div key={category.id}>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{category.name}</h2>
                  {category.description && (
                    <p className="text-gray-600">{category.description}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.items.map(item => (
                    <Card key={item.id} className="bg-white hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden">
                      <Link to={createPageUrl(`MenuItemView?id=${item.id}`)}>
                        {/* Image */}
                        <div className="relative h-48 bg-gray-100 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                              <ChefHat className="w-16 h-16 text-gray-300" />
                            </div>
                          )}
                          {item.allergen_tags && item.allergen_tags.length > 0 && (
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-red-500 text-white">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Allergens
                              </Badge>
                            </div>
                          )}
                        </div>

                        <CardContent className="p-4">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">
                              {item.name}
                            </h3>
                            {item.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                            )}
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                Price
                              </span>
                              <span className="font-bold text-gray-900 text-lg">£{(item.sell_price || 0).toFixed(2)}</span>
                            </div>
                            {item.prep_time_minutes > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  Prep Time
                                </span>
                                <span className="text-gray-900">{item.prep_time_minutes} min</span>
                              </div>
                            )}
                            {item.food_cost_percentage > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Food Cost</span>
                                <Badge variant="outline" className={
                                  item.food_cost_percentage < 30 ? 'text-green-700 border-green-300' :
                                  item.food_cost_percentage < 40 ? 'text-amber-700 border-amber-300' :
                                  'text-red-700 border-red-300'
                                }>
                                  {item.food_cost_percentage.toFixed(1)}%
                                </Badge>
                              </div>
                            )}
                          </div>

                          {item.allergen_tags && item.allergen_tags.length > 0 && (
                            <div className="pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Contains:</p>
                              <div className="flex flex-wrap gap-1">
                                {item.allergen_tags.slice(0, 3).map(allergen => (
                                  <Badge key={allergen} variant="outline" className="text-xs">
                                    {allergen}
                                  </Badge>
                                ))}
                                {item.allergen_tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{item.allergen_tags.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {item.linked_sop_id && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2 text-sm text-blue-600">
                                <FileText className="w-4 h-4" />
                                <span>Has Recipe SOP</span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        {isManager && (
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            <Link to={createPageUrl('MenuManagement')}>
              <Card className="bg-white hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Edit className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Menu Management</h3>
                  <p className="text-sm text-gray-600">Edit items & recipes</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('AllergyTable')}>
              <Card className="bg-white hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Allergen Table</h3>
                  <p className="text-sm text-gray-600">View all allergens</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('MenuAnalysis')}>
              <Card className="bg-white hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Profit Analysis</h3>
                  <p className="text-sm text-gray-600">Cost & profit reports</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}