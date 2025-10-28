
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { differenceInMinutes, format, parseISO } from "date-fns";

// Enhanced automatic backup scheduler component
// Runs twice daily at configured times
function AutoBackupScheduler() {
  const [lastCheck, setLastCheck] = useState(new Date());

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: backupSettings } = useQuery({
    queryKey: ['backupSettings'],
    queryFn: async () => {
      const settings = await base44.entities.BackupSettings.filter({
        setting_key: 'auto_backup_config'
      });
      
      if (settings.length === 0) {
        // Create default settings
        return await base44.entities.BackupSettings.create({
          setting_key: 'auto_backup_config',
          enabled: true,
          frequency: 'twice_daily',
          backup_times: ['09:00', '21:00'],
          retention_days: 30,
          total_backups_created: 0,
          notify_on_backup: true,
          notify_on_failure: true,
        });
      }
      
      return settings[0];
    },
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const allEntities = [
        'Shift', 'AttendanceRecord', 'TeamMember', 'StaffProfile',
        'TrainingRecord', 'PerformanceReview', 'StaffReward',
        'ChecklistExecution', 'ChecklistTemplate', 'FormResponse', 'FormTemplate',
        'Ingredient', 'MenuItem', 'Supplier', 'PurchaseOrder', 'ProductionPlan',
        'ComplianceCheck', 'MaintenanceTicket', 'ManagerAlert', 'Document',
        'Announcement', 'ChatMessage', 'CoachingSession', 'DailyChecklist'
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

      const backupData = await base44.entities.DataBackup.create({
        backup_name: `Auto Backup ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
        backup_type: 'automatic',
        backup_date: new Date().toISOString(),
        created_by: 'system',
        created_by_name: 'Auto Backup System',
        entities_included: allEntities,
        total_records: totalRecords,
        file_size: new Blob([JSON.stringify(exportData)]).size,
        status: 'completed',
        notes: `Scheduled automatic backup - ${backupSettings?.frequency}`,
      });

      // Update settings with last backup time
      if (backupSettings) {
        await base44.entities.BackupSettings.update(backupSettings.id, {
          last_backup_time: new Date().toISOString(),
          total_backups_created: (backupSettings.total_backups_created || 0) + 1,
        });
      }

      // Send notification if enabled
      if (backupSettings?.notify_on_backup && user?.email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: user.email,
            subject: '✅ AURA Auto-Backup Completed',
            body: `
Automatic backup completed successfully!

📊 Backup Details:
- Time: ${format(new Date(), 'PPpp')}
- Records: ${totalRecords.toLocaleString()}
- Size: ${(backupData.file_size / 1024).toFixed(2)} KB
- Entities: ${allEntities.length}

Your restaurant data is safely backed up.

AURA Restaurant System
            `.trim()
          });
        } catch (error) {
          console.error('Failed to send backup notification:', error);
        }
      }

      return backupData;
    },
    onError: async (error) => {
      console.error('Auto-backup failed:', error);
      
      // Send failure notification
      if (backupSettings?.notify_on_failure && user?.email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: user.email,
            subject: '❌ AURA Auto-Backup Failed',
            body: `
Automatic backup encountered an error!

⚠️ Error Details:
- Time: ${format(new Date(), 'PPpp')}
- Error: ${error.message || 'Unknown error'}

Please check your system or create a manual backup.

AURA Restaurant System
            `.trim()
          });
        } catch (e) {
          console.error('Failed to send failure notification:', e);
        }
      }
    }
  });

  const cleanupOldBackupsMutation = useMutation({
    mutationFn: async () => {
      if (!backupSettings?.retention_days) return;

      const allBackups = await base44.entities.DataBackup.list('-backup_date');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - backupSettings.retention_days);

      let deletedCount = 0;
      for (const backup of allBackups) {
        if (backup.backup_type === 'automatic') {
          const backupDate = parseISO(backup.backup_date);
          if (backupDate < cutoffDate) {
            try {
              await base44.entities.DataBackup.delete(backup.id);
              deletedCount++;
            } catch (error) {
              console.error('Failed to delete old backup:', error);
            }
          }
        }
      }

      if (backupSettings) {
        await base44.entities.BackupSettings.update(backupSettings.id, {
          last_cleanup_time: new Date().toISOString(),
        });
      }

      console.log(`🗑️ Cleaned up ${deletedCount} old backups`);
      return deletedCount;
    },
  });

  // Check if backup is needed
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.position !== 'owner')) {
      return;
    }

    if (!backupSettings || !backupSettings.enabled) {
      return;
    }

    const checkBackupSchedule = () => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Check if we should run backup based on frequency
      let shouldBackup = false;

      if (backupSettings.frequency === 'twice_daily') {
        // Check if current time matches one of the backup times
        const backupTimes = backupSettings.backup_times || ['09:00', '21:00'];
        
        for (const time of backupTimes) {
          const [hour, minute] = time.split(':').map(Number);
          
          // Run if within 5-minute window of scheduled time
          if (currentHour === hour && Math.abs(currentMinute - minute) <= 5) {
            // Check if we haven't backed up in the last hour
            if (backupSettings.last_backup_time) {
              const minutesSinceLastBackup = differenceInMinutes(
                now,
                parseISO(backupSettings.last_backup_time)
              );
              
              if (minutesSinceLastBackup >= 60) {
                shouldBackup = true;
              }
            } else {
              // No previous backup, create one
              shouldBackup = true;
            }
            break;
          }
        }
      } else if (backupSettings.frequency === 'daily') {
        // Run once per day at first backup time
        const [hour, minute] = (backupSettings.backup_times[0] || '09:00').split(':').map(Number);
        
        if (currentHour === hour && Math.abs(currentMinute - minute) <= 5) {
          if (backupSettings.last_backup_time) {
            const hoursSinceLastBackup = differenceInMinutes(
              now,
              parseISO(backupSettings.last_backup_time)
            ) / 60;
            
            if (hoursSinceLastBackup >= 23) {
              shouldBackup = true;
            }
          } else {
            shouldBackup = true;
          }
        }
      }

      if (shouldBackup) {
        console.log(`🔄 Starting automatic backup at ${format(now, 'PPpp')}`);
        createBackupMutation.mutate();
      }

      // Cleanup old backups once per day at midnight
      if (currentHour === 0 && currentMinute <= 5) {
        const hoursSinceCleanup = backupSettings.last_cleanup_time
          ? differenceInMinutes(now, parseISO(backupSettings.last_cleanup_time)) / 60
          : 999;

        if (hoursSinceCleanup >= 23) {
          console.log('🗑️ Running backup cleanup...');
          cleanupOldBackupsMutation.mutate();
        }
      }
    };

    // Check immediately
    checkBackupSchedule();

    // Then check every 5 minutes
    const interval = setInterval(checkBackupSchedule, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [backupSettings, user, lastCheck]);

  return null; // Silent component, no UI
}

export default AutoBackupScheduler;
