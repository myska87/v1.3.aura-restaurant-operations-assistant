import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, AlertTriangle, CheckCircle, Eye, Camera } from 'lucide-react';
import { format } from 'date-fns';

export default function QualityCheckCard({ check, onView, showActions = true }) {
  const getScoreColor = (score) => {
    if (score >= 4) return 'text-green-600 bg-green-100';
    if (score >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusBadge = (status) => {
    const badges = {
      recorded: { label: 'Recorded', color: 'bg-blue-100 text-blue-800' },
      needs_action: { label: 'Needs Action', color: 'bg-yellow-100 text-yellow-800' },
      action_taken: { label: 'Action Taken', color: 'bg-purple-100 text-purple-800' },
      verified: { label: 'Verified', color: 'bg-green-100 text-green-800' },
      closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
    };
    return badges[status] || badges.recorded;
  };

  const statusInfo = getStatusBadge(check.status);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-3 rounded-lg ${getScoreColor(check.score)}`}>
              {check.score >= 3 ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">{check.check_title}</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
                <Badge variant="outline">
                  {check.category?.replace('_', ' ')}
                </Badge>
                <Badge variant="outline">
                  {check.area}
                </Badge>
              </div>
              {check.comments && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {check.comments}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${getScoreColor(check.score)}`}>
              <Star className="w-4 h-4 fill-current" />
              <span className="font-bold">{check.score}/5</span>
            </div>
            {showActions && onView && (
              <Button variant="ghost" size="icon" onClick={() => onView(check)}>
                <Eye className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <p className="text-gray-500">Checked By</p>
            <p className="font-semibold">{check.checked_by_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Date</p>
            <p className="font-semibold">
              {format(new Date(check.created_date), 'PPp')}
            </p>
          </div>
        </div>

        {check.photo_url && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Camera className="w-4 h-4" />
            <span>Photo evidence attached</span>
          </div>
        )}

        {check.corrective_action_required && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              ⚠️ Corrective action required
            </p>
            {check.corrective_action_taken && (
              <p className="text-xs text-yellow-700 mt-1">
                Action: {check.corrective_action_taken}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}