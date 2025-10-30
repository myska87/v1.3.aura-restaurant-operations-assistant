import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Home,
  Printer,
  AlertTriangle,
  CheckCircle,
  Search,
  RefreshCw,
  Sparkles,
  Download,
  Package,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function AllergyTable() {
  const [ingredientMatrix, setIngredientMatrix] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: ingredients = [], isLoading: loadingIngredients } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list(),
  });

  useEffect(() => {
    if (menuItems.length > 0 && ingredients.length > 0) {
      generateIngredientMatrix();
    }
  }, [menuItems, ingredients]);

  const generateIngredientMatrix = () => {
    const matrix = menuItems.map(menuItem => {
      const itemIngredients = [];
      const allergens = new Set();

      if (menuItem.recipe && Array.isArray(menuItem.recipe)) {
        menuItem.recipe.forEach(recipeItem => {
          itemIngredients.push({
            ingredient_id: recipeItem.ingredient_id,
            ingredient_name: recipeItem.ingredient_name,
            quantity: recipeItem.quantity,
            unit: recipeItem.unit,
          });

          // Also collect allergens from ingredients
          const ingredient = ingredients.find(ing => ing.id === recipeItem.ingredient_id);
          if (ingredient?.allergen_tags && Array.isArray(ingredient.allergen_tags)) {
            ingredient.allergen_tags.forEach(allergen => allergens.add(allergen.toLowerCase()));
          }
        });
      }

      return {
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        category: menuItem.category_name || 'Uncategorized',
        ingredients: itemIngredients,
        allergens: Array.from(allergens),
        sellPrice: menuItem.sell_price,
      };
    });

    setIngredientMatrix(matrix);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    // Get all unique ingredients used across all menu items
    const allIngredientsUsed = new Map();
    ingredientMatrix.forEach(item => {
      item.ingredients.forEach(ing => {
        if (!allIngredientsUsed.has(ing.ingredient_id)) {
          allIngredientsUsed.set(ing.ingredient_id, ing.ingredient_name);
        }
      });
    });
    const ingredientsInUse = Array.from(allIngredientsUsed.entries()).map(([id, name]) => ({ id, name }));

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ingredient Matrix - AURA Restaurant</title>
          <style>
            @media print {
              @page {
                size: landscape;
                margin: 10mm;
              }
            }
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 15px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
              border-bottom: 3px solid #014D40;
              padding-bottom: 12px;
            }
            .header h1 {
              color: #014D40;
              margin: 0 0 5px 0;
              font-size: 26px;
            }
            .header p {
              color: #64748b;
              margin: 0;
              font-size: 13px;
            }
            .ingredient-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
            }
            .ingredient-table th {
              background: #014D40;
              color: white;
              padding: 8px 4px;
              text-align: center;
              font-weight: bold;
              border: 1px solid #0a3830;
              writing-mode: horizontal-tb;
            }
            .ingredient-table th.item-name {
              text-align: left;
              min-width: 180px;
              writing-mode: horizontal-tb;
            }
            .ingredient-table th.ingredient-header {
              writing-mode: vertical-rl;
              transform: rotate(180deg);
              white-space: nowrap;
              height: 120px;
              min-width: 30px;
              padding: 4px 2px;
            }
            .ingredient-table td {
              border: 1px solid #e2e8f0;
              padding: 6px 4px;
              text-align: center;
            }
            .ingredient-table tr:nth-child(even) {
              background: #f8fafc;
            }
            .ingredient-table tr:hover {
              background: #f1f5f9;
            }
            .present {
              color: #10B981;
              font-size: 16px;
              font-weight: bold;
            }
            .quantity {
              color: #0ea5e9;
              font-size: 8px;
              font-weight: normal;
              display: block;
              margin-top: 2px;
            }
            .category {
              background: #10B981;
              color: white;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 8px;
              margin-left: 6px;
            }
            .allergen-badge {
              background: #DC2626;
              color: white;
              padding: 1px 4px;
              border-radius: 3px;
              font-size: 7px;
              margin-left: 4px;
            }
            .legend {
              margin-top: 15px;
              padding: 12px;
              background: #f8fafc;
              border-radius: 6px;
            }
            .legend-item {
              display: inline-block;
              margin-right: 15px;
              font-size: 10px;
              color: #475569;
            }
            .footer {
              margin-top: 25px;
              text-align: center;
              color: #94a3b8;
              font-size: 10px;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
            }
            .warning {
              background: #FEF3C7;
              border: 2px solid #F59E0B;
              padding: 12px;
              border-radius: 6px;
              margin-bottom: 15px;
            }
            .warning h3 {
              color: #92400E;
              margin: 0 0 6px 0;
              font-size: 13px;
            }
            .warning p {
              color: #78350F;
              margin: 0;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Complete Ingredient Matrix</h1>
            <p>Full breakdown of all ingredients in menu items</p>
            <p style="font-size: 11px; margin-top: 5px;">Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="warning">
            <h3>⚠️ Important Notice</h3>
            <p>This matrix shows all ingredients in recipes. Always verify with kitchen staff about substitutions, cross-contamination, and allergen risks. Inform customers about potential allergen traces.</p>
          </div>

          <table class="ingredient-table">
            <thead>
              <tr>
                <th class="item-name">Menu Item</th>
                ${ingredientsInUse.map(ing => `
                  <th class="ingredient-header">${ing.name}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${ingredientMatrix.map(item => `
                <tr>
                  <td style="text-align: left; font-weight: bold;">
                    ${item.menuItemName}
                    <span class="category">${item.category}</span>
                    ${item.allergens.length > 0 ? `<span class="allergen-badge">${item.allergens.length} allergen${item.allergens.length > 1 ? 's' : ''}</span>` : ''}
                  </td>
                  ${ingredientsInUse.map(ing => {
                    const itemIng = item.ingredients.find(i => i.ingredient_id === ing.id);
                    return `
                      <td>
                        ${itemIng ? `
                          <span class="present">✓</span>
                          <span class="quantity">${parseFloat(itemIng.quantity).toFixed(1)} ${itemIng.unit}</span>
                        ` : '-'}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="legend">
            <strong>Legend:</strong><br/>
            <div style="margin-top: 6px;">
              <span class="legend-item"><span class="present">✓</span> = Ingredient Used</span>
              <span class="legend-item">- = Not Used</span>
              <span class="legend-item"><span style="color: #0ea5e9;">Blue text</span> = Quantity needed</span>
              <span class="legend-item"><span class="allergen-badge">Red badge</span> = Contains allergens</span>
            </div>
          </div>

          <div class="footer">
            <p><strong>AURA Restaurant Operations</strong></p>
            <p>Complete ingredient breakdown for menu planning and allergen tracking</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadCSV = () => {
    const allIngredientsUsed = new Map();
    ingredientMatrix.forEach(item => {
      item.ingredients.forEach(ing => {
        if (!allIngredientsUsed.has(ing.ingredient_id)) {
          allIngredientsUsed.set(ing.ingredient_id, ing.ingredient_name);
        }
      });
    });
    const ingredientsInUse = Array.from(allIngredientsUsed.entries()).map(([id, name]) => ({ id, name }));

    let csv = 'Menu Item,Category,Allergens,' + ingredientsInUse.map(i => i.name).join(',') + '\n';
    
    ingredientMatrix.forEach(item => {
      csv += `"${item.menuItemName}","${item.category}","${item.allergens.join('; ')}",`;
      csv += ingredientsInUse.map(ing => {
        const itemIng = item.ingredients.find(i => i.ingredient_id === ing.id);
        return itemIng ? `${parseFloat(itemIng.quantity).toFixed(2)} ${itemIng.unit}` : '-';
      }).join(',');
      csv += '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingredient-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loadingMenu || loadingIngredients) {
    return <LoadingSpinner message="Generating ingredient matrix..." />;
  }

  const filteredMatrix = searchTerm 
    ? ingredientMatrix.filter(item => 
        item.menuItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : ingredientMatrix;

  // Get all unique ingredients used across all menu items
  const allIngredientsUsed = new Map();
  ingredientMatrix.forEach(item => {
    item.ingredients.forEach(ing => {
      if (!allIngredientsUsed.has(ing.ingredient_id)) {
        const fullIngredient = ingredients.find(i => i.id === ing.ingredient_id);
        allIngredientsUsed.set(ing.ingredient_id, {
          id: ing.ingredient_id,
          name: ing.ingredient_name,
          allergens: fullIngredient?.allergen_tags || []
        });
      }
    });
  });
  const ingredientsInUse = Array.from(allIngredientsUsed.values());

  const totalWithAllergens = ingredientMatrix.filter(item => item.allergens.length > 0).length;
  const allergenFreeItems = ingredientMatrix.filter(item => item.allergens.length === 0).length;
  const totalIngredientsTracked = ingredientsInUse.length;

  const groupedByCategory = categories.map(cat => ({
    category: cat.name,
    items: filteredMatrix.filter(item => item.category === cat.name)
  })).filter(group => group.items.length > 0);

  const uncategorized = filteredMatrix.filter(item => item.category === 'Uncategorized');
  if (uncategorized.length > 0) {
    groupedByCategory.push({ category: 'Uncategorized', items: uncategorized });
  }

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-[1800px] mx-auto">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Menu')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Ingredient Matrix</h1>
            <p className="text-gray-600">Auto-generated from menu recipes - shows all ingredients and allergens</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={generateIngredientMatrix}
              className="bg-blue-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadCSV}
              className="bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Matrix
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Menu Items</p>
                  <p className="text-3xl font-bold text-blue-600">{ingredientMatrix.length}</p>
                </div>
                <Package className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ingredients Tracked</p>
                  <p className="text-3xl font-bold text-purple-600">{totalIngredientsTracked}</p>
                </div>
                <Sparkles className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Contains Allergens</p>
                  <p className="text-3xl font-bold text-orange-600">{totalWithAllergens}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Allergen-Free</p>
                  <p className="text-3xl font-bold text-green-600">{allergenFreeItems}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-amber-50 border-amber-300 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-amber-900 mb-2">⚠️ Important Safety Notice</h3>
                <p className="text-sm text-amber-800">
                  This matrix is automatically generated from recipe data. Always verify with kitchen staff about cross-contamination risks, 
                  shared equipment, and preparation methods. Inform customers that traces of allergens may be present.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Complete Ingredient Matrix</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search menu items..."
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {ingredientsInUse.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Ingredients Found</h3>
                <p className="text-gray-600">
                  Add ingredients to your menu items to see the ingredient matrix.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedByCategory.map(group => (
                  <div key={group.category}>
                    <div className="flex items-center gap-3 mb-3 pb-2 border-b-2 border-gray-200">
                      <Badge className="bg-emerald-600 text-white text-sm px-3 py-1">
                        {group.category}
                      </Badge>
                      <span className="text-sm text-gray-500">{group.items.length} items</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left p-3 font-semibold text-gray-900 border sticky left-0 bg-gray-50 z-10 min-w-[280px]">
                              Menu Item
                            </th>
                            {ingredientsInUse.map(ing => (
                              <th key={ing.id} className="p-2 text-center border min-w-[100px] max-w-[120px]">
                                <div className="flex flex-col items-center">
                                  <Package className="w-4 h-4 text-purple-600 mb-1" />
                                  <span className="text-xs font-semibold text-gray-900 leading-tight">{ing.name}</span>
                                  {ing.allergens.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1 justify-center">
                                      {ing.allergens.map(allergen => (
                                        <Badge key={allergen} className="bg-red-100 text-red-800 text-[8px] px-1 py-0">
                                          {allergen}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map(item => (
                            <tr key={item.menuItemId} className="hover:bg-gray-50 transition-colors">
                              <td className="p-3 border font-medium text-gray-900 sticky left-0 bg-white z-10">
                                <div className="flex flex-col">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">{item.menuItemName}</span>
                                    <span className="text-sm text-gray-500 ml-2">£{formatPrice(item.sellPrice)}</span>
                                  </div>
                                  {item.allergens.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {item.allergens.map(allergen => (
                                        <Badge key={allergen} className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">
                                          {allergen}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              {ingredientsInUse.map(ing => {
                                const itemIng = item.ingredients.find(i => i.ingredient_id === ing.id);
                                
                                return (
                                  <td 
                                    key={ing.id} 
                                    className={`p-2 border text-center ${itemIng ? 'bg-green-50' : ''}`}
                                    title={itemIng ? `${parseFloat(itemIng.quantity).toFixed(2)} ${itemIng.unit}` : 'Not used'}
                                  >
                                    {itemIng ? (
                                      <div className="flex flex-col items-center">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-[10px] text-blue-600 font-medium mt-1">
                                          {parseFloat(itemIng.quantity).toFixed(1)} {itemIng.unit}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-300 text-xl">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">📊 How This Works</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Automatic:</strong> Matrix is generated from your menu recipes and ingredient data</li>
                <li>• <strong>Complete View:</strong> Shows ALL ingredients used across your menu</li>
                <li>• <strong>Allergen Tracking:</strong> Red badges show which ingredients contain allergens</li>
                <li>• <strong>Quantities:</strong> Hover or see quantity needed for each ingredient per dish</li>
                <li>• <strong>Real-time:</strong> Updates automatically when you change recipes or ingredients</li>
                <li>• <strong>Printable:</strong> Professional landscape format for kitchen display</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const formatPrice = (price) => {
  return (parseFloat(price) || 0).toFixed(2);
};