
/**
 * 🔍 CHANGE DETECTOR
 * Monitors for unauthorized modifications to protected files
 * Real-time protection during development
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { BuildValidator } from './BuildValidator';

export default function ChangeDetector() {
  const [status, setStatus] = useState('monitoring');
  const [lastCheck, setLastCheck] = useState(null);
  const [violations, setViolations] = useState([]);

  useEffect(() => {
    // Run validation check every 30 seconds
    const interval = setInterval(async () => {
      const report = await BuildValidator.validateBuild();
      
      setLastCheck(new Date());
      
      if (report.status === 'passed') {
        setStatus('safe');
        setViolations([]);
      } else {
        setStatus('violation_detected');
        setViolations(report.modifications_detected || []);
      }
    }, 30000);

    // Initial check
    BuildValidator.validateBuild().then(report => {
      setLastCheck(new Date());
      setStatus(report.status === 'passed' ? 'safe' : 'violation_detected');
    });

    return () => clearInterval(interval);
  }, []);

  // Only show if there's a violation
  if (status !== 'violation_detected') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className="border-2 border-red-500 shadow-2xl bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-2">
                🚨 Protection Violation Detected
              </h3>
              <p className="text-sm text-red-800 mb-3">
                Protected files were modified during build.
              </p>
              
              {violations.length > 0 && (
                <div className="bg-white rounded p-2 mb-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Modified Files:
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {violations.map((file, index) => (
                      <li key={index}>• {file}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => BuildValidator.rollbackToSafe()}
                className="w-full px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                🔄 Rollback to Safe Version
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
