/**
 * AURA RBAC (Role-Based Access Control) System
 * 
 * Centralized permission management for all entities
 * Based on User.role (admin/user) and User.position (owner/manager/chef/etc.)
 */

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  admin: 100,
  owner: 90,
  manager: 80,
  chef: 50,
  sous_chef: 50,
  line_cook: 40,
  server: 30,
  bartender: 30,
  host: 30,
  cleaner: 20,
  maintenance: 20,
  dishwasher: 10,
  user: 10, // Default role
};

// Get role level
export const getRoleLevel = (user) => {
  if (!user) return 0;
  
  // Admin role overrides everything
  if (user.role === 'admin') return ROLE_HIERARCHY.admin;
  
  // Position-based role
  const position = user.position?.toLowerCase();
  return ROLE_HIERARCHY[position] || ROLE_HIERARCHY.user;
};

// Check if user is admin/owner/manager
export const isManager = (user) => {
  if (!user) return false;
  return user.role === 'admin' || 
         user.position === 'owner' || 
         user.position === 'manager';
};

export const isAdmin = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.position === 'owner';
};

// Entity-specific permission checks
export const permissions = {
  
  // ============================================
  // 🧼 COMPLIANCE & HYGIENE
  // ============================================
  
  ComplianceCheck: {
    canRead: (user) => !!user, // All authenticated users
    canCreate: (user) => !!user, // All staff can create checks
    canUpdate: (user) => isManager(user), // Only managers can edit
    canDelete: (user) => isAdmin(user), // Only admins can delete
  },
  
  HygieneRecord: {
    canRead: (user) => !!user,
    canCreate: (user) => !!user, // All staff can log hygiene
    canUpdate: (user, record) => {
      if (!user) return false;
      return isManager(user) || record?.recorded_by_email === user.email;
    },
    canDelete: (user) => isAdmin(user),
  },
  
  // ============================================
  // 📦 INVENTORY & PURCHASING
  // ============================================
  
  Ingredient: {
    canRead: (user) => !!user, // All can view ingredients
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  Supplier: {
    canRead: (user) => isManager(user), // Managers only
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  PurchaseOrder: {
    canRead: (user) => isManager(user),
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  // ============================================
  // 🍽️ MENU MANAGEMENT
  // ============================================
  
  MenuItem: {
    canRead: (user) => !!user, // All can view menu
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  MenuCategory: {
    canRead: (user) => !!user,
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  MenuSOPLink: {
    canRead: (user) => !!user, // All can view SOPs
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isManager(user),
  },
  
  // ============================================
  // 📚 SOP & TRAINING
  // ============================================
  
  SOPDocument: {
    canRead: (user) => !!user, // All staff can view SOPs
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  SOPSignatureLog: {
    canRead: (user, record) => {
      if (!user) return false;
      return isManager(user) || record?.staff_email === user.email;
    },
    canCreate: (user) => !!user, // All can sign SOPs
    canUpdate: (user) => false, // Signatures cannot be edited
    canDelete: (user) => isAdmin(user),
  },
  
  TrainingModule: {
    canRead: (user) => !!user,
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  TrainingRecord: {
    canRead: (user, record) => {
      if (!user) return false;
      return isManager(user) || record?.staff_email === user.email;
    },
    canCreate: (user) => !!user,
    canUpdate: (user, record) => {
      if (!user) return false;
      return isManager(user) || record?.staff_email === user.email;
    },
    canDelete: (user) => isAdmin(user),
  },
  
  // ============================================
  // 👥 WORKFORCE & SCHEDULING
  // ============================================
  
  Shift: {
    canRead: (user) => !!user, // All can view shifts
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  AttendanceRecord: {
    canRead: (user, record) => {
      if (!user) return false;
      return isManager(user) || record?.staff_email === user.email;
    },
    canCreate: (user) => !!user, // Auto-created on clock in/out
    canUpdate: (user) => isManager(user), // Only managers can edit attendance
    canDelete: (user) => isAdmin(user),
  },
  
  StaffTask: {
    canRead: (user, task) => {
      if (!user) return false;
      return isManager(user) || task?.assigned_to_email === user.email;
    },
    canCreate: (user) => isManager(user),
    canUpdate: (user, task) => {
      if (!user) return false;
      // Staff can update their own tasks, managers can update all
      return isManager(user) || task?.assigned_to_email === user.email;
    },
    canDelete: (user) => isManager(user),
  },
  
  TeamMember: {
    canRead: (user) => !!user, // All can view team directory
    canCreate: (user) => isAdmin(user), // Only admins can add staff
    canUpdate: (user, record) => {
      if (!user) return false;
      // Admins can edit all, staff can edit their own profile only
      return isAdmin(user) || record?.staff_email === user.email;
    },
    canDelete: (user) => isAdmin(user),
  },
  
  // ============================================
  // ✅ CHECKLISTS & FORMS
  // ============================================
  
  ChecklistTemplate: {
    canRead: (user) => !!user,
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  ChecklistExecution: {
    canRead: (user, record) => {
      if (!user) return false;
      return isManager(user) || record?.assigned_to_email === user.email;
    },
    canCreate: (user) => !!user,
    canUpdate: (user, record) => {
      if (!user) return false;
      return isManager(user) || record?.assigned_to_email === user.email;
    },
    canDelete: (user) => isAdmin(user),
  },
  
  FormTemplate: {
    canRead: (user) => !!user,
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  FormResponse: {
    canRead: (user, record) => {
      if (!user) return false;
      return isManager(user) || record?.staff_email === user.email;
    },
    canCreate: (user) => !!user,
    canUpdate: (user, record) => {
      if (!user) return false;
      // Can only update draft responses
      if (record?.status !== 'draft') return false;
      return isManager(user) || record?.staff_email === user.email;
    },
    canDelete: (user) => isAdmin(user),
  },
  
  // ============================================
  // 🔧 MAINTENANCE
  // ============================================
  
  MaintenanceTicket: {
    canRead: (user) => !!user, // All can view tickets
    canCreate: (user) => !!user, // All can create tickets
    canUpdate: (user) => isManager(user), // Only managers can update status
    canDelete: (user) => isAdmin(user),
  },
  
  // ============================================
  // 📄 DOCUMENTS & COMPLIANCE
  // ============================================
  
  Document: {
    canRead: (user, document) => {
      if (!user) return false;
      // Check confidentiality level
      if (document?.confidentiality_level === 'restricted') {
        return isAdmin(user);
      }
      if (document?.confidentiality_level === 'confidential') {
        return isManager(user);
      }
      return !!user; // Internal and public docs
    },
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  ComplianceAudit: {
    canRead: (user) => isManager(user), // Only managers can view audit logs
    canCreate: (user) => false, // System-generated only
    canUpdate: (user) => false, // Immutable
    canDelete: (user) => isAdmin(user), // Only admins for cleanup
  },
  
  DataBackup: {
    canRead: (user) => isManager(user),
    canCreate: (user) => isManager(user),
    canUpdate: (user) => false, // Immutable
    canDelete: (user) => isAdmin(user),
  },
  
  // ============================================
  // 💰 PAYROLL & PERFORMANCE
  // ============================================
  
  PayrollRecord: {
    canRead: (user, record) => {
      if (!user) return false;
      // Staff can only see their own payroll
      return isManager(user) || record?.staff_email === user.email;
    },
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  PerformanceReview: {
    canRead: (user, record) => {
      if (!user) return false;
      return isManager(user) || record?.staff_email === user.email;
    },
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isAdmin(user),
  },
  
  // ============================================
  // 💬 COMMUNICATION
  // ============================================
  
  Announcement: {
    canRead: (user) => !!user,
    canCreate: (user) => isManager(user),
    canUpdate: (user) => isManager(user),
    canDelete: (user) => isManager(user),
  },
  
  ChatMessage: {
    canRead: (user, message) => {
      if (!user) return false;
      // Can read if in the room or if manager
      return isManager(user) || true; // Will be refined by room membership
    },
    canCreate: (user) => !!user,
    canUpdate: (user, message) => {
      if (!user) return false;
      return message?.sender_email === user.email;
    },
    canDelete: (user, message) => {
      if (!user) return false;
      return isManager(user) || message?.sender_email === user.email;
    },
  },
};

// Helper function to check entity permission
export const canAccessEntity = (entityName, action, user, record = null) => {
  const entityPermissions = permissions[entityName];
  
  if (!entityPermissions) {
    console.warn(`No permissions defined for entity: ${entityName}`);
    return false;
  }
  
  const permissionCheck = entityPermissions[`can${action.charAt(0).toUpperCase() + action.slice(1)}`];
  
  if (!permissionCheck) {
    console.warn(`No ${action} permission defined for entity: ${entityName}`);
    return false;
  }
  
  return permissionCheck(user, record);
};

// Export default object
export default {
  getRoleLevel,
  isManager,
  isAdmin,
  canAccessEntity,
  permissions,
  ROLE_HIERARCHY,
};