/**
 * AURA Module API Gateway
 * 
 * Clean microservice-style APIs for different functional modules
 * Routes: /api/core, /api/module, /api/ai
 */

import CoreDB from './CoreDB';
import { base44 } from '@/api/base44Client';

/**
 * ========================================
 * /api/core/* - Core Identity & Metadata
 * ========================================
 */
export const CoreAPI = {
  // Authentication
  auth: {
    async me() {
      return await CoreDB.getCurrentUser();
    },
    
    async updateProfile(data) {
      return await CoreDB.updateCurrentUser(data);
    },
    
    async logout(redirectUrl) {
      return base44.auth.logout(redirectUrl);
    },
    
    async isAuthenticated() {
      return await base44.auth.isAuthenticated();
    }
  },

  // Staff Management
  staff: {
    async list(filters = {}, sortBy = '', limit = 100) {
      return await CoreDB.getStaff(filters, sortBy, limit);
    },
    
    async getById(userId) {
      return await CoreDB.getStaffById(userId);
    },
    
    async getByEmail(email) {
      return await CoreDB.getStaffByEmail(email);
    },
    
    async update(userId, data) {
      return await CoreDB.updateStaff(userId, data);
    },
    
    async getByPosition(position) {
      return await CoreDB.getStaff({ position });
    },
    
    async getByDepartment(department) {
      return await CoreDB.getStaff({ department });
    }
  },

  // Metadata & Configuration
  metadata: {
    async getConfig(key) {
      // Fetch app-wide configuration
      const configs = await base44.entities.BackupSettings.filter({ setting_key: key });
      return configs[0] || null;
    },
    
    async updateConfig(key, value) {
      const existing = await this.getConfig(key);
      if (existing) {
        return await base44.entities.BackupSettings.update(existing.id, value);
      } else {
        return await base44.entities.BackupSettings.create({ setting_key: key, ...value });
      }
    }
  }
};

/**
 * ========================================
 * /api/module/* - Functional Sub-Systems
 * ========================================
 */

export const ModuleAPI = {
  // Workforce Module
  workforce: {
    async getShifts(filters = {}, sortBy = '-shift_date', limit = 100) {
      return await CoreDB.getShifts(filters, sortBy, limit);
    },
    
    async createShift(shiftData) {
      return await CoreDB.createShift(shiftData);
    },
    
    async updateShift(shiftId, data) {
      return await CoreDB.updateShift(shiftId, data);
    },
    
    async clockIn(shiftId, location = null) {
      return await CoreDB.clockIn(shiftId, location);
    },
    
    async clockOut(shiftId, location = null) {
      return await CoreDB.clockOut(shiftId, location);
    },
    
    async getTodayShifts(staffEmail) {
      const today = new Date().toISOString().split('T')[0];
      return await CoreDB.getShifts({ staff_email: staffEmail, shift_date: today });
    },
    
    async getWeekShifts(startDate, endDate) {
      const shifts = await CoreDB.getShifts({}, '-shift_date', 500);
      return shifts.filter(s => {
        const shiftDate = new Date(s.shift_date);
        return shiftDate >= new Date(startDate) && shiftDate <= new Date(endDate);
      });
    }
  },

  // Task Management Module
  tasks: {
    async list(filters = {}, sortBy = '-due_date', limit = 100) {
      return await CoreDB.getTasks(filters, sortBy, limit);
    },
    
    async create(taskData) {
      return await CoreDB.createTask(taskData);
    },
    
    async update(taskId, data) {
      return await CoreDB.updateTask(taskId, data);
    },
    
    async complete(taskId, completionData = {}) {
      return await CoreDB.completeTask(taskId, completionData);
    },
    
    async getMyTasks(email, status = null) {
      const filters = { assigned_to_email: email };
      if (status) filters.status = status;
      return await CoreDB.getTasks(filters);
    },
    
    async getOverdueTasks(email = null) {
      const now = new Date().toISOString();
      const allTasks = await CoreDB.getTasks({}, '-due_date');
      return allTasks.filter(t => {
        const isOverdue = new Date(t.shift_date || t.created_date) < new Date(now);
        const isPending = t.status === 'pending' || t.status === 'in_progress';
        const matchesEmail = !email || t.assigned_to_email === email;
        return isOverdue && isPending && matchesEmail;
      });
    }
  },

  // Forms & Compliance Module
  forms: {
    async getTemplates(filters = {}) {
      return await CoreDB.getForms(filters);
    },
    
    async getAssignments(filters = {}) {
      return await CoreDB.getFormAssignments(filters);
    },
    
    async getResponses(filters = {}) {
      return await CoreDB.getFormResponses(filters);
    },
    
    async submitResponse(responseData) {
      return await CoreDB.submitFormResponse(responseData);
    },
    
    async getMyAssignments(email, status = null) {
      const filters = { assigned_to_email: email };
      if (status) filters.completion_status = status;
      return await CoreDB.getFormAssignments(filters);
    },
    
    async getPendingForms(email) {
      return await this.getMyAssignments(email, 'pending');
    }
  },

  // Hygiene Module
  hygiene: {
    async getRecords(filters = {}, sortBy = '-created_date', limit = 100) {
      return await CoreDB.getHygieneRecords(filters, sortBy, limit);
    },
    
    async createRecord(recordData) {
      return await CoreDB.createHygieneRecord(recordData);
    },
    
    async getAlerts(filters = {}) {
      return await CoreDB.getHygieneAlerts(filters);
    },
    
    async getUserScore(email) {
      return await CoreDB.getUserHygieneScore(email);
    },
    
    async getTodayRecords(venueId = null) {
      const today = new Date().toISOString().split('T')[0];
      const allRecords = await CoreDB.getHygieneRecords({}, '-created_date');
      return allRecords.filter(r => {
        const recordDate = new Date(r.created_date).toISOString().split('T')[0];
        const matchesDate = recordDate === today;
        const matchesVenue = !venueId || r.venue_id === venueId;
        return matchesDate && matchesVenue;
      });
    },
    
    async getActiveAlerts() {
      return await CoreDB.getHygieneAlerts({ status: 'open' });
    }
  },

  // Inventory & Menu Module
  inventory: {
    async getIngredients(filters = {}) {
      return await CoreDB.getIngredients(filters);
    },
    
    async getMenuItems(filters = {}) {
      return await CoreDB.getMenuItems(filters);
    },
    
    async getPurchaseOrders(filters = {}) {
      return await CoreDB.getPurchaseOrders(filters);
    },
    
    async getLowStock(threshold = null) {
      const ingredients = await CoreDB.getIngredients();
      return ingredients.filter(ing => {
        const reorderPoint = threshold || ing.reorder_point || 0;
        return ing.current_stock <= reorderPoint;
      });
    },
    
    async getActiveOrders() {
      const orders = await CoreDB.getPurchaseOrders();
      return orders.filter(o => 
        o.status === 'pending_approval' || 
        o.status === 'in_delivery' || 
        o.status === 'delivered_awaiting_check'
      );
    }
  },

  // Maintenance Module
  maintenance: {
    async getTickets(filters = {}, sortBy = '-created_date', limit = 100) {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.MaintenanceTicket.filter(filters, sortBy, limit);
      }
      return await base44.entities.MaintenanceTicket.list(sortBy, limit);
    },
    
    async createTicket(ticketData) {
      return await base44.entities.MaintenanceTicket.create(ticketData);
    },
    
    async updateTicket(ticketId, data) {
      return await base44.entities.MaintenanceTicket.update(ticketId, data);
    },
    
    async getOpenTickets() {
      return await this.getTickets({ status: 'open' });
    }
  },

  // Compliance & GDPR Module
  compliance: {
    async getChecks(filters = {}, sortBy = '-check_date', limit = 100) {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.ComplianceCheck.filter(filters, sortBy, limit);
      }
      return await base44.entities.ComplianceCheck.list(sortBy, limit);
    },
    
    async getAuditLogs(filters = {}, sortBy = '-created_date', limit = 100) {
      if (Object.keys(filters).length > 0) {
        return await base44.entities.ComplianceAudit.filter(filters, sortBy, limit);
      }
      return await base44.entities.ComplianceAudit.list(sortBy, limit);
    },
    
    async createAuditLog(auditData) {
      return await base44.entities.ComplianceAudit.create(auditData);
    }
  }
};

/**
 * ========================================
 * /api/ai/* - AI & Automation Layer
 * ========================================
 */

export const AIAPI = {
  // Predictive Analytics
  predictions: {
    async predictStaffNeeds(date, historical = 30) {
      // Analyze historical shift patterns
      const startDate = new Date(date);
      startDate.setDate(startDate.getDate() - historical);
      
      const shifts = await CoreDB.getShifts({}, '-shift_date', 500);
      const relevantShifts = shifts.filter(s => new Date(s.shift_date) >= startDate);
      
      // Simple prediction logic
      const dayOfWeek = new Date(date).getDay();
      const sameDayShifts = relevantShifts.filter(s => new Date(s.shift_date).getDay() === dayOfWeek);
      
      const avgStaffCount = sameDayShifts.length / (historical / 7);
      
      return {
        date,
        predicted_staff_needed: Math.ceil(avgStaffCount),
        confidence: sameDayShifts.length > 4 ? 'high' : 'medium',
        historical_average: avgStaffCount
      };
    },
    
    async predictInventoryNeeds(ingredientId, daysAhead = 7) {
      // Analyze usage patterns
      const ingredient = await base44.entities.Ingredient.list();
      const target = ingredient.find(i => i.id === ingredientId);
      
      if (!target) return null;
      
      // Simple linear projection
      const currentStock = target.current_stock || 0;
      const parLevel = target.par_level || 0;
      const dailyUsage = (parLevel - currentStock) / 7; // Estimate
      
      const predictedStock = currentStock - (dailyUsage * daysAhead);
      const needsReorder = predictedStock < target.reorder_point;
      
      return {
        ingredient_id: ingredientId,
        ingredient_name: target.name,
        current_stock: currentStock,
        predicted_stock: Math.max(0, predictedStock),
        days_until_reorder: needsReorder ? Math.ceil(currentStock / dailyUsage) : null,
        recommended_order_quantity: needsReorder ? parLevel - predictedStock : 0
      };
    }
  },

  // Automation
  automation: {
    async autoScheduleForms() {
      // Get all active forms with auto-assign enabled
      const forms = await CoreDB.getForms({ auto_assign_enabled: true, is_active: true });
      const staff = await CoreDB.getStaff({ status: 'active' });
      
      const assignments = [];
      const today = new Date();
      
      for (const form of forms) {
        // Find matching staff
        const matchingStaff = staff.filter(s => 
          !form.assigned_position || s.position === form.assigned_position
        );
        
        for (const member of matchingStaff) {
          // Check if already assigned
          const existing = await CoreDB.getFormAssignments({
            form_id: form.id,
            assigned_to_email: member.email
          });
          
          if (existing.length === 0) {
            const dueDate = new Date(today);
            dueDate.setHours(parseInt(form.schedule_time?.split(':')[0] || 9), 0, 0, 0);
            
            assignments.push({
              form_id: form.id,
              form_name: form.form_name,
              assignment_type: 'position_based',
              assigned_to_email: member.email,
              assigned_to_name: member.full_name,
              assigned_position: member.position,
              assigned_by: 'system',
              due_date: dueDate.toISOString(),
              completion_status: 'pending'
            });
          }
        }
      }
      
      return assignments;
    },
    
    async generateTasks(shiftId) {
      // Auto-generate tasks based on shift and role
      const shift = await CoreDB.getShiftById(shiftId);
      if (!shift) return [];
      
      const responsibilities = await base44.entities.RoleResponsibility.filter({
        position: shift.role
      });
      
      const tasks = [];
      
      for (const resp of responsibilities) {
        const dailyTasks = resp.daily_tasks || [];
        
        for (const task of dailyTasks) {
          const taskName = typeof task === 'string' ? task : task.task_name;
          const description = typeof task === 'object' ? task.description : '';
          
          tasks.push({
            task_name: taskName,
            description,
            assigned_to_email: shift.staff_email,
            assigned_to_name: shift.staff_name,
            role: shift.role,
            department: shift.department,
            shift_id: shiftId,
            shift_date: shift.shift_date,
            status: 'pending',
            created_automatically: true,
            task_type: 'daily'
          });
        }
      }
      
      return tasks;
    }
  },

  // Trend Reports
  trends: {
    async getComplianceTrend(days = 30) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const checks = await base44.entities.ComplianceCheck.list('-check_date', 500);
      const relevantChecks = checks.filter(c => new Date(c.check_date) >= startDate);
      
      const dailyData = {};
      
      relevantChecks.forEach(check => {
        const date = new Date(check.check_date).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { passed: 0, failed: 0, total: 0 };
        }
        dailyData[date].total++;
        if (check.status === 'passed') {
          dailyData[date].passed++;
        } else {
          dailyData[date].failed++;
        }
      });
      
      return {
        period: `${days} days`,
        daily_breakdown: dailyData,
        overall_pass_rate: relevantChecks.length > 0 
          ? (relevantChecks.filter(c => c.status === 'passed').length / relevantChecks.length * 100).toFixed(1)
          : 0
      };
    },
    
    async getStaffPerformanceTrend(email, days = 30) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const tasks = await CoreDB.getTasks({ assigned_to_email: email });
      const relevantTasks = tasks.filter(t => new Date(t.created_date) >= startDate);
      
      const completed = relevantTasks.filter(t => t.status === 'completed').length;
      const total = relevantTasks.length;
      const completionRate = total > 0 ? (completed / total * 100).toFixed(1) : 0;
      
      return {
        email,
        period: `${days} days`,
        tasks_assigned: total,
        tasks_completed: completed,
        completion_rate: completionRate,
        on_time_completion: relevantTasks.filter(t => 
          t.status === 'completed' && 
          new Date(t.completed_at) <= new Date(t.due_time || t.shift_date)
        ).length
      };
    }
  }
};

/**
 * ========================================
 * Unified Gateway Export
 * ========================================
 */

export const AuraAPI = {
  core: CoreAPI,
  module: ModuleAPI,
  ai: AIAPI,
  
  // Direct access to CoreDB for advanced usage
  db: CoreDB,
  
  // Health check
  async healthCheck() {
    return await CoreDB.healthCheck();
  }
};

export default AuraAPI;