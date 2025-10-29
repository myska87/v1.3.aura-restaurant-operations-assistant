import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, Info, Clock, MapPin, Eye, Check, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ManagerAlertsWidget() {
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [managerNotes, setManagerNotes] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: alerts = [] } = useQuery({
    queryKey: ['managerAlerts'],
    queryFn: () => base44.entities.ManagerAlert.list('-created_date', 100),
    enabled: isManager,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: ({ id, notes, status }) => base44.entities.ManagerAlert.update(id, {
      status: status,
      acknowledged_by: user?.email,
      acknowledged_at: new Date().toISOString(),
      manager_notes: notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerAlerts'] });
      setSelectedAlert(null);
      setManagerNotes("");
    },
  });

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity === "all") return true;
    return alert.severity === filterSeverity;
  });

  const unreadCount = alerts.filter(a => a.status === 'unread').length;
  const urgentCount = alerts.filter(a => a.severity === 'urgent' && a.status === 'unread').length;

  if (!isManager) return null;

  return (
    <>
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Attendance Alerts
            </CardTitle>
            <div className="flex gap-2">
              {urgentCount > 0 && (
                <Badge className="bg-red-600 text-white animate-pulse">
                  {urgentCount} Urgent
                </Badge>
              )}
              {unreadCount > 0 && (
                <Badge className="bg-yellow-600 text-white">
                  {unreadCount} Unread
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={filterSeverity === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSeverity("all")}
            >
              All ({alerts.length})
            </Button>
            <Button
              variant={filterSeverity === "urgent" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSeverity("urgent")}
              className={filterSeverity === "urgent" ? "bg-red-600" : ""}
            >
              Urgent
            </Button>
            <Button
              variant={filterSeverity === "warning" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSeverity("warning")}
              className={filterSeverity === "warning" ? "bg-yellow-600" : ""}
            >
              Warning
            </Button>
            <Button
              variant={filterSeverity === "info" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSeverity("info")}
            >
              Info
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>No alerts at this time</p>
                  <p className="text-sm">All staff clocked in on time!</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className={`${getSeverityColor(alert.severity)} ${
                      alert.status === 'unread' ? 'border-2 shadow-md' : 'opacity-75'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getSeverityIcon(alert.severity)}
                            <span className="font-bold text-gray-900">
                              {alert.staff_name}
                            </span>
                            {alert.status === 'unread' && (
                              <Badge className="bg-white text-gray-900">NEW</Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-800 mb-2">
                            {alert.message}
                          </p>

                          <div className="flex flex-wrap gap-3 text-xs text-gray-700">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(parseISO(alert.actual_time), 'h:mm a')}
                            </span>
                            <span>
                              Expected: {alert.scheduled_time}
                            </span>
                            <span className="font-semibold">
                              {alert.minutes_difference > 0 ? '+' : ''}{alert.minutes_difference} min
                            </span>
                            {alert.location?.name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {alert.location.name}
                              </span>
                            )}
                          </div>

                          {alert.auto_notified && (
                            <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Email notification sent
                            </p>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alert Details</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${getSeverityColor(selectedAlert.severity)}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getSeverityIcon(selectedAlert.severity)}
                  <h3 className="font-bold text-lg">{selectedAlert.staff_name}</h3>
                </div>
                <p className="text-sm">{selectedAlert.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Date</Label>
                  <p className="font-medium">{format(parseISO(selectedAlert.shift_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Alert Type</Label>
                  <p className="font-medium capitalize">{selectedAlert.alert_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Scheduled Time</Label>
                  <p className="font-medium">{selectedAlert.scheduled_time}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Actual Time</Label>
                  <p className="font-medium">{format(parseISO(selectedAlert.actual_time), 'h:mm a')}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Difference</Label>
                  <p className="font-medium text-red-600">
                    {selectedAlert.minutes_difference > 0 ? '+' : ''}{selectedAlert.minutes_difference} minutes
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Location</Label>
                  <p className="font-medium">{selectedAlert.location?.name || 'Unknown'}</p>
                </div>
              </div>

              {selectedAlert.status !== 'acknowledged' && selectedAlert.status !== 'resolved' && (
                <div>
                  <Label htmlFor="notes">Manager Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    placeholder="Add notes about this incident..."
                    className="mt-2"
                  />
                </div>
              )}

              {selectedAlert.manager_notes && (
                <div className="p-4 bg-gray-50 rounded">
                  <Label className="text-xs text-gray-500">Manager Notes</Label>
                  <p className="text-sm mt-1">{selectedAlert.manager_notes}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    By {selectedAlert.acknowledged_by} on {format(parseISO(selectedAlert.acknowledged_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {selectedAlert.status === 'unread' && (
                  <>
                    <Button
                      onClick={() => acknowledgeAlertMutation.mutate({
                        id: selectedAlert.id,
                        notes: managerNotes,
                        status: 'acknowledged'
                      })}
                      disabled={acknowledgeAlertMutation.isPending}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Acknowledge
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => acknowledgeAlertMutation.mutate({
                        id: selectedAlert.id,
                        notes: managerNotes,
                        status: 'resolved'
                      })}
                      disabled={acknowledgeAlertMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Resolve
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedAlert(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}