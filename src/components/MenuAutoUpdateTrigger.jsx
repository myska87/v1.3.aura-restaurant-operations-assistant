/**
 * Auto-Update Trigger Component
 * Monitors changes to SOPs and Ingredients linked to menu items
 */

import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function MenuAutoUpdateTrigger() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check for SOP updates every 5 minutes
    const interval = setInterval(async () => {
      try {
        // Get all menu-SOP links with auto_update enabled
        const links = await base44.entities.MenuSOPLink.filter({
          auto_update: true,
          is_active: true
        });

        for (const link of links) {
          // Get current SOP version
          const sops = await base44.entities.SOPDocument.list();
          const currentSOP = sops.find(s => s.id === link.sop_id);

          if (currentSOP && currentSOP.version !== link.sop_version) {
            // SOP was updated - refresh link
            await base44.entities.MenuSOPLink.update(link.id, {
              sop_version: currentSOP.version,
              sop_title: currentSOP.title,
            });

            // Invalidate menu item cache
            queryClient.invalidateQueries({ queryKey: ['menuItem', link.menu_item_id] });
            
            console.log(`✅ Auto-updated SOP link for menu item: ${link.menu_item_name}`);
          }
        }
      } catch (error) {
        console.error('Auto-update check failed:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [queryClient]);

  return null; // This is a background service component
}