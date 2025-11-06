import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle } from 'lucide-react';

const CRITICAL_MODULES = [
  'SOPCore', 'DocumentCore', 'TrainingAcademy', 'EventHub',
  'OperationsCore', 'QualityCore', 'InventoryCore', 'HygieneCore',
  'ComplianceCore', 'StaffCore', 'AnalyticsCore', 'AuraBrain', 'FormIntelligence'
];

const CRITICAL_ENTITIES = [
  'SOPDocument', 'FormTemplate', 'TrainingModule', 'Event', 
  'OperationTask', 'QualityRecord', 'Ingredient', 'HygieneRecord'
];

export default function SystemHealthCheck() {
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', issues: [] });

  useEffect(() => {
    const runHealthCheck = async () => {
      const issues = [];
      const startTime = Date.now();

      try {
        // Check if critical entities are accessible
        for (const entityName of CRITICAL_ENTITIES) {
          try {
            await base44.entities[entityName].list();
          } catch (error) {
            issues.push({
              severity: 'critical',
              module: entityName,
              message: `${entityName} entity not accessible`,
              error: error.message,
            });
            console.error(`❌ HEALTH CHECK FAILED: ${entityName} not accessible`, error);
          }
        }

        // Log health check
        try {
          await base44.entities.ModuleHealthLog.create({
            module_name: 'SystemHealth',
            check_type: 'startup',
            status: issues.length === 0 ? 'passed' : issues.length < 3 ? 'warning' : 'critical',
            checks_performed: CRITICAL_ENTITIES.map(entity => ({
              check_name: `${entity} accessibility`,
              passed: !issues.some(i => i.module === entity),
              message: issues.find(i => i.module === entity)?.message || 'OK',
              severity: issues.find(i => i.module === entity) ? 'error' : 'info',
            })),
            errors_found: issues.filter(i => i.severity === 'critical').map(i => i.message),
            warnings_found: issues.filter(i => i.severity === 'warning').map(i => i.message),
            performance_metrics: {
              load_time_ms: Date.now() - startTime,
            },
            checked_by: 'system',
          });
        } catch (error) {
          console.warn('Could not log health check:', error);
        }

        setHealthStatus({
          status: issues.length === 0 ? 'healthy' : issues.length < 3 ? 'warning' : 'critical',
          issues,
        });

        // Console warnings for protected modules
        console.log('%c🛡️ PROTECTED MODULES - DO NOT MODIFY WITHOUT FEATURE TICKET', 'color: #ff6b00; font-size: 16px; font-weight: bold;');
        console.log('%c' + CRITICAL_MODULES.join(', '), 'color: #0066cc; font-size: 12px;');
        
        if (issues.length > 0) {
          console.error('%c⚠️ SYSTEM HEALTH ISSUES DETECTED:', 'color: red; font-size: 14px; font-weight: bold;');
          issues.forEach(issue => {
            console.error(`  - ${issue.module}: ${issue.message}`);
          });
        } else {
          console.log('%c✅ All critical modules healthy', 'color: green; font-size: 14px; font-weight: bold;');
        }

      } catch (error) {
        console.error('Health check error:', error);
        setHealthStatus({ status: 'error', issues: [{ severity: 'critical', message: 'Health check failed' }] });
      }
    };

    runHealthCheck();

    // Run health check every 5 minutes
    const interval = setInterval(runHealthCheck, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Visual indicator (optional - shown in dev tools or as overlay)
  if (healthStatus.status === 'critical' && healthStatus.issues.length > 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-2xl border-2 border-red-800 max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold">System Health Warning</span>
          </div>
          <p className="text-sm">
            {healthStatus.issues.length} critical issue{healthStatus.issues.length > 1 ? 's' : ''} detected.
            Check console for details.
          </p>
        </div>
      </div>
    );
  }

  return null;
}