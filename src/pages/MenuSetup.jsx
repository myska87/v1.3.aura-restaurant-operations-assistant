import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, Loader2 } from "lucide-react";

export default function MenuSetup() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: () => base44.entities.MenuCategory.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const createMenuItemMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuItem.create(data),
  });

  const chaiPattaMenu = [
    {
      category: "Chai Specials",
      items: [
        {
          name: "Masala Chai",
          price: 3.50,
          description: "Traditional spiced chai with black tea, milk, and masala blend",
          recipe: [
            { name: "Black Tea Leaves", qty: 5 },
            { name: "Whole Milk", qty: 200 },
            { name: "Sugar", qty: 10 },
            { name: "Cinnamon Sticks", qty: 1 },
            { name: "Cardamom Pods", qty: 2 },
            { name: "Fresh Ginger", qty: 5 },
            { name: "Ground Cloves", qty: 0.5 }
          ],
          prep_time: 8
        },
        {
          name: "Saffron Chai",
          price: 4.00,
          description: "Premium chai infused with aromatic saffron strands",
          recipe: [
            { name: "Black Tea Leaves", qty: 5 },
            { name: "Whole Milk", qty: 200 },
            { name: "Sugar", qty: 10 },
            { name: "Saffron Strands", qty: 0.05 }
          ],
          prep_time: 7
        },
        {
          name: "Ginger Chai",
          price: 3.75,
          description: "Warming chai with fresh grated ginger",
          recipe: [
            { name: "Black Tea Leaves", qty: 5 },
            { name: "Whole Milk", qty: 200 },
            { name: "Sugar", qty: 10 },
            { name: "Fresh Ginger", qty: 10 }
          ],
          prep_time: 7
        },
        {
          name: "Cardamom Chai",
          price: 3.75,
          description: "Aromatic chai with crushed cardamom pods",
          recipe: [
            { name: "Black Tea Leaves", qty: 5 },
            { name: "Whole Milk", qty: 200 },
            { name: "Sugar", qty: 10 },
            { name: "Cardamom Pods", qty: 4 }
          ],
          prep_time: 7
        },
        {
          name: "Chai Latte",
          price: 3.50,
          description: "Creamy masala chai with steamed milk",
          recipe: [
            { name: "Black Tea Leaves", qty: 5 },
            { name: "Whole Milk", qty: 250 },
            { name: "Sugar", qty: 10 },
            { name: "Masala Spice Mix", qty: 3 },
            { name: "Cinnamon Sticks", qty: 1 }
          ],
          prep_time: 6
        }
      ]
    },
    {
      category: "Signature Karak Chai",
      items: [
        {
          name: "Original Karak Chai",
          price: 3.50,
          description: "Rich and creamy karak style chai with evaporated milk",
          recipe: [
            { name: "Black Tea Leaves", qty: 7 },
            { name: "Evaporated Milk", qty: 150 },
            { name: "Sugar", qty: 12 }
          ],
          prep_time: 6
        },
        {
          name: "Saffron Karak",
          price: 4.25,
          description: "Luxurious karak chai infused with saffron",
          recipe: [
            { name: "Black Tea Leaves", qty: 7 },
            { name: "Evaporated Milk", qty: 150 },
            { name: "Sugar", qty: 12 },
            { name: "Saffron Strands", qty: 0.05 }
          ],
          prep_time: 6
        },
        {
          name: "Ginger Karak",
          price: 3.75,
          description: "Spicy karak chai with fresh ginger",
          recipe: [
            { name: "Black Tea Leaves", qty: 7 },
            { name: "Evaporated Milk", qty: 150 },
            { name: "Sugar", qty: 12 },
            { name: "Fresh Ginger", qty: 8 }
          ],
          prep_time: 6
        }
      ]
    },
    {
      category: "Eastern Fusion Pastries",
      items: [
        {
          name: "Cinnamon Cardamom Croissant",
          price: 3.00,
          description: "Buttery croissant with cinnamon-cardamom sugar",
          recipe: [
            { name: "Croissants (Frozen)", qty: 1 },
            { name: "Butter", qty: 10 },
            { name: "Cinnamon Sticks", qty: 2 },
            { name: "Cardamom Pods", qty: 1 },
            { name: "Sugar", qty: 5 }
          ],
          prep_time: 15
        },
        {
          name: "Saffron Pistachio Twist",
          price: 3.50,
          description: "Twisted pastry with saffron glaze and pistachios",
          recipe: [
            { name: "Croissants (Frozen)", qty: 1 },
            { name: "Saffron Strands", qty: 0.03 },
            { name: "Pistachios", qty: 15 },
            { name: "Sugar", qty: 10 }
          ],
          prep_time: 15
        },
        {
          name: "Rose Almond Danish",
          price: 3.25,
          description: "Danish pastry with rosewater and toasted almonds",
          recipe: [
            { name: "Croissants (Frozen)", qty: 1 },
            { name: "Rose Syrup", qty: 15 },
            { name: "Almonds (Sliced)", qty: 10 }
          ],
          prep_time: 15
        },
        {
          name: "Chai-Spiced Chocolate Croissant",
          price: 3.50,
          description: "Chocolate-filled croissant with chai spices",
          recipe: [
            { name: "Croissants (Frozen)", qty: 1 },
            { name: "Dark Chocolate", qty: 30 },
            { name: "Masala Spice Mix", qty: 2 },
            { name: "Cocoa Powder", qty: 5 }
          ],
          prep_time: 15
        },
        {
          name: "Honey & Nut Baklava Croissant",
          price: 3.75,
          description: "Croissant drizzled with honey and mixed nuts",
          recipe: [
            { name: "Croissants (Frozen)", qty: 1 },
            { name: "Honey", qty: 20 },
            { name: "Mixed Nuts", qty: 15 }
          ],
          prep_time: 15
        },
        {
          name: "Date & Fig Crescent",
          price: 3.25,
          description: "Crescent pastry filled with dates and figs",
          recipe: [
            { name: "Croissants (Frozen)", qty: 1 },
            { name: "Dates (Pitted)", qty: 20 },
            { name: "Dried Figs", qty: 15 }
          ],
          prep_time: 15
        },
        {
          name: "Rose Pistachio Croissant",
          price: 3.50,
          description: "Croissant with rosewater glaze and pistachios",
          recipe: [
            { name: "Croissants (Frozen)", qty: 1 },
            { name: "Rose Syrup", qty: 15 },
            { name: "Pistachios", qty: 15 }
          ],
          prep_time: 15
        },
        {
          name: "Chai Latte Roll",
          price: 3.00,
          description: "Sweet roll with chai-infused glaze",
          recipe: [
            { name: "Croissants (Frozen)", qty: 1 },
            { name: "Masala Spice Mix", qty: 2 },
            { name: "Cinnamon Sticks", qty: 1 },
            { name: "Sugar", qty: 10 }
          ],
          prep_time: 15
        }
      ]
    },
    {
      category: "Coffee Selection",
      items: [
        {
          name: "Espresso",
          price: 2.00,
          description: "Single or double shot of rich espresso",
          recipe: [
            { name: "Coffee Beans", qty: 18 }
          ],
          prep_time: 2
        },
        {
          name: "Americano",
          price: 2.50,
          description: "Espresso with hot water",
          recipe: [
            { name: "Coffee Beans", qty: 18 }
          ],
          prep_time: 3
        },
        {
          name: "Cappuccino",
          price: 3.00,
          description: "Espresso with steamed milk and foam",
          recipe: [
            { name: "Coffee Beans", qty: 18 },
            { name: "Whole Milk", qty: 120 }
          ],
          prep_time: 4
        },
        {
          name: "Latte",
          price: 3.00,
          description: "Espresso with steamed milk",
          recipe: [
            { name: "Coffee Beans", qty: 18 },
            { name: "Whole Milk", qty: 200 }
          ],
          prep_time: 4
        },
        {
          name: "Flat White",
          price: 3.00,
          description: "Espresso with micro-foamed milk",
          recipe: [
            { name: "Coffee Beans", qty: 18 },
            { name: "Whole Milk", qty: 150 }
          ],
          prep_time: 4
        },
        {
          name: "Karak Coffee",
          price: 3.75,
          description: "Espresso with cardamom and evaporated milk",
          recipe: [
            { name: "Coffee Beans", qty: 18 },
            { name: "Evaporated Milk", qty: 80 },
            { name: "Cardamom Pods", qty: 2 }
          ],
          prep_time: 5
        }
      ]
    },
    {
      category: "Cold Drinks",
      items: [
        {
          name: "Iced Karak Chai",
          price: 4.00,
          description: "Chilled karak chai over ice",
          recipe: [
            { name: "Black Tea Leaves", qty: 7 },
            { name: "Evaporated Milk", qty: 150 },
            { name: "Sugar", qty: 12 }
          ],
          prep_time: 10
        },
        {
          name: "Iced Chai Latte",
          price: 4.00,
          description: "Cold masala chai latte",
          recipe: [
            { name: "Black Tea Leaves", qty: 5 },
            { name: "Whole Milk", qty: 250 },
            { name: "Sugar", qty: 10 },
            { name: "Masala Spice Mix", qty: 3 }
          ],
          prep_time: 8
        },
        {
          name: "Iced Spanish Latte",
          price: 4.50,
          description: "Espresso with sweetened condensed milk over ice",
          recipe: [
            { name: "Coffee Beans", qty: 18 },
            { name: "Sweetened Condensed Milk", qty: 50 },
            { name: "Whole Milk", qty: 200 }
          ],
          prep_time: 5
        },
        {
          name: "Rose Lemonade",
          price: 3.50,
          description: "Fresh lemonade with rose syrup",
          recipe: [
            { name: "Fresh Lemon", qty: 1.5 },
            { name: "Rose Syrup", qty: 30 },
            { name: "Sugar", qty: 15 }
          ],
          prep_time: 5
        },
        {
          name: "Mint Mojito Cooler",
          price: 3.75,
          description: "Refreshing mint and lime mocktail",
          recipe: [
            { name: "Fresh Mint", qty: 10 },
            { name: "Fresh Lime", qty: 1 },
            { name: "Sugar", qty: 15 },
            { name: "Sparkling Water", qty: 250 }
          ],
          prep_time: 5
        }
      ]
    },
    {
      category: "Small Bites",
      items: [
        {
          name: "Samosas (3 pcs)",
          price: 4.00,
          description: "Crispy fried samosas with mint chutney",
          recipe: [
            { name: "Samosas (Frozen)", qty: 3 }
          ],
          prep_time: 8
        },
        {
          name: "Spicy Masala Fries",
          price: 3.50,
          description: "Crispy fries tossed in masala seasoning",
          recipe: [
            { name: "Frozen Fries", qty: 200 },
            { name: "Masala Spice Mix", qty: 5 }
          ],
          prep_time: 10
        }
      ]
    },
    {
      category: "Parathas",
      items: [
        {
          name: "Cheese Paratha",
          price: 3.75,
          description: "Griddled flatbread stuffed with cheese",
          recipe: [
            { name: "Paratha Dough", qty: 150 },
            { name: "Cheddar Cheese", qty: 40 },
            { name: "Butter", qty: 10 }
          ],
          prep_time: 8
        },
        {
          name: "Aloo Paratha",
          price: 3.50,
          description: "Traditional potato-stuffed paratha",
          recipe: [
            { name: "Paratha Dough", qty: 150 },
            { name: "Potatoes", qty: 0.1 },
            { name: "Masala Spice Mix", qty: 3 },
            { name: "Butter", qty: 10 }
          ],
          prep_time: 10
        },
        {
          name: "Chili Cheese Paratha",
          price: 4.00,
          description: "Spicy cheese and chili paratha",
          recipe: [
            { name: "Paratha Dough", qty: 150 },
            { name: "Cheddar Cheese", qty: 40 },
            { name: "Green Chili", qty: 10 },
            { name: "Butter", qty: 10 }
          ],
          prep_time: 8
        }
      ]
    },
    {
      category: "Additions",
      items: [
        {
          name: "Vanilla Flavor Shot",
          price: 0.50,
          description: "Add vanilla syrup to any drink",
          recipe: [
            { name: "Vanilla Syrup", qty: 20 }
          ],
          prep_time: 0
        },
        {
          name: "Caramel Flavor Shot",
          price: 0.50,
          description: "Add caramel syrup to any drink",
          recipe: [
            { name: "Caramel Syrup", qty: 20 }
          ],
          prep_time: 0
        },
        {
          name: "Hazelnut Flavor Shot",
          price: 0.50,
          description: "Add hazelnut syrup to any drink",
          recipe: [
            { name: "Hazelnut Syrup", qty: 20 }
          ],
          prep_time: 0
        },
        {
          name: "Extra Spice - Cinnamon",
          price: 0.75,
          description: "Add extra cinnamon to your drink",
          recipe: [
            { name: "Cinnamon Sticks", qty: 2 }
          ],
          prep_time: 0
        },
        {
          name: "Extra Spice - Saffron",
          price: 0.75,
          description: "Add saffron strands to your drink",
          recipe: [
            { name: "Saffron Strands", qty: 0.03 }
          ],
          prep_time: 0
        },
        {
          name: "Extra Spice - Cardamom",
          price: 0.75,
          description: "Add cardamom to your drink",
          recipe: [
            { name: "Cardamom Pods", qty: 2 }
          ],
          prep_time: 0
        },
        {
          name: "Whipped Cream",
          price: 0.50,
          description: "Top your drink with whipped cream",
          recipe: [
            { name: "Whipped Cream", qty: 30 }
          ],
          prep_time: 0
        },
        {
          name: "Extra Espresso Shot",
          price: 1.00,
          description: "Add an additional espresso shot",
          recipe: [
            { name: "Coffee Beans", qty: 18 }
          ],
          prep_time: 2
        }
      ]
    }
  ];

  const handleImportMenu = async () => {
    if (!categories.length || !ingredients.length) {
      alert("Please wait for categories and ingredients to load first.");
      return;
    }

    setImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const categoryGroup of chaiPattaMenu) {
      const category = categories.find(c => c.name === categoryGroup.category);
      if (!category) {
        setProgress(`Category "${categoryGroup.category}" not found. Skipping...`);
        continue;
      }

      for (const item of categoryGroup.items) {
        setProgress(`Creating: ${item.name}...`);
        
        const recipe = [];
        let totalCost = 0;
        let allIngredientsFound = true;

        for (const recipeItem of item.recipe) {
          const ingredient = ingredients.find(ing => ing.name === recipeItem.name);
          if (!ingredient) {
            console.warn(`Ingredient "${recipeItem.name}" not found for ${item.name}`);
            allIngredientsFound = false;
            break;
          }

          const cost = ingredient.unit_cost * recipeItem.qty;
          recipe.push({
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.name,
            quantity: recipeItem.qty,
            unit: ingredient.unit,
            cost: cost
          });
          totalCost += cost;
        }

        if (!allIngredientsFound) {
          failCount++;
          continue;
        }

        const foodCostPercentage = (totalCost / item.price) * 100;
        const profitMargin = item.price - totalCost;

        try {
          await createMenuItemMutation.mutateAsync({
            name: item.name,
            category_id: category.id,
            category_name: category.name,
            sell_price: item.price,
            description: item.description,
            recipe: recipe,
            total_cost: totalCost,
            food_cost_percentage: foodCostPercentage,
            profit_margin: profitMargin,
            prep_time_minutes: item.prep_time,
            is_active: true
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to create ${item.name}:`, error);
          failCount++;
        }
      }
    }

    setProgress(`Import complete! Created ${successCount} items. ${failCount} failed.`);
    queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    
    setTimeout(() => {
      setImporting(false);
      setProgress("");
    }, 3000);
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white border-none shadow-lg">
          <CardContent className="p-8 text-center">
            <ChefHat className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Chai Patta Menu Import</h1>
            <p className="text-gray-600 mb-6">
              Click below to import the complete Chai Patta menu with all items, recipes, and cost calculations
            </p>

            <div className="mb-6 space-y-2 text-sm text-gray-600">
              <p>✅ {categories.length} Categories loaded</p>
              <p>✅ {ingredients.length} Ingredients loaded</p>
            </div>

            <Button 
              onClick={handleImportMenu}
              disabled={importing || !categories.length || !ingredients.length}
              className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
            >
              {importing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Importing Menu...
                </>
              ) : (
                <>
                  <ChefHat className="w-5 h-5 mr-2" />
                  Import Chai Patta Menu
                </>
              )}
            </Button>

            {progress && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-900">
                {progress}
              </div>
            )}

            <div className="mt-8 text-xs text-gray-500">
              <p>This will create:</p>
              <ul className="mt-2 space-y-1">
                <li>• 5 Chai Specials</li>
                <li>• 3 Signature Karak Chai</li>
                <li>• 8 Eastern Fusion Pastries</li>
                <li>• 6 Coffee drinks</li>
                <li>• 5 Cold drinks</li>
                <li>• 5 Small bites & Parathas</li>
                <li>• 8 Add-ons</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}