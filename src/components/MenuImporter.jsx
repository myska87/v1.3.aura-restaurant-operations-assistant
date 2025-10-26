import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function MenuImporter() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const hasImported = sessionStorage.getItem('chai_patta_menu_imported_v2');
    if (!hasImported && !importing) {
      setTimeout(() => {
        importMenu();
      }, 2000);
    }
  }, []);

  const importMenu = async () => {
    setImporting(true);
    
    try {
      console.log('🔄 Starting menu import...');
      
      const categories = await base44.entities.MenuCategory.list();
      const ingredients = await base44.entities.Ingredient.list();

      if (categories.length === 0) {
        console.log('⏳ Waiting for categories...');
        setTimeout(importMenu, 3000);
        setImporting(false);
        return;
      }

      if (ingredients.length < 10) {
        console.log('⏳ Waiting for ingredients...');
        setTimeout(importMenu, 3000);
        setImporting(false);
        return;
      }

      console.log(`✅ Found ${categories.length} categories and ${ingredients.length} ingredients`);

      const getCategoryId = (name) => {
        const category = categories.find(c => c.name === name);
        return category ? category.id : null;
      };

      const createRecipe = (ingredientNames) => {
        if (!Array.isArray(ingredientNames)) {
          console.error('❌ ingredientNames is not an array:', ingredientNames);
          return [];
        }

        return ingredientNames
          .map(name => {
            if (!name) {
              console.warn('⚠️ Empty ingredient name found');
              return null;
            }

            const ingredient = ingredients.find(i => i.name === name);
            
            if (!ingredient) {
              console.warn(`⚠️ Ingredient not found: ${name}`);
              return null;
            }

            // Ensure all required properties exist
            return {
              ingredient_id: ingredient.id || '',
              ingredient_name: ingredient.name || name,
              quantity: 1, // Default quantity
              unit: ingredient.unit || 'unit',
              cost: (ingredient.unit_cost || 0) * 1,
            };
          })
          .filter(item => item !== null); // Remove null entries
      };

      const calculateAllergens = (ingredientNames) => {
        if (!Array.isArray(ingredientNames)) {
          return [];
        }

        const allergens = new Set();
        
        ingredientNames.forEach(name => {
          if (!name) return;
          
          const ingredient = ingredients.find(i => i.name === name);
          
          if (ingredient && Array.isArray(ingredient.allergen_tags)) {
            ingredient.allergen_tags.forEach(a => allergens.add(a));
          }
        });
        
        return Array.from(allergens);
      };

      const menuItemsData = [
        // Chai Specials (5 items)
        {
          name: "Masala Chai",
          category: "Chai Specials",
          sell_price: 3.50,
          description: "Classic Indian spiced tea with aromatic masala blend",
          ingredients: ["Black Tea Leaves", "Water", "Milk (Whole)", "Sugar (White)", "Masala Chai Spice Blend"],
          prep_time_minutes: 5,
        },
        {
          name: "Saffron Chai",
          category: "Chai Specials",
          sell_price: 4.00,
          description: "Luxurious chai infused with premium saffron strands",
          ingredients: ["Black Tea Leaves", "Milk (Whole)", "Saffron Strands", "Sugar (White)", "Water"],
          prep_time_minutes: 6,
        },
        {
          name: "Ginger Chai",
          category: "Chai Specials",
          sell_price: 3.75,
          description: "Warming chai with fresh ginger kick",
          ingredients: ["Black Tea Leaves", "Milk (Whole)", "Fresh Ginger Root", "Sugar (White)", "Water"],
          prep_time_minutes: 5,
        },
        {
          name: "Cardamom Chai",
          category: "Chai Specials",
          sell_price: 3.75,
          description: "Aromatic chai with crushed cardamom pods",
          ingredients: ["Black Tea Leaves", "Milk (Whole)", "Cardamom Pods", "Sugar (White)", "Water"],
          prep_time_minutes: 5,
        },
        {
          name: "Chai Latte",
          category: "Chai Specials",
          sell_price: 3.50,
          description: "Creamy latte-style chai with steamed milk",
          ingredients: ["Masala Chai Spice Blend", "Milk (Whole)", "Sugar (White)"],
          prep_time_minutes: 4,
        },

        // Signature Karak Chai (3 items)
        {
          name: "Original Karak Chai",
          category: "Signature Karak Chai",
          sell_price: 3.50,
          description: "Strong, milky chai with Middle Eastern influence",
          ingredients: ["Black Tea Leaves", "Evaporated Milk", "Sugar (White)", "Water"],
          prep_time_minutes: 5,
        },
        {
          name: "Saffron Karak",
          category: "Signature Karak Chai",
          sell_price: 4.25,
          description: "Karak chai elevated with saffron strands",
          ingredients: ["Black Tea Leaves", "Evaporated Milk", "Saffron Strands", "Sugar (White)", "Water"],
          prep_time_minutes: 6,
        },
        {
          name: "Ginger Karak",
          category: "Signature Karak Chai",
          sell_price: 3.75,
          description: "Karak chai with a ginger twist",
          ingredients: ["Black Tea Leaves", "Evaporated Milk", "Fresh Ginger Root", "Sugar (White)", "Water"],
          prep_time_minutes: 5,
        },

        // Eastern Fusion Pastries (8 items)
        {
          name: "Cinnamon Cardamom Croissant",
          category: "Eastern Fusion Pastries",
          sell_price: 3.00,
          description: "Buttery croissant infused with cinnamon and cardamom",
          ingredients: ["Croissant Dough (Raw)", "Butter (Unsalted)", "Cinnamon Powder", "Cardamom Pods", "Sugar (White)"],
          prep_time_minutes: 20,
        },
        {
          name: "Saffron Pistachio Twist",
          category: "Eastern Fusion Pastries",
          sell_price: 3.50,
          description: "Golden pastry twist with saffron glaze and pistachios",
          ingredients: ["Pastry Twist Dough", "Saffron Glaze", "Pistachios (Chopped)"],
          prep_time_minutes: 18,
        },
        {
          name: "Rose Almond Danish",
          category: "Eastern Fusion Pastries",
          sell_price: 3.25,
          description: "Flaky Danish with rose syrup and toasted almonds",
          ingredients: ["Danish Pastry Dough", "Rose Syrup", "Almonds (Sliced)"],
          prep_time_minutes: 18,
        },
        {
          name: "Chai-Spiced Chocolate Croissant",
          category: "Eastern Fusion Pastries",
          sell_price: 3.50,
          description: "Chocolate croissant with chai spice infusion",
          ingredients: ["Croissant Dough (Raw)", "Chocolate Ganache", "Masala Chai Spice Blend"],
          prep_time_minutes: 20,
        },
        {
          name: "Honey & Nut Baklava Croissant",
          category: "Eastern Fusion Pastries",
          sell_price: 3.75,
          description: "Croissant layered with honey syrup and mixed nuts",
          ingredients: ["Croissant Dough (Raw)", "Honey Syrup", "Mixed Nuts (Chopped)"],
          prep_time_minutes: 22,
        },
        {
          name: "Date & Fig Crescent",
          category: "Eastern Fusion Pastries",
          sell_price: 3.25,
          description: "Crescent pastry filled with sweet date and fig paste",
          ingredients: ["Pastry Twist Dough", "Date & Fig Paste", "Powdered Sugar"],
          prep_time_minutes: 18,
        },
        {
          name: "Rose Pistachio Croissant",
          category: "Eastern Fusion Pastries",
          sell_price: 3.50,
          description: "Croissant with rosewater glaze and crushed pistachios",
          ingredients: ["Croissant Dough (Raw)", "Rosewater", "Pistachios (Chopped)"],
          prep_time_minutes: 20,
        },
        {
          name: "Chai Latte Roll",
          category: "Eastern Fusion Pastries",
          sell_price: 3.00,
          description: "Soft roll with chai glaze and cinnamon swirl",
          ingredients: ["Roll Pastry Dough", "Chai Glaze", "Cinnamon Powder"],
          prep_time_minutes: 15,
        },

        // Coffee Selection (6 items)
        {
          name: "Espresso",
          category: "Coffee Selection",
          sell_price: 2.00,
          description: "Single shot of premium espresso",
          ingredients: ["Coffee Beans (Espresso)", "Water"],
          prep_time_minutes: 2,
        },
        {
          name: "Americano",
          category: "Coffee Selection",
          sell_price: 2.50,
          description: "Espresso with hot water",
          ingredients: ["Coffee Beans (Espresso)", "Water"],
          prep_time_minutes: 3,
        },
        {
          name: "Cappuccino",
          category: "Coffee Selection",
          sell_price: 3.00,
          description: "Espresso with steamed milk and foam",
          ingredients: ["Coffee Beans (Espresso)", "Milk (Whole)", "Water"],
          prep_time_minutes: 4,
        },
        {
          name: "Latte",
          category: "Coffee Selection",
          sell_price: 3.00,
          description: "Espresso with steamed milk",
          ingredients: ["Coffee Beans (Espresso)", "Milk (Whole)", "Water"],
          prep_time_minutes: 4,
        },
        {
          name: "Flat White",
          category: "Coffee Selection",
          sell_price: 3.00,
          description: "Espresso with micro-foamed milk",
          ingredients: ["Coffee Beans (Espresso)", "Milk (Whole)", "Water"],
          prep_time_minutes: 4,
        },
        {
          name: "Karak Coffee",
          category: "Coffee Selection",
          sell_price: 3.75,
          description: "Espresso with cardamom and evaporated milk",
          ingredients: ["Coffee Beans (Espresso)", "Cardamom Pods", "Evaporated Milk", "Water"],
          prep_time_minutes: 5,
        },

        // Cold Drinks (5 items)
        {
          name: "Iced Karak Chai",
          category: "Cold Drinks",
          sell_price: 4.00,
          description: "Chilled karak chai over ice",
          ingredients: ["Black Tea Leaves", "Evaporated Milk", "Sugar (White)", "Ice Cubes", "Water"],
          prep_time_minutes: 5,
        },
        {
          name: "Iced Chai Latte",
          category: "Cold Drinks",
          sell_price: 4.00,
          description: "Masala chai concentrate with cold milk over ice",
          ingredients: ["Masala Chai Spice Blend", "Milk (Whole)", "Ice Cubes"],
          prep_time_minutes: 4,
        },
        {
          name: "Iced Spanish Latte",
          category: "Cold Drinks",
          sell_price: 4.50,
          description: "Espresso with condensed milk and cold milk over ice",
          ingredients: ["Coffee Beans (Espresso)", "Condensed Milk", "Milk (Whole)", "Ice Cubes", "Water"],
          prep_time_minutes: 5,
        },
        {
          name: "Rose Lemonade",
          category: "Cold Drinks",
          sell_price: 3.50,
          description: "Refreshing rose-infused lemonade",
          ingredients: ["Rose Syrup", "Lemon Juice", "Sparkling Water", "Ice Cubes"],
          prep_time_minutes: 3,
        },
        {
          name: "Mint Mojito Cooler",
          category: "Cold Drinks",
          sell_price: 3.75,
          description: "Non-alcoholic mojito with fresh mint and lime",
          ingredients: ["Mint Leaves (Fresh)", "Lime (Fresh)", "Sparkling Water", "Sugar Syrup (Simple)", "Ice Cubes"],
          prep_time_minutes: 4,
        },

        // Small Bites (5 items)
        {
          name: "Samosas (3 pcs)",
          category: "Small Bites",
          sell_price: 4.00,
          description: "Crispy samosas served with mint chutney",
          ingredients: ["Samosa (Frozen)", "Mint Chutney", "Cooking Oil"],
          prep_time_minutes: 10,
        },
        {
          name: "Spicy Masala Fries",
          category: "Small Bites",
          sell_price: 3.50,
          description: "Crispy fries tossed in masala seasoning",
          ingredients: ["Fries (Frozen)", "Masala Seasoning", "Salt", "Cooking Oil"],
          prep_time_minutes: 8,
        },
        {
          name: "Cheese Paratha",
          category: "Small Bites",
          sell_price: 3.75,
          description: "Flaky paratha stuffed with melted cheese",
          ingredients: ["Paratha Dough", "Cheese (Grated)", "Butter (Unsalted)"],
          prep_time_minutes: 12,
        },
        {
          name: "Aloo Paratha",
          category: "Small Bites",
          sell_price: 3.50,
          description: "Traditional paratha with spiced potato filling",
          ingredients: ["Paratha Dough", "Potatoes (Diced)", "Masala Seasoning", "Butter (Unsalted)"],
          prep_time_minutes: 15,
        },
        {
          name: "Chili Cheese Paratha",
          category: "Small Bites",
          sell_price: 4.00,
          description: "Spicy paratha with cheese and chili flakes",
          ingredients: ["Paratha Dough", "Cheese (Grated)", "Chili Flakes", "Butter (Unsalted)"],
          prep_time_minutes: 12,
        },

        // Additions (8 items)
        {
          name: "Vanilla Flavor Shot",
          category: "Additions",
          sell_price: 0.50,
          description: "Add vanilla syrup to any drink",
          ingredients: ["Vanilla Syrup"],
          prep_time_minutes: 1,
        },
        {
          name: "Caramel Flavor Shot",
          category: "Additions",
          sell_price: 0.50,
          description: "Add caramel syrup to any drink",
          ingredients: ["Caramel Syrup"],
          prep_time_minutes: 1,
        },
        {
          name: "Hazelnut Flavor Shot",
          category: "Additions",
          sell_price: 0.50,
          description: "Add hazelnut syrup to any drink",
          ingredients: ["Hazelnut Syrup"],
          prep_time_minutes: 1,
        },
        {
          name: "Extra Cinnamon",
          category: "Additions",
          sell_price: 0.75,
          description: "Add cinnamon powder to your drink",
          ingredients: ["Cinnamon Powder"],
          prep_time_minutes: 1,
        },
        {
          name: "Extra Saffron",
          category: "Additions",
          sell_price: 0.75,
          description: "Add saffron strands to your drink",
          ingredients: ["Saffron Strands"],
          prep_time_minutes: 1,
        },
        {
          name: "Extra Cardamom",
          category: "Additions",
          sell_price: 0.75,
          description: "Add cardamom to your drink",
          ingredients: ["Cardamom Pods"],
          prep_time_minutes: 1,
        },
        {
          name: "Whipped Cream",
          category: "Additions",
          sell_price: 0.50,
          description: "Add whipped cream topping",
          ingredients: ["Whipped Cream"],
          prep_time_minutes: 1,
        },
        {
          name: "Extra Espresso Shot",
          category: "Additions",
          sell_price: 1.00,
          description: "Add an extra shot of espresso",
          ingredients: ["Coffee Beans (Espresso)", "Water"],
          prep_time_minutes: 2,
        },
      ];

      console.log(`🍽️ Preparing to import ${menuItemsData.length} menu items...`);

      let successCount = 0;
      let skipCount = 0;
      const missingIngredients = new Set();

      for (const itemData of menuItemsData) {
        try {
          const categoryId = getCategoryId(itemData.category);
          
          if (!categoryId) {
            console.warn(`⏭️ Skipping ${itemData.name} - category "${itemData.category}" not found`);
            skipCount++;
            continue;
          }

          // Check if item already exists
          const existing = await base44.entities.MenuItem.filter({ name: itemData.name });
          if (existing.length > 0) {
            console.log(`⏭️ Skipping ${itemData.name} - already exists`);
            skipCount++;
            continue;
          }

          const recipe = createRecipe(itemData.ingredients);
          
          // Track missing ingredients
          if (recipe.length < itemData.ingredients.length) {
            itemData.ingredients.forEach(ingName => {
              if (!ingredients.find(i => i.name === ingName)) {
                missingIngredients.add(ingName);
              }
            });
          }

          // Skip if no valid recipe
          if (recipe.length === 0) {
            console.warn(`⏭️ Skipping ${itemData.name} - no valid ingredients found`);
            skipCount++;
            continue;
          }

          const allergens = calculateAllergens(itemData.ingredients);
          const totalCost = recipe.reduce((sum, r) => sum + (r.cost || 0), 0);
          const profitMargin = itemData.sell_price - totalCost;
          const foodCostPercentage = itemData.sell_price > 0 ? (totalCost / itemData.sell_price) * 100 : 0;

          const menuItem = await base44.entities.MenuItem.create({
            name: itemData.name,
            category_id: categoryId,
            category_name: itemData.category,
            sell_price: itemData.sell_price,
            description: itemData.description,
            recipe: recipe,
            allergens: allergens,
            total_cost: totalCost,
            profit_margin: profitMargin,
            food_cost_percentage: foodCostPercentage,
            prep_time_minutes: itemData.prep_time_minutes,
            is_active: true,
          });

          // Create allergy record
          const riskLevel = allergens.length === 0 ? 'none' :
                            allergens.some(a => ['nuts', 'shellfish', 'fish'].includes(a)) ? 'high' :
                            allergens.length >= 3 ? 'medium' : 'low';

          await base44.entities.AllergyRecord.create({
            menu_item_id: menuItem.id,
            menu_item_name: menuItem.name,
            category: itemData.category,
            allergens_detected: allergens,
            ingredient_sources: recipe.map(r => ({
              ingredient_id: r.ingredient_id,
              ingredient_name: r.ingredient_name,
              allergens: ingredients.find(i => i.id === r.ingredient_id)?.allergen_tags || [],
            })),
            auto_generated: true,
            risk_level: riskLevel,
            last_synced: new Date().toISOString(),
          });

          successCount++;
          console.log(`✅ [${successCount}/${menuItemsData.length}] Imported: ${menuItem.name}`);

        } catch (error) {
          console.error(`❌ Failed to import ${itemData.name}:`, error.message);
        }
      }

      if (missingIngredients.size > 0) {
        console.warn(`⚠️ Missing ingredients detected: ${Array.from(missingIngredients).join(', ')}`);
      }

      sessionStorage.setItem('chai_patta_menu_imported_v2', 'true');
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['allergyRecords'] });
      
      console.log(`
🎉 MENU IMPORT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━
✅ Successfully imported: ${successCount}
⏭️ Skipped (duplicates): ${skipCount}
📊 Total menu items: ${successCount + skipCount}
⚠️ Missing ingredients: ${missingIngredients.size}
      `);
      
    } catch (error) {
      console.error('❌ Menu import error:', error);
      sessionStorage.removeItem('chai_patta_menu_imported_v2');
    } finally {
      setImporting(false);
    }
  };

  return null;
}