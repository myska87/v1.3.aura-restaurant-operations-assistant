import { base44 } from '@/api/base44Client';

/**
 * SOPCore Integration API
 * Secure APIs for integrating with other modules (Menu, Staff, etc.)
 * Read-only access to external entities
 */

export const IntegrationAPI = {
  // ========== Menu Integration (Read-Only) ==========

  async getMenuItems() {
    return await base44.entities.MenuItem.list();
  },

  async getMenuItemById(menuItemId) {
    const items = await base44.entities.MenuItem.list();
    return items.find(item => item.id === menuItemId);
  },

  async getMenuCategories() {
    return await base44.entities.MenuCategory.list();
  },

  // ========== Staff Integration (Read-Only) ==========

  async getAllStaff() {
    return await base44.entities.User.list();
  },

  async getStaffByEmail(email) {
    const staff = await base44.entities.User.list();
    return staff.find(s => s.email === email);
  },

  async getStaffByPosition(position) {
    const staff = await base44.entities.User.list();
    return staff.filter(s => s.position === position);
  },

  async getStaffByDepartment(department) {
    const staff = await base44.entities.User.list();
    return staff.filter(s => s.department === department);
  },

  // ========== Role Responsibilities (Read-Only) ==========

  async getRoleResponsibilities() {
    return await base44.entities.RoleResponsibility.list();
  },

  async getResponsibilitiesForRole(position) {
    const responsibilities = await base44.entities.RoleResponsibility.list();
    return responsibilities.find(r => r.position === position);
  },

  // ========== Helper Methods ==========

  async getSOPRecommendationsForMenuItem(menuItemId) {
    // Get menu item details
    const menuItem = await this.getMenuItemById(menuItemId);
    if (!menuItem) return [];

    // Get all SOPs
    const sops = await base44.entities.SOPDocument.list();

    // Filter relevant SOPs based on category and name matching
    return sops.filter(sop => {
      if (sop.category === 'recipe' || sop.category === 'kitchen') {
        const sopTitle = sop.title?.toLowerCase() || '';
        const menuName = menuItem.name?.toLowerCase() || '';
        return sopTitle.includes(menuName) || menuName.includes(sopTitle);
      }
      return false;
    });
  },

  async getSOPRecommendationsForStaff(staffEmail) {
    const staff = await this.getStaffByEmail(staffEmail);
    if (!staff) return [];

    // Get SOPs relevant to staff position
    const sops = await base44.entities.SOPDocument.list();
    
    return sops.filter(sop => {
      if (!sop.role_assigned || sop.role_assigned.length === 0) return true;
      return sop.role_assigned.includes(staff.position) || sop.role_assigned.includes('all');
    });
  },

  // ========== Cross-Module Analytics ==========

  async getIntegrationStats() {
    const menuItems = await this.getMenuItems();
    const staff = await this.getAllStaff();
    const sopLinks = await base44.entities.MenuSOPLink.list();
    const certifications = await base44.entities.SOPCertification.list();

    return {
      totalMenuItems: menuItems.length,
      linkedMenuItems: new Set(sopLinks.map(l => l.menu_item_id)).size,
      unlinkMenuItems: menuItems.length - new Set(sopLinks.map(l => l.menu_item_id)).size,
      totalStaff: staff.length,
      certifiedStaff: new Set(certifications.filter(c => c.status === 'completed').map(c => c.staff_email)).size,
      staffByPosition: this._groupByPosition(staff),
      linksByMenuCategory: await this._linksByMenuCategory(sopLinks, menuItems),
    };
  },

  _groupByPosition(staff) {
    const grouped = {};
    staff.forEach(s => {
      const position = s.position || 'unassigned';
      if (!grouped[position]) grouped[position] = 0;
      grouped[position]++;
    });
    return grouped;
  },

  async _linksByMenuCategory(sopLinks, menuItems) {
    const categories = await this.getMenuCategories();
    const grouped = {};

    sopLinks.forEach(link => {
      const menuItem = menuItems.find(m => m.id === link.menu_item_id);
      if (menuItem) {
        const category = menuItem.category_name || 'uncategorized';
        if (!grouped[category]) grouped[category] = 0;
        grouped[category]++;
      }
    });

    return grouped;
  },
};

export default IntegrationAPI;