import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * AURA Brain - Event Bus
 * Central event dispatcher for agent coordination
 * Listens to React Query cache changes and triggers agent processing
 */
export default function EventBus() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[EventBus] Initializing AURA Brain Event Bus...');

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated') {
        const queryKey = event.query?.queryKey;
        if (!queryKey || queryKey.length === 0) return;

        const entityName = queryKey[0];

        // Dispatch to relevant agents based on entity changes
        switch (entityName) {
          case 'checklistExecutions':
          case 'formAssignments':
          case 'hygieneRecords':
            console.log('[EventBus] Hygiene-related data updated → HygieneAgent notified');
            break;

          case 'ingredients':
          case 'inventoryItems':
            console.log('[EventBus] Inventory data updated → InventoryAgent notified');
            break;

          case 'qualityRecords':
          case 'qualityScores':
            console.log('[EventBus] Quality data updated → QualityAgent notified');
            break;

          case 'shifts':
          case 'attendanceRecords':
            console.log('[EventBus] Operations data updated → OperationsAgent notified');
            break;

          default:
            // No action needed for other entities
            break;
        }
      }
    });

    return () => {
      console.log('[EventBus] Shutting down Event Bus');
      unsubscribe();
    };
  }, [queryClient]);

  return null;
}