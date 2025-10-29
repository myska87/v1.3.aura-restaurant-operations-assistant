import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImpersonationBanner({ role, onExit }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-2xl"
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">⚠️ OWNER MODE ACTIVE</p>
              <p className="text-xs text-amber-100">
                Viewing AURA as <span className="font-semibold uppercase">{role}</span> — All actions are being logged
              </p>
            </div>
          </div>
          <Button
            onClick={onExit}
            variant="secondary"
            size="sm"
            className="bg-white text-orange-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4 mr-2" />
            Exit Owner Mode
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}