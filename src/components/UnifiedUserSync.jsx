import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Unified User Synchronization System
 * Ensures TeamMember entity is always in sync with User entity
 * TeamMember = AURAUserCore (single source of truth for all staff data)
 */
export function UnifiedUserSync() {
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60000, // 1 minute
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['allTeamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    staleTime: 60000,
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
    },
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
    },
  });

  // Auto-sync on mount and when users change
  useEffect(() => {
    if (!isAdmin || users.length === 0) return;

    const performSync = async () => {
      try {
        for (const user of users) {
          if (!user.email || !user.full_name) continue;

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
          } else {
            // Create new TeamMember
            await createTeamMemberMutation.mutateAsync(userData);
          }
        }
      } catch (error) {
        console.error('User sync error:', error);
      }
    };

    // Run sync once per session
    const hasSynced = sessionStorage.getItem('unified_user_sync_done');
    if (!hasSynced) {
      performSync();
      sessionStorage.setItem('unified_user_sync_done', 'true');
    }
  }, [users, teamMembers, isAdmin]);

  // Component doesn't render anything
  return null;
}