import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Home, Save, Clock, Calendar, Bell, Trash2, Database, CheckCircle, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BackupSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['backupSettings'],
    queryFn: async () => {
      const result = await base44.entities.BackupSettings.filter({
        setting_key: 'auto_backup_config'
      });
      
      if (result.length === 0) {
        const newSettings = await base44.entities.BackupSettings.create({
          setting_key: 'auto_backup_config',
          enabled: true,
          frequency: 'twice_daily',
          backup_times: ['09:00', '21:00'],
          retention_days: 30,
          total_backups_created: 0,
          notify_on_backup: true,
          notify_on_failure: true,
        });
        setFormData(newSettings);
        return newSettings;
      }
      
      setFormData(result[0]);
      return result[0];
    },
  });

  const { data: recentBackups = [] } = useQuery({
    queryKey: ['recentAutoBackups'],
    queryFn: async () => {
      const backups = await base44.entities.DataBackup.list('-backup_date', 10);
      return backups.filter(b => b.backup_type === 'automatic');
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => base44.entities.BackupSettings.update(settings.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupSettings'] });
      alert('✅ Backup settings updated successfully!');
    },
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-6">
              Only administrators can access backup settings.
            </p>
            <Link to={createPageUrl("Dashboard")}>
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !formData) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading settings...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    updateSettingsMutation.mutate({
      ...formData,
      updated_by: user?.email,
    });
  };

  const handleTimeChange = (index, value) => {
    const newTimes = [...formData.backup_times];
    newTimes[index] = value;
    setFormData({ ...formData, backup_times: newTimes });
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("DataManagement")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Data Management
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Auto-Backup Settings</h1>
              <p className="text-gray-600">Configure automated backup schedule and retention</p>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <Card className="mb-6 border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Auto-Backup Status</p>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={formData.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {formData.enabled ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Disabled
                      </>
                    )}
                  </Badge>
                  <Badge variant="outline">{formData.frequency.replace('_', ' ').toUpperCase()}</Badge>
                </div>
                {formData.last_backup_time && (
                  <p className="text-sm text-gray-600">
                    Last backup: {format(parseISO(formData.last_backup_time), 'PPpp')}
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  Total backups created: {formData.total_backups_created || 0}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Next Backup</p>
                {formData.enabled ? (
                  <div>
                    {formData.backup_times.map((time, idx) => (
                      <p key={idx} className="text-sm font-medium text-gray-900">
                        {time}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Disabled</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Backup Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enabled" className="text-base font-semibold">Enable Auto-Backup</Label>
                <p className="text-sm text-gray-600">Automatically backup your database on schedule</p>
              </div>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>

            {/* Frequency */}
            <div>
              <Label htmlFor="frequency">Backup Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger id="frequency" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twice_daily">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Twice Daily (Recommended)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Once Daily</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Weekly</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Backup Times */}
            {formData.frequency === 'twice_daily' && (
              <div>
                <Label>Backup Times (24-hour format)</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="time1" className="text-sm text-gray-600">First Backup</Label>
                    <Input
                      id="time1"
                      type="time"
                      value={formData.backup_times[0] || '09:00'}
                      onChange={(e) => handleTimeChange(0, e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="time2" className="text-sm text-gray-600">Second Backup</Label>
                    <Input
                      id="time2"
                      type="time"
                      value={formData.backup_times[1] || '21:00'}
                      onChange={(e) => handleTimeChange(1, e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Recommended: Morning (9:00) and Evening (21:00)
                </p>
              </div>
            )}

            {formData.frequency === 'daily' && (
              <div>
                <Label htmlFor="daily_time">Backup Time (24-hour format)</Label>
                <Input
                  id="daily_time"
                  type="time"
                  value={formData.backup_times[0] || '09:00'}
                  onChange={(e) => handleTimeChange(0, e.target.value)}
                  className="mt-2"
                />
              </div>
            )}

            {/* Retention */}
            <div>
              <Label htmlFor="retention">Backup Retention (days)</Label>
              <Input
                id="retention"
                type="number"
                min="7"
                max="365"
                value={formData.retention_days}
                onChange={(e) => setFormData({ ...formData, retention_days: parseInt(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-2">
                Automatic backups older than this will be deleted
              </p>
            </div>

            {/* Notifications */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify_backup" className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notify on Successful Backup
                  </Label>
                  <p className="text-sm text-gray-600">Receive email confirmation after each backup</p>
                </div>
                <Switch
                  id="notify_backup"
                  checked={formData.notify_on_backup}
                  onCheckedChange={(checked) => setFormData({ ...formData, notify_on_backup: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify_failure" className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notify on Backup Failure
                  </Label>
                  <p className="text-sm text-gray-600">Receive alert if backup fails</p>
                </div>
                <Switch
                  id="notify_failure"
                  checked={formData.notify_on_failure}
                  onCheckedChange={(checked) => setFormData({ ...formData, notify_on_failure: checked })}
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              size="lg"
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <Clock className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Auto-Backups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Auto-Backups</span>
              <Badge variant="outline">{recentBackups.length} backups</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentBackups.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No automatic backups yet</p>
                <p className="text-sm text-gray-400 mt-1">Backups will appear here once scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBackups.map((backup) => (
                  <div key={backup.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{backup.backup_name}</p>
                      <p className="text-sm text-gray-600">
                        {format(parseISO(backup.backup_date), 'PPpp')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {backup.total_records?.toLocaleString()} records • {(backup.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {backup.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Alert */}
        <Alert className="mt-6 bg-blue-50 border-blue-200">
          <Clock className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>How it works:</strong> The system checks every 5 minutes if it's time for a backup. 
            Backups run within a 5-minute window of your scheduled times. Old backups are automatically 
            cleaned up based on your retention settings.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}