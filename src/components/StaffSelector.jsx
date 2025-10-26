import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnifiedStaff } from "./UnifiedStaffData";
import { Badge } from "@/components/ui/badge";

/**
 * Reusable Staff Selector Component
 * Uses unified staff data from User + TeamMember
 */
export default function StaffSelector({ 
  value, 
  onValueChange, 
  placeholder = "Select staff member",
  filterByDepartment = null,
  filterByPosition = null,
  showDepartmentBadge = true,
  showPositionBadge = true,
  allowEmpty = true,
  className = ""
}) {
  const { staff, isLoading } = useUnifiedStaff();

  // Apply filters
  let filteredStaff = staff;
  
  if (filterByDepartment) {
    filteredStaff = filteredStaff.filter(s => s.department === filterByDepartment);
  }
  
  if (filterByPosition) {
    filteredStaff = filteredStaff.filter(s => s.position === filterByPosition);
  }

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading staff..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (filteredStaff.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="No staff members found" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {allowEmpty && (
          <SelectItem value={null}>
            <span className="text-gray-500">-- No Selection --</span>
          </SelectItem>
        )}
        
        {filteredStaff.map((staffMember) => (
          <SelectItem key={staffMember.email} value={staffMember.email}>
            <div className="flex items-center gap-2 py-1">
              {/* Photo */}
              {staffMember.photo_url ? (
                <img 
                  src={staffMember.photo_url} 
                  alt={staffMember.full_name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {staffMember.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {staffMember.full_name}
                </p>
                
                <div className="flex items-center gap-1.5 mt-0.5">
                  {showPositionBadge && staffMember.position && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {staffMember.position.replace('_', ' ')}
                    </Badge>
                  )}
                  
                  {showDepartmentBadge && staffMember.department && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {staffMember.department.replace('_', ' ')}
                    </Badge>
                  )}
                  
                  {staffMember.needs_user_account && (
                    <Badge className="text-[10px] px-1 py-0 bg-yellow-100 text-yellow-800">
                      Pending User
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}