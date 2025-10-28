import React, { useEffect } from 'react';

/**
 * DEPRECATED: ChecklistAutomation component
 * Replaced by FormScheduler and FormIntelligenceEngine
 * Kept for backwards compatibility but does nothing
 */
export default function ChecklistAutomation() {
  useEffect(() => {
    console.log('[ChecklistAutomation] DEPRECATED - Use FormScheduler instead');
  }, []);

  return null;
}