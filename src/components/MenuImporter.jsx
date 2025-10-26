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
          if (!ingredient) return null;
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
        // Add remaining menu items...
      ];

      for (const item of menuItemsData) {
        const allergens = calculateAllergens(item.recipe.map(r => r.ingredient_name));
        const totalCost = item.recipe.reduce((sum, r) => sum + r.cost, 0);
        const profitMargin = item.sell_price - totalCost;
        const foodCostPercentage = item.sell_price > 0 ? (totalCost / item.sell_price) * 100 : 0;

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
      }

      sessionStorage.setItem('chai_patta_menu_imported', 'true');
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['allergyRecords'] });
      
      console.log('✅ Chai Patta Menu imported successfully!');
    } catch (error) {
      console.error('❌ Menu import error:', error);
    } finally {
      setImporting(false);
    }
  };

  return null;
}