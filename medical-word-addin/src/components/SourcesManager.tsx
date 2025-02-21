import * as React from 'react';
import { Stack, Label, Toggle, ChoiceGroup, PrimaryButton, DetailsList, SelectionMode, MessageBar, MessageBarType, IconButton, DefaultButton, Text, Checkbox } from '@fluentui/react';
import { useSourceStore } from '../store/sourceStore';
import { api } from '../services/api';
import Word from '/Users/roboticssn/Documents/code/project/chatbot/medical-word-addin/src/services/word';
import { v4 as uuidv4 } from 'uuid';
import { Icon } from '@fluentui/react';
import { StatusIndicator } from './StatusIndicator';
import Office from 'office-js';

interface DocumentItem {
  id: string;
  name: string;
  uploadDate: string;
  size: string;
  summary?: string;
  status: 'uploading' | 'success' | 'error';
  progress?: number;
  vectorized?: boolean;
  isTemplate?: boolean;
  analyzed?: boolean;
}

export const SourcesManager: React.FC = () => {
  const {
    selectedSources,
    selectedTemplates,
    availableSources,
    availableTemplates,
    toggleSource,
    selectTemplate,
    loadSources,
    loadTemplates,
    addSource,
    removeSource,
    setAvailableSources
  } = useSourceStore();

  const [uploadingDocs, setUploadingDocs] = React.useState<DocumentItem[]>([]);
  const [selectedDocs, setSelectedDocs] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);

  // 组件挂载时强制同步
  React.useEffect(() => {
    const initialize = async () => {
      await loadSources();  // 首次加载
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
      await loadSources();  // 二次确认
    };
    initialize();
  }, [loadSources]);

  // 添加文件监听
  React.useEffect(() => {
    const handler = () => loadSources();
    
    // 每5秒同步一次
    const timer = setInterval(handler, 5000);
    
    // 监听窗口焦点事件
    window.addEventListener('focus', handler);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handler);
    };
  }, [loadSources]);

  React.useEffect(() => {
    loadTemplates();
  }, []);

  // 定期同步文档列表
  React.useEffect(() => {
    loadSources(); // 初始加载
    
    const syncInterval = setInterval(() => {
      loadSources();
    }, 30000); // 每30秒同步一次
    
    return () => clearInterval(syncInterval);
  }, [loadSources]);

  const handleUpload = async (files: FileList) => {
    console.log('[DEBUG] 开始上传文件数量:', files.length);
    
    setError(null);
    
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('file', file);
    });

    Array.from(files).forEach(async file => {
      console.log('[DEBUG] 正在上传文件:', file.name);
      
      const tempId = uuidv4();
      
      // 显示上传进度
      setUploadingDocs(prev => [...prev, {
        id: tempId,
        name: file.name,
        status: 'uploading',
        progress: 0
      }]);

      try {
        const response = await api.post('/api/sources/upload', formData, {
          headers: {'Content-Type': 'multipart/form-data'},
          onUploadProgress: progressEvent => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadingDocs(prev => 
              prev.map(doc => 
                doc.id === tempId ? {...doc, progress: percent} : doc
              )
            );
          }
        });
        
        console.log('[DEBUG] 上传响应:', response.data);
        addSource(response.data.document);
        
        // 强制刷新文档列表
        const sources = await api.get('/api/sources');
        console.log('[DEBUG] 刷新后的文档列表:', sources.data);
        
        setAvailableSources(sources.data);

        // 移除上传中状态
        setUploadingDocs(prev => 
          prev.filter(doc => doc.id !== tempId)
        );

      } catch (error) {
        setUploadingDocs(prev =>
          prev.map(doc => 
            doc.id === tempId ? {...doc, status: 'error'} : doc
          )
        );
        console.error('[ERROR] 上传失败:', error);
      }
    });
  };

  const handleAnalyze = async () => {
    if (selectedDocs.length === 0) return;
    
    setAnalyzing(true);
    try {
        const response = await api.post('/api/analyze', {
            docIds: selectedDocs,
            instruction: "请分析这些文档的内容"
        });
        
        // 更新每个文档的状态
        response.data.documents.forEach((doc: Source) => {
            addSource({
                ...doc,
                vectorized: true,
                analyzed: true
            });
        });
        
        // 显示成功消息
        Office.context.ui.displayDialogAsync(
            'data:text/plain,' + encodeURIComponent('文档分析完成'),
            { height: 60, width: 300 }
        );
    } catch (error) {
        console.error('Analysis failed:', error);
        Office.context.ui.displayDialogAsync(
            'data:text/plain,' + encodeURIComponent(`分析失败: ${error.message}`),
            { height: 60, width: 300 }
        );
    } finally {
        setAnalyzing(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await api.delete(`/api/sources/${docId}`);
      removeSource(docId);
      await loadSources();
    } catch (error: any) {
      console.error('Delete error:', error);
      if (error.response?.status === 404) {
        removeSource(docId);
        await loadSources();
      } else {
        Office.context.ui.displayDialogAsync(
          'data:text/plain,' + encodeURIComponent(`删除失败: ${error.message}`),
          { height: 60, width: 300 }
        );
      }
    }
  };

  // 合并上传中和已上传的文档，但排除模板
  const allDocuments = [
    ...uploadingDocs,
    ...availableSources.map(source => ({
      ...source,
      status: 'success' as const
    }))
  ];

  // 在loadSources调用后添加调试日志
  const loadAndLogSources = async () => {
    await loadSources();
    console.log('当前文档列表:', availableSources);
  }

  // 修改useEffect
  React.useEffect(() => {
    loadAndLogSources();
    const interval = setInterval(loadAndLogSources, 5000);
    return () => clearInterval(interval);
  }, []);

  // 修改列定义
  const columns = [
    { 
      key: 'status', 
      name: '', 
      minWidth: 40,
      maxWidth: 40,
      onRender: (item: DocumentItem) => 
        item.status === 'uploading' ? (
          <StatusIndicator 
            status="uploading" 
            progress={item.progress} 
          />
        ) : (
          <StatusIndicator 
            status="success"
            analyzed={item.analyzed}
            selected={selectedDocs.includes(item.id)}
            onClick={() => {
              if (item.status !== 'uploading') {
                if (selectedDocs.includes(item.id)) {
                  setSelectedDocs(selectedDocs.filter(id => id !== item.id));
                } else {
                  setSelectedDocs([...selectedDocs, item.id]);
                }
              }
            }}
          />
        )
    },
    { 
      key: 'name', 
      name: 'Document Name', 
      minWidth: 150,
      onRender: (item: DocumentItem) => (
        <Text>{item.name}</Text>
      )
    },
    {
      key: 'delete',
      name: 'Actions',
      minWidth: 70,
      onRender: (item: DocumentItem) => {
        return item.isTemplate ? null : (
          <DefaultButton
            text="Delete"
            onClick={() => handleDelete(item.id)}
            styles={{
              root: {
                backgroundColor: '#d13438',
                color: 'white',
                minWidth: 60,
                padding: '5px 10px'
              },
              rootHovered: {
                backgroundColor: '#a4262c',
                color: 'white'
              }
            }}
          />
        );
      }
    }
  ];

  // 移除 select 列
  const columnsWithoutSelect = columns.filter(col => col.key !== 'select');

  return (
    <Stack tokens={{ childrenGap: 15 }}>
      {error && (
        <MessageBar
          messageBarType={MessageBarType.error}
          onDismiss={() => setError(null)}
        >
          {error}
        </MessageBar>
      )}
      {/* 文件上传区域 */}
      <div className="upload-area">
        <input
          type="file"
          multiple
          onChange={e => e.target.files && handleUpload(e.target.files)}
          accept=".pdf,.docx,.doc,.txt"
          id="file-upload"
          style={{ display: 'none' }}
        />
        <label htmlFor="file-upload" className="upload-label">
          <Icon iconName="Upload" />
          <span>Drag and drop files or click to upload</span>
          <span>Supported formats: PDF, DOCX, DOC, TXT</span>
        </label>
      </div>

      {/* 用户文档列表 */}
      <Text variant="large" styles={{ root: { marginTop: 20 } }}>
        Documents
      </Text>
      <DetailsList
        items={allDocuments}
        columns={columnsWithoutSelect}
        selectionMode={SelectionMode.none}
        styles={{
          root: {
            overflowY: 'auto',
            height: '400px'
          }
        }}
      />

      {/* 分析按钮 */}
      <Stack horizontal tokens={{ childrenGap: 10 }}>
        <PrimaryButton
          text="Analyze Documents"
          disabled={selectedDocs.length === 0 || analyzing}
          onClick={handleAnalyze}
          styles={{
            root: {
              backgroundColor: selectedDocs.length > 0 ? '#0078d4' : '#f3f2f1'
            }
          }}
        />
      </Stack>
    </Stack>
  );
};

export const StatusIndicator: React.FC<{
  status: 'uploading' | 'success' | 'error';
  progress?: number;
  analyzed?: boolean;
  selected?: boolean;
  onClick?: () => void;
}> = ({ status, progress, analyzed, selected, onClick }) => {
  const getStatusColor = () => {
    if (status === 'error') return '#d13438';
    if (status === 'uploading') return '#0078d4';
    if (selected) return '#0078d4';  // 选中状态改为蓝色
    if (analyzed) return '#666';      // 已分析为灰色
    return '#c8c8c8';                // 未分析为浅灰色
  };

  return (
    <div 
      onClick={onClick}
      style={{
        cursor: status === 'uploading' ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center', // 居中对齐
        width: '100%', // 占满列宽
        gap: '8px'
      }}
    >
      <div style={{
        width: '16px', // 增大圆点尺寸
        height: '16px',
        borderRadius: '50%',
        backgroundColor: getStatusColor(),
        transition: 'background-color 0.2s',
        border: '1px solid #e0e0e0' // 添加边框使圆点更明显
      }} />
      {status === 'uploading' && progress !== undefined && (
        <Text>{progress}%</Text>
      )}
    </div>
  );
}; 