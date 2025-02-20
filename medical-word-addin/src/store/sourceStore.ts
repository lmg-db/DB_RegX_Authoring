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
  isTemplate?: boolean;
}

interface Template {
  id: string;
  name: string;
  category: 'clinical' | 'regulatory' | 'csr';
}

interface SourceState {
  selectedSources: string[];
  selectedTemplates: Template[];
  availableSources: Source[];
  availableTemplates: Template[];
  addSource: (source: Source) => void;
  removeSource: (id: string) => void;
  toggleSource: (id: string) => void;
  selectTemplate: (template: Template) => void;
  loadSources: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  vectorizeSource: (id: string) => Promise<void>;
}

export const useSourceStore = create(
  persist<SourceState>(
    (set) => ({
      selectedSources: [],
      selectedTemplates: [],
      availableSources: [],
      availableTemplates: [],
      addSource: (source) => set((state) => ({
        availableSources: [...state.availableSources, source]
      })),
      removeSource: (id) => set((state) => {
        const source = state.availableSources.find(s => s.id === id);
        if (source?.isTemplate) {
          return state;
        }
        return {
          availableSources: state.availableSources.filter(s => s.id !== id),
          selectedSources: state.selectedSources.filter(s => s !== id)
        };
      }),
      toggleSource: (id) => set((state) => ({
        selectedSources: state.selectedSources.includes(id)
          ? state.selectedSources.filter(s => s !== id)
          : [...state.selectedSources, id]
      })),
      selectTemplate: (template) => set({ selectedTemplates: [template] }),
      loadSources: async () => {
        try {
          const sources = await getSources();
          // 定义模板文档的名称列表
          const templateNames = [
            'Main Protocol',
            'CRO Final Report 2023',
            'Lab Results Q4'
          ];
          const sourcesWithTemplates = sources.map(source => ({
            ...source,
            isTemplate: templateNames.includes(source.name)
          }));
          set({ availableSources: sourcesWithTemplates });
        } catch (error) {
          console.error('Failed to load sources:', error);
        }
      },
      loadTemplates: async () => {
        const templates = await getTemplates();
        set({ availableTemplates: templates });
      },
      vectorizeSource: async (id) => {
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
      getStorage: () => localStorage
    }
  )
); 