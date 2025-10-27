import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { 
  Clock, 
  CheckCircle, 
  FileText, 
  Users, 
  TrendingUp,
  RefreshCw,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RecentActivity() {
  // FIXED: Real-time activity fetching from multiple sources
  const { data: clockEvents = [], refetch: refetchClockEvents } = useQuery({
    queryKey: ['recentClockEvents'],
    queryFn: () => base44.entities.ClockEvent.list('-timestamp', 5),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: sopSignatures = [], refetch: refetchSOPs } = useQuery({
    queryKey: ['recentSOPSignatures'],
    queryFn: () => base44.entities.SOPSignatureLog.list('-signed_at', 5),
    refetchInterval: 10000,
  });

  const { data: qualityRecords = [], refetch: refetchQuality } = useQuery({
    queryKey: ['recentQualityRecords'],
    queryFn: () => base44.entities.QualityRecord.list('-created_date', 5),
    refetchInterval: 10000,
  });

  const { data: formResponses = [], refetch: refetchForms } = useQuery({
    queryKey: ['recentFormResponses'],
    queryFn: () => base44.entities.FormResponse.list('-submitted_at', 5),
    refetchInterval: 10000,
  });

  // Combine and sort all activities
  const allActivities = [
    ...clockEvents.map(event => ({
      id: `clock-${event.id}`,
      title: `${event.user_name} ${event.event_type === 'clock_in' ? 'clocked in' : 'clocked out'}`,
      date: event.timestamp,
      type: 'clock',
      icon: Clock,
      color: event.event_type === 'clock_in' ? 'text-green-600' : 'text-orange-600',
    })),
    ...sopSignatures.map(sig => ({
      id: `sop-${sig.id}`,
      title: `${sig.staff_name} signed "${sig.sop_title}"`,
      date: sig.signed_at,
      type: 'sop',
      icon: FileText,
      color: 'text-blue-600',
    })),
    ...qualityRecords.map(record => ({
      id: `quality-${record.id}`,
      title: `${record.checked_by_name} completed quality check (${record.score}⭐)`,
      date: record.created_date,
      type: 'quality',
      icon: CheckCircle,
      color: record.score >= 4 ? 'text-green-600' : 'text-yellow-600',
    })),
    ...formResponses.map(response => ({
      id: `form-${response.id}`,
      title: `${response.staff_name} submitted "${response.form_name}"`,
      date: response.submitted_at,
      type: 'form',
      icon: FileText,
      color: 'text-purple-600',
    })),
  ]
    .filter(activity => activity.date) // Remove activities without dates
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10); // Show top 10 most recent

  const handleRefreshAll = () => {
    refetchClockEvents();
    refetchSOPs();
    refetchQuality();
    refetchForms();
  };

  const isLoading = !clockEvents && !sopSignatures && !qualityRecords && !formResponses;

  return (
    <Card className="bg-white border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Recent Activity
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefreshAll}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : allActivities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No recent activity</p>
            <p className="text-xs text-gray-400 mt-1">Activity will appear here as staff interact with the system</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                  <div className={`p-2 rounded-lg bg-gray-50 ${activity.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium truncate">{activity.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-500">
                        {format(new Date(activity.date), "MMM d, h:mm a")}
                      </p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {activity.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {allActivities.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.location.href = createPageUrl('Reports')}
            >
              <Eye className="w-4 h-4 mr-2" />
              View All Activity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}