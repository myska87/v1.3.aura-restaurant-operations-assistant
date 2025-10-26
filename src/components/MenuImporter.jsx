import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function MenuImporter() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const hasImported = sessionStorage.getItem('chai_patta_menu_imported');
    if (!hasImported && !importing) {
      importMenu();
    }
  }, []);

  const importMenu = async () => {
    setImporting(true);
    
    try {
      const categories = await base44.entities.MenuCategory.list();
      const ingredients = await base44.entities.Ingredient.list();

      if (categories.length === 0 || ingredients.length === 0) {
        console.log('⏳ Waiting for categories and ingredients to be created first...');
        setTimeout(importMenu, 2000);
        return;
      }

      const getCategoryId = (name) => categories.find(c => c.name === name)?.id;

      const createRecipe = (ingredientNames) => {
        return ingredientNames.map(name => {
          const ingredient = ingredients.find(i => i.name === name);
          if (!ingredient) {
            console.warn(`Ingredient not found: ${name}`);
            return null;
          }
          return {
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.name,
            quantity: 1,
            unit: ingredient.unit,
            cost: ingredient.unit_cost * 1,
          };
        }).filter(Boolean);
      };

      const calculateAllergens = (ingredientNames) => {
        const allergens = new Set();
        ingredientNames.forEach(name => {
          const ingredient = ingredients.find(i => i.name === name);
          if (ingredient?.allergen_tags) {
            ingredient.allergen_tags.forEach(a => allergens.add(a));
          }
        });
        return Array.from(allergens);
      };

      const menuItemsData = [
        // Chai Specials
        {
          name: "Masala Chai",
          category_id: getCategoryId("Chai Specials"),
          category_name: "Chai Specials",
          sell_price: 3.50,
          description: "Classic Indian spiced tea with aromatic masala blend",
          recipe: createRecipe(["Black Tea Leaves", "Water", "Milk (Whole)", "Sugar (White)", "Masala Chai Spice Blend"]),
          prep_time_minutes: 5,
          is_active: true,
        },
        {
          name: "Saffron Chai",
          category_id: getCategoryId("Chai Specials"),
          category_name: "Chai Specials",
          sell_price: 4.00,
          description: "Luxurious chai infused with premium saffron strands",
          recipe: createRecipe(["Black Tea Leaves", "Milk (Whole)", "Saffron Strands", "Sugar (White)", "Water"]),
          prep_time_minutes: 6,
          is_active: true,
        },
        {
          name: "Ginger Chai",
          category_id: getCategoryId("Chai Specials"),
          category_name: "Chai Specials",
          sell_price: 3.75,
          description: "Warming chai with fresh ginger kick",
          recipe: createRecipe(["Black Tea Leaves", "Milk (Whole)", "Fresh Ginger Root", "Sugar (White)", "Water"]),
          prep_time_minutes: 5,
          is_active: true,
        },
        {
          name: "Cardamom Chai",
          category_id: getCategoryId("Chai Specials"),
          category_name: "Chai Specials",
          sell_price: 3.75,
          description: "Aromatic chai with crushed cardamom pods",
          recipe: createRecipe(["Black Tea Leaves", "Milk (Whole)", "Cardamom Pods", "Sugar (White)", "Water"]),
          prep_time_minutes: 5,
          is_active: true,
        },
        {
          name: "Chai Latte",
          category_id: getCategoryId("Chai Specials"),
          category_name: "Chai Specials",
          sell_price: 3.50,
          description: "Creamy latte-style chai with steamed milk",
          recipe: createRecipe(["Masala Chai Spice Blend", "Milk (Whole)", "Sugar (White)"]),
          prep_time_minutes: 4,
          is_active: true,
        },

        // Signature Karak Chai
        {
          name: "Original Karak Chai",
          category_id: getCategoryId("Signature Karak Chai"),
          category_name: "Signature Karak Chai",
          sell_price: 3.50,
          description: "Strong, milky chai with Middle Eastern influence",
          recipe: createRecipe(["Black Tea Leaves", "Evaporated Milk", "Sugar (White)", "Water"]),
          prep_time_minutes: 5,
          is_active: true,
        },
        {
          name: "Saffron Karak",
          category_id: getCategoryId("Signature Karak Chai"),
          category_name: "Signature Karak Chai",
          sell_price: 4.25,
          description: "Karak chai elevated with saffron strands",
          recipe: createRecipe(["Black Tea Leaves", "Evaporated Milk", "Saffron Strands", "Sugar (White)", "Water"]),
          prep_time_minutes: 6,
          is_active: true,
        },
        {
          name: "Ginger Karak",
          category_id: getCategoryId("Signature Karak Chai"),
          category_name: "Signature Karak Chai",
          sell_price: 3.75,
          description: "Karak chai with a ginger twist",
          recipe: createRecipe(["Black Tea Leaves", "Evaporated Milk", "Fresh Ginger Root", "Sugar (White)", "Water"]),
          prep_time_minutes: 5,
          is_active: true,
        },

        // Eastern Fusion Pastries
        {
          name: "Cinnamon Cardamom Croissant",
          category_id: getCategoryId("Eastern Fusion Pastries"),
          category_name: "Eastern Fusion Pastries",
          sell_price: 3.00,
          description: "Buttery croissant infused with cinnamon and cardamom",
          recipe: createRecipe(["Croissant Dough (Raw)", "Butter (Unsalted)", "Cinnamon Powder", "Cardamom Pods", "Sugar (White)"]),
          prep_time_minutes: 20,
          is_active: true,
        },
        {
          name: "Saffron Pistachio Twist",
          category_id: getCategoryId("Eastern Fusion Pastries"),
          category_name: "Eastern Fusion Pastries",
          sell_price: 3.50,
          description: "Golden pastry twist with saffron glaze and pistachios",
          recipe: createRecipe(["Pastry Twist Dough", "Saffron Glaze", "Pistachios (Chopped)"]),
          prep_time_minutes: 18,
          is_active: true,
        },
        {
          name: "Rose Almond Danish",
          category_id: getCategoryId("Eastern Fusion Pastries"),
          category_name: "Eastern Fusion Pastries",
          sell_price: 3.25,
          description: "Flaky Danish with rose syrup and toasted almonds",
          recipe: createRecipe(["Danish Pastry Dough", "Rose Syrup", "Almonds (Sliced)"]),
          prep_time_minutes: 18,
          is_active: true,
        },
        {
          name: "Chai-Spiced Chocolate Croissant",
          category_id: getCategoryId("Eastern Fusion Pastries"),
          category_name: "Eastern Fusion Pastries",
          sell_price: 3.50,
          description: "Chocolate croissant with chai spice infusion",
          recipe: createRecipe(["Croissant Dough (Raw)", "Chocolate Ganache", "Masala Chai Spice Blend"]),
          prep_time_minutes: 20,
          is_active: true,
        },
        {
          name: "Honey & Nut Baklava Croissant",
          category_id: getCategoryId("Eastern Fusion Pastries"),
          category_name: "Eastern Fusion Pastries",
          sell_price: 3.75,
          description: "Croissant layered with honey syrup and mixed nuts",
          recipe: createRecipe(["Croissant Dough (Raw)", "Honey Syrup", "Mixed Nuts (Chopped)"]),
          prep_time_minutes: 22,
          is_active: true,
        },
        {
          name: "Date & Fig Crescent",
          category_id: getCategoryId("Eastern Fusion Pastries"),
          category_name: "Eastern Fusion Pastries",
          sell_price: 3.25,
          description: "Crescent pastry filled with sweet date and fig paste",
          recipe: createRecipe(["Pastry Twist Dough", "Date & Fig Paste", "Powdered Sugar"]),
          prep_time_minutes: 18,
          is_active: true,
        },
        {
          name: "Rose Pistachio Croissant",
          category_id: getCategoryId("Eastern Fusion Pastries"),
          category_name: "Eastern Fusion Pastries",
          sell_price: 3.50,
          description: "Croissant with rosewater glaze and crushed pistachios",
          recipe: createRecipe(["Croissant Dough (Raw)", "Rosewater", "Pistachios (Chopped)"]),
          prep_time_minutes: 20,
          is_active: true,
        },
        {
          name: "Chai Latte Roll",
          category_id: getCategoryId("Eastern Fusion Pastries"),
          category_name: "Eastern Fusion Pastries",
          sell_price: 3.00,
          description: "Soft roll with chai glaze and cinnamon swirl",
          recipe: createRecipe(["Roll Pastry Dough", "Chai Glaze", "Cinnamon Powder"]),
          prep_time_minutes: 15,
          is_active: true,
        },

        // Coffee Selection
        {
          name: "Espresso",
          category_id: getCategoryId("Coffee Selection"),
          category_name: "Coffee Selection",
          sell_price: 2.00,
          description: "Single shot of premium espresso",
          recipe: createRecipe(["Coffee Beans (Espresso)", "Water"]),
          prep_time_minutes: 2,
          is_active: true,
        },
        {
          name: "Americano",
          category_id: getCategoryId("Coffee Selection"),
          category_name: "Coffee Selection",
          sell_price: 2.50,
          description: "Espresso with hot water",
          recipe: createRecipe(["Coffee Beans (Espresso)", "Water"]),
          prep_time_minutes: 3,
          is_active: true,
        },
        {
          name: "Cappuccino",
          category_id: getCategoryId("Coffee Selection"),
          category_name: "Coffee Selection",
          sell_price: 3.00,
          description: "Espresso with steamed milk and foam",
          recipe: createRecipe(["Coffee Beans (Espresso)", "Milk (Whole)", "Water"]),
          prep_time_minutes: 4,
          is_active: true,
        },
        {
          name: "Latte",
          category_id: getCategoryId("Coffee Selection"),
          category_name: "Coffee Selection",
          sell_price: 3.00,
          description: "Espresso with steamed milk",
          recipe: createRecipe(["Coffee Beans (Espresso)", "Milk (Whole)", "Water"]),
          prep_time_minutes: 4,
          is_active: true,
        },
        {
          name: "Flat White",
          category_id: getCategoryId("Coffee Selection"),
          category_name: "Coffee Selection",
          sell_price: 3.00,
          description: "Espresso with micro-foamed milk",
          recipe: createRecipe(["Coffee Beans (Espresso)", "Milk (Whole)", "Water"]),
          prep_time_minutes: 4,
          is_active: true,
        },
        {
          name: "Karak Coffee",
          category_id: getCategoryId("Coffee Selection"),
          category_name: "Coffee Selection",
          sell_price: 3.75,
          description: "Espresso with cardamom and evaporated milk",
          recipe: createRecipe(["Coffee Beans (Espresso)", "Cardamom Pods", "Evaporated Milk", "Water"]),
          prep_time_minutes: 5,
          is_active: true,
        },

        // Cold Drinks
        {
          name: "Iced Karak Chai",
          category_id: getCategoryId("Cold Drinks"),
          category_name: "Cold Drinks",
          sell_price: 4.00,
          description: "Chilled karak chai over ice",
          recipe: createRecipe(["Black Tea Leaves", "Evaporated Milk", "Sugar (White)", "Ice Cubes", "Water"]),
          prep_time_minutes: 5,
          is_active: true,
        },
        {
          name: "Iced Chai Latte",
          category_id: getCategoryId("Cold Drinks"),
          category_name: "Cold Drinks",
          sell_price: 4.00,
          description: "Masala chai concentrate with cold milk over ice",
          recipe: createRecipe(["Masala Chai Spice Blend", "Milk (Whole)", "Ice Cubes"]),
          prep_time_minutes: 4,
          is_active: true,
        },
        {
          name: "Iced Spanish Latte",
          category_id: getCategoryId("Cold Drinks"),
          category_name: "Cold Drinks",
          sell_price: 4.50,
          description: "Espresso with condensed milk and cold milk over ice",
          recipe: createRecipe(["Coffee Beans (Espresso)", "Condensed Milk", "Milk (Whole)", "Ice Cubes", "Water"]),
          prep_time_minutes: 5,
          is_active: true,
        },
        {
          name: "Rose Lemonade",
          category_id: getCategoryId("Cold Drinks"),
          category_name: "Cold Drinks",
          sell_price: 3.50,
          description: "Refreshing rose-infused lemonade",
          recipe: createRecipe(["Rose Syrup", "Lemon Juice", "Sparkling Water", "Ice Cubes"]),
          prep_time_minutes: 3,
          is_active: true,
        },
        {
          name: "Mint Mojito Cooler",
          category_id: getCategoryId("Cold Drinks"),
          category_name: "Cold Drinks",
          sell_price: 3.75,
          description: "Non-alcoholic mojito with fresh mint and lime",
          recipe: createRecipe(["Mint Leaves (Fresh)", "Lime (Fresh)", "Sparkling Water", "Sugar Syrup (Simple)", "Ice Cubes"]),
          prep_time_minutes: 4,
          is_active: true,
        },

        // Small Bites
        {
          name: "Samosas (3 pcs)",
          category_id: getCategoryId("Small Bites"),
          category_name: "Small Bites",
          sell_price: 4.00,
          description: "Crispy samosas served with mint chutney",
          recipe: createRecipe(["Samosa (Frozen)", "Mint Chutney", "Cooking Oil"]),
          prep_time_minutes: 10,
          is_active: true,
        },
        {
          name: "Spicy Masala Fries",
          category_id: getCategoryId("Small Bites"),
          category_name: "Small Bites",
          sell_price: 3.50,
          description: "Crispy fries tossed in masala seasoning",
          recipe: createRecipe(["Fries (Frozen)", "Masala Seasoning", "Salt", "Cooking Oil"]),
          prep_time_minutes: 8,
          is_active: true,
        },
        {
          name: "Cheese Paratha",
          category_id: getCategoryId("Small Bites"),
          category_name: "Small Bites",
          sell_price: 3.75,
          description: "Flaky paratha stuffed with melted cheese",
          recipe: createRecipe(["Paratha Dough", "Cheese (Grated)", "Butter (Unsalted)"]),
          prep_time_minutes: 12,
          is_active: true,
        },
        {
          name: "Aloo Paratha",
          category_id: getCategoryId("Small Bites"),
          category_name: "Small Bites",
          sell_price: 3.50,
          description: "Traditional paratha with spiced potato filling",
          recipe: createRecipe(["Paratha Dough", "Potatoes (Diced)", "Masala Seasoning", "Butter (Unsalted)"]),
          prep_time_minutes: 15,
          is_active: true,
        },
        {
          name: "Chili Cheese Paratha",
          category_id: getCategoryId("Small Bites"),
          category_name: "Small Bites",
          sell_price: 4.00,
          description: "Spicy paratha with cheese and chili flakes",
          recipe: createRecipe(["Paratha Dough", "Cheese (Grated)", "Chili Flakes", "Butter (Unsalted)"]),
          prep_time_minutes: 12,
          is_active: true,
        },

        // Additions
        {
          name: "Vanilla Flavor Shot",
          category_id: getCategoryId("Additions"),
          category_name: "Additions",
          sell_price: 0.50,
          description: "Add vanilla syrup to any drink",
          recipe: createRecipe(["Vanilla Syrup"]),
          prep_time_minutes: 1,
          is_active: true,
        },
        {
          name: "Caramel Flavor Shot",
          category_id: getCategoryId("Additions"),
          category_name: "Additions",
          sell_price: 0.50,
          description: "Add caramel syrup to any drink",
          recipe: createRecipe(["Caramel Syrup"]),
          prep_time_minutes: 1,
          is_active: true,
        },
        {
          name: "Hazelnut Flavor Shot",
          category_id: getCategoryId("Additions"),
          category_name: "Additions",
          sell_price: 0.50,
          description: "Add hazelnut syrup to any drink",
          recipe: createRecipe(["Hazelnut Syrup"]),
          prep_time_minutes: 1,
          is_active: true,
        },
        {
          name: "Extra Cinnamon",
          category_id: getCategoryId("Additions"),
          category_name: "Additions",
          sell_price: 0.75,
          description: "Add cinnamon powder to your drink",
          recipe: createRecipe(["Cinnamon Powder"]),
          prep_time_minutes: 1,
          is_active: true,
        },
        {
          name: "Extra Saffron",
          category_id: getCategoryId("Additions"),
          category_name: "Additions",
          sell_price: 0.75,
          description: "Add saffron strands to your drink",
          recipe: createRecipe(["Saffron Strands"]),
          prep_time_minutes: 1,
          is_active: true,
        },
        {
          name: "Extra Cardamom",
          category_id: getCategoryId("Additions"),
          category_name: "Additions",
          sell_price: 0.75,
          description: "Add cardamom to your drink",
          recipe: createRecipe(["Cardamom Pods"]),
          prep_time_minutes: 1,
          is_active: true,
        },
        {
          name: "Whipped Cream",
          category_id: getCategoryId("Additions"),
          category_name: "Additions",
          sell_price: 0.50,
          description: "Add whipped cream topping",
          recipe: createRecipe(["Whipped Cream"]),
          prep_time_minutes: 1,
          is_active: true,
        },
        {
          name: "Extra Espresso Shot",
          category_id: getCategoryId("Additions"),
          category_name: "Additions",
          sell_price: 1.00,
          description: "Add an extra shot of espresso",
          recipe: createRecipe(["Coffee Beans (Espresso)", "Water"]),
          prep_time_minutes: 2,
          is_active: true,
        },
      ];

      console.log(`🍽️ Importing ${menuItemsData.length} menu items...`);

      for (const item of menuItemsData) {
        if (!item.category_id) {
          console.warn(`Skipping ${item.name} - category not found`);
          continue;
        }

        const allergens = calculateAllergens(item.recipe.map(r => r.ingredient_name));
        const totalCost = item.recipe.reduce((sum, r) => sum + r.cost, 0);
        const profitMargin = item.sell_price - totalCost;
        const foodCostPercentage = item.sell_price > 0 ? (totalCost / item.sell_price) * 100 : 0;

        try {
          const menuItem = await base44.entities.MenuItem.create({
            ...item,
            allergens,
            total_cost: totalCost,
            profit_margin: profitMargin,
            food_cost_percentage: foodCostPercentage,
          });

          const riskLevel = allergens.length === 0 ? 'none' :
                            allergens.some(a => ['nuts', 'shellfish', 'fish'].includes(a)) ? 'high' :
                            allergens.length >= 3 ? 'medium' : 'low';

          await base44.entities.AllergyRecord.create({
            menu_item_id: menuItem.id,
            menu_item_name: menuItem.name,
            category: menuItem.category_name,
            allergens_detected: allergens,
            ingredient_sources: item.recipe.map(r => ({
              ingredient_id: r.ingredient_id,
              ingredient_name: r.ingredient_name,
              allergens: ingredients.find(i => i.id === r.ingredient_id)?.allergen_tags || [],
            })),
            auto_generated: true,
            risk_level: riskLevel,
            last_synced: new Date().toISOString(),
          });

          console.log(`✅ Imported: ${menuItem.name}`);
        } catch (error) {
          console.error(`❌ Failed to import ${item.name}:`, error.message);
        }
      }

      sessionStorage.setItem('chai_patta_menu_imported', 'true');
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['allergyRecords'] });
      
      console.log('✅ Full Chai Patta Menu imported successfully!');
    } catch (error) {
      console.error('❌ Menu import error:', error);
    } finally {
      setImporting(false);
    }
  };

  return null;
}