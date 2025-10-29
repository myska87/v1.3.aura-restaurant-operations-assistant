// 🔹 SOPCore Module - Central SOP Management System
// Independent module for Standard Operating Procedures
// Uses secure internal APIs - no direct entity modifications

export { default as SOPCoreProvider } from './SOPCoreProvider';
export { default as SOPList } from './SOPList';
export { default as SOPEditor } from './SOPEditor';
export { default as SOPViewer } from './SOPViewer';
export { default as SOPVersionControl } from './SOPVersionControl';
export { default as SOPCertificationTracker } from './SOPCertificationTracker';
export { default as SOPLinkManager } from './SOPLinkManager';
export { default as SOPSearch } from './SOPSearch';
export { default as SOPAnalytics } from './SOPAnalytics';
export { default as SOPComplianceChecker } from './SOPComplianceChecker';

// API Utilities
export * from './api/sopcore-api';
export * from './api/integration-api';

// Hooks
export { useSOPCore } from './hooks/useSOPCore';
export { useSOPIntegration } from './hooks/useSOPIntegration';
export { useSOPCertification } from './hooks/useSOPCertification';