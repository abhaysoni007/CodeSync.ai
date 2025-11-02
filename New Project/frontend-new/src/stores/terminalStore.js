import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Terminal Store
 * Manages terminal sessions, history, and state
 */
export const useTerminalStore = create(
  persist(
    (set, get) => ({
      // State
      terminals: [],
      activeTerminalId: null,
      
      // Add a new terminal
      addTerminal: (id, shell = 'powershell') => {
        set((state) => ({
          terminals: [
            ...state.terminals,
            {
              id,
              shell,
              output: '',
              history: [],
              historyIndex: -1,
              status: 'idle', // 'idle' | 'running' | 'killed'
              cwd: '',
              createdAt: Date.now(),
            },
          ],
          activeTerminalId: id,
        }));
      },

      // Remove a terminal
      removeTerminal: (id) => {
        set((state) => {
          const filtered = state.terminals.filter((t) => t.id !== id);
          const newActiveId =
            state.activeTerminalId === id && filtered.length > 0
              ? filtered[filtered.length - 1].id
              : state.activeTerminalId;

          return {
            terminals: filtered,
            activeTerminalId: filtered.length > 0 ? newActiveId : null,
          };
        });
      },

      // Set active terminal
      setActiveTerminal: (id) => {
        set({ activeTerminalId: id });
      },

      // Update terminal output
      updateTerminalOutput: (id, output) => {
        set((state) => ({
          terminals: state.terminals.map((t) =>
            t.id === id ? { ...t, output: t.output + output } : t
          ),
        }));
      },

      // Clear terminal output
      clearTerminalOutput: (id) => {
        set((state) => ({
          terminals: state.terminals.map((t) =>
            t.id === id ? { ...t, output: '' } : t
          ),
        }));
      },

      // Set terminal status
      setTerminalStatus: (id, status) => {
        set((state) => ({
          terminals: state.terminals.map((t) =>
            t.id === id ? { ...t, status } : t
          ),
        }));
      },

      // Add command to history
      addToHistory: (id, command) => {
        set((state) => ({
          terminals: state.terminals.map((t) =>
            t.id === id
              ? {
                  ...t,
                  history: [...t.history, command],
                  historyIndex: -1,
                }
              : t
          ),
        }));
      },

      // Navigate history (up/down arrows)
      navigateHistory: (id, direction) => {
        const terminal = get().terminals.find((t) => t.id === id);
        if (!terminal || terminal.history.length === 0) return null;

        let newIndex = terminal.historyIndex;

        if (direction === 'up') {
          newIndex =
            terminal.historyIndex === -1
              ? terminal.history.length - 1
              : Math.max(0, terminal.historyIndex - 1);
        } else if (direction === 'down') {
          newIndex =
            terminal.historyIndex === -1
              ? -1
              : Math.min(terminal.history.length - 1, terminal.historyIndex + 1);
        }

        set((state) => ({
          terminals: state.terminals.map((t) =>
            t.id === id ? { ...t, historyIndex: newIndex } : t
          ),
        }));

        return newIndex === -1 ? '' : terminal.history[newIndex];
      },

      // Set terminal working directory
      setTerminalCwd: (id, cwd) => {
        set((state) => ({
          terminals: state.terminals.map((t) =>
            t.id === id ? { ...t, cwd } : t
          ),
        }));
      },

      // Get terminal by ID
      getTerminal: (id) => {
        return get().terminals.find((t) => t.id === id);
      },

      // Clear all terminals
      clearAllTerminals: () => {
        set({ terminals: [], activeTerminalId: null });
      },

      // Get active terminal
      getActiveTerminal: () => {
        const { terminals, activeTerminalId } = get();
        return terminals.find((t) => t.id === activeTerminalId);
      },
    }),
    {
      name: 'terminal-storage',
      partialize: (state) => ({
        // Only persist terminal history, not full state
        terminals: state.terminals.map((t) => ({
          id: t.id,
          shell: t.shell,
          history: t.history.slice(-50), // Keep last 50 commands
        })),
      }),
    }
  )
);
