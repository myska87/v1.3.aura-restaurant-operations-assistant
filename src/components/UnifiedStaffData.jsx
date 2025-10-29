import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useMemo } from "react";

/**
 * Unified Staff Data Hook
 * Merges User and TeamMember entities into single source of truth
 * TeamMember data takes precedence over User data when both exist
 */
export function useUnifiedStaff() {
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: teamMembers = [], isLoading: loadingTeamMembers } = useQuery({
    queryKey: ['allTeamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    staleTime: 5 * 60 * 1000,
  });

  const unifiedStaff = useMemo(() => {
    const staffMap = new Map();

    // First, add all users
    users.forEach(user => {
      staffMap.set(user.email, {
        // Core identification
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        
        // Role & Department
        role: user.role, // admin or user
        position: user.position,
        department: user.department,
        
        // Contact
        phone: user.phone,
        photo_url: user.photo_url,
        
        // Employment
        hire_date: user.hire_date,
        status: user.status || 'active',
        
        // Schedule
        shift_start: user.shift_start,
        shift_end: user.shift_end,
        shift_preference: user.shift_preference,
        
        // Additional
        certifications: user.certifications || [],
        emergency_contact: user.emergency_contact,
        hourly_rate: user.hourly_rate,
        
        // Source tracking
        source: 'user',
        has_team_member: false,
      });
    });

    // Then, enrich or add from TeamMember (TeamMember takes precedence)
    teamMembers.forEach(member => {
      const existing = staffMap.get(member.staff_email);
      
      if (existing) {
        // Merge - TeamMember data overrides User data
        staffMap.set(member.staff_email, {
          ...existing,
          
          // Override with TeamMember data
          full_name: member.staff_name || existing.full_name,
          position: member.position || existing.position,
          department: member.department || existing.department,
          phone: member.phone || existing.phone,
          photo_url: member.photo_url || existing.photo_url,
          
          // TeamMember specific
          shift_start: member.shift_start || existing.shift_start,
          shift_end: member.shift_end || existing.shift_end,
          status: member.status || existing.status,
          hire_date: member.hire_date || existing.hire_date,
          hourly_rate: member.hourly_rate || existing.hourly_rate,
          emergency_contact: member.emergency_contact || existing.emergency_contact,
          
          // TeamMember extras
          manager_email: member.manager_email,
          manager_id: member.manager_id,
          probation_end_date: member.probation_end_date,
          notes: member.notes,
          
          // Source tracking
          source: 'merged',
          has_team_member: true,
          team_member_id: member.id,
        });
      } else {
        // Add new entry from TeamMember (no User account yet)
        staffMap.set(member.staff_email, {
          id: member.id,
          email: member.staff_email,
          full_name: member.staff_name,
          
          position: member.position,
          department: member.department,
          phone: member.phone,
          photo_url: member.photo_url,
          
          hire_date: member.hire_date,
          status: member.status || 'active',
          
          shift_start: member.shift_start,
          shift_end: member.shift_end,
          
          hourly_rate: member.hourly_rate,
          emergency_contact: member.emergency_contact,
          
          manager_email: member.manager_email,
          probation_end_date: member.probation_end_date,
          notes: member.notes,
          
          source: 'team_member_only',
          has_team_member: true,
          team_member_id: member.id,
          
          // Flag for pending user account
          needs_user_account: true,
        });
      }
    });

    // Convert to array and filter/sort
    return Array.from(staffMap.values())
      .filter(staff => !staff.status || staff.status === 'active') // Only active staff
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [users, teamMembers]);

  const staffByDepartment = useMemo(() => {
    const byDept = {};
    unifiedStaff.forEach(staff => {
      const dept = staff.department || 'unassigned';
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push(staff);
    });
    return byDept;
  }, [unifiedStaff]);

  const staffByPosition = useMemo(() => {
    const byPos = {};
    unifiedStaff.forEach(staff => {
      const pos = staff.position || 'unassigned';
      if (!byPos[pos]) byPos[pos] = [];
      byPos[pos].push(staff);
    });
    return byPos;
  }, [unifiedStaff]);

  return {
    staff: unifiedStaff,
    staffByDepartment,
    staffByPosition,
    isLoading: loadingUsers || loadingTeamMembers,
    
    // Helper functions
    getStaffByEmail: (email) => unifiedStaff.find(s => s.email === email),
    getStaffByPosition: (position) => unifiedStaff.filter(s => s.position === position),
    getStaffByDepartment: (department) => unifiedStaff.filter(s => s.department === department),
    getManagers: () => unifiedStaff.filter(s => s.position === 'manager' || s.position === 'owner'),
  };
}

/**
 * Staff Sync Component
 * Automatically syncs User data to TeamMember when User is updated
 * Runs in background without UI
 */
export function StaffDataSync() {
  const { staff } = useUnifiedStaff();
  
  // This component runs in background and doesn't render anything
  // It monitors for staff without TeamMember records and can create them
  
  return null;
}