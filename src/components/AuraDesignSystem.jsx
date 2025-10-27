/**
 * AURA Design System
 * Universal, accessible, beautiful UI components
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  Sparkles,
  TrendingUp,
  Users,
  Calendar,
  Package,
  Shield
} from 'lucide-react';

/**
 * AURA Color Palette
 */
export const AuraColors = {
  // Primary Brand Colors
  primary: {
    teal: '#014D40',
    emerald: '#10B981',
    gold: '#E0B037',
  },
  
  // Semantic Colors
  success: {
    light: '#D1FAE5',
    DEFAULT: '#10B981',
    dark: '#047857',
  },
  warning: {
    light: '#FEF3C7',
    DEFAULT: '#F59E0B',
    dark: '#D97706',
  },
  error: {
    light: '#FEE2E2',
    DEFAULT: '#EF4444',
    dark: '#DC2626',
  },
  info: {
    light: '#DBEAFE',
    DEFAULT: '#3B82F6',
    dark: '#2563EB',
  },
  
  // Neutrals (Light Mode)
  light: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceHover: '#F1F5F9',
    border: '#E2E8F0',
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      muted: '#94A3B8',
    }
  },
  
  // Neutrals (Dark Mode)
  dark: {
    bg: '#0F172A',
    surface: '#1E293B',
    surfaceHover: '#334155',
    border: '#334155',
    text: {
      primary: '#F1F5F9',
      secondary: '#CBD5E1',
      muted: '#64748B',
    }
  }
};

/**
 * AURA Status Badge
 */
export const AuraStatusBadge = ({ status, size = 'default' }) => {
  const statusConfig = {
    success: {
      label: 'Success',
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    warning: {
      label: 'Warning',
      icon: AlertTriangle,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    error: {
      label: 'Error',
      icon: XCircle,
      className: 'bg-red-100 text-red-800 border-red-300',
    },
    info: {
      label: 'Info',
      icon: Info,
      className: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    active: {
      label: 'Active',
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-gray-100 text-gray-800 border-gray-300',
    },
  };

  const config = statusConfig[status] || statusConfig.info;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge className={`${config.className} ${sizeClasses[size]} border font-medium inline-flex items-center gap-1.5`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

/**
 * AURA Stat Card
 */
export const AuraStatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'teal',
  trend,
  onClick 
}) => {
  const colorClasses = {
    teal: 'from-teal-500 to-emerald-500',
    blue: 'from-blue-500 to-indigo-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-green-500 to-emerald-500',
    orange: 'from-orange-500 to-red-500',
  };

  return (
    <Card 
      className={`bg-white dark:bg-slate-800 border-none shadow-sm hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{value}</h3>
          </div>
          <div className={`p-3 bg-gradient-to-br ${colorClasses[color]} rounded-xl shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        )}
        {trend && (
          <div className={`text-sm font-medium mt-2 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * AURA Action Button
 */
export const AuraActionButton = ({ 
  label, 
  icon: Icon, 
  color = 'primary',
  size = 'default',
  variant = 'solid',
  onClick,
  disabled = false,
  fullWidth = false
}) => {
  const colorClasses = {
    primary: {
      solid: 'bg-gradient-to-r from-[#014D40] to-emerald-600 hover:from-[#013830] hover:to-emerald-700 text-white',
      outline: 'border-2 border-[#014D40] text-[#014D40] hover:bg-[#014D40] hover:text-white',
      ghost: 'text-[#014D40] hover:bg-teal-50',
    },
    success: {
      solid: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white',
      outline: 'border-2 border-green-500 text-green-700 hover:bg-green-500 hover:text-white',
      ghost: 'text-green-700 hover:bg-green-50',
    },
    danger: {
      solid: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white',
      outline: 'border-2 border-red-500 text-red-700 hover:bg-red-500 hover:text-white',
      ghost: 'text-red-700 hover:bg-red-50',
    },
    warning: {
      solid: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white',
      outline: 'border-2 border-yellow-500 text-yellow-700 hover:bg-yellow-500 hover:text-white',
      ghost: 'text-yellow-700 hover:bg-yellow-50',
    },
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${colorClasses[color][variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        rounded-lg font-semibold
        inline-flex items-center justify-center gap-2
        transition-all duration-200
        shadow-sm hover:shadow-md
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#014D40]
        touch-manipulation
      `}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {label}
    </button>
  );
};

/**
 * AURA Alert
 */
export const AuraAlert = ({ type = 'info', title, message, icon: CustomIcon, onClose }) => {
  const alertConfig = {
    success: {
      bgClass: 'bg-green-50 dark:bg-green-900/20',
      borderClass: 'border-green-200 dark:border-green-800',
      iconClass: 'text-green-600 dark:text-green-400',
      titleClass: 'text-green-900 dark:text-green-100',
      textClass: 'text-green-700 dark:text-green-300',
      icon: CheckCircle,
    },
    warning: {
      bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderClass: 'border-yellow-200 dark:border-yellow-800',
      iconClass: 'text-yellow-600 dark:text-yellow-400',
      titleClass: 'text-yellow-900 dark:text-yellow-100',
      textClass: 'text-yellow-700 dark:text-yellow-300',
      icon: AlertTriangle,
    },
    error: {
      bgClass: 'bg-red-50 dark:bg-red-900/20',
      borderClass: 'border-red-200 dark:border-red-800',
      iconClass: 'text-red-600 dark:text-red-400',
      titleClass: 'text-red-900 dark:text-red-100',
      textClass: 'text-red-700 dark:text-red-300',
      icon: XCircle,
    },
    info: {
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
      borderClass: 'border-blue-200 dark:border-blue-800',
      iconClass: 'text-blue-600 dark:text-blue-400',
      titleClass: 'text-blue-900 dark:text-blue-100',
      textClass: 'text-blue-700 dark:text-blue-300',
      icon: Info,
    },
  };

  const config = alertConfig[type];
  const Icon = CustomIcon || config.icon;

  return (
    <div className={`${config.bgClass} ${config.borderClass} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconClass} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && (
            <h4 className={`font-semibold ${config.titleClass} mb-1`}>{title}</h4>
          )}
          <p className={`text-sm ${config.textClass}`}>{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`${config.iconClass} hover:opacity-70 transition-opacity`}
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * AURA Loading Spinner
 */
export const AuraLoader = ({ size = 'default', color = 'primary' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    default: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const colorClasses = {
    primary: 'border-[#014D40] border-t-transparent',
    white: 'border-white border-t-transparent',
    success: 'border-green-500 border-t-transparent',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div 
        className={`
          ${sizeClasses[size]} 
          ${colorClasses[color]}
          rounded-full animate-spin
        `}
      />
    </div>
  );
};

/**
 * AURA Empty State
 */
export const AuraEmptyState = ({ icon: Icon, title, message, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
        <Icon className="w-12 h-12 text-gray-400 dark:text-gray-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {message}
      </p>
      {action && action}
    </div>
  );
};

/**
 * AURA Section Header
 */
export const AuraSectionHeader = ({ icon: Icon, title, subtitle, action }) => {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 bg-gradient-to-br from-[#014D40] to-emerald-600 rounded-xl shadow-lg">
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

/**
 * AURA Touch Target (Mobile-Friendly Button)
 */
export const AuraTouchTarget = ({ children, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`
        min-h-[44px] min-w-[44px] 
        flex items-center justify-center
        touch-manipulation
        active:scale-95 transition-transform
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default {
  AuraColors,
  AuraStatusBadge,
  AuraStatCard,
  AuraActionButton,
  AuraAlert,
  AuraLoader,
  AuraEmptyState,
  AuraSectionHeader,
  AuraTouchTarget,
};