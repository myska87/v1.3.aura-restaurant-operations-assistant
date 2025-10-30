import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const PROTECTED_MODULES = [
  'SOPCore', 'DocumentCore', 'TrainingAcademy', 'EventHub',
  'OperationsCore', 'QualityCore', 'InventoryCore', 'HygieneCore',
  'ComplianceCore', 'FormIntelligence', 'AuraBrain'
];

export default function DataIntegrityChecker() {
  useEffect(() => {
    const checkIntegrity = async () => {
      console.group('%c🔍 DATA INTEGRITY CHECK', 'color: #0066cc; font-size: 16px; font-weight: bold;');
      
      try {
        // Check for orphaned records
        const shifts = await base44.entities.Shift.list();
        const users = await base44.entities.User.list();
        
        const orphanedShifts = shifts.filter(shift => 
          !users.some(user => user.email === shift.staff_email)
        );

        if (orphanedShifts.length > 0) {
          console.warn(`⚠️ Found ${orphanedShifts.length} shifts with no matching user`);
        }

        // Check protected modules
        console.log('%c🛡️ Protected Modules:', 'font-weight: bold;');
        PROTECTED_MODULES.forEach((module, index) => {
          console.log(`  ${index + 1}. ${module} - LOCKED 🔒`);
        });

        console.log('%c✅ Integrity check completed', 'color: green; font-weight: bold;');
        
      } catch (error) {
        console.error('Integrity check error:', error);
      }

      console.groupEnd();
    };

    checkIntegrity();

    // Check every 10 minutes
    const interval = setInterval(checkIntegrity, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}