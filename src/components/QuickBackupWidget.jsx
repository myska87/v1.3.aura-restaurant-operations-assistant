import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Upload, 
  Database, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  Zap,
  Calendar,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickBackupWidget() {
  const queryClient = useQueryClient();
  const [showQuickExport, setShowQuickExport] = useState(false);
  const [showQuickImport, setShowQuickImport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);

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
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  // All entities for quick full backup
  const allEntities = [
    'Shift', 'AttendanceRecord', 'TeamMember', 'StaffProfile',
    'TrainingRecord', 'PerformanceReview', 'StaffReward',
    'ChecklistExecution', 'ChecklistTemplate', 'FormResponse', 'FormTemplate',
    'Ingredient', 'MenuItem', 'Supplier', 'PurchaseOrder', 'ProductionPlan',
    'ComplianceCheck', 'MaintenanceTicket', 'ManagerAlert', 'Document', 'Announcement'
  ];

  const handleQuickExport = async () => {
    setIsExporting(true);

    try {
      const exportData = {};
      let totalRecords = 0;

      // Fetch data from all entities
      for (const entityName of allEntities) {
        try {
          const records = await base44.entities[entityName].list();
          exportData[entityName] = records;
          totalRecords += records.length;
        } catch (error) {
          console.error(`Error fetching ${entityName}:`, error);
          exportData[entityName] = [];
        }
      }

      // Add metadata
      const fullExport = {
        metadata: {
          export_date: new Date().toISOString(),
          exported_by: user?.email,
          exported_by_name: user?.full_name,
          total_records: totalRecords,
          entities: allEntities,
          app_version: '1.0.0',
          backup_type: 'quick_full_backup',
        },
        data: exportData,
      };

      // Download JSON file
      const jsonString = JSON.stringify(fullExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aura-quick-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Create backup record
      await base44.entities.DataBackup.create({
        backup_name: `Quick Backup ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
        backup_type: 'automatic',
        backup_date: new Date().toISOString(),
        created_by: user?.email,
        created_by_name: user?.full_name,
        entities_included: allEntities,
        total_records: totalRecords,
        file_size: blob.size,
        status: 'completed',
        notes: 'Quick full backup from Dashboard',
      });

      queryClient.invalidateQueries({ queryKey: ['lastBackup'] });
      alert(`✅ Successfully exported ${totalRecords} records!`);
      setShowQuickExport(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Export failed. Please try again.');
    }

    setIsExporting(false);
  };

  const handleQuickImport = async () => {
    if (!importFile) {
      alert('❌ Please select a file to import');
      return;
    }

    if (!window.confirm('⚠️ This will merge imported data with existing data. Continue?')) {
      return;
    }

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        const dataToImport = jsonData.data || jsonData;
        let successCount = 0;
        let errorCount = 0;

        for (const [entityName, records] of Object.entries(dataToImport)) {
          if (!Array.isArray(records)) continue;

          for (const record of records) {
            try {
              const { id, created_date, updated_date, created_by, ...cleanRecord } = record;
              await base44.entities[entityName].create(cleanRecord);
              successCount++;
            } catch (error) {
              console.error(`Error importing ${entityName} record:`, error);
              errorCount++;
            }
          }
        }

        queryClient.invalidateQueries();
        alert(`✅ Import completed!\n\n${successCount} records imported\n${errorCount} errors`);
        setShowQuickImport(false);
        setImportFile(null);
      } catch (error) {
        console.error('Import error:', error);
        alert('❌ Invalid backup file. Please check the file and try again.');
      }

      setIsImporting(false);
    };

    reader.readAsText(importFile);
  };

  if (!isAdmin) {
    return null;
  }

  const daysSinceLastBackup = lastBackup 
    ? Math.floor((new Date() - new Date(lastBackup.backup_date)) / (1000 * 60 * 60 * 24))
    : null;

  const needsBackup = !lastBackup || daysSinceLastBackup > 7;

  return (
    <>
      <Card className="border-none shadow-lg hover:shadow-xl transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="w-5 h-5 text-indigo-600" />
              Quick Backup & Restore
            </CardTitle>
            {needsBackup && (
              <Badge className="bg-red-100 text-red-800 animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Backup Needed!
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastBackup ? (
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Last Backup</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(lastBackup.backup_date), 'MMM d, yyyy')} at {format(new Date(lastBackup.backup_date), 'h:mm a')}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {lastBackup.total_records?.toLocaleString()} records • {(lastBackup.file_size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Badge className={daysSinceLastBackup > 7 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                  {daysSinceLastBackup === 0 ? 'Today' : `${daysSinceLastBackup}d ago`}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">No backups found</p>
                  <p className="text-xs text-amber-700 mt-1">Create your first backup to protect your data</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setShowQuickExport(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Quick Export
            </Button>
            <Button
              onClick={() => setShowQuickImport(true)}
              variant="outline"
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Quick Import
            </Button>
          </div>

          <Link to={createPageUrl("DataManagement")}>
            <Button variant="ghost" className="w-full text-sm" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Advanced Data Management
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </Link>

          {/* Auto-Backup Reminder */}
          {needsBackup && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-red-900">Backup Recommended</p>
                  <p className="text-xs text-red-700 mt-1">
                    {lastBackup 
                      ? `It's been ${daysSinceLastBackup} days since your last backup` 
                      : 'No backups exist yet'}
                  </p>
                  <Button
                    onClick={() => setShowQuickExport(true)}
                    size="sm"
                    className="mt-2 bg-red-600 hover:bg-red-700 text-white h-7 text-xs"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Backup Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Export Dialog */}
      <Dialog open={showQuickExport} onOpenChange={setShowQuickExport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Full Backup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Full Database Export</p>
                  <p className="text-sm text-blue-700 mt-1">
                    This will export all {allEntities.length} entity types including:
                  </p>
                  <ul className="text-xs text-blue-600 mt-2 grid grid-cols-2 gap-1">
                    <li>• Shifts & Attendance</li>
                    <li>• Team Members & Staff</li>
                    <li>• Inventory & Menu</li>
                    <li>• Checklists & Forms</li>
                    <li>• Training & Performance</li>
                    <li>• Documents & Alerts</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This may take a few moments depending on your data size. The file will download automatically.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickExport(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickExport}
              disabled={isExporting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isExporting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Start Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Import Dialog */}
      <Dialog open={showQuickImport} onOpenChange={setShowQuickImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Import / Restore</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Important Warning</p>
                  <p className="text-sm text-red-700 mt-1">
                    This will merge imported data with your existing data. 
                    Make sure you have a recent backup before proceeding.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0])}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">
                Select a JSON backup file exported from AURA
              </p>
            </div>

            {importFile && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">{importFile.name}</p>
                    <p className="text-xs text-green-700">
                      {(importFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickImport(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickImport}
              disabled={isImporting || !importFile}
              className="bg-green-600 hover:bg-green-700"
            >
              {isImporting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Start Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}