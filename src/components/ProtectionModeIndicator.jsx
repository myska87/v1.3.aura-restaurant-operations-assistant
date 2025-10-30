import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PROTECTED_MODULES = [
  'SOPCore', 'DocumentCore', 'TrainingAcademy', 'EventHub',
  'OperationsCore', 'QualityCore', 'InventoryCore'
];

export default function ProtectionModeIndicator() {
  const [showIndicator, setShowIndicator] = useState(true);

  useEffect(() => {
    // Show protection indicator on load
    console.log('%c🛡️ PROTECTION MODE ACTIVE', 'color: #0066cc; font-size: 20px; font-weight: bold; background: #fff3cd; padding: 10px;');
    console.log('%cLocked Modules:', 'font-weight: bold; font-size: 14px;');
    PROTECTED_MODULES.forEach(module => {
      console.log(`  🔒 ${module}`);
    });
    console.log('%cℹ️ Editing protected modules requires Feature Ticket approval', 'color: #856404; font-style: italic;');

    // Auto-hide after 10 seconds
    const timer = setTimeout(() => setShowIndicator(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (!showIndicator) return null;

  return (
    <div className="fixed top-20 right-4 z-40 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg shadow-2xl border-2 border-blue-800 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-blue-200" />
          <span className="font-bold text-sm">Protection Active</span>
        </div>
        <p className="text-xs text-blue-100">
          {PROTECTED_MODULES.length} critical modules locked. Check console for details.
        </p>
        <button
          onClick={() => setShowIndicator(false)}
          className="mt-2 text-xs text-blue-200 hover:text-white underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}