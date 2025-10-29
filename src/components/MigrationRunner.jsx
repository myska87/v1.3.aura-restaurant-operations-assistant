import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * 🔄 Entity Migration Runner
 * Admin tool for safely migrating between entity schemas
 */
export default function MigrationRunner() {
  const [migrationStatus, setMigrationStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
    console.log(`[Migration ${timestamp}] ${message}`);
  };

  const migrateInventory = async () => {
    setMigrationStatus('running');
    setProgress(0);
    setLogs([]);
    
    try {
      addLog('🔄 Starting Inventory Migration...', 'info');
      
      // Get all old records
      const [ingredients, inventoryItems] = await Promise.all([
        base44.entities.Ingredient.list(),
        base44.entities.InventoryItem.list(),
      ]);

      addLog(`Found ${ingredients.length} Ingredients, ${inventoryItems.length} InventoryItems`, 'info');
      
      const totalRecords = ingredients.length + inventoryItems.length;
      let processed = 0;

      // Migrate Ingredient records
      for (const ing of ingredients) {
        await base44.entities.InventoryIngredient.create({
          name: ing.name,
          category: ing.category,
          unit: ing.unit,
          current_stock: ing.current_stock || 0,
          par_level: ing.par_level,
          reorder_point: ing.reorder_point,
          supplier_id: ing.supplier_id,
          supplier_name: ing.supplier_name,
          supplier_email: ing.supplier_email,
          supplier_phone: ing.supplier_phone,
          unit_cost: ing.unit_cost,
          pack_size: ing.pack_size,
          storage_location: ing.storage_location,
          shelf_life_days: ing.shelf_life_days,
          allergen_tags: ing.allergen_tags || [],
          auto_order_enabled: ing.auto_order_enabled !== false,
          auto_order_quantity: ing.auto_order_quantity,
          last_cost_update: ing.last_cost_update,
        });
        
        processed++;
        setProgress((processed / totalRecords) * 100);
      }

      addLog(`✅ Migrated ${ingredients.length} Ingredient records`, 'success');

      // Migrate unique InventoryItem records
      let uniqueItems = 0;
      for (const item of inventoryItems) {
        const existing = await base44.entities.InventoryIngredient.filter({ 
          name: item.item_name 
        });
        
        if (existing.length === 0) {
          await base44.entities.InventoryIngredient.create({
            name: item.item_name,
            category: item.category,
            unit: item.unit,
            current_stock: item.current_quantity || 0,
            unit_cost: item.unit_cost || 0,
            supplier_name: item.supplier,
            supplier_contact: item.supplier_contact,
            storage_location: item.storage_location,
            expiry_date: item.expiry_date,
            last_ordered: item.last_ordered,
            minimum_quantity: item.minimum_quantity,
            supplier_id: 'NEEDS_SUPPLIER',
          });
          uniqueItems++;
        }
        
        processed++;
        setProgress((processed / totalRecords) * 100);
      }

      addLog(`✅ Migrated ${uniqueItems} unique InventoryItem records`, 'success');
      
      setMigrationStatus('completed');
      setResults({
        ingredientsMigrated: ingredients.length,
        inventoryItemsMigrated: uniqueItems,
        totalRecords: ingredients.length + uniqueItems,
      });

    } catch (error) {
      addLog(`❌ Migration failed: ${error.message}`, 'error');
      setMigrationStatus('failed');
      console.error('Migration error:', error);
    }
  };

  const migrateMenu = async () => {
    setMigrationStatus('running');
    setProgress(0);
    setLogs([]);
    
    try {
      addLog('🔄 Starting Menu Migration...', 'info');
      
      const [menuItems, sopLinks] = await Promise.all([
        base44.entities.MenuItem.list(),
        base44.entities.MenuSOPLink.list(),
      ]);

      addLog(`Found ${menuItems.length} MenuItems, ${sopLinks.length} SOP Links`, 'info');

      for (let i = 0; i < menuItems.length; i++) {
        const item = menuItems[i];
        const sopLink = sopLinks.find(l => l.menu_item_id === item.id);

        await base44.entities.MenuRecipe.create({
          name: item.name,
          category_id: item.category_id,
          category_name: item.category_name,
          sell_price: item.sell_price,
          image_url: item.image_url,
          description: item.description,
          recipe: item.recipe || [],
          total_cost: item.total_cost,
          food_cost_percentage: item.food_cost_percentage,
          profit_margin: item.profit_margin,
          prep_time_minutes: item.prep_time_minutes,
          cooking_instructions: item.cooking_instructions,
          allergen_tags: item.allergen_tags || [],
          linked_sop_id: sopLink?.sop_id || item.linked_sop_id,
          linked_sop_title: sopLink?.sop_title || item.linked_sop_title,
          linked_sop_version: sopLink?.sop_version,
          auto_update_sop: sopLink?.auto_update ?? true,
          is_active: item.is_active !== false,
          popularity_score: item.popularity_score,
        });

        setProgress(((i + 1) / menuItems.length) * 100);
      }

      addLog(`✅ Migrated ${menuItems.length} menu items`, 'success');
      
      setMigrationStatus('completed');
      setResults({
        menuItemsMigrated: menuItems.length,
        sopLinksMerged: sopLinks.length,
      });

    } catch (error) {
      addLog(`❌ Migration failed: ${error.message}`, 'error');
      setMigrationStatus('failed');
      console.error('Migration error:', error);
    }
  };

  const validateForeignKeys = async () => {
    setMigrationStatus('validating');
    setLogs([]);
    
    try {
      addLog('🔍 Validating foreign key integrity...', 'info');
      
      let errors = [];

      // Check MenuRecipe → InventoryIngredient
      const menuRecipes = await base44.entities.MenuRecipe.list();
      for (const menu of menuRecipes) {
        if (!menu.recipe) continue;
        
        for (const recipeItem of menu.recipe) {
          const ingredient = await base44.entities.InventoryIngredient.filter({
            id: recipeItem.ingredient_id
          });
          
          if (ingredient.length === 0) {
            errors.push(`MenuRecipe "${menu.name}": Missing ingredient ${recipeItem.ingredient_id}`);
          }
        }
      }

      // Check InventoryIngredient → Supplier
      const ingredients = await base44.entities.InventoryIngredient.list();
      for (const ing of ingredients) {
        if (!ing.supplier_id || ing.supplier_id === 'NEEDS_SUPPLIER') {
          errors.push(`Ingredient "${ing.name}": Missing supplier_id`);
          continue;
        }

        const supplier = await base44.entities.Supplier.filter({ id: ing.supplier_id });
        if (supplier.length === 0) {
          errors.push(`Ingredient "${ing.name}": Invalid supplier_id ${ing.supplier_id}`);
        }
      }

      if (errors.length === 0) {
        addLog('✅ All foreign keys valid!', 'success');
        setMigrationStatus('validated');
      } else {
        errors.forEach(err => addLog(`❌ ${err}`, 'error'));
        setMigrationStatus('failed');
      }

      setResults({ errors, totalChecked: menuRecipes.length + ingredients.length });

    } catch (error) {
      addLog(`❌ Validation failed: ${error.message}`, 'error');
      setMigrationStatus('failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600" />
            Entity Migration Control Center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <Alert className={
            migrationStatus === 'completed' || migrationStatus === 'validated' ? 'bg-green-50 border-green-200' :
            migrationStatus === 'failed' ? 'bg-red-50 border-red-200' :
            migrationStatus === 'running' ? 'bg-blue-50 border-blue-200' :
            'bg-gray-50 border-gray-200'
          }>
            <AlertDescription>
              <div className="flex items-center gap-2">
                {migrationStatus === 'idle' && <Database className="w-4 h-4" />}
                {migrationStatus === 'running' && <RefreshCw className="w-4 h-4 animate-spin" />}
                {migrationStatus === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {migrationStatus === 'validated' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {migrationStatus === 'failed' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                
                <span className="font-semibold">
                  {migrationStatus === 'idle' && 'Ready to migrate'}
                  {migrationStatus === 'running' && 'Migration in progress...'}
                  {migrationStatus === 'validating' && 'Validating foreign keys...'}
                  {migrationStatus === 'completed' && 'Migration completed successfully!'}
                  {migrationStatus === 'validated' && 'Validation completed!'}
                  {migrationStatus === 'failed' && 'Migration failed - check logs'}
                </span>
              </div>
            </AlertDescription>
          </Alert>

          {/* Progress */}
          {migrationStatus === 'running' && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Results */}
          {results && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Migration Results</h3>
                <div className="space-y-1 text-sm">
                  {Object.entries(results).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-700">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Migration Actions */}
          <div className="space-y-3">
            <Button
              onClick={migrateInventory}
              disabled={migrationStatus === 'running'}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Migrate Inventory (Ingredient + InventoryItem → InventoryIngredient)
            </Button>

            <Button
              onClick={migrateMenu}
              disabled={migrationStatus === 'running'}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Migrate Menu (MenuItem + MenuSOPLink → MenuRecipe)
            </Button>

            <Button
              onClick={validateForeignKeys}
              disabled={migrationStatus === 'running'}
              variant="outline"
              className="w-full"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Validate Foreign Keys
            </Button>
          </div>

          {/* Migration Logs */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Migration Logs
              {logs.length > 0 && <Badge>{logs.length}</Badge>}
            </h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg h-64 overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet. Run a migration to see progress.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`mb-1 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    'text-gray-300'
                  }`}>
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Warning */}
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <p className="font-semibold mb-1">⚠️ Before Running Migration:</p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Create a full system backup (Data Management → Backup)</li>
                <li>Enable Safe Mode to disable AI agents</li>
                <li>Test migration on a few records first</li>
                <li>Do NOT delete old entities until fully verified</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}