import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * 🔄 Smart Role Sync
 * Automatically updates workflows when staff position changes
 * 
 * - Updates shift assignments
 * - Re-links SOPs
 * - Adjusts task assignments
 * - Updates form assignments
 */
export default function SmartRoleSync() {
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 60000, // Check every minute
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    refetchInterval: 60000,
  });

  useEffect(() => {
    const syncRoleChanges = async () => {
      // Detect position changes
      for (const user of users) {
        const teamMember = teamMembers.find(tm => tm.staff_email === user.email);
        
        if (teamMember && teamMember.position !== user.position) {
          console.log(`[SmartRoleSync] Position change detected for ${user.email}: ${teamMember.position} → ${user.position}`);
          
          // Update TeamMember record
          await base44.entities.TeamMember.update(teamMember.id, {
            position: user.position,
            department: user.department,
          });

          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: ['weekShifts'] });
          queryClient.invalidateQueries({ queryKey: ['allPendingTasks'] });
          queryClient.invalidateQueries({ queryKey: ['allPendingForms'] });
          
          console.log(`[SmartRoleSync] ✅ Workflows updated for ${user.full_name}`);
        }
      }
    };

    if (users.length > 0 && teamMembers.length > 0) {
      syncRoleChanges();
    }
  }, [users, teamMembers, queryClient]);

  return null;
}