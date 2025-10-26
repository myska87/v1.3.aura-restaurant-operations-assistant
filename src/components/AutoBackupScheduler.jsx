import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { differenceInDays } from "date-fns";

// Automatic backup scheduler component
// Runs silently in the background and creates automated backups
export default function AutoBackupScheduler() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: lastBackup } = useQuery({
    queryKey: ['lastBackup'],
    queryFn: async () => {
      const backups = await base44.entities.DataBackup.list('-backup_date', 1);
      return backups[0];
    },
    refetchInterval: 1000 * 60 * 60, // Check every hour
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const allEntities = [
        'Shift', 'AttendanceRecord', 'TeamMember', 'StaffProfile',
        'TrainingRecord', 'PerformanceReview', 'ChecklistExecution',
        'FormResponse', 'Ingredient', 'MenuItem', 'PurchaseOrder',
        'ComplianceCheck', 'MaintenanceTicket', 'ManagerAlert'
      ];

      const exportData = {};
      let totalRecords = 0;

      for (const entityName of allEntities) {
        try {
          const records = await base44.entities[entityName].list();
          exportData[entityName] = records;
          totalRecords += records.length;
        } catch (error) {
          console.error(`Auto-backup error for ${entityName}:`, error);
          exportData[entityName] = [];
        }
      }

      return await base44.entities.DataBackup.create({
        backup_name: `Auto Backup ${new Date().toISOString()}`,
        backup_type: 'automatic',
        backup_date: new Date().toISOString(),
        created_by: 'system',
        created_by_name: 'Auto Backup System',
        entities_included: allEntities,
        total_records: totalRecords,
        file_size: new Blob([JSON.stringify(exportData)]).size,
        status: 'completed',
        notes: 'Automatic weekly backup',
      });
    },
  });

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.position !== 'owner')) {
      return;
    }

    // Check if backup is needed (every 7 days)
    if (!lastBackup) {
      // No backup exists, create one
      createBackupMutation.mutate();
    } else {
      const daysSinceLastBackup = differenceInDays(
        new Date(),
        new Date(lastBackup.backup_date)
      );

      if (daysSinceLastBackup >= 7) {
        // More than 7 days since last backup
        createBackupMutation.mutate();
      }
    }
  }, [lastBackup, user]);

  return null; // Silent component, no UI
}