import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Delta Sync Store - Zustand state management for delta snapshots
 */
const useDeltaStore = create(
  persist(
    (set, get) => ({
      // State
      snapshots: {},
      currentVersions: {},
      syncStatus: {},
      pendingDeltas: {},
      isLoading: false,
      error: null,

      // Actions
      setSnapshots: (fileId, snapshots) =>
        set((state) => ({
          snapshots: {
            ...state.snapshots,
            [fileId]: snapshots
          }
        })),

      addSnapshot: (fileId, snapshot) =>
        set((state) => ({
          snapshots: {
            ...state.snapshots,
            [fileId]: [snapshot, ...(state.snapshots[fileId] || [])]
          },
          currentVersions: {
            ...state.currentVersions,
            [fileId]: snapshot.versionNumber
          }
        })),

      setCurrentVersion: (fileId, version) =>
        set((state) => ({
          currentVersions: {
            ...state.currentVersions,
            [fileId]: version
          }
        })),

      setSyncStatus: (fileId, status) =>
        set((state) => ({
          syncStatus: {
            ...state.syncStatus,
            [fileId]: {
              ...state.syncStatus[fileId],
              ...status,
              timestamp: Date.now()
            }
          }
        })),

      addPendingDelta: (fileId, delta) =>
        set((state) => ({
          pendingDeltas: {
            ...state.pendingDeltas,
            [fileId]: [...(state.pendingDeltas[fileId] || []), delta]
          }
        })),

      clearPendingDeltas: (fileId) =>
        set((state) => ({
          pendingDeltas: {
            ...state.pendingDeltas,
            [fileId]: []
          }
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Get snapshot by ID
      getSnapshotById: (fileId, snapshotId) => {
        const snapshots = get().snapshots[fileId] || [];
        return snapshots.find(s => s.snapshotId === snapshotId);
      },

      // Get latest snapshot
      getLatestSnapshot: (fileId) => {
        const snapshots = get().snapshots[fileId] || [];
        return snapshots[0];
      },

      // Check if file is synced
      isSynced: (fileId) => {
        const status = get().syncStatus[fileId];
        return status?.synced || false;
      },

      // Reset state for file
      resetFile: (fileId) =>
        set((state) => {
          const newSnapshots = { ...state.snapshots };
          const newVersions = { ...state.currentVersions };
          const newStatus = { ...state.syncStatus };
          const newPending = { ...state.pendingDeltas };

          delete newSnapshots[fileId];
          delete newVersions[fileId];
          delete newStatus[fileId];
          delete newPending[fileId];

          return {
            snapshots: newSnapshots,
            currentVersions: newVersions,
            syncStatus: newStatus,
            pendingDeltas: newPending
          };
        }),

      // Clear all state
      reset: () =>
        set({
          snapshots: {},
          currentVersions: {},
          syncStatus: {},
          pendingDeltas: {},
          isLoading: false,
          error: null
        })
    }),
    {
      name: 'delta-sync-storage',
      partialize: (state) => ({
        // Only persist these fields
        currentVersions: state.currentVersions
      })
    }
  )
);

export default useDeltaStore;
