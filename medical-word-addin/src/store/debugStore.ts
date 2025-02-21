import create from 'zustand';

interface DebugStore {
  showDebug: boolean;
  toggleDebug: () => void;
}

export const useDebugStore = create<DebugStore>((set) => ({
  showDebug: false,
  toggleDebug: () => set(state => ({ showDebug: !state.showDebug }))
})); 