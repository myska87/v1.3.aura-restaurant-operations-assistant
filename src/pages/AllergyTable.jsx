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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ALLERGEN_LIST = [
  { key: 'milk', label: 'Milk', icon: '🥛', color: 'blue' },
  { key: 'egg', label: 'Eggs', icon: '🥚', color: 'yellow' },
  { key: 'fish', label: 'Fish', icon: '🐟', color: 'cyan' },
  { key: 'shellfish', label: 'Shellfish', icon: '🦐', color: 'orange' },
  { key: 'nuts', label: 'Tree Nuts', icon: '🌰', color: 'amber' },
  { key: 'peanuts', label: 'Peanuts', icon: '🥜', color: 'brown' },
  { key: 'gluten', label: 'Gluten', icon: '🌾', color: 'yellow' },
  { key: 'soy', label: 'Soy', icon: '🫘', color: 'green' },
  { key: 'sesame', label: 'Sesame', icon: '⚫', color: 'gray' },
  { key: 'celery', label: 'Celery', icon: '🥬', color: 'green' },
  { key: 'mustard', label: 'Mustard', icon: '🟡', color: 'yellow' },
  { key: 'sulphites', label: 'Sulphites', icon: '🍷', color: 'purple' },
  { key: 'lupin', label: 'Lupin', icon: '🌼', color: 'pink' },
];

export default function AllergyTable() {
  const [allergenMatrix, setAllergenMatrix] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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
      generateAllergenMatrix();
    }
  }, [menuItems, ingredients]);

  const generateAllergenMatrix = () => {
    const matrix = menuItems.map(menuItem => {
      const allergens = new Set();
      const ingredientSources = [];

      // Get allergens from recipe ingredients
      if (menuItem.recipe && Array.isArray(menuItem.recipe)) {
        menuItem.recipe.forEach(recipeItem => {
          const ingredient = ingredients.find(ing => ing.id === recipeItem.ingredient_id);
          if (ingredient && ingredient.allergen_tags && Array.isArray(ingredient.allergen_tags)) {
            ingredient.allergen_tags.forEach(allergen => {
              allergens.add(allergen.toLowerCase());
              
              const existing = ingredientSources.find(s => s.allergen === allergen.toLowerCase());
              if (existing) {
                existing.ingredients.push(ingredient.name);
              } else {
                ingredientSources.push({
                  allergen: allergen.toLowerCase(),
                  ingredients: [ingredient.name]
                });
              }
            });
          }
        });
      }

      return {
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        category: menuItem.category_name || 'Uncategorized',
        allergens: Array.from(allergens),
        ingredientSources: ingredientSources,
        sellPrice: menuItem.sell_price,
      };
    });

    setAllergenMatrix(matrix);
  };

  const handleAIEnhancement = async () => {
    setIsGenerating(true);
    try {
      // Use AI to detect allergens from descriptions for items without full recipe data
      for (const item of menuItems.slice(0, 5)) { // Limit to 5 per run to avoid timeouts
        if (!item.recipe || item.recipe.length === 0) {
          const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Analyze this menu item and identify potential allergens:

Item: ${item.name}
Description: ${item.description || 'No description'}
Category: ${item.category_name || 'Unknown'}

Based on typical restaurant recipes, what allergens might this dish contain?
Return a list of allergen keys from: milk, egg, fish, shellfish, nuts, peanuts, gluten, soy, sesame, celery, mustard, sulphites, lupin

Only include allergens that are very likely to be in this dish.`,
            response_json_schema: {
              type: "object",
              properties: {
                allergens: { type: "array", items: { type: "string" } }
              }
            }
          });

          if (response.allergens && response.allergens.length > 0) {
            await base44.entities.MenuItem.update(item.id, {
              allergen_tags: response.allergens
            });
          }
        }
      }
      
      // Refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['menuItems'] }),
      ]);
      
      alert('✅ AI allergen detection completed! Matrix updated.');
    } catch (error) {
      console.error('AI enhancement failed:', error);
      alert('AI enhancement failed. Using manual data only.');
    }
    setIsGenerating(false);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const allergensInUse = ALLERGEN_LIST.filter(allergen => 
      allergenMatrix.some(item => item.allergens.includes(allergen.key))
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Allergen Matrix - AURA Restaurant</title>
          <style>
            @media print {
              @page {
                size: landscape;
                margin: 15mm;
              }
            }
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #014D40;
              padding-bottom: 15px;
            }
            .header h1 {
              color: #014D40;
              margin: 0 0 5px 0;
              font-size: 28px;
            }
            .header p {
              color: #64748b;
              margin: 0;
              font-size: 14px;
            }
            .allergen-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            .allergen-table th {
              background: #014D40;
              color: white;
              padding: 12px 8px;
              text-align: center;
              font-weight: bold;
              border: 1px solid #0a3830;
            }
            .allergen-table th.item-name {
              text-align: left;
              min-width: 200px;
            }
            .allergen-table td {
              border: 1px solid #e2e8f0;
              padding: 8px;
              text-align: center;
            }
            .allergen-table tr:nth-child(even) {
              background: #f8fafc;
            }
            .allergen-table tr:hover {
              background: #f1f5f9;
            }
            .present {
              color: #DC2626;
              font-size: 20px;
              font-weight: bold;
            }
            .category {
              background: #10B981;
              color: white;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 9px;
              margin-left: 8px;
            }
            .legend {
              margin-top: 20px;
              padding: 15px;
              background: #f8fafc;
              border-radius: 8px;
            }
            .legend-item {
              display: inline-block;
              margin-right: 20px;
              font-size: 12px;
              color: #475569;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #94a3b8;
              font-size: 11px;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
            }
            .warning {
              background: #FEF3C7;
              border: 2px solid #F59E0B;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .warning h3 {
              color: #92400E;
              margin: 0 0 8px 0;
              font-size: 14px;
            }
            .warning p {
              color: #78350F;
              margin: 0;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🍽️ Allergen Matrix</h1>
            <p>Complete allergen guide for all menu items</p>
            <p style="font-size: 12px; margin-top: 5px;">Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="warning">
            <h3>⚠️ Important Notice</h3>
            <p>This matrix is based on standard recipes. Always verify with kitchen staff about cross-contamination risks and preparation methods. Inform customers that traces of allergens may be present due to shared equipment.</p>
          </div>

          <table class="allergen-table">
            <thead>
              <tr>
                <th class="item-name">Menu Item</th>
                ${allergensInUse.map(allergen => `
                  <th>${allergen.icon}<br/>${allergen.label}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${allergenMatrix.map(item => `
                <tr>
                  <td style="text-align: left; font-weight: bold;">
                    ${item.menuItemName}
                    <span class="category">${item.category}</span>
                  </td>
                  ${allergensInUse.map(allergen => `
                    <td>
                      ${item.allergens.includes(allergen.key) ? '<span class="present">✓</span>' : '-'}
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="legend">
            <strong>Legend:</strong><br/>
            <div style="margin-top: 8px;">
              <span class="legend-item"><span class="present">✓</span> = Allergen Present</span>
              <span class="legend-item">- = Not Present</span>
            </div>
          </div>

          <div class="footer">
            <p><strong>AURA Restaurant Operations</strong></p>
            <p>For customer safety, always confirm with kitchen staff before serving</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadCSV = () => {
    const allergensInUse = ALLERGEN_LIST.filter(allergen => 
      allergenMatrix.some(item => item.allergens.includes(allergen.key))
    );

    let csv = 'Menu Item,Category,' + allergensInUse.map(a => a.label).join(',') + '\n';
    
    allergenMatrix.forEach(item => {
      csv += `"${item.menuItemName}","${item.category}",`;
      csv += allergensInUse.map(allergen => 
        item.allergens.includes(allergen.key) ? 'YES' : 'NO'
      ).join(',');
      csv += '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allergen-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loadingMenu || loadingIngredients) {
    return <LoadingSpinner message="Generating allergen matrix..." />;
  }

  const filteredMatrix = searchTerm 
    ? allergenMatrix.filter(item => 
        item.menuItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allergenMatrix;

  const allergensInUse = ALLERGEN_LIST.filter(allergen => 
    allergenMatrix.some(item => item.allergens.includes(allergen.key))
  );

  const totalAllergenItems = allergenMatrix.filter(item => item.allergens.length > 0).length;
  const allergenFreeItems = allergenMatrix.filter(item => item.allergens.length === 0).length;

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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Allergen Matrix</h1>
            <p className="text-gray-600">Auto-generated from menu recipes and ingredients</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={generateAllergenMatrix}
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
                  <p className="text-3xl font-bold text-blue-600">{allergenMatrix.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Contains Allergens</p>
                  <p className="text-3xl font-bold text-orange-600">{totalAllergenItems}</p>
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

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Allergens Tracked</p>
                  <p className="text-3xl font-bold text-purple-600">{allergensInUse.length}</p>
                </div>
                <Sparkles className="w-10 h-10 text-purple-500" />
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
              <CardTitle>Allergen Matrix Table</CardTitle>
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
            {allergensInUse.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Allergens Detected</h3>
                <p className="text-gray-600">
                  Great! No allergens found in menu items, or ingredients need allergen tags configured.
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
                            <th className="text-left p-3 font-semibold text-gray-900 border sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                              Menu Item
                            </th>
                            {allergensInUse.map(allergen => (
                              <th key={allergen.key} className="p-3 text-center border min-w-[80px]">
                                <div className="flex flex-col items-center">
                                  <span className="text-2xl mb-1">{allergen.icon}</span>
                                  <span className="text-xs font-semibold text-gray-700">{allergen.label}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map(item => (
                            <tr key={item.menuItemId} className="hover:bg-gray-50 transition-colors">
                              <td className="p-3 border font-medium text-gray-900 sticky left-0 bg-white z-10">
                                <div className="flex items-center justify-between">
                                  <span>{item.menuItemName}</span>
                                  <span className="text-sm text-gray-500">£{formatPrice(item.sellPrice)}</span>
                                </div>
                              </td>
                              {allergensInUse.map(allergen => {
                                const hasAllergen = item.allergens.includes(allergen.key);
                                const source = item.ingredientSources.find(s => s.allergen === allergen.key);
                                
                                return (
                                  <td 
                                    key={allergen.key} 
                                    className={`p-3 border text-center ${hasAllergen ? 'bg-red-50' : ''}`}
                                    title={hasAllergen && source ? `From: ${source.ingredients.join(', ')}` : ''}
                                  >
                                    {hasAllergen ? (
                                      <div className="flex flex-col items-center">
                                        <CheckCircle className="w-6 h-6 text-red-600" />
                                        {source && (
                                          <span className="text-xs text-gray-600 mt-1">
                                            {source.ingredients.length} source{source.ingredients.length > 1 ? 's' : ''}
                                          </span>
                                        )}
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
                <li>• <strong>Real-time:</strong> Updates automatically when you change recipes or ingredients</li>
                <li>• <strong>Traceable:</strong> Hover over checkmarks to see which ingredients contain allergens</li>
                <li>• <strong>Printable:</strong> Professional format for kitchen display and customer reference</li>
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