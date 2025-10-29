import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

/**
 * 👥 Staff Selector Component
 * Unified staff selection using User entity only
 */
export default function StaffSelector({ 
  value, 
  onValueChange, 
  placeholder = "Select staff member",
  filterByDepartment = null,
  filterByPosition = null,
  showAvatar = true,
  className = ""
}) {
  // SIMPLIFIED: Query User entity only
  const { data: allStaff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.User.list(),
  });

  // Apply filters
  const filteredStaff = allStaff.filter(staff => {
    if (!staff) return false;
    if (staff.status !== 'active') return false;
    
    if (filterByDepartment && staff.department !== filterByDepartment) {
      return false;
    }
    
    if (filterByPosition && staff.position !== filterByPosition) {
      return false;
    }
    
    return true;
  });

  // Sort by name
  const sortedStaff = filteredStaff.sort((a, b) => 
    (a.full_name || '').localeCompare(b.full_name || '')
  );

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? "Loading staff..." : placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {sortedStaff.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No staff members found
          </div>
        ) : (
          sortedStaff.map((staff) => (
            <SelectItem key={staff.email} value={staff.email}>
              <div className="flex items-center gap-3">
                {showAvatar && (
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={staff.photo_url} alt={staff.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
                      {staff.full_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{staff.full_name}</p>
                  {staff.position && (
                    <p className="text-xs text-gray-500 capitalize">
                      {staff.position.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
                {staff.role === 'admin' && (
                  <Badge className="bg-purple-100 text-purple-800 text-xs">Admin</Badge>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}