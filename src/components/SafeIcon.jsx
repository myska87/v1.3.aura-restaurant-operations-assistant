import React from 'react';

/**
 * SafeIcon Component
 * Prevents crashes from missing icon imports
 * 
 * Usage:
 * <SafeIcon icon={CheckCircle} className="w-5 h-5" />
 */
export default function SafeIcon({ icon: Icon, fallback: Fallback, ...props }) {
  // If icon exists, render it
  if (Icon && typeof Icon === 'function') {
    return <Icon {...props} />;
  }
  
  // If fallback exists, render it
  if (Fallback && typeof Fallback === 'function') {
    return <Fallback {...props} />;
  }
  
  // Return null if no icon available
  return null;
}

/**
 * Usage Example:
 * 
 * import SafeIcon from '@/components/SafeIcon';
 * import { CheckCircle, AlertCircle } from '@/components/icons';
 * 
 * <SafeIcon 
 *   icon={CheckCircle} 
 *   fallback={AlertCircle}
 *   className="w-5 h-5 text-green-500" 
 * />
 */