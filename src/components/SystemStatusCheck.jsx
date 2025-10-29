import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

/**
 * System Status Check Component
 * Verifies all critical systems are operational
 * Runs silently in background
 */
export default function SystemStatusCheck() {
  const [status, setStatus] = useState({
    menu: 'checking',
    ingredients: 'checking',
    scheduler: 'checking',
    staff: 'checking',
  });

  const { data: menuCategories } = useQuery({
    queryKey: ['menuCategoriesStatus'],
    queryFn: () => base44.entities.MenuCategory.list(),
    staleTime: 60000,
  });

  const { data: menuItems } = useQuery({
    queryKey: ['menuItemsStatus'],
    queryFn: () => base44.entities.MenuItem.list(),
    staleTime: 60000,
  });

  const { data: ingredients } = useQuery({
    queryKey: ['ingredientsStatus'],
    queryFn: () => base44.entities.Ingredient.list(),
    staleTime: 60000,
  });

  const { data: shifts } = useQuery({
    queryKey: ['shiftsStatus'],
    queryFn: () => base44.entities.Shift.list(),
    staleTime: 60000,
  });

  const { data: staff } = useQuery({
    queryKey: ['staffStatus'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60000,
  });

  useEffect(() => {
    const newStatus = {
      menu: menuCategories?.length >= 7 && menuItems?.length >= 30 ? 'ready' : 'incomplete',
      ingredients: ingredients?.length >= 30 ? 'ready' : 'incomplete',
      scheduler: shifts !== undefined ? 'ready' : 'incomplete',
      staff: staff?.length > 0 ? 'ready' : 'incomplete',
    };
    setStatus(newStatus);

    // Log status for debugging
    console.log('📊 System Status:', {
      '🍽️ Menu Categories': menuCategories?.length || 0,
      '📋 Menu Items': menuItems?.length || 0,
      '🥕 Ingredients': ingredients?.length || 0,
      '📅 Shifts': shifts?.length || 0,
      '👥 Staff': staff?.length || 0,
    });
  }, [menuCategories, menuItems, ingredients, shifts, staff]);

  // Only show if there are issues (silent success)
  const hasIssues = Object.values(status).some(s => s === 'incomplete' || s === 'checking');

  if (!hasIssues) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <Card className="bg-white border-blue-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="font-semibold text-gray-900">System Initialization</p>
          </div>
          
          <div className="space-y-2 text-sm">
            <StatusItem 
              label="Menu System" 
              status={status.menu}
              count={`${menuItems?.length || 0} items`}
            />
            <StatusItem 
              label="Ingredients" 
              status={status.ingredients}
              count={`${ingredients?.length || 0} items`}
            />
            <StatusItem 
              label="Scheduler" 
              status={status.scheduler}
              count={`${shifts?.length || 0} shifts`}
            />
            <StatusItem 
              label="Staff Database" 
              status={status.staff}
              count={`${staff?.length || 0} members`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusItem({ label, status, count }) {
  const icons = {
    ready: <CheckCircle className="w-4 h-4 text-green-600" />,
    incomplete: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
    checking: <Clock className="w-4 h-4 text-blue-600 animate-spin" />,
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icons[status]}
        <span className="text-gray-700">{label}</span>
      </div>
      <span className="text-xs text-gray-500">{count}</span>
    </div>
  );
}