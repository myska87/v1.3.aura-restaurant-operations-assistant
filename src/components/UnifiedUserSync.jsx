
import React, { useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Unified User Synchronization System
 * Ensures TeamMember entity is always in sync with User entity
 * 
 * PERMISSION FIX: Works for both admins and managers
 */
export function UnifiedUserSync() {
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 0,
    refetchInterval: 60000, // Every minute
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['allTeamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    staleTime: 0,
    refetchInterval: 60000,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Allow both admins and managers to sync
  const canSync = currentUser?.role === 'admin' || 
                  currentUser?.position === 'owner' || 
                  currentUser?.position === 'manager';

  const createTeamMemberMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
    onError: (error) => {
      console.error('[UnifiedUserSync] Create error:', error);
    },
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
    onError: (error) => {
      console.error('[UnifiedUserSync] Update error:', error);
    },
  });

  useEffect(() => {
    if (!canSync || users.length === 0) {
      console.log('[UnifiedUserSync] Skipping sync - insufficient permissions or no users');
      return;
    }

    const performSync = async () => {
      console.log('[UnifiedUserSync] Starting sync...', {
        users: users.length,
        teamMembers: teamMembers.length,
        syncedBy: currentUser?.email,
      });

      try {
        let syncedCount = 0;
        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        for (const user of users) {
          if (!user.email || !user.full_name) {
            console.warn('[UnifiedUserSync] Skipping invalid user:', user);
            continue;
          }

          const existingMember = teamMembers.find(tm => tm.staff_email === user.email);

          const userData = {
            staff_id: user.id,
            staff_email: user.email,
            staff_name: user.full_name,
            position: user.position || 'server',
            department: user.department || 'front_of_house',
            phone: user.phone || '',
            photo_url: user.photo_url || '',
            status: user.status || 'active',
            shift_start: user.shift_start || '09:00',
            shift_end: user.shift_end || '17:00',
            hire_date: user.hire_date || new Date().toISOString().split('T')[0],
            hourly_rate: user.hourly_rate || 0,
            emergency_contact: user.emergency_contact || '',
            manager_email: currentUser?.email || '',
            notes: existingMember?.notes || `Auto-synced from User entity`,
          };

          try {
            if (existingMember) {
              await updateTeamMemberMutation.mutateAsync({
                id: existingMember.id,
                data: userData,
              });
              updatedCount++;
            } else {
              await createTeamMemberMutation.mutateAsync(userData);
              createdCount++;
            }
            syncedCount++;
          } catch (error) {
            console.error('[UnifiedUserSync] Error syncing user:', user.email, error);
            errorCount++;
          }
        }

        console.log('[UnifiedUserSync] Sync complete:', {
          total: syncedCount,
          created: createdCount,
          updated: updatedCount,
          errors: errorCount,
        });

      } catch (error) {
        console.error('[UnifiedUserSync] Sync error:', error);
      }
    };

    // Run sync on mount only if not already done
    const hasRun = sessionStorage.getItem('unified_user_sync_done');
    if (!hasRun) {
      performSync();
      sessionStorage.setItem('unified_user_sync_done', 'true');
    }

    // Run every minute
    const interval = setInterval(performSync, 60000);

    return () => clearInterval(interval);
  }, [users, teamMembers, canSync]);

  return null;
}
