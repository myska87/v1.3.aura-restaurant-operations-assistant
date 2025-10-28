import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Circle, CheckCircle, Clock, PlayCircle, XCircle } from 'lucide-react';

/**
 * Shift Status Badge Component
 * Shows color-coded status for shifts
 * 
 * 🟡 Draft - Not yet published
 * 🟢 Scheduled - Published and confirmed
 * 🔵 In Progress - Staff clocked in
 * ⚪ Completed - Shift finished
 * 🔴 Missed - Staff didn't clock in
 */
export default function ShiftStatusBadge({ status, className = "" }) {
  const statusConfig = {
    draft: {
      label: 'Draft',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: Circle,
    },
    scheduled: {
      label: 'Scheduled',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
    },
    in_progress: {
      label: 'In Progress',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: PlayCircle,
    },
    completed: {
      label: 'Completed',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: CheckCircle,
    },
    missed: {
      label: 'Missed',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircle,
    },
  };

  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border ${className} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}