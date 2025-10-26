/**
 * ComplianceCore Design System
 * Consistent AURA branding for compliance modules
 */

export const ComplianceColors = {
  // Primary AURA Colors
  primary: '#014D40',        // Emerald
  accent: '#E0B037',         // Gold
  background: '#FFFFFF',     // White
  
  // Compliance-specific
  complianceBlue: '#3B82F6',    // Info/Data
  compliancePurple: '#9333EA',   // Security
  complianceGreen: '#10B981',    // Success/Approved
  complianceRed: '#EF4444',      // Critical/Denied
  complianceYellow: '#F59E0B',   // Warning/Pending
  complianceGray: '#6B7280',     // Neutral
  
  // Backgrounds
  lightBlue: '#EFF6FF',
  lightPurple: '#F5F3FF',
  lightGreen: '#ECFDF5',
  lightRed: '#FEF2F2',
  lightYellow: '#FFFBEB',
  lightGray: '#F9FAFB',
};

export const ComplianceGradients = {
  header: 'linear-gradient(135deg, #014D40 0%, #10B981 100%)',
  shield: 'linear-gradient(135deg, #3B82F6 0%, #9333EA 100%)',
  warning: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  success: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
  primary: 'linear-gradient(135deg, #014D40 0%, #E0B037 100%)',
};

export const ComplianceIcons = {
  shield: '🛡️',
  lock: '🔒',
  key: '🔑',
  document: '📄',
  email: '📧',
  check: '✅',
  warning: '⚠️',
  alert: '🚨',
  audit: '📊',
  privacy: '🔐',
  data: '💾',
  user: '👤',
};

export const ComplianceFonts = {
  heading: '"Poppins", system-ui, -apple-system, sans-serif',
  body: '"Inter", system-ui, -apple-system, sans-serif',
  mono: '"Fira Code", "Courier New", monospace',
};

export const ComplianceShadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
};

/**
 * Compliance Badge Component
 * Consistent badge styling across compliance modules
 */
export const ComplianceBadge = ({ type, children, className = '' }) => {
  const styles = {
    gdpr: 'bg-purple-100 text-purple-800 border-purple-200',
    secure: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[type] || styles.info} ${className}`}>
      {children}
    </span>
  );
};

/**
 * Compliance Card Component
 * Consistent card styling with soft shadows and borders
 */
export const ComplianceCard = ({ children, gradient = null, className = '' }) => {
  const gradientStyle = gradient ? { background: ComplianceGradients[gradient] } : {};
  
  return (
    <div 
      className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`}
      style={gradientStyle}
    >
      {children}
    </div>
  );
};

/**
 * Compliance Alert Component
 * Consistent alert styling for different severity levels
 */
export const ComplianceAlert = ({ severity = 'info', children }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    critical: 'bg-purple-50 border-purple-200 text-purple-800',
  };

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    critical: '🚨',
  };

  return (
    <div className={`p-4 rounded-lg border ${styles[severity]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{icons[severity]}</span>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
};