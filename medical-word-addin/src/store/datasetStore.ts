import create from 'zustand';
import { api } from '../services/api';

interface Dataset {
  id: string;
  name: string;
  type: 'table' | 'figure' | 'chart';
  columns: string[];
  previewData: any[];
}

interface VisualizationConfig {
  chartType: 'bar' | 'line' | 'pie' | 'scatter';
  xAxis?: string;
  yAxis?: string;
  grouping?: string;
}

interface DatasetState {
  currentDataset: Dataset | null;
  visualizationConfig: VisualizationConfig;
  generatedImage?: string;
  setDataset: (dataset: Dataset) => void;
  updateConfig: (config: Partial<VisualizationConfig>) => void;
  generateVisualization: () => Promise<void>;
  uploadDataset: (file: File) => Promise<void>;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  currentDataset: null,
  visualizationConfig: { chartType: 'bar' },
  setDataset: (dataset) => set({ currentDataset: dataset }),
  updateConfig: (config) => set(state => ({
    visualizationConfig: { ...state.visualizationConfig, ...config }
  })),
  generateVisualization: async () => {
    const state = useDatasetStore.getState();
    if (!state.currentDataset || !state.visualizationConfig.xAxis || !state.visualizationConfig.yAxis) {
      throw new Error('Please select both X and Y axes');
    }
    
    const response = await api.post('/api/generate-visualization', {
      dataset: {
        data: state.currentDataset.previewData,
        columns: state.currentDataset.columns
      },
      config: {
        chartType: state.visualizationConfig.chartType,
        xAxis: state.visualizationConfig.xAxis,
        yAxis: state.visualizationConfig.yAxis
      }
    });
    set({ generatedImage: response.data.image });
  },
  uploadDataset: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.uploadDataset(formData);
      
      if (response.data) {
        set({ 
          currentDataset: {
            name: file.name,
            columns: response.data.columns,
            previewData: response.data.preview
          }
        });
      }
    } catch (error) {
      console.error('Failed to upload dataset:', error);
      throw error;
    }
  }
})); 