import { create } from 'zustand';

/**
 * Which terminal tabs exist and which one is on screen.
 *
 * Deliberately NOT here: the output text, the command history and the cwd. xterm keeps its own
 * scrollback and the shell owns history/cwd since the PTY rewrite, so mirroring output into React
 * state only bought us a re-render of the whole panel for every byte the shell printed.
 */
export const useTerminalStore = create((set, get) => ({
  terminals: [],
  activeTerminalId: null,

  addTerminal: (id, shell = 'powershell') => {
    set((state) => ({
      terminals: [...state.terminals, { id, shell, status: 'idle', createdAt: Date.now() }],
      activeTerminalId: id,
    }));
  },

  removeTerminal: (id) => {
    set((state) => {
      const remaining = state.terminals.filter((t) => t.id !== id);
      const activeId =
        state.activeTerminalId === id
          ? remaining[remaining.length - 1]?.id ?? null
          : state.activeTerminalId;
      return { terminals: remaining, activeTerminalId: activeId };
    });
  },

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  // 'idle' | 'running'
  setTerminalStatus: (id, status) => {
    set((state) => ({
      terminals: state.terminals.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  },

  getActiveTerminal: () => {
    const { terminals, activeTerminalId } = get();
    return terminals.find((t) => t.id === activeTerminalId);
  },
}));
