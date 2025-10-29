/**
 * EventBus - Inter-Agent Communication System
 * Allows agents to communicate and coordinate actions safely
 */

class EventBusClass {
  constructor() {
    this.listeners = {};
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Subscribe to an event type
   */
  on(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    };
  }

  /**
   * Emit an event to all subscribers
   */
  async emit(eventType, data) {
    try {
      const event = {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Add to history
      this.eventHistory.push(event);
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory.shift();
      }

      // Notify all listeners
      const listeners = this.listeners[eventType] || [];
      for (const callback of listeners) {
        try {
          await callback(data, event);
        } catch (error) {
          console.error(`EventBus: Error in listener for ${eventType}:`, error);
        }
      }

      return event;
    } catch (error) {
      console.error('EventBus: Failed to emit event:', error);
      return null;
    }
  }

  /**
   * Get recent events
   */
  getHistory(eventType = null, limit = 20) {
    let events = this.eventHistory;
    
    if (eventType) {
      events = events.filter(e => e.type === eventType);
    }

    return events.slice(-limit);
  }

  /**
   * Clear all listeners (useful for cleanup)
   */
  clear() {
    this.listeners = {};
  }

  /**
   * Get all active event types
   */
  getEventTypes() {
    return Object.keys(this.listeners);
  }
}

// Create singleton instance
const EventBus = new EventBusClass();

export default EventBus;

// Event Types Constants
export const EVENT_TYPES = {
  // Hygiene Events
  HYGIENE_CHECK_COMPLETED: 'hygiene_check_completed',
  HYGIENE_ALERT: 'hygiene_alert',
  HYGIENE_SCORE_UPDATED: 'hygiene_score_updated',
  
  // Inventory Events
  STOCK_LOW: 'stock_low',
  STOCK_CRITICAL: 'stock_critical',
  ORDER_GENERATED: 'order_generated',
  ORDER_APPROVED: 'order_approved',
  
  // Quality Events
  QUALITY_CHECK_FAILED: 'quality_check_failed',
  SOP_MISSED: 'sop_missed',
  QUALITY_SCORE_UPDATED: 'quality_score_updated',
  
  // System Events
  AGENT_STARTED: 'agent_started',
  AGENT_COMPLETED: 'agent_completed',
  AGENT_FAILED: 'agent_failed',
  
  // Task Events
  TASK_CREATED: 'task_created',
  TASK_ASSIGNED: 'task_assigned',
  TASK_OVERDUE: 'task_overdue'
};