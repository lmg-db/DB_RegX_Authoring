import create from 'zustand';
import { getSources, getTemplates } from '../services/api';
import { persist } from 'zustand/middleware';

interface Source {
  id: string;
  name: string;
  type: 'document' | 'report' | 'lab';
  origin: string;
  summary?: string;
  uploadDate: string;
  size: string;
  vectorized: boolean;
  analyzed: boolean;
  isTemplate?: boolean;
}

interface Template {
  id: string;
  name: string;
  category: 'clinical' | 'regulatory' | 'csr';
}

interface SourceState {
  availableSources: Source[];
  availableTemplates: Source[];
  selectedSources: string[];
  selectedTemplates: string[];
  addSource: (source: Source) => void;
  removeSource: (id: string) => void;
  toggleSource: (id: string) => void;
  selectTemplate: (template: Template) => void;
  loadSources: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  vectorizeSource: (id: string) => Promise<void>;
  setAvailableSources: (sources: Source[]) => void;
}

const useSourceStore = create<SourceState>()(
  persist(
    (set) => ({
      availableSources: [],
      availableTemplates: [],
      selectedSources: [],
      selectedTemplates: [],
      
      addSource: (source: Source) => {
        set(state => {
          const existingIndex = state.availableSources.findIndex(s => s.id === source.id);
          const newSources = existingIndex >= 0 
            ? state.availableSources.map((s, i) => i === existingIndex ? { ...s, ...source } : s)
            : [...state.availableSources, source];
          return { availableSources: newSources };
        });
      },
      
      removeSource: (id: string) => {
        set(state => ({
          availableSources: state.availableSources.filter(s => s.id !== id),
          selectedSources: state.selectedSources.filter(s => s !== id)
        }));
      },
      
      loadSources: async () => {
        try {
          // 强制从后端获取最新文档列表
          const serverSources = await getSources();
          
          set(state => ({
            // 完全使用服务器数据，覆盖本地缓存
            availableSources: serverSources.map(serverDoc => ({
              ...serverDoc,
              // 仅保留服务器没有的本地状态
              analyzed: state.availableSources.find(local => local.id === serverDoc.id)?.analyzed || false
            }))
          }));
        } catch (error) {
          console.error('Failed to load sources:', error);
        }
      },
      
      toggleSource: (id: string) => set((state) => ({
        selectedSources: state.selectedSources.includes(id)
          ? state.selectedSources.filter(s => s !== id)
          : [...state.selectedSources, id]
      })),
      
      selectTemplate: (template: Template) => set({ selectedTemplates: [template] }),
      
      setAvailableSources: (sources: Source[]) => set({ 
        availableSources: sources,
        // 清理选中状态
        selectedSources: []  // 重置选中状态
      }),
      
      loadTemplates: async () => {
        const templates = await getTemplates();
        set({ availableTemplates: templates });
      },
      
      vectorizeSource: async (id: string) => {
        try {
          await getSources();
          set((state) => ({
            availableSources: state.availableSources.map(s =>
              s.id === id ? { ...s, vectorized: true } : s
            )
          }));
        } catch (error) {
          console.error('Failed to vectorize source:', error);
        }
      }
    }),
    {
      name: 'source-storage',
      getStorage: () => localStorage,
      // 添加迁移策略清除旧数据
      migrate: (persistedState) => {
        return { ...persistedState, availableSources: [] }
      }
    }
  )
);

export { useSourceStore }; 