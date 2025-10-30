import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Data Integrity Checker
 * Runs in background to ensure data consistency across modules
 * - Syncs TeamMember ↔ User
 * - Updates cached names and references
 * - Fixes orphaned records
 */
export default function DataIntegrityChecker() {
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['allTeamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shiftsNeedingSync'],
    queryFn: () => base44.entities.Shift.list('-shift_date', 50),
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamMember.update(id, data),
  });

  // Sync User data to TeamMember
  useEffect(() => {
    if (users.length === 0 || teamMembers.length === 0) return;

    const syncUserToTeamMember = async () => {
      for (const user of users) {
        const teamMember = teamMembers.find(tm => tm.staff_email === user.email);
        
        if (teamMember) {
          // Update TeamMember with latest User data
          const needsUpdate = 
            teamMember.staff_name !== user.full_name ||
            teamMember.position !== user.position ||
            teamMember.phone !== user.phone;

          if (needsUpdate) {
            try {
              await updateTeamMemberMutation.mutateAsync({
                id: teamMember.id,
                data: {
                  staff_name: user.full_name,
                  position: user.position,
                  phone: user.phone,
                  photo_url: user.photo_url,
                }
              });
            } catch (error) {
              console.error('Failed to sync TeamMember:', error);
            }
          }
        }
      }
    };

    // Run sync once on mount
    const timer = setTimeout(syncUserToTeamMember, 2000);
    return () => clearTimeout(timer);
  }, [users, teamMembers]);

  // Update shifts with latest staff names
  useEffect(() => {
    if (shifts.length === 0 || users.length === 0) return;

    const syncShiftNames = async () => {
      for (const shift of shifts.slice(0, 10)) { // Limit to 10 per run
        const user = users.find(u => u.email === shift.staff_email);
        
        if (user && shift.staff_name !== user.full_name) {
          try {
            await updateShiftMutation.mutateAsync({
              id: shift.id,
              data: {
                staff_name: user.full_name,
                role: user.position,
                department: user.department,
              }
            });
          } catch (error) {
            console.error('Failed to sync shift:', error);
          }
        }
      }
    };

    const timer = setTimeout(syncShiftNames, 3000);
    return () => clearTimeout(timer);
  }, [shifts, users]);

  // This component doesn't render anything
  return null;
}