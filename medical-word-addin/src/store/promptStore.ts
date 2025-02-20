import create from 'zustand';
import { api } from '../services/api';

export interface Prompt {
  id: string;
  title: string;
  content: string;
  model_type: 'generation' | 'compliance';
  task?: string;
  templates?: string[];
  scope: 'user' | 'team';
}

interface PromptStore {
  prompts: Prompt[];
  selectedPrompt: Prompt | null;
  isLoading: boolean;
  error: string | null;
  loadPrompts: () => Promise<void>;
  setSelectedPrompt: (prompt: Prompt | null) => void;
}

export const usePromptStore = create<PromptStore>((set) => ({
  prompts: [],
  selectedPrompt: null,
  isLoading: false,
  error: null,

  loadPrompts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/prompts');
      set({ prompts: response.data });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to load prompts',
        isLoading: false,
        prompts: []
      });
    }
  },

  setSelectedPrompt: (prompt) => set({ selectedPrompt: prompt }),
})); 