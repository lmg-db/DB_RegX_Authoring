import create from 'zustand';
import { api } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

type ChatStatus = 'idle' | 'initializing' | 'ready' | 'error';

interface ChatMessage {
  content: string;
  isUser: boolean;
}

interface ChatSession {
  id: string;
  messages: ChatMessage[];
}

interface ChatState {
  status: ChatStatus;
  currentSessionId: string | null;
  sessions: ChatSession[];
  newMessage: string;
  error?: string;
  
  setNewMessage: (msg: string) => void;
  initializeChat: () => Promise<void>;
  sendMessage: (message: string, documentText: string) => Promise<void>;
  reset: () => void;
  createNewSession: () => void;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  set: (state: Partial<ChatState>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  status: 'idle',
  currentSessionId: null,
  sessions: [],
  newMessage: '',
  error: undefined,

  setNewMessage: (msg: string) => set({ newMessage: msg }),

  createNewSession: () => {
    const newSession = {
      id: uuidv4(),
      messages: []
    };
    set(state => ({
      sessions: [...state.sessions, newSession],
      currentSessionId: newSession.id
    }));
  },

  switchSession: (sessionId) => {
    set({ currentSessionId: sessionId });
  },

  deleteSession: (sessionId) => {
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      currentSessionId: state.currentSessionId === sessionId 
        ? (state.sessions[0]?.id || null) 
        : state.currentSessionId
    }));
  },

  initializeChat: async () => {
    try {
      set({ status: 'initializing', error: undefined });
      
      if (!get().currentSessionId) {
        get().createNewSession();
      }

      const docText = await window.Word.run(async (context) => {
        const body = context.document.body;
        body.load('text');
        await context.sync();
        return body.text;
      });

      if (!docText || docText.trim().length < 50) {
        throw new Error('Document must contain at least 50 characters');
      }

      set({ status: 'ready' });
    } catch (error) {
      set({ 
        status: 'error',
        error: error.message
      });
    }
  },

  sendMessage: async (message: string, documentText: string) => {
    try {
      set({ status: 'loading', error: undefined });
      
      const currentSession = get().sessions.find(s => s.id === get().currentSessionId);
      if (!currentSession) throw new Error('No active chat session');

      const history = [];
      for (let i = 0; i < currentSession.messages.length; i += 2) {
        if (i + 1 < currentSession.messages.length) {
          history.push({
            role: 'user',
            content: currentSession.messages[i].content
          });
          history.push({
            role: 'assistant',
            content: currentSession.messages[i + 1].content
          });
        }
      }

      const response = await api.post('/api/chat/word', {
        question: message,
        document_text: documentText,
        history: history
      });

      if (!response.data || !response.data.response) {
        throw new Error('Invalid response from server');
      }

      set(state => ({
        status: 'ready',
        error: undefined,
        sessions: state.sessions.map(session => 
          session.id === state.currentSessionId
            ? {
                ...session,
                messages: [...session.messages,
                  { content: message, isUser: true },
                  { content: response.data.response, isUser: false }
                ]
              }
            : session
        )
      }));

    } catch (error) {
      console.error('Chat error:', error);
      set({
        status: 'error',
        error: error.message || 'Failed to send message'
      });
      throw error;
    }
  },

  reset: () => set({
    status: 'idle',
    currentSessionId: null,
    sessions: [],
    newMessage: '',
    error: undefined
  }),

  set: (state: Partial<ChatState>) => set(state),
})); 