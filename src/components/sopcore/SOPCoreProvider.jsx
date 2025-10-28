import React, { createContext, useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const SOPCoreContext = createContext();

export const useSOPCoreContext = () => {
  const context = useContext(SOPCoreContext);
  if (!context) {
    throw new Error('useSOPCoreContext must be used within SOPCoreProvider');
  }
  return context;
};

export default function SOPCoreProvider({ children }) {
  const queryClient = useQueryClient();
  const [activeFilters, setActiveFilters] = useState({
    category: 'all',
    status: 'active',
    role: 'all',
  });

  // Fetch SOPs
  const { data: sops = [], isLoading: loadingSOPs, refetch: refetchSOPs } = useQuery({
    queryKey: ['sopcore-sops', activeFilters],
    queryFn: async () => {
      const allSOPs = await base44.entities.SOPDocument.list('-created_date');
      return allSOPs.filter(sop => {
        if (activeFilters.category !== 'all' && sop.category !== activeFilters.category) return false;
        if (activeFilters.status === 'active' && sop.active_status === false) return false;
        if (activeFilters.status === 'archived' && sop.active_status !== false) return false;
        return true;
      });
    },
  });

  // Fetch Certifications
  const { data: certifications = [] } = useQuery({
    queryKey: ['sopcore-certifications'],
    queryFn: () => base44.entities.SOPCertification.list('-assigned_date'),
  });

  // Fetch Signatures
  const { data: signatures = [] } = useQuery({
    queryKey: ['sopcore-signatures'],
    queryFn: () => base44.entities.SOPSignatureLog.list('-signed_at', 100),
  });

  // Fetch Links (Menu/Staff connections)
  const { data: menuLinks = [] } = useQuery({
    queryKey: ['sopcore-menu-links'],
    queryFn: () => base44.entities.MenuSOPLink.list('-linked_at'),
  });

  const { data: sopLinks = [] } = useQuery({
    queryKey: ['sopcore-sop-links'],
    queryFn: () => base44.entities.SOPLinkMap.list('-created_date'),
  });

  // API Methods - Using Secure Internal APIs
  const api = {
    // Create SOP (secure)
    createSOP: async (sopData) => {
      return await base44.entities.SOPDocument.create(sopData);
    },

    // Update SOP (secure, creates version)
    updateSOP: async (id, updates) => {
      const existing = await base44.entities.SOPDocument.list();
      const sop = existing.find(s => s.id === id);
      
      if (sop) {
        // Create version snapshot
        await base44.entities.SOPVersion.create({
          sop_id: id,
          sop_title: sop.title,
          version_number: sop.version || 1,
          content_snapshot: sop,
          changelog: updates.changelog || 'Updated SOP',
          updated_by: updates.updated_by,
          updated_by_name: updates.updated_by_name,
          replaced_version: sop.version || 1,
          is_current: false,
        });

        // Update SOP
        return await base44.entities.SOPDocument.update(id, {
          ...updates,
          version: (sop.version || 1) + 1,
        });
      }
    },

    // Link SOP to Menu Item (secure)
    linkToMenuItem: async (sopId, menuItemId, linkedBy, linkType = 'preparation') => {
      const sop = sops.find(s => s.id === sopId);
      return await base44.entities.MenuSOPLink.create({
        menu_item_id: menuItemId,
        sop_id: sopId,
        sop_title: sop?.title,
        sop_version: sop?.version || 1,
        linked_by: linkedBy,
        linked_by_name: linkedBy,
        link_type: linkType,
        is_active: true,
      });
    },

    // Assign SOP Certification (secure)
    assignCertification: async (sopId, staffEmail, assignedBy) => {
      const sop = sops.find(s => s.id === sopId);
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

    // Get SOP Analytics (read-only)
    getAnalytics: () => {
      return {
        totalSOPs: sops.length,
        activeSOPs: sops.filter(s => s.active_status !== false).length,
        totalCertifications: certifications.length,
        completedCertifications: certifications.filter(c => c.status === 'completed').length,
        pendingCertifications: certifications.filter(c => c.status === 'pending').length,
        totalSignatures: signatures.length,
        linkedMenuItems: menuLinks.length,
        averageCompletionRate: certifications.length > 0
          ? Math.round((certifications.filter(c => c.status === 'completed').length / certifications.length) * 100)
          : 0,
      };
    },

    // Search SOPs (read-only)
    searchSOPs: (query) => {
      return sops.filter(sop =>
        sop.title?.toLowerCase().includes(query.toLowerCase()) ||
        sop.description?.toLowerCase().includes(query.toLowerCase()) ||
        sop.category?.toLowerCase().includes(query.toLowerCase())
      );
    },
  };

  const value = {
    // Data
    sops,
    certifications,
    signatures,
    menuLinks,
    sopLinks,
    loadingSOPs,

    // Filters
    activeFilters,
    setActiveFilters,

    // API
    api,

    // Refresh
    refetchSOPs,
    refetchAll: () => {
      queryClient.invalidateQueries({ queryKey: ['sopcore-'] });
    },
  };

  return (
    <SOPCoreContext.Provider value={value}>
      {children}
    </SOPCoreContext.Provider>
  );
}