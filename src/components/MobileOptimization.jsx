/**
 * AURA Mobile Optimization
 * Touch-friendly, responsive, PWA-ready
 */

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Detect mobile device
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

/**
 * Detect touch device
 */
export const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
};

/**
 * Online/Offline Status
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * Offline Status Banner
 */
export const OfflineStatusBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 text-center">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          You're offline. Changes will sync when connection is restored.
        </span>
      </div>
    </div>
  );
};

/**
 * PWA Install Prompt
 */
export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:w-96 z-50 shadow-xl border-[#014D40]">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gradient-to-br from-[#014D40] to-emerald-600 rounded-lg">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Install AURA App</h3>
            <p className="text-sm text-gray-600 mb-3">
              Add AURA to your home screen for quick access and offline support.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstall} className="bg-[#014D40] hover:bg-[#013830]">
                Install
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowPrompt(false)}>
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Mobile-Friendly Table Wrapper
 */
export const MobileTable = ({ headers, rows, renderRow }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Card-based layout for mobile
    return (
      <div className="space-y-3">
        {rows.map((row, index) => (
          <Card key={index} className="bg-white">
            <CardContent className="p-4">
              {renderRow(row, true)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Table layout for desktop
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {headers.map((header, i) => (
              <th key={i} className="text-left p-3 font-semibold text-gray-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b hover:bg-gray-50">
              {renderRow(row, false)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Touch-friendly Bottom Navigation
 */
export const MobileBottomNav = ({ items, activeItem, onItemClick }) => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-40">
      <div className="flex justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[60px] touch-manipulation transition-colors ${
                isActive
                  ? 'text-[#014D40]'
                  : 'text-gray-600'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default {
  useIsMobile,
  useIsTouchDevice,
  useOnlineStatus,
  OfflineStatusBanner,
  PWAInstallPrompt,
  MobileTable,
  MobileBottomNav,
};