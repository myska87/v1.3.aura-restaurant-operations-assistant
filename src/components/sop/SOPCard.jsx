import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, Users, Eye, Edit, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SOPCard({ sop, onEdit, showActions = true }) {
  const getCategoryColor = (category) => {
    const colors = {
      kitchen: 'bg-orange-100 text-orange-800',
      service: 'bg-blue-100 text-blue-800',
      cleaning: 'bg-green-100 text-green-800',
      admin: 'bg-purple-100 text-purple-800',
      hygiene: 'bg-red-100 text-red-800',
      maintenance: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">{sop.title}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {sop.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className={getCategoryColor(sop.category)}>
                  {sop.category}
                </Badge>
                <Badge variant="outline">
                  v{sop.version}
                </Badge>
                {sop.is_mandatory && (
                  <Badge className="bg-red-100 text-red-800">
                    Mandatory
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {showActions && (
            <div className="flex gap-2">
              <Link to={createPageUrl(`SOPViewer?id=${sop.id}`)}>
                <Button variant="ghost" size="icon">
                  <Eye className="w-4 h-4" />
                </Button>
              </Link>
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(sop)}>
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {sop.total_time_minutes && (
            <div>
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Clock className="w-4 h-4" />
                <span>Duration</span>
              </div>
              <p className="font-semibold">{sop.total_time_minutes} min</p>
            </div>
          )}

          {sop.signature_count !== undefined && (
            <div>
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span>Signatures</span>
              </div>
              <p className="font-semibold">{sop.signature_count}</p>
            </div>
          )}

          {sop.view_count !== undefined && (
            <div>
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Eye className="w-4 h-4" />
                <span>Views</span>
              </div>
              <p className="font-semibold">{sop.view_count}</p>
            </div>
          )}

          {sop.role_assigned && sop.role_assigned.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Users className="w-4 h-4" />
                <span>For</span>
              </div>
              <p className="font-semibold">{sop.role_assigned.length} roles</p>
            </div>
          )}
        </div>

        {sop.last_reviewed_date && (
          <div className="mt-4 pt-4 border-t text-xs text-gray-500">
            Last reviewed: {format(new Date(sop.last_reviewed_date), 'PPP')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}