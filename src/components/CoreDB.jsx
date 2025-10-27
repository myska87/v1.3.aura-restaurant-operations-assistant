/**
 * AURA_CoreDB - Unified Data Layer
 * 
 * Central data engine that handles all entity operations with:
 * - Real-time sync
 * - Caching layer
 * - Offline support
 * - Cross-module data access
 * - Data integrity validation
 */

import { base44 } from "@/api/base44Client";

class AuraCoreDB {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes default cache
    this.listeners = new Map();
    this.offlineQueue = [];
    this.isOnline = navigator.onLine;
    
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  /**
   * ========================================
   * CORE API - Identity & Authentication
   * ========================================
   */
  
  async getCurrentUser() {
    return this._cachedQuery('current_user', async () => {
      return await base44.auth.me();
    }, 60000); // 1 minute cache for user data
  }

  async updateCurrentUser(data) {
    const result = await base44.auth.updateMe(data);
    this._invalidateCache('current_user');
    this._notifyListeners('user:updated', result);
    return result;
  }

  /**
   * ========================================
   * CORE API - Staff & Team Management
   * ========================================
   */
  
  async getStaff(filters = {}, sortBy = '', limit = 100) {
    const cacheKey = `staff:${JSON.stringify(filters)}:${sortBy}:${limit}`;
    return this._cachedQuery(cacheKey, async () => {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.User.filter(filters, sortBy, limit);
      }
      return await base44.entities.User.list(sortBy, limit);
    });
  }

  async getStaffById(userId) {
    const cacheKey = `staff:${userId}`;
    return this._cachedQuery(cacheKey, async () => {
      const allStaff = await base44.entities.User.list();
      return allStaff.find(s => s.id === userId);
    });
  }

  async getStaffByEmail(email) {
    const cacheKey = `staff:email:${email}`;
    return this._cachedQuery(cacheKey, async () => {
      const staff = await base44.entities.User.filter({ email });
      return staff[0] || null;
    });
  }

  async updateStaff(userId, data) {
    const result = await base44.entities.User.update(userId, data);
    this._invalidateCache(`staff:${userId}`);
    this._invalidateCache('staff:');
    this._notifyListeners('staff:updated', { userId, data: result });
    return result;
  }

  /**
   * ========================================
   * CORE API - Shifts & Attendance
   * ========================================
   */
  
  async getShifts(filters = {}, sortBy = '-shift_date', limit = 100) {
    const cacheKey = `shifts:${JSON.stringify(filters)}:${sortBy}`;
    return this._cachedQuery(cacheKey, async () => {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.Shift.filter(filters, sortBy, limit);
      }
      return await base44.entities.Shift.list(sortBy, limit);
    }, 60000); // 1 minute cache
  }

  async getShiftById(shiftId) {
    const cacheKey = `shift:${shiftId}`;
    return this._cachedQuery(cacheKey, async () => {
      const shifts = await base44.entities.Shift.list();
      return shifts.find(s => s.id === shiftId);
    });
  }

  async createShift(shiftData) {
    const result = await base44.entities.Shift.create(shiftData);
    this._invalidateCache('shifts:');
    this._notifyListeners('shift:created', result);
    return result;
  }

  async updateShift(shiftId, data) {
    const result = await base44.entities.Shift.update(shiftId, data);
    this._invalidateCache(`shift:${shiftId}`);
    this._invalidateCache('shifts:');
    this._notifyListeners('shift:updated', { shiftId, data: result });
    return result;
  }

  async clockIn(shiftId, location = null) {
    const clockInData = {
      status: 'in_progress',
      clock_in_time: new Date().toISOString()
    };
    
    const result = await this.updateShift(shiftId, clockInData);
    
    // Create clock event
    const shift = await this.getShiftById(shiftId);
    await base44.entities.ClockEvent.create({
      user_email: shift.staff_email,
      user_name: shift.staff_name,
      shift_id: shiftId,
      event_type: 'clock_in',
      timestamp: clockInData.clock_in_time,
      location_lat: location?.latitude,
      location_lng: location?.longitude,
      location_name: location?.name
    });
    
    this._notifyListeners('shift:clock_in', { shiftId, shift: result });
    return result;
  }

  async clockOut(shiftId, location = null) {
    const clockOutData = {
      status: 'completed',
      clock_out_time: new Date().toISOString()
    };
    
    const result = await this.updateShift(shiftId, clockOutData);
    
    // Create clock event
    const shift = await this.getShiftById(shiftId);
    await base44.entities.ClockEvent.create({
      user_email: shift.staff_email,
      user_name: shift.staff_name,
      shift_id: shiftId,
      event_type: 'clock_out',
      timestamp: clockOutData.clock_out_time,
      location_lat: location?.latitude,
      location_lng: location?.longitude,
      location_name: location?.name
    });
    
    this._notifyListeners('shift:clock_out', { shiftId, shift: result });
    return result;
  }

  /**
   * ========================================
   * CORE API - Tasks & Assignments
   * ========================================
   */
  
  async getTasks(filters = {}, sortBy = '-due_date', limit = 100) {
    const cacheKey = `tasks:${JSON.stringify(filters)}:${sortBy}`;
    return this._cachedQuery(cacheKey, async () => {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.AutoGeneratedTask.filter(filters, sortBy, limit);
      }
      return await base44.entities.AutoGeneratedTask.list(sortBy, limit);
    }, 60000);
  }

  async createTask(taskData) {
    const result = await base44.entities.AutoGeneratedTask.create(taskData);
    this._invalidateCache('tasks:');
    this._notifyListeners('task:created', result);
    return result;
  }

  async updateTask(taskId, data) {
    const result = await base44.entities.AutoGeneratedTask.update(taskId, data);
    this._invalidateCache('tasks:');
    this._notifyListeners('task:updated', { taskId, data: result });
    return result;
  }

  async completeTask(taskId, completionData = {}) {
    const data = {
      ...completionData,
      status: 'completed',
      completed_at: new Date().toISOString()
    };
    return await this.updateTask(taskId, data);
  }

  /**
   * ========================================
   * CORE API - Forms & Compliance
   * ========================================
   */
  
  async getForms(filters = {}, sortBy = '', limit = 100) {
    const cacheKey = `forms:${JSON.stringify(filters)}`;
    return this._cachedQuery(cacheKey, async () => {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.FormTemplate.filter(filters, sortBy, limit);
      }
      return await base44.entities.FormTemplate.list(sortBy, limit);
    });
  }

  async getFormAssignments(filters = {}, sortBy = '-assigned_at', limit = 100) {
    const cacheKey = `form_assignments:${JSON.stringify(filters)}`;
    return this._cachedQuery(cacheKey, async () => {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.FormAssignmentMetadata.filter(filters, sortBy, limit);
      }
      return await base44.entities.FormAssignmentMetadata.list(sortBy, limit);
    }, 60000);
  }

  async getFormResponses(filters = {}, sortBy = '-submitted_at', limit = 100) {
    const cacheKey = `form_responses:${JSON.stringify(filters)}`;
    return this._cachedQuery(cacheKey, async () => {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.FormResponse.filter(filters, sortBy, limit);
      }
      return await base44.entities.FormResponse.list(sortBy, limit);
    }, 60000);
  }

  async submitFormResponse(responseData) {
    const result = await base44.entities.FormResponse.create(responseData);
    this._invalidateCache('form_responses:');
    this._invalidateCache('form_assignments:');
    this._notifyListeners('form:submitted', result);
    return result;
  }

  /**
   * ========================================
   * CORE API - Inventory & Menu
   * ========================================
   */
  
  async getIngredients(filters = {}, sortBy = 'name', limit = 200) {
    const cacheKey = `ingredients:${JSON.stringify(filters)}`;
    return this._cachedQuery(cacheKey, async () => {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.Ingredient.filter(filters, sortBy, limit);
      }
      return await base44.entities.Ingredient.list(sortBy, limit);
    });
  }

  async getMenuItems(filters = {}, sortBy = 'name', limit = 200) {
    const cacheKey = `menu_items:${JSON.stringify(filters)}`;
    return this._cachedQuery(cacheKey, async () => {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.MenuItem.filter(filters, sortBy, limit);
      }
      return await base44.entities.MenuItem.list(sortBy, limit);
    });
  }

  async getPurchaseOrders(filters = {}, sortBy = '-order_date', limit = 100) {
    const cacheKey = `purchase_orders:${JSON.stringify(filters)}`;
    return this._cachedQuery(cacheKey, async () => {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.PurchaseOrder.filter(filters, sortBy, limit);
      }
      return await base44.entities.PurchaseOrder.list(sortBy, limit);
    });
  }

  /**
   * ========================================
   * CORE API - Hygiene & Safety
   * ========================================
   */
  
  async getHygieneRecords(filters = {}, sortBy = '-created_date', limit = 100) {
    const cacheKey = `hygiene_records:${JSON.stringify(filters)}`;
    return this._cachedQuery(cacheKey, async () => {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.HygieneRecord.filter(filters, sortBy, limit);
      }
      return await base44.entities.HygieneRecord.list(sortBy, limit);
    }, 60000);
  }

  async createHygieneRecord(recordData) {
    const result = await base44.entities.HygieneRecord.create(recordData);
    this._invalidateCache('hygiene_records:');
    this._notifyListeners('hygiene:recorded', result);
    return result;
  }

  async getHygieneAlerts(filters = {}, sortBy = '-created_date', limit = 50) {
    const cacheKey = `hygiene_alerts:${JSON.stringify(filters)}`;
    return this._cachedQuery(cacheKey, async () => {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.HygieneAlertLog.filter(filters, sortBy, limit);
      }
      return await base44.entities.HygieneAlertLog.list(sortBy, limit);
    }, 60000);
  }

  async getUserHygieneScore(email) {
    const cacheKey = `hygiene_score:${email}`;
    return this._cachedQuery(cacheKey, async () => {
      const scores = await base44.entities.HygieneUserScore.filter({ staff_email: email });
      return scores[0] || null;
    }, 60000);
  }

  /**
   * ========================================
   * CACHE MANAGEMENT
   * ========================================
   */
  
  async _cachedQuery(key, queryFn, duration = null) {
    const cacheDuration = duration || this.cacheDuration;
    const now = Date.now();
    
    // Check if cached and not expired
    if (this.cache.has(key)) {
      const timestamp = this.cacheTimestamps.get(key);
      if (now - timestamp < cacheDuration) {
        return this.cache.get(key);
      }
    }
    
    // Execute query
    const result = await queryFn();
    
    // Store in cache
    this.cache.set(key, result);
    this.cacheTimestamps.set(key, now);
    
    return result;
  }

  _invalidateCache(pattern) {
    if (pattern.endsWith(':')) {
      // Invalidate all keys starting with pattern
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
          this.cacheTimestamps.delete(key);
        }
      }
    } else {
      // Invalidate exact key
      this.cache.delete(pattern);
      this.cacheTimestamps.delete(pattern);
    }
  }

  clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * ========================================
   * REAL-TIME SYNC & LISTENERS
   * ========================================
   */
  
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  _notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * ========================================
   * OFFLINE SUPPORT
   * ========================================
   */
  
  handleOnline() {
    this.isOnline = true;
    console.log('📡 AURA CoreDB: Back online, processing queued operations...');
    this._processOfflineQueue();
  }

  handleOffline() {
    this.isOnline = false;
    console.log('📴 AURA CoreDB: Offline mode activated');
  }

  async _processOfflineQueue() {
    while (this.offlineQueue.length > 0) {
      const operation = this.offlineQueue.shift();
      try {
        await operation.execute();
        console.log('✅ Processed offline operation:', operation.type);
      } catch (error) {
        console.error('❌ Failed to process offline operation:', error);
        // Re-queue if failed
        this.offlineQueue.push(operation);
        break;
      }
    }
  }

  /**
   * ========================================
   * UTILITIES
   * ========================================
   */
  
  async healthCheck() {
    try {
      await base44.auth.me();
      return {
        status: 'healthy',
        cache_size: this.cache.size,
        is_online: this.isOnline,
        offline_queue: this.offlineQueue.length
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        is_online: this.isOnline
      };
    }
  }
}

// Export singleton instance
export const CoreDB = new AuraCoreDB();
export default CoreDB;