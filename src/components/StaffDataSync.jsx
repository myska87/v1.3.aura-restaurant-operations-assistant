import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

/**
 * Staff Data Synchronization Component
 * Automatically syncs User entity data into TeamMember entity
 * Ensures single source of truth for staff data
 */
export function StaffDataSync() {
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState({ synced: 0, total: 0, errors: [] });
  const [showAlert, setShowAlert] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['allTeamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
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

  // Auto-sync on component mount (runs once per session)
  useEffect(() => {
    const hasRunAutoSync = sessionStorage.getItem('staff_auto_sync_done');
    
    if (!hasRunAutoSync && users.length > 0 && isAdmin) {
      performSync(true); // Silent auto-sync
      sessionStorage.setItem('staff_auto_sync_done', 'true');
    }
  }, [users, isAdmin]);

  const performSync = async (silent = false) => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    if (!silent) setShowAlert(true);

    const errors = [];
    let syncedCount = 0;

    try {
      for (const user of users) {
        // Skip if user has no email or name
        if (!user.email || !user.full_name) {
          errors.push(`Skipped user ${user.email || 'unknown'}: Missing required data`);
          continue;
        }

        try {
          // Check if TeamMember already exists
          const existingMember = teamMembers.find(tm => tm.staff_email === user.email);

          const teamMemberData = {
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
            notes: `Auto-synced from User entity on ${new Date().toISOString()}`,
          };

          if (existingMember) {
            // Update existing TeamMember (User data takes precedence)
            await updateTeamMemberMutation.mutateAsync({
              id: existingMember.id,
              data: {
                ...teamMemberData,
                notes: existingMember.notes || teamMemberData.notes, // Preserve existing notes
              }
            });
          } else {
            // Create new TeamMember
            await createTeamMemberMutation.mutateAsync(teamMemberData);
          }

          syncedCount++;
        } catch (error) {
          console.error(`Error syncing user ${user.email}:`, error);
          errors.push(`Failed to sync ${user.full_name}: ${error.message}`);
        }
      }

      setSyncStatus({
        synced: syncedCount,
        total: users.length,
        errors: errors,
      });

      if (!silent && syncedCount > 0) {
        setTimeout(() => setShowAlert(false), 5000);
      }

    } catch (error) {
      console.error('Sync error:', error);
    }

    setIsSyncing(false);
  };

  const handleManualSync = () => {
    if (window.confirm(`This will sync ${users.length} users into TeamMember entity. Continue?`)) {
      performSync(false);
    }
  };

  // Don't show UI unless admin and there's work to do
  if (!isAdmin) return null;
  
  const needsSync = users.length > teamMembers.length;
  
  if (!showAlert && !needsSync) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {needsSync && (
        <Alert className="bg-yellow-50 border-yellow-200 shadow-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-yellow-900 mb-1">
                  Staff Data Sync Needed
                </p>
                <p className="text-yellow-700 text-xs">
                  {users.length} users, {teamMembers.length} team members
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3 mr-1" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {showAlert && syncStatus.synced > 0 && (
        <Alert className="bg-green-50 border-green-200 shadow-lg mt-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-green-900 mb-1">
                  Sync Complete
                </p>
                <p className="text-green-700 text-xs">
                  {syncStatus.synced}/{syncStatus.total} staff members synced
                </p>
                {syncStatus.errors.length > 0 && (
                  <p className="text-yellow-700 text-xs mt-1">
                    ⚠️ {syncStatus.errors.length} errors
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAlert(false)}
                className="text-xs"
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default StaffDataSync;