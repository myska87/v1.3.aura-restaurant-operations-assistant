import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Unified User Synchronization System
 * Ensures TeamMember entity is always in sync with User entity
 * TeamMember = AURAUserCore (single source of truth for all staff data)
 * 
 * CRITICAL FIX: Ensures new users appear in team list immediately
 */
export function UnifiedUserSync() {
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 0, // Always fetch fresh
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['allTeamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    staleTime: 0,
    refetchInterval: 30000,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.position === 'owner' || currentUser?.position === 'manager';

  const createTeamMemberMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  // Auto-sync on mount and when users change
  useEffect(() => {
    if (!isAdmin || users.length === 0) return;

    const performSync = async () => {
      console.log('[UnifiedUserSync] Starting sync...', {
        users: users.length,
        teamMembers: teamMembers.length,
      });

      try {
        let syncedCount = 0;
        let createdCount = 0;
        let updatedCount = 0;

        for (const user of users) {
          // Skip users without email or name
          if (!user.email || !user.full_name) {
            console.warn('[UnifiedUserSync] Skipping user - missing email or name:', user);
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
            manager_email: '',
            notes: existingMember?.notes || `Synced from User entity`,
          };

          if (existingMember) {
            // Update existing - User data takes precedence
            await updateTeamMemberMutation.mutateAsync({
              id: existingMember.id,
              data: userData,
            });
            updatedCount++;
            console.log('[UnifiedUserSync] Updated TeamMember:', user.email);
          } else {
            // Create new TeamMember
            await createTeamMemberMutation.mutateAsync(userData);
            createdCount++;
            console.log('[UnifiedUserSync] Created new TeamMember:', user.email);
          }
          
          syncedCount++;
        }

        console.log('[UnifiedUserSync] Sync complete:', {
          total: syncedCount,
          created: createdCount,
          updated: updatedCount,
        });

        // Invalidate all related queries
        queryClient.invalidateQueries({ queryKey: ['allUsers'] });
        queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
        queryClient.invalidateQueries({ queryKey: ['teamMembers'] });

      } catch (error) {
        console.error('[UnifiedUserSync] Sync error:', error);
      }
    };

    // Run sync immediately on mount
    performSync();

    // Also run when users array changes significantly
    const interval = setInterval(() => {
      performSync();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [users, teamMembers, isAdmin]);

  // Component doesn't render anything
  return null;
}