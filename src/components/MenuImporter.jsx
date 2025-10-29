
import React, { useEffect, useState } from "react";
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
      }, 3000);
    }
  }, []);

  const importMenu = async () => {
    setImporting(true);
    
    try {
      console.log('🔄 Starting menu import...');
      
      const categories = await base44.entities.MenuCategory.list();
      const ingredients = await base44.entities.Ingredient.list();

      if (categories.length === 0 || ingredients.length < 10) {
        console.log('⏳ Waiting for dependencies...');
        setTimeout(importMenu, 3000);
        return;
      }

      console.log(`✅ Found ${categories.length} categories and ${ingredients.length} ingredients`);

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
            cost: (ingredient.unit_cost || 0) * 1,
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

      const menuItems = [
        { name: "Masala Chai", category: "Chai Specials", price: 3.50, desc: "Classic Indian spiced tea", ingredients: ["Black Tea Leaves", "Water", "Milk (Whole)", "Sugar (White)", "Masala Chai Spice Blend"] },
        { name: "Saffron Chai", category: "Chai Specials", price: 4.00, desc: "Luxurious chai with saffron", ingredients: ["Black Tea Leaves", "Milk (Whole)", "Saffron Strands", "Sugar (White)", "Water"] },
        { name: "Ginger Chai", category: "Chai Specials", price: 3.75, desc: "Warming chai with ginger", ingredients: ["Black Tea Leaves", "Milk (Whole)", "Fresh Ginger Root", "Sugar (White)", "Water"] },
        { name: "Cardamom Chai", category: "Chai Specials", price: 3.75, desc: "Aromatic cardamom chai", ingredients: ["Black Tea Leaves", "Milk (Whole)", "Cardamom Pods", "Sugar (White)", "Water"] },
        { name: "Chai Latte", category: "Chai Specials", price: 3.50, desc: "Creamy latte-style chai", ingredients: ["Masala Chai Spice Blend", "Milk (Whole)", "Sugar (White)"] },
        
        { name: "Original Karak Chai", category: "Signature Karak Chai", price: 3.50, desc: "Strong milky chai", ingredients: ["Black Tea Leaves", "Evaporated Milk", "Sugar (White)", "Water"] },
        { name: "Saffron Karak", category: "Signature Karak Chai", price: 4.25, desc: "Karak with saffron", ingredients: ["Black Tea Leaves", "Evaporated Milk", "Saffron Strands", "Sugar (White)", "Water"] },
        { name: "Ginger Karak", category: "Signature Karak Chai", price: 3.75, desc: "Karak with ginger", ingredients: ["Black Tea Leaves", "Evaporated Milk", "Fresh Ginger Root", "Sugar (White)", "Water"] },
        
        { name: "Cinnamon Cardamom Croissant", category: "Eastern Fusion Pastries", price: 3.00, desc: "Spiced croissant", ingredients: ["Croissant Dough (Raw)", "Butter (Unsalted)", "Cinnamon Powder", "Cardamom Pods", "Sugar (White)"] },
        { name: "Saffron Pistachio Twist", category: "Eastern Fusion Pastries", price: 3.50, desc: "Pastry with saffron glaze", ingredients: ["Pastry Twist Dough", "Saffron Glaze", "Pistachios (Chopped)"] },
        { name: "Rose Almond Danish", category: "Eastern Fusion Pastries", price: 3.25, desc: "Rose-flavored danish", ingredients: ["Danish Pastry Dough", "Rose Syrup", "Almonds (Sliced)"] },
        { name: "Chai-Spiced Chocolate Croissant", category: "Eastern Fusion Pastries", price: 3.50, desc: "Croissant with chai chocolate", ingredients: ["Croissant Dough (Raw)", "Chocolate Ganache", "Masala Chai Spice Blend"] },
        { name: "Honey & Nut Baklava Croissant", category: "Eastern Fusion Pastries", price: 3.75, desc: "Baklava-inspired pastry", ingredients: ["Croissant Dough (Raw)", "Honey Syrup", "Mixed Nuts (Baklava)"] },
        { name: "Date & Fig Crescent", category: "Eastern Fusion Pastries", price: 3.25, desc: "Sweet date-fig pastry", ingredients: ["Pastry Twist Dough", "Date-Fig Paste", "Powdered Sugar"] },
        { name: "Rose Pistachio Croissant", category: "Eastern Fusion Pastries", price: 3.50, desc: "Rose and pistachio", ingredients: ["Croissant Dough (Raw)", "Rose Syrup", "Pistachios (Chopped)"] },
        { name: "Chai Latte Roll", category: "Eastern Fusion Pastries", price: 3.00, desc: "Chai-glazed roll", ingredients: ["Roll Pastry Dough", "Masala Chai Spice Blend", "Cinnamon Powder"] },
        
        { name: "Espresso", category: "Coffee Selection", price: 2.00, desc: "Strong espresso shot", ingredients: ["Coffee Beans (Espresso)", "Water"] },
        { name: "Americano", category: "Coffee Selection", price: 2.50, desc: "Espresso with water", ingredients: ["Coffee Beans (Espresso)", "Water"] },
        { name: "Cappuccino", category: "Coffee Selection", price: 3.00, desc: "Espresso with foam", ingredients: ["Coffee Beans (Espresso)", "Milk (Whole)"] },
        { name: "Latte", category: "Coffee Selection", price: 3.00, desc: "Espresso with milk", ingredients: ["Coffee Beans (Espresso)", "Milk (Whole)"] },
        { name: "Flat White", category: "Coffee Selection", price: 3.00, desc: "Smooth espresso drink", ingredients: ["Coffee Beans (Espresso)", "Milk (Whole)"] },
        { name: "Karak Coffee", category: "Coffee Selection", price: 3.75, desc: "Cardamom-spiced coffee", ingredients: ["Coffee Beans (Espresso)", "Cardamom Pods", "Evaporated Milk"] },
        
        { name: "Iced Karak Chai", category: "Cold Drinks", price: 4.00, desc: "Chilled karak chai", ingredients: ["Black Tea Leaves", "Evaporated Milk", "Sugar (White)", "Ice Cubes"] },
        { name: "Iced Chai Latte", category: "Cold Drinks", price: 4.00, desc: "Cold chai latte", ingredients: ["Masala Chai Spice Blend", "Milk (Whole)", "Ice Cubes"] },
        { name: "Iced Spanish Latte", category: "Cold Drinks", price: 4.50, desc: "Sweet iced latte", ingredients: ["Coffee Beans (Espresso)", "Condensed Milk", "Milk (Whole)", "Ice Cubes"] },
        { name: "Rose Lemonade", category: "Cold Drinks", price: 3.50, desc: "Floral lemonade", ingredients: ["Rose Syrup", "Lemon Juice (Fresh)", "Sparkling Water", "Ice Cubes"] },
        { name: "Mint Mojito Cooler", category: "Cold Drinks", price: 3.75, desc: "Refreshing mint drink", ingredients: ["Mint Leaves (Fresh)", "Lime Juice", "Sparkling Water", "Sugar Syrup (Simple)", "Ice Cubes"] },
        
        { name: "Samosas (3 pcs)", category: "Small Bites", price: 4.00, desc: "Crispy samosas", ingredients: ["Samosa Pastry", "Spiced Potato Filling", "Mint Chutney", "Vegetable Oil (Frying)"] },
        { name: "Spicy Masala Fries", category: "Small Bites", price: 3.50, desc: "Seasoned fries", ingredients: ["French Fries (Frozen)", "Masala Seasoning Mix", "Salt", "Vegetable Oil (Frying)"] },
        { name: "Cheese Paratha", category: "Small Bites", price: 3.75, desc: "Cheese-stuffed flatbread", ingredients: ["Paratha Dough", "Cheddar Cheese (Shredded)", "Butter (Unsalted)"] },
        { name: "Aloo Paratha", category: "Small Bites", price: 3.50, desc: "Potato-stuffed flatbread", ingredients: ["Paratha Dough", "Spiced Potato Filling", "Butter (Unsalted)"] },
        { name: "Chili Cheese Paratha", category: "Small Bites", price: 4.00, desc: "Spicy cheese paratha", ingredients: ["Paratha Dough", "Cheddar Cheese (Shredded)", "Green Chilies (Chopped)", "Butter (Unsalted)"] },
        
        { name: "Vanilla Flavor Shot", category: "Additions", price: 0.50, desc: "Add vanilla", ingredients: ["Vanilla Syrup"] },
        { name: "Caramel Flavor Shot", category: "Additions", price: 0.50, desc: "Add caramel", ingredients: ["Caramel Syrup"] },
        { name: "Hazelnut Flavor Shot", category: "Additions", price: 0.50, desc: "Add hazelnut", ingredients: ["Hazelnut Syrup"] },
        { name: "Extra Cinnamon", category: "Additions", price: 0.75, desc: "Extra spice", ingredients: ["Cinnamon Powder"] },
        { name: "Extra Saffron", category: "Additions", price: 0.75, desc: "Extra saffron", ingredients: ["Saffron Strands"] },
        { name: "Extra Cardamom", category: "Additions", price: 0.75, desc: "Extra cardamom", ingredients: ["Cardamom Pods"] },
        { name: "Whipped Cream", category: "Additions", price: 0.50, desc: "Cream topping", ingredients: ["Whipping Cream (Heavy)", "Sugar (White)"] },
        { name: "Extra Espresso Shot", category: "Additions", price: 1.00, desc: "Extra caffeine", ingredients: ["Coffee Beans (Espresso)"] },
      ];

      console.log(`📝 Creating ${menuItems.length} menu items...`);

      for (const item of menuItems) {
        const categoryId = getCategoryId(item.category);
        if (!categoryId) continue;

        const recipe = createRecipe(item.ingredients);
        const allergens = calculateAllergens(item.ingredients);

        await base44.entities.MenuItem.create({
          name: item.name,
          category_id: categoryId,
          category_name: item.category,
          sell_price: item.price,
          description: item.desc,
          recipe: recipe,
          allergen_tags: allergens,
          prep_time_minutes: 5,
          is_active: true,
        });
      }

      console.log('✅ Menu import complete!');
      sessionStorage.setItem('chai_patta_menu_imported_v2', 'true');
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      
    } catch (error) {
      console.error('❌ Menu import failed:', error);
      setImporting(false);
    }
  };

  return null;
}
