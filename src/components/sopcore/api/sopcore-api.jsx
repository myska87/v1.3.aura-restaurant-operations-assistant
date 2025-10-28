import { base44 } from '@/api/base44Client';

/**
 * SOPCore API Layer
 * Secure internal APIs for SOP management
 * No direct entity modifications - all through base44 SDK
 */

export const SOPCoreAPI = {
  // ========== SOP Management ==========
  
  async getAllSOPs(filters = {}) {
    const sops = await base44.entities.SOPDocument.list('-created_date');
    
    if (filters.category && filters.category !== 'all') {
      return sops.filter(sop => sop.category === filters.category);
    }
    
    if (filters.status === 'active') {
      return sops.filter(sop => sop.active_status !== false);
    }
    
    return sops;
  },

  async getSOPById(sopId) {
    const sops = await base44.entities.SOPDocument.list();
    return sops.find(sop => sop.id === sopId);
  },

  async createSOP(sopData, createdBy) {
    return await base44.entities.SOPDocument.create({
      ...sopData,
      version: 1,
      active_status: true,
      created_by: createdBy,
      created_by_name: createdBy,
      view_count: 0,
      completion_count: 0,
      signature_count: 0,
    });
  },

  async updateSOPWithVersion(sopId, updates, updatedBy) {
    const sop = await this.getSOPById(sopId);
    
    if (!sop) throw new Error('SOP not found');

    // Create version snapshot
    await base44.entities.SOPVersion.create({
      sop_id: sopId,
      sop_title: sop.title,
      version_number: sop.version || 1,
      content_snapshot: sop,
      changelog: updates.changelog || 'SOP updated',
      updated_by: updatedBy,
      updated_by_name: updatedBy,
      replaced_version: sop.version || 1,
      is_current: false,
    });

    // Update SOP
    return await base44.entities.SOPDocument.update(sopId, {
      ...updates,
      version: (sop.version || 1) + 1,
      last_updated_by: updatedBy,
      last_updated_by_name: updatedBy,
    });
  },

  async archiveSOP(sopId, archivedBy) {
    return await base44.entities.SOPDocument.update(sopId, {
      active_status: false,
      last_updated_by: archivedBy,
    });
  },

  async incrementViewCount(sopId) {
    const sop = await this.getSOPById(sopId);
    if (sop) {
      await base44.entities.SOPDocument.update(sopId, {
        view_count: (sop.view_count || 0) + 1,
      });
    }
  },

  // ========== Certifications ==========

  async getCertificationsForStaff(staffEmail) {
    return await base44.entities.SOPCertification.filter({
      staff_email: staffEmail,
    });
  },

  async assignCertification(sopId, staffEmail, assignedBy) {
    const sop = await this.getSOPById(sopId);
    
    return await base44.entities.SOPCertification.create({
      staff_email: staffEmail,
      staff_name: staffEmail,
      sop_id: sopId,
      sop_title: sop?.title,
      sop_version: sop?.version || 1,
      status: 'pending',
      assigned_date: new Date().toISOString(),
    });
  },

  async bulkAssignCertifications(sopId, staffEmails, assignedBy) {
    const sop = await this.getSOPById(sopId);
    
    const promises = staffEmails.map(email =>
      base44.entities.SOPCertification.create({
        staff_email: email,
        staff_name: email,
        sop_id: sopId,
        sop_title: sop?.title,
        sop_version: sop?.version || 1,
        status: 'pending',
        assigned_date: new Date().toISOString(),
      })
    );

    return await Promise.all(promises);
  },

  // ========== Signatures ==========

  async createSignature(signatureData) {
    const signature = await base44.entities.SOPSignatureLog.create(signatureData);

    // Update SOP signature count
    const sop = await this.getSOPById(signatureData.sop_id);
    if (sop) {
      await base44.entities.SOPDocument.update(signatureData.sop_id, {
        signature_count: (sop.signature_count || 0) + 1,
      });
    }

    return signature;
  },

  async getSignaturesForSOP(sopId) {
    return await base44.entities.SOPSignatureLog.filter({
      sop_id: sopId,
    });
  },

  // ========== Integration APIs (Menu/Staff) ==========

  async linkSOPToMenuItem(sopId, menuItemId, linkedBy, linkType = 'preparation') {
    const sop = await this.getSOPById(sopId);
    
    return await base44.entities.MenuSOPLink.create({
      sop_id: sopId,
      sop_title: sop?.title,
      sop_version: sop?.version || 1,
      menu_item_id: menuItemId,
      linked_by: linkedBy,
      linked_by_name: linkedBy,
      link_type: linkType,
      auto_update: true,
      is_active: true,
    });
  },

  async unlinkSOPFromMenuItem(linkId) {
    return await base44.entities.MenuSOPLink.update(linkId, {
      is_active: false,
    });
  },

  async getMenuItemLinks(menuItemId) {
    const links = await base44.entities.MenuSOPLink.list();
    return links.filter(link => link.menu_item_id === menuItemId && link.is_active);
  },

  async getSOPMenuLinks(sopId) {
    const links = await base44.entities.MenuSOPLink.list();
    return links.filter(link => link.sop_id === sopId && link.is_active);
  },

  // ========== Analytics (Read-Only) ==========

  async getSOPAnalytics() {
    const sops = await base44.entities.SOPDocument.list();
    const certifications = await base44.entities.SOPCertification.list();
    const signatures = await base44.entities.SOPSignatureLog.list();
    const menuLinks = await base44.entities.MenuSOPLink.list();

    return {
      totalSOPs: sops.length,
      activeSOPs: sops.filter(s => s.active_status !== false).length,
      archivedSOPs: sops.filter(s => s.active_status === false).length,
      totalViews: sops.reduce((sum, sop) => sum + (sop.view_count || 0), 0),
      totalSignatures: signatures.length,
      totalCertifications: certifications.length,
      completedCertifications: certifications.filter(c => c.status === 'completed').length,
      pendingCertifications: certifications.filter(c => c.status === 'pending').length,
      linkedMenuItems: menuLinks.filter(l => l.is_active).length,
      averageCompletionRate: certifications.length > 0
        ? Math.round((certifications.filter(c => c.status === 'completed').length / certifications.length) * 100)
        : 0,
      byCategory: this._groupByCategory(sops),
      topViewedSOPs: sops.sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10),
    };
  },

  _groupByCategory(sops) {
    const grouped = {};
    sops.forEach(sop => {
      const category = sop.category || 'other';
      if (!grouped[category]) {
        grouped[category] = 0;
      }
      grouped[category]++;
    });
    return grouped;
  },
};

export default SOPCoreAPI;