import React, { createContext, useContext, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Settings,
  X,
} from 'lucide-react';

const SafeModeContext = createContext({
  safeMode: false,
  setSafeMode: () => {},
  disabledServices: [],
});

export const useSafeMode = () => useContext(SafeModeContext);

/**
 * 🛡️ Safe Mode Provider
 * Allows disabling AI agents and background services for testing
 */
export function SafeModeProvider({ children }) {
  const [safeMode, setSafeMode] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('aura_safe_mode');
    return saved === 'true';
  });

  const [showPanel, setShowPanel] = useState(false);

  // Services that can be disabled in safe mode
  const disabledServices = safeMode ? [
    'PredictiveInsightsEngine',
    'AIInsightsEngine',
    'AIComplianceSummary',
    'AISummaryEngine',
    'AutoActionEngine',
    'EventProcessor',
    'EventRouter',
    'DataAggregator',
  ] : [];

  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem('aura_safe_mode', safeMode.toString());
    
    // Log mode changes
    console.log(`[SafeMode] ${safeMode ? '🛡️ ENABLED' : '⚡ DISABLED'}`);
    if (safeMode) {
      console.log('[SafeMode] Disabled services:', disabledServices);
    }
  }, [safeMode]);

  // Keyboard shortcut: Ctrl+Shift+S to toggle panel
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setShowPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <SafeModeContext.Provider value={{ safeMode, setSafeMode, disabledServices }}>
      {children}

      {/* Safe Mode Control Panel */}
      {showPanel && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full shadow-2xl border-2 border-amber-400">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    safeMode ? 'bg-amber-100' : 'bg-green-100'
                  }`}>
                    {safeMode ? (
                      <Shield className="w-6 h-6 text-amber-600" />
                    ) : (
                      <Zap className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Safe Mode Control</h2>
                    <p className="text-sm text-gray-600">Disable AI agents for testing</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPanel(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Status */}
              <div className={`p-4 rounded-lg mb-6 ${
                safeMode ? 'bg-amber-50 border-2 border-amber-200' : 'bg-green-50 border-2 border-green-200'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {safeMode ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span className="font-bold text-amber-900">SAFE MODE ACTIVE</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-900">FULL SYSTEM ACTIVE</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-700">
                  {safeMode 
                    ? '🛡️ AI services disabled. Background automation paused. Testing mode active.'
                    : '⚡ All AI agents, automation, and background services running normally.'
                  }
                </p>
              </div>

              {/* Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
                <div>
                  <Label htmlFor="safe-mode-toggle" className="text-base font-semibold cursor-pointer">
                    Enable Safe Mode
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Disable AI and automation for debugging
                  </p>
                </div>
                <Switch
                  id="safe-mode-toggle"
                  checked={safeMode}
                  onCheckedChange={setSafeMode}
                />
              </div>

              {/* Disabled Services List */}
              {safeMode && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Disabled Services ({disabledServices.length})
                  </h3>
                  <div className="grid md:grid-cols-2 gap-2 mb-4">
                    {disabledServices.map(service => (
                      <Badge key={service} variant="outline" className="justify-center py-2">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
                <p className="font-semibold mb-1">💡 Quick Access</p>
                <p>Press <kbd className="px-2 py-1 bg-white border rounded">Ctrl+Shift+S</kbd> to toggle this panel</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowPanel(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setSafeMode(!safeMode);
                    setShowPanel(false);
                  }}
                  className={safeMode ? 'flex-1 bg-green-600 hover:bg-green-700' : 'flex-1 bg-amber-600 hover:bg-amber-700'}
                >
                  {safeMode ? 'Enable Full System' : 'Enable Safe Mode'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Safe Mode Indicator (Bottom Right) */}
      {safeMode && (
        <button
          onClick={() => setShowPanel(true)}
          className="fixed bottom-6 right-6 z-50 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105"
        >
          <Shield className="w-4 h-4" />
          <span className="font-semibold">SAFE MODE</span>
        </button>
      )}

      {/* Settings Icon (Always visible) */}
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-6 left-6 z-50 bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 lg:left-[280px]"
        title="Safe Mode Settings (Ctrl+Shift+S)"
      >
        <Settings className="w-5 h-5" />
      </button>
    </SafeModeContext.Provider>
  );
}

/**
 * HOC to disable component in Safe Mode
 */
export function withSafeMode(Component, serviceName) {
  return function SafeModeWrapper(props) {
    const { safeMode, disabledServices } = useSafeMode();
    
    if (safeMode && disabledServices.includes(serviceName)) {
      console.log(`[SafeMode] ${serviceName} disabled`);
      return null;
    }
    
    return <Component {...props} />;
  };
}