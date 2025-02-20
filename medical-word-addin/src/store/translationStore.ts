import create from 'zustand';
import { translateText } from '../services/api';

interface TranslationState {
  isTranslating: boolean;
  error: string | null;
  translate: (text: string, targetLanguage: string) => Promise<string>;
}

export const useTranslationStore = create<TranslationState>((set) => ({
  isTranslating: false,
  error: null,
  translate: async (text: string, targetLanguage: string) => {
    set({ isTranslating: true, error: null });
    try {
      const result = await translateText(text, targetLanguage);
      set({ isTranslating: false });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Translation failed';
      set({ error: errorMessage, isTranslating: false });
      throw error;
    }
  }
})); 