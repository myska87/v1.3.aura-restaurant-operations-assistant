import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Calendar, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function StaffCard({ staff, onEdit, onDelete, showActions = true }) {
  const getRoleColor = (position) => {
    const colors = {
      owner: 'bg-red-100 text-red-800',
      manager: 'bg-purple-100 text-purple-800',
      chef: 'bg-orange-100 text-orange-800',
      server: 'bg-blue-100 text-blue-800',
      bartender: 'bg-indigo-100 text-indigo-800',
      cleaner: 'bg-green-100 text-green-800',
    };
    return colors[position] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {staff.photo_url ? (
              <img
                src={staff.photo_url}
                alt={staff.full_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                {staff.full_name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {staff.full_name}
              </h3>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className={getRoleColor(staff.position)}>
                  {staff.position}
                </Badge>
                <Badge variant="outline">
                  {staff.department}
                </Badge>
                {staff.status && (
                  <Badge className={staff.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {staff.status}
                  </Badge>
                )}
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                {staff.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{staff.email}</span>
                  </div>
                )}
                {staff.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{staff.phone}</span>
                  </div>
                )}
                {staff.hire_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Hired: {format(new Date(staff.hire_date), 'PPP')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showActions && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(staff)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(staff)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}