import axios from 'axios';
import { logService } from './logService';

// 必须使用HTTPS协议
const API_BASE_URL = 'https://localhost:8000';

// 确保密钥与后端完全一致
const API_KEY = 'your-secure-key-here'; // 复制自后端配置

// 创建axios实例
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Key': API_KEY  // 确保字段名称和值正确
  }
});

// 在axios实例中添加错误处理
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    const errorMessage = error.response?.data?.message || error.message;
    return Promise.reject(new Error(errorMessage));
  }
);

// 在axios实例配置中添加
axiosInstance.interceptors.request.use(config => {
  config.headers['X-API-Key'] = 'your-secure-key-here';
  return config;
});

export interface TranslationRequest {
  text: string;
  direction: 'zh2en' | 'en2zh';
  model?: string;
  llm_model?: 'mistral' | 'llama';
}

export interface TranslationResponse {
  translatedText: string;
  confidence: number;
  model_used: string;
}

export interface TextGenerationRequest {
  text: string;
  template?: string;
  llm_model?: 'mistral' | 'llama';
}

export interface TextGenerationResponse {
  generatedText: string;
  model_used: string;
}

export interface DownloadRequest {
  content: string;
  fileName: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  isDefault?: boolean;
  scope?: 'user' | 'team';
  modelType?: 'translation' | 'generation' | 'compliance';
  category?: 'csr' | 'patient' | 'regulatory';
  createdBy?: string;
  createdAt?: Date;
}

export interface PromptManagementRequest {
  action: 'create' | 'update' | 'delete';
  prompt: Partial<Prompt>;
}

export interface PromptManagementResponse {
  userPrompts: Prompt[];
  defaultPrompts: Prompt[];
}

export interface Source {
  id: string;
  name: string;
  type: 'document' | 'report' | 'lab';
  origin: string;
}

export interface Template {
  id: string;
  name: string;
  category: 'clinical' | 'regulatory' | 'csr';
}

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  const request: TranslationRequest = {
    text,
    direction: targetLanguage === 'zh-CN' ? 'en2zh' : 'zh2en',
    model: 'default'
  };

  const response = await axiosInstance.post('/api/translate', request);
  return response.data.translatedText;
};

export const generateText = async (request: TextGenerationRequest): Promise<TextGenerationResponse> => {
  try {
    console.log('Sending generation request:', request);
    const response = await axiosInstance.post('/api/generate', {
      text: request.text,
      template: request.template,
      llm_model: request.llm_model,
      prompt: request.text // 实际发送完整提示词
    });
    console.log('Generation response:', response.data);
    return response.data;
  } catch (error) {
    throw new Error(`Content generation failed: ${error.message}`);
  }
};

export const downloadComplianceReport = async (request: DownloadRequest): Promise<void> => {
  try {
    await logService.log('Starting report creation', { contentLength: request.content.length });

    // 从后端获取生成的文档
    const response = await axiosInstance.post('/api/download-report', request, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    
    const base64Content = await blobToBase64(blob);
    
    // 使用 Word.js API 插入文档
    await Word.run(async (context) => {
      try {
        
        const body = context.document.body;
        
        
        body.insertBreak(Word.BreakType.page, Word.InsertLocation.end);
        await context.sync();
        
        
        body.insertFileFromBase64(base64Content, Word.InsertLocation.end);
        await context.sync();
        
        await logService.log('Document content updated successfully');
      } catch (error) {
        await logService.log('Error updating document content', { error });
        throw error;
      }
    });

  } catch (error) {
    await logService.log('Error in downloadComplianceReport', { error });
    throw new Error(`Failed to create report: ${error.message}`);
  }
};


const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]); // 移除 data:application/...;base64, 前缀
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const getPrompts = async (): Promise<PromptManagementResponse> => {
  const response = await axiosInstance.get('/api/prompts');
  return {
    userPrompts: response.data.userPrompts || [],
    defaultPrompts: response.data.defaultPrompts || []
  };
};

export const managePrompt = async (request: PromptManagementRequest): Promise<PromptManagementResponse> => {
  try {
    const response = await axiosInstance.post('/api/prompts', request);
    return response.data;
  } catch (error) {
    throw new Error(`Prompt management failed: ${error.message}`);
  }
};

// 修改为通过api实例调用
export const getSources = async (): Promise<Source[]> => {
  const response = await axiosInstance.get('/api/sources');
  return response.data;
};

export const getTemplates = async (): Promise<Template[]> => {
  const response = await axiosInstance.get('/api/templates');
  return response.data;
};

// 导出整合后的API对象
export const api = {
  // 基础方法
  get: axiosInstance.get,
  post: axiosInstance.post,
  put: axiosInstance.put,
  delete: axiosInstance.delete,
  
  // 自定义方法
  translateText: (request: TranslationRequest) => 
    axiosInstance.post<TranslationResponse>('/api/translate', request),
  
  generateText: (request: TextGenerationRequest) =>
    axiosInstance.post<TextGenerationResponse>('/api/generate', request),
  
  // 来源管理相关
  uploadSourcesDocuments: (formData: FormData) => 
    axiosInstance.post('/api/sources/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    
  analyzeSources: (params: { docIds: string[]; instruction: string }) =>
    axiosInstance.post('/api/sources/analyze', params),

  uploadSourcesDocument: async (formData: FormData, config?: any) => {
    try {
      const response = await axiosInstance.post('/api/sources/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        ...config
      });
      return response;
    } catch (error) {
      console.error('Upload error:', error.response || error);
      throw new Error(
        error.response?.data?.detail || 
        error.message || 
        'Failed to upload file'
      );
    }
  },

  deleteSource: async (id: string) => {
    try {
      const response = await axiosInstance.delete(`/api/sources/${id}`);
      if (!response.data) {
        throw new Error('No response from server');
      }
      return response.data;
    } catch (error) {
      console.error('Delete error:', error);
      throw error; // 保留原始错误以便上层处理
    }
  },

  uploadDataset: async (formData: FormData) => {
    try {
      const response = await axiosInstance.post('/api/datasets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response;
    } catch (error) {
      console.error('Upload dataset error:', error);
      throw error;
    }
  }
};

const promptCache = new Map();

export const loadPrompts = async (forceRefresh = false) => {
  const cacheKey = 'prompts';
  
  if (!forceRefresh && promptCache.has(cacheKey)) {
    return promptCache.get(cacheKey);
  }

  const data = await api.get('/api/prompts');
  const merged = [
    ...hardcodedPrompts, // 前端硬编码的预定义提示词
    ...data.filter((p: Prompt) => p.scope === 'user')
  ];
  
  promptCache.set(cacheKey, merged);
  return merged;
};

// 在模型类型定义中添加Azure选项
export type ChatModel = 'mistral' | 'llama' | 'azure';

// 修改API调用
export const chatWithDocument = async (
  request: ChatRequest,
  modelType: ChatModel
) => {
  const response = await axiosInstance.post('/api/chat/word', {
    ...request,
    model: modelType // 传递模型类型参数
  });
  return response.data;
}; 