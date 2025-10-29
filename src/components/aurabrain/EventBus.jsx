/**
 * EventBus - Inter-Agent Communication System
 * Allows agents to communicate and coordinate actions safely
 */

const subscribers = {};

export const EventBus = {
  subscribe(event, fn) {
    (subscribers[event] ||= []).push(fn);
    
    // Return unsubscribe function
    return () => {
      const index = subscribers[event]?.indexOf(fn);
      if (index > -1) {
        subscribers[event].splice(index, 1);
      }
    };
  },
  
  publish(event, data) {
    (subscribers[event] || []).forEach(fn => {
      try {
        fn(data);
      } catch (error) {
        console.error(`EventBus: Error in subscriber for ${event}:`, error);
      }
    });
  },

  emit(event, data) {
    // Alias for publish (for backward compatibility)
    this.publish(event, data);
  },

  on(event, fn) {
    // Alias for subscribe (for backward compatibility)
    return this.subscribe(event, fn);
  },

  clear() {
    Object.keys(subscribers).forEach(key => delete subscribers[key]);
  }
};

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

export default EventBus;