/**
 * 🔒 PROTECTION MODE GUARD
 * Validates that new code follows safe extension rules
 * Prevents accidental overwrites of existing modules
 */

export class ProtectionModeGuard {
  static PROTECTED_MODULES = [
    'AURA_Main',
    'AURA_ComplianceCore', 
    'AURA_WorkforceCore',
    'Inventory',
    'Payroll',
    'Menu',
    'DocumentManagement',
    'FormBuilder',
    'Notifications',
  ];

  static PROTECTED_ENTITIES = [
    'User',
    'Shift',
    'Attendance',
    'PayrollRecord',
    'MenuItem',
    'Ingredient',
    'PurchaseOrder',
    'Document',
    'ChecklistTemplate',
    'ChecklistExecution',
    'FormTemplate',
    'FormResponse',
  ];

  static PROTECTED_PAGES = [
    'Dashboard',
    'Inventory',
    'Menu',
    'Compliance',
    'Maintenance',
    'Reports',
    'StaffRota',
    'MyShifts',
    'ClockInOut',
    'ProductionPlanning',
    'MenuManagement',
    'SupplierManagement',
  ];

  /**
   * Check if a module is protected
   */
  static isProtectedModule(moduleName) {
    return this.PROTECTED_MODULES.includes(moduleName);
  }

  /**
   * Check if an entity is protected
   */
  static isProtectedEntity(entityName) {
    return this.PROTECTED_ENTITIES.includes(entityName);
  }

  /**
   * Check if a page is protected
   */
  static isProtectedPage(pageName) {
    return this.PROTECTED_PAGES.includes(pageName);
  }

  /**
   * Validate new module name follows convention
   */
  static validateNewModuleName(name) {
    const validPattern = /^[A-Z][a-zA-Z0-9_]*Core$/;
    if (!validPattern.test(name)) {
      throw new Error(
        `❌ Invalid module name: "${name}". Must follow pattern: "FeatureNameCore"`
      );
    }
    
    if (this.isProtectedModule(name)) {
      throw new Error(
        `❌ Module "${name}" is protected and cannot be modified`
      );
    }
    
    return true;
  }

  /**
   * Validate API connection follows read-only rules
   */
  static validateAPIConnection(targetModule, action) {
    if (this.isProtectedModule(targetModule)) {
      const allowedActions = ['GET', 'LIST', 'FILTER', 'FIND'];
      
      if (!allowedActions.includes(action.toUpperCase())) {
        throw new Error(
          `❌ Cannot perform "${action}" on protected module "${targetModule}". Only read operations allowed.`
        );
      }
    }
    
    return true;
  }

  /**
   * Generate safe integration example
   */
  static generateSafeIntegrationExample(targetModule, newModule) {
    return `
// ✅ SAFE INTEGRATION EXAMPLE
// New module: ${newModule}
// Target: ${targetModule}

import { base44 } from "@/api/base44Client";

export class ${newModule}Connector {
  // ✅ READ-ONLY: Get data from ${targetModule}
  static async get${targetModule}Data(id) {
    const items = await base44.entities.${targetModule}.filter({ id });
    return items[0] || null;
  }

  // ✅ METADATA STORAGE: Store reference in new module
  static async createReference(targetId, metadata) {
    return await base44.entities.${newModule}Reference.create({
      target_module: '${targetModule}',
      target_id: targetId,
      metadata: metadata,
      created_at: new Date().toISOString(),
    });
  }

  // ❌ NEVER DO THIS: Direct modification
  // static async update${targetModule}(id, data) {
  //   return await base44.entities.${targetModule}.update(id, data); // BLOCKED
  // }
}
    `;
  }

  /**
   * Log protection status
   */
  static logProtectionStatus() {
    console.log('🔒 PROTECTION MODE ACTIVE');
    console.log('📦 Protected Modules:', this.PROTECTED_MODULES.length);
    console.log('🗄️ Protected Entities:', this.PROTECTED_ENTITIES.length);
    console.log('📄 Protected Pages:', this.PROTECTED_PAGES.length);
    console.log('✅ Safe extension mode enabled');
  }
}

// Initialize protection on load
if (typeof window !== 'undefined') {
  window.ProtectionModeGuard = ProtectionModeGuard;
  ProtectionModeGuard.logProtectionStatus();
}

export default ProtectionModeGuard;