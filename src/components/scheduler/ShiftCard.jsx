import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, MapPin, Edit, Trash2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ShiftCard({ shift, onEdit, onDelete, showActions = true }) {
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      missed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getShiftTypeColor = (type) => {
    const colors = {
      opening: 'bg-amber-100 text-amber-800',
      mid_shift: 'bg-blue-100 text-blue-800',
      closing: 'bg-indigo-100 text-indigo-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-3 rounded-lg ${
              shift.status === 'in_progress' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {shift.status === 'completed' ? (
                <CheckCircle className={`w-6 h-6 ${
                  shift.status === 'in_progress' ? 'text-green-600' : 'text-blue-600'
                }`} />
              ) : (
                <Clock className={`w-6 h-6 ${
                  shift.status === 'in_progress' ? 'text-green-600' : 'text-blue-600'
                }`} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-gray-900">{shift.staff_name}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge className={getStatusColor(shift.status)}>
                  {shift.status?.replace('_', ' ')}
                </Badge>
                <Badge className={getShiftTypeColor(shift.shift_type)}>
                  {shift.shift_type?.replace('_', ' ')}
                </Badge>
                <Badge variant="outline">
                  {shift.role}
                </Badge>
              </div>
            </div>
          </div>

          {showActions && (
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(shift)}>
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(shift)}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              {shift.start_time} - {shift.end_time}
            </span>
          </div>
          
          {shift.location && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{shift.location}</span>
            </div>
          )}

          {shift.clock_in_time && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Clocked In</p>
              <p className="font-semibold">
                {format(new Date(shift.clock_in_time), 'h:mm a')}
              </p>
            </div>
          )}

          {shift.clock_out_time && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Clocked Out</p>
              <p className="font-semibold">
                {format(new Date(shift.clock_out_time), 'h:mm a')}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}