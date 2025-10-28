
import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * AURA Brain - Inventory Agent
 * Monitors stock levels and predicts shortages
 * Auto-creates purchase order drafts when needed
 */
export default function InventoryAgent() {
  const queryClient = useQueryClient();

  const processInventoryData = async (ingredients) => {
    try {
      // Low stock detection
      const lowStockItems = ingredients.filter(ing =>
        ing.current_stock <= (ing.reorder_point || 0) // Ensure reorder_point is treated as 0 if null/undefined
      );

      // Critical stock (below 25% of par level)
      const criticalStockItems = lowStockItems.filter(ing =>
        ing.par_level && ing.current_stock < (ing.par_level * 0.25)
      );

      // Stock out items
      const stockOutItems = ingredients.filter(ing => ing.current_stock <= 0);

      // High value waste (stock approaching expiry)
      const expiringItems = ingredients.filter(ing => {
        if (!ing.shelf_life_days) return false;

        const now = new Date();
        // Assuming shelf_life_days represents the *remaining* shelf life from now
        // to be consistent with "approaching expiry" logic
        const estimatedExpiry = new Date(now.getTime());
        estimatedExpiry.setDate(now.getDate() + ing.shelf_life_days);

        // Calculate days until this estimated expiry from the current time
        const daysUntilExpiry = Math.ceil((estimatedExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 3 && daysUntilExpiry >= 0; // Within 3 days and not already expired
      });

      // 1. Critical Stock Out Alert
      if (stockOutItems.length > 0) {
        await base44.entities.AgentLog.create({
          agent_name: 'inventory_agent',
          action_type: 'alert_triggered',
          action_description: `🚨 ${stockOutItems.length} ingredient(s) out of stock!`,
          trigger_event: 'stock_monitoring',
          related_entity: 'Ingredient',
          related_entity_id: stockOutItems[0].id,
          related_entity_name: stockOutItems[0].name,
          decision_data: {
            out_of_stock_items: stockOutItems.map(i => ({ name: i.name, category: i.category })),
          },
          decision_reasoning: `Critical inventory shortage. Service interruption risk. Recommend immediate emergency ordering.`,
          confidence_score: 1.0,
          severity: 'critical',
          status: 'pending',
        });
      }

      // 2. Low Stock Reorder Suggestion (general alert, not necessarily for auto-order)
      if (lowStockItems.length > 0) { // Changed from <= 10 to include all low stock for logging
        const autoOrderEnabledCount = lowStockItems.filter(i => i.auto_order_enabled && i.supplier_id).length;

        await base44.entities.AgentLog.create({
          agent_name: 'inventory_agent',
          action_type: 'order_suggested',
          action_description: `📦 ${lowStockItems.length} ingredient(s) need reordering`,
          trigger_event: 'reorder_point_reached',
          decision_data: {
            low_stock_items: lowStockItems.map(i => ({
              id: i.id,
              name: i.name,
              current: i.current_stock,
              reorder_point: i.reorder_point,
              supplier: i.supplier_name,
            })),
            can_auto_order_count: autoOrderEnabledCount,
          },
          decision_reasoning: autoOrderEnabledCount > 0
            ? `${autoOrderEnabledCount} items can be auto-ordered. Recommend creating purchase orders for ${lowStockItems.map(i => i.name).join(', ')}.`
            : `Stock levels low but suppliers not configured for auto-ordering for some items. Manual intervention may be required.`,
          confidence_score: autoOrderEnabledCount > 0 ? 0.9 : 0.6,
          severity: criticalStockItems.length > 0 ? 'high' : 'medium',
          status: 'pending',
        });
      }

      // 3. Expiring Stock Alert
      if (expiringItems.length > 0) {
        await base44.entities.AgentLog.create({
          agent_name: 'inventory_agent',
          action_type: 'alert_triggered',
          action_description: `⏰ ${expiringItems.length} ingredient(s) expiring soon`,
          trigger_event: 'expiry_monitoring',
          decision_data: {
            expiring_items: expiringItems.map(i => ({
              id: i.id,
              name: i.name,
              shelf_life_days: i.shelf_life_days,
              current_stock: i.current_stock,
            })),
          },
          decision_reasoning: `Ingredients approaching expiry. Recommend prioritizing these in menu planning or marking down to minimize waste.`,
          confidence_score: 0.85,
          severity: 'medium',
          status: 'pending',
        });
      }

      // 4. Stock Efficiency Analysis
      const totalValue = ingredients.reduce((sum, ing) =>
        sum + (ing.current_stock * (ing.unit_cost || 0)), 0 // Handle potentially missing unit_cost
      );

      if (ingredients.length > 0) { // Log analysis if there are any ingredients
        await base44.entities.AgentLog.create({
          agent_name: 'inventory_agent',
          action_type: 'analysis',
          action_description: `📊 Inventory health: ${ingredients.length} items, £${totalValue.toFixed(2)} total value`,
          trigger_event: 'daily_analysis',
          decision_data: {
            total_ingredients: ingredients.length,
            total_value: totalValue,
            low_stock_count: lowStockItems.length,
            critical_count: criticalStockItems.length,
            stock_out_count: stockOutItems.length,
            expiring_count: expiringItems.length,
          },
          decision_reasoning: lowStockItems.length === 0 && expiringItems.length === 0 && stockOutItems.length === 0
            ? 'All stock levels healthy. No immediate action required.'
            : `${lowStockItems.length} items below reorder point, ${criticalStockItems.length} critical, ${stockOutItems.length} out of stock, ${expiringItems.length} expiring soon. Monitor closely.`,
          confidence_score: 0.8,
          severity: 'info',
          status: 'completed',
        });
      }

      console.log('[InventoryAgent] Analysis complete:', {
        lowStock: lowStockItems.length,
        critical: criticalStockItems.length,
        stockOut: stockOutItems.length,
        expiring: expiringItems.length,
      });

    } catch (error) {
      console.error('[InventoryAgent] Error processing data:', error);
      // Log the error during data processing
      try {
        await base44.entities.AgentLog.create({
          agent_name: 'inventory_agent',
          action_type: 'analysis_failure',
          action_description: 'Error during inventory data analysis',
          trigger_event: 'scheduled_run',
          status: 'failed',
          success: false,
          error_message: error.message,
        });
      } catch (logError) {
        console.error('[InventoryAgent] Failed to log internal error:', logError);
      }
    }
  };


  useEffect(() => {
    const runAgent = async () => {
      try {
        // Check if agent is enabled
        const configs = await base44.entities.AgentConfig.filter({ agent_name: 'inventory_agent' });
        const config = configs[0];

        if (!config || !config.is_enabled) {
          console.log('[InventoryAgent] Agent is disabled');
          return;
        }

        const ingredients = await base44.entities.Ingredient.list();

        // Run comprehensive inventory analysis and logging
        await processInventoryData(ingredients);

        // 1️⃣ Find low stock items specifically for auto-ordering
        const lowStockItemsForAutoOrder = ingredients.filter(ing =>
          ing.auto_order_enabled &&
          ing.supplier_id &&
          ing.current_stock <= (ing.reorder_point || 0)
        );

        if (lowStockItemsForAutoOrder.length === 0) {
          console.log('[InventoryAgent] No low stock items detected for auto-ordering');
          return; // Continue if no items to auto-order, analysis has already run
        }

        // 2️⃣ Group by supplier
        const supplierGroups = {};
        for (const item of lowStockItemsForAutoOrder) {
          if (!supplierGroups[item.supplier_id]) {
            supplierGroups[item.supplier_id] = [];
          }
          supplierGroups[item.supplier_id].push(item);
        }

        // 3️⃣ Create purchase order drafts
        for (const [supplierId, items] of Object.entries(supplierGroups)) {
          // Fetch supplier details
          const supplier = await base44.entities.Supplier.filter({ id: supplierId });

          if (!supplier || supplier.length === 0) {
            console.warn(`[InventoryAgent] Supplier with ID ${supplierId} not found for PO creation. Skipping.`);
            continue;
          }

          const supplierData = supplier[0];

          // Calculate order items
          const orderItems = items.map(ing => {
            const quantityToOrder = ing.auto_order_quantity ||
              (ing.par_level ? ing.par_level - ing.current_stock : 10); // Default to 10 if no par_level

            return {
              ingredient_id: ing.id,
              ingredient_name: ing.name,
              quantity_ordered: quantityToOrder,
              quantity_received: 0,
              unit: ing.unit,
              unit_cost: ing.unit_cost || 0, // Handle potentially missing unit_cost
              line_total: quantityToOrder * (ing.unit_cost || 0),
            };
          });

          const subtotal = orderItems.reduce((sum, item) => sum + item.line_total, 0);
          const tax = subtotal * 0.2; // Assuming 20% tax
          const total = subtotal + tax;

          // Create draft PO
          const orderNumber = `PO-${Date.now()}-${supplierId.slice(0, 4).toUpperCase()}`;

          const purchaseOrder = await base44.entities.PurchaseOrder.create({
            order_number: orderNumber,
            supplier_id: supplierId,
            supplier_name: supplierData.name,
            supplier_email: supplierData.email,
            status: 'draft',
            items: orderItems,
            subtotal,
            tax,
            total,
            order_date: new Date().toISOString(),
            notes: '🤖 Auto-generated by AURA Inventory Agent',
          });

          // Log the action for PO creation
          await base44.entities.AgentLog.create({
            agent_name: 'inventory_agent',
            action_type: 'purchase_order_created',
            action_description: `Created draft order for ${supplierData.name} - ${items.length} low stock items`,
            trigger_event: 'low_stock_detected',
            related_entity: 'PurchaseOrder',
            related_entity_id: purchaseOrder.id,
            related_entity_name: orderNumber,
            created_order_id: purchaseOrder.id,
            decision_reasoning: `${items.length} ingredients below reorder point. Total value: £${total.toFixed(2)}.`,
            confidence_score: 0.95,
            severity: 'medium',
            status: 'completed', // PO is created, so status is completed for this action
            notification_sent: true,
            notification_recipients: ['manager@restaurant.com'],
            success: true,
            decision_data: {
              supplier_name: supplierData.name,
              items_count: items.length,
              total_cost: total,
              low_stock_items: items.map(i => ({ id: i.id, name: i.name })),
            },
          });

          // Create notification event
          await base44.entities.Event.create({
            source_module: 'ai',
            event_type: 'stock_low_po_created', // More specific event type
            title: '📦 Purchase Order Draft Created',
            message: `AURA detected ${items.length} low stock items from ${supplierData.name}. Draft order ${orderNumber} created for manager review (£${total.toFixed(2)}).`,
            severity: 'warning',
            recipient_roles: ['manager', 'owner'],
            linked_entity_type: 'PurchaseOrder',
            linked_entity_id: purchaseOrder.id,
            linked_entity_name: orderNumber,
            action_url: '/ordering', // Assuming a route for ordering
          });
        }

        console.log(`[InventoryAgent] Created ${Object.keys(supplierGroups).length} draft purchase orders.`);

      } catch (error) {
        console.error('[InventoryAgent] Main agent run error:', error);

        // Log the main agent run failure
        try {
          await base44.entities.AgentLog.create({
            agent_name: 'inventory_agent',
            action_type: 'agent_run_failure',
            action_description: 'Overall agent run failed',
            trigger_event: 'scheduled_run',
            status: 'failed',
            success: false,
            error_message: error.message,
          });
        } catch (logError) {
          console.error('[InventoryAgent] Failed to log critical agent error:', logError);
        }
      }
    };

    // Run on mount
    runAgent();

    // Run every hour
    const interval = setInterval(runAgent, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}
