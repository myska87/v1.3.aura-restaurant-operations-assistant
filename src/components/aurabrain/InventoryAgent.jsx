/**
 * InventoryAgent - Autonomous Inventory Monitoring & Order Management
 * Monitors stock levels, auto-generates orders, predicts shortages
 */

import { base44 } from '@/api/base44Client';
import EventBus, { EVENT_TYPES } from './EventBus';

class InventoryAgentClass {
  constructor() {
    this.name = 'inventory_agent';
    this.isRunning = false;
    this.lastRun = null;
  }

  /**
   * Main run cycle
   */
  async run() {
    if (this.isRunning) {
      console.log('InventoryAgent: Already running, skipping...');
      return { status: 'skipped', reason: 'already_running' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const results = {
      lowStockDetected: 0,
      ordersGenerated: 0,
      predictionsCreated: 0,
      errors: []
    };

    try {
      console.log('🧠 InventoryAgent: Starting run...');
      
      await EventBus.emit(EVENT_TYPES.AGENT_STARTED, { 
        agent: this.name,
        timestamp: new Date().toISOString()
      });

      // 1. Check low stock items
      const lowStockResult = await this.checkLowStock();
      results.lowStockDetected = lowStockResult.detected;

      // 2. Auto-generate orders for critical items
      const orderResult = await this.autoGenerateOrders();
      results.ordersGenerated = orderResult.generated;

      // 3. Predict future shortages
      const predictionResult = await this.predictShortages();
      results.predictionsCreated = predictionResult.created;

      // 4. Log agent action
      await this.logAction('auto_run', 'completed', results);

      const duration = Date.now() - startTime;
      console.log(`✅ InventoryAgent: Completed in ${duration}ms`, results);

      await EventBus.emit(EVENT_TYPES.AGENT_COMPLETED, { 
        agent: this.name,
        duration,
        results
      });

      this.lastRun = new Date().toISOString();
      return { status: 'success', results, duration };

    } catch (error) {
      console.error('❌ InventoryAgent: Run failed:', error);
      results.errors.push(error.message);
      
      await this.logAction('auto_run', 'failed', { error: error.message });
      
      await EventBus.emit(EVENT_TYPES.AGENT_FAILED, { 
        agent: this.name,
        error: error.message
      });

      return { status: 'error', error: error.message, results };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check for low stock items
   */
  async checkLowStock() {
    try {
      const ingredients = await base44.entities.Ingredient.list('-current_stock', 100);
      
      const lowStockItems = ingredients.filter(ing => 
        ing.current_stock <= (ing.reorder_point || 0) && ing.supplier_id
      );

      let detected = 0;

      for (const item of lowStockItems) {
        const severity = item.current_stock === 0 ? 'critical' : 'warning';
        
        await EventBus.emit(
          item.current_stock === 0 ? EVENT_TYPES.STOCK_CRITICAL : EVENT_TYPES.STOCK_LOW,
          {
            ingredient_id: item.id,
            ingredient_name: item.name,
            current_stock: item.current_stock,
            reorder_point: item.reorder_point,
            supplier_id: item.supplier_id
          }
        );

        detected++;
      }

      console.log(`📦 InventoryAgent: Detected ${detected} low stock items`);
      return { detected };

    } catch (error) {
      console.error('InventoryAgent: Error in checkLowStock:', error);
      return { detected: 0, error: error.message };
    }
  }

  /**
   * Auto-generate purchase orders for critical stock
   */
  async autoGenerateOrders() {
    try {
      const ingredients = await base44.entities.Ingredient.list('-current_stock', 100);
      
      // Only auto-order for critical items (stock = 0 or below critical threshold)
      const criticalItems = ingredients.filter(ing => 
        ing.auto_order_enabled &&
        ing.current_stock <= (ing.reorder_point || 0) * 0.3 && // 30% of reorder point
        ing.supplier_id
      );

      // Group by supplier
      const ordersBySupplier = {};

      criticalItems.forEach(item => {
        if (!ordersBySupplier[item.supplier_id]) {
          ordersBySupplier[item.supplier_id] = {
            supplier_id: item.supplier_id,
            supplier_name: item.supplier_name,
            supplier_email: item.supplier_email,
            items: []
          };
        }

        const quantityToOrder = item.auto_order_quantity || 
          (item.par_level ? item.par_level - item.current_stock : 10);

        ordersBySupplier[item.supplier_id].items.push({
          ingredient_id: item.id,
          ingredient_name: item.name,
          quantity_ordered: quantityToOrder,
          unit: item.unit,
          unit_cost: item.unit_cost,
          line_total: parseFloat((quantityToOrder * item.unit_cost).toFixed(2))
        });
      });

      let generated = 0;

      // Create draft orders
      for (const order of Object.values(ordersBySupplier)) {
        const subtotal = order.items.reduce((sum, item) => sum + item.line_total, 0);
        const taxRate = 0.20;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        await base44.entities.PurchaseOrder.create({
          order_number: `PO-AUTO-${Date.now()}-${order.supplier_id.substring(0, 4)}`,
          supplier_id: order.supplier_id,
          supplier_name: order.supplier_name,
          supplier_email: order.supplier_email,
          status: 'draft',
          items: order.items,
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax: parseFloat(tax.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          order_date: new Date().toISOString().split('T')[0],
          notes: 'AUTO-GENERATED by AURA Brain - Critical stock replenishment',
          auto_generated: true
        });

        await EventBus.emit(EVENT_TYPES.ORDER_GENERATED, {
          supplier_id: order.supplier_id,
          supplier_name: order.supplier_name,
          itemCount: order.items.length,
          total: total
        });

        generated++;
      }

      console.log(`🛒 InventoryAgent: Generated ${generated} draft orders`);
      return { generated };

    } catch (error) {
      console.error('InventoryAgent: Error in autoGenerateOrders:', error);
      return { generated: 0, error: error.message };
    }
  }

  /**
   * Predict future shortages using historical data
   */
  async predictShortages() {
    try {
      // Get ingredients with low stock trend
      const ingredients = await base44.entities.Ingredient.list('-current_stock', 100);
      
      const predictions = [];
      let created = 0;

      for (const item of ingredients) {
        // Simple prediction: if current stock < 50% of reorder point
        if (item.current_stock > 0 && 
            item.current_stock < (item.reorder_point || 0) * 0.5 &&
            item.supplier_id) {
          
          const daysUntilOut = Math.ceil(item.current_stock / (item.reorder_point / 7)); // Rough estimate
          
          predictions.push({
            ingredient_id: item.id,
            ingredient_name: item.name,
            current_stock: item.current_stock,
            predicted_out_date: new Date(Date.now() + daysUntilOut * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            confidence: 0.7
          });

          // Create AI prediction record
          await base44.entities.AIPrediction.create({
            prediction_date: new Date().toISOString().split('T')[0],
            prediction_type: 'stock_shortage',
            target_date: new Date(Date.now() + daysUntilOut * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            category: 'inventory',
            prediction_summary: `${item.name} predicted to run out in ${daysUntilOut} days`,
            confidence_level: 0.7,
            severity: daysUntilOut <= 3 ? 'high' : 'medium',
            recommended_actions: [
              `Order ${item.auto_order_quantity || item.par_level || 10} ${item.unit} from ${item.supplier_name}`,
              'Monitor usage closely',
              'Consider increasing par level'
            ],
            data_points_used: 1,
            pattern_detected: 'declining_stock_trend'
          });

          created++;
        }
      }

      console.log(`🔮 InventoryAgent: Created ${created} shortage predictions`);
      return { created, predictions };

    } catch (error) {
      console.error('InventoryAgent: Error in predictShortages:', error);
      return { created: 0, error: error.message };
    }
  }

  /**
   * Log agent action to database
   */
  async logAction(actionType, status, data = {}) {
    try {
      await base44.entities.AgentLog.create({
        agent_name: this.name,
        action_type: 'auto_action',
        action_description: `Inventory agent ${actionType}: ${status}`,
        trigger_event: 'scheduled_run',
        decision_data: data,
        decision_reasoning: 'Automated inventory monitoring and order generation',
        confidence_score: 0.9,
        severity: status === 'failed' ? 'high' : 'info',
        status: status === 'failed' ? 'failed' : 'completed',
        notification_sent: false,
        success: status !== 'failed',
        processing_time_ms: data.duration || 0
      });
    } catch (error) {
      console.error('InventoryAgent: Failed to log action:', error);
    }
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      name: this.name,
      isRunning: this.isRunning,
      lastRun: this.lastRun
    };
  }
}

// Create singleton instance
const InventoryAgent = new InventoryAgentClass();

export default InventoryAgent;