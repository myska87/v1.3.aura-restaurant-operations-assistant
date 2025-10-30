import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Download, Upload, Database } from 'lucide-react';

const BACKUP_ENTITIES = [
  'SOPDocument', 'FormTemplate', 'TrainingModule', 'Event', 'OperationTask',
  'QualityRecord', 'Ingredient', 'HygieneRecord', 'ComplianceDocument',
  'Shift', 'ChecklistExecution', 'MenuItem', 'PurchaseOrder'
];

export default function BackupManager({ onClose }) {
  const queryClient = useQueryClient();
  const [backupName, setBackupName] = useState('');
  const [backupNotes, setBackupNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateBackup = async () => {
    if (!backupName.trim()) {
      alert('Please enter a backup name');
      return;
    }

    setIsCreating(true);
    try {
      const backupData = {};
      let totalRecords = 0;

      for (const entityName of BACKUP_ENTITIES) {
        try {
          const records = await base44.entities[entityName].list();
          backupData[entityName] = records;
          totalRecords += records.length;
        } catch (error) {
          console.warn(`Could not backup ${entityName}:`, error);
        }
      }

      const backupPayload = {
        backup_name: backupName,
        backup_type: 'entities_only',
        entities_backed_up: BACKUP_ENTITIES,
        total_records: totalRecords,
        backup_data: backupData,
        file_size_mb: parseFloat((JSON.stringify(backupData).length / 1024 / 1024).toFixed(2)),
        created_by: base44.auth.me().then(u => u.email),
        created_by_name: base44.auth.me().then(u => u.full_name),
        restore_available: true,
        notes: backupNotes,
      };

      await base44.entities.SystemBackupRecord.create(backupPayload);
      
      // Also download as JSON file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aura-backup-${Date.now()}.json`;
      a.click();

      alert(`✅ Backup created! ${totalRecords} records backed up and downloaded.`);
      queryClient.invalidateQueries({ queryKey: ['systemBackups'] });
      if (onClose) onClose();
    } catch (error) {
      console.error('Backup error:', error);
      alert('❌ Backup failed. Check console.');
    }
    setIsCreating(false);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>📦 Quick Backup:</strong> Export all critical data including SOPs, Forms, Training, Events, Quality, Inventory, and more.
          </p>
        </CardContent>
      </Card>

      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Backup Name</label>
        <Input
          value={backupName}
          onChange={(e) => setBackupName(e.target.value)}
          placeholder="e.g., Pre-Update Backup"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Notes (Optional)</label>
        <Textarea
          value={backupNotes}
          onChange={(e) => setBackupNotes(e.target.value)}
          placeholder="Why are you creating this backup?"
          rows={3}
        />
      </div>

      <Button
        onClick={handleCreateBackup}
        disabled={isCreating}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isCreating ? (
          <>
            <Database className="w-4 h-4 mr-2 animate-pulse" />
            Creating Backup...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Create & Download Backup
          </>
        )}
      </Button>
    </div>
  );
}