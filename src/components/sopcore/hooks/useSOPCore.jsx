import { useSOPCoreContext } from '../SOPCoreProvider';

export function useSOPCore() {
  const context = useSOPCoreContext();

  return {
    // Data
    sops: context.sops,
    certifications: context.certifications,
    signatures: context.signatures,
    loading: context.loadingSOPs,

    // Filters
    filters: context.activeFilters,
    setFilters: context.setActiveFilters,

    // Methods
    createSOP: context.api.createSOP,
    updateSOP: context.api.updateSOP,
    searchSOPs: context.api.searchSOPs,
    getAnalytics: context.api.getAnalytics,

    // Refresh
    refresh: context.refetchAll,
  };
}