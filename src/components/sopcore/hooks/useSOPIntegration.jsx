import { useSOPCoreContext } from '../SOPCoreProvider';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useSOPIntegration() {
  const context = useSOPCoreContext();

  // Fetch Menu Items (for linking)
  const { data: menuItems = [] } = useQuery({
    queryKey: ['sopcore-menu-items'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  // Fetch Staff (for certification)
  const { data: staff = [] } = useQuery({
    queryKey: ['sopcore-staff'],
    queryFn: () => base44.entities.User.list(),
  });

  return {
    // Integration Data
    menuItems,
    staff,
    menuLinks: context.menuLinks,
    sopLinks: context.sopLinks,

    // Methods
    linkToMenuItem: context.api.linkToMenuItem,
    assignCertification: context.api.assignCertification,

    // Helpers
    getMenuItemLinks: (menuItemId) => {
      return context.menuLinks.filter(link => link.menu_item_id === menuItemId);
    },

    getStaffCertifications: (staffEmail) => {
      return context.certifications.filter(cert => cert.staff_email === staffEmail);
    },

    getSOPLinks: (sopId) => {
      return context.sopLinks.filter(link => link.sop_id === sopId);
    },
  };
}