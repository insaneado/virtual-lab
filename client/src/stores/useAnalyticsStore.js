import { create } from 'zustand';

const MAX_POINTS = 100;

const useAnalyticsStore = create((set) => ({
  timeseriesData: {},

  pushSample: (bodyId, sample) => set((state) => {
    const current = state.timeseriesData[bodyId] || [];
    return {
      timeseriesData: {
        ...state.timeseriesData,
        [bodyId]: [...current, sample].slice(-MAX_POINTS),
      },
    };
  }),
  prune: (activeBodyIds) => set((state) => {
    const keep = new Set(activeBodyIds);
    return {
      timeseriesData: Object.fromEntries(
        Object.entries(state.timeseriesData).filter(([bodyId]) => keep.has(bodyId))
      ),
    };
  }),
  clear: () => set({ timeseriesData: {} }),
}));

export default useAnalyticsStore;
