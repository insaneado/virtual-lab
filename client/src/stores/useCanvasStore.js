import { create } from 'zustand';

const useCanvasStore = create((set) => ({
  selectedTool: 'select',
  selectedBodyIds: [],
  watchedBodyIds: [],
  wallsEnabled: true,

  setSelectedTool: (selectedTool) => set({ selectedTool }),
  setSelectedBodyIds: (selectedBodyIds) => set({ selectedBodyIds }),
  clearSelection: () => set({ selectedBodyIds: [] }),
  toggleWatchedBody: (bodyId) => set((state) => {
    const exists = state.watchedBodyIds.includes(bodyId);
    const watchedBodyIds = exists
      ? state.watchedBodyIds.filter((id) => id !== bodyId)
      : [...state.watchedBodyIds, bodyId].slice(-5);
    return { watchedBodyIds };
  }),
  setWallsEnabled: (wallsEnabled) => set({ wallsEnabled }),
}));

export default useCanvasStore;
