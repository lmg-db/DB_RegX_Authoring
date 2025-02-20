import * as React from 'react';
import { Stack, Label, Toggle, ChoiceGroup, PrimaryButton, DetailsList, SelectionMode, MessageBar, MessageBarType, IconButton, DefaultButton, Text } from '@fluentui/react';
import { useSourceStore } from '../store/sourceStore';
import { api } from '../services/api';
import Word from '/Users/roboticssn/Documents/code/project/chatbot/medical-word-addin/src/services/word';
import { v4 as uuidv4 } from 'uuid';
import { Icon } from '@fluentui/react';
import { StatusIndicator } from './StatusIndicator';

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
    removeSource
  } = useSourceStore();

  const [uploadingDocs, setUploadingDocs] = React.useState<DocumentItem[]>([]);
  const [selectedDocs, setSelectedDocs] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadSources();
    loadTemplates();
  }, []);

  const handleUpload = async (files: FileList) => {
    setError(null);
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    
    Array.from(files).forEach(file => {
      // 添加文件大小检查
      if (file.size > maxFileSize) {
        setError(`File ${file.name} is too large. Maximum size is 50MB`);
        return;
      }
      
      const tempId = uuidv4();
      
      // 添加上传中状态
      setUploadingDocs(prev => [...prev, {
        id: tempId,
        name: file.name,
        uploadDate: new Date().toLocaleString(),
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        status: 'uploading',
        progress: 0
      }]);

      const formData = new FormData();
      formData.append('file', file);

      api.uploadSourcesDocument(formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadingDocs(prev => 
            prev.map(doc => 
              doc.id === tempId ? {...doc, progress: percent} : doc
            )
          );
        }
      })
      .then(response => {
        const newDoc = {
          ...response.data.document,
          id: tempId,
          status: 'success',
        };
        setUploadingDocs(prev => prev.filter(doc => doc.id !== tempId));
        addSource(newDoc);
      })
      .catch(error => {
        console.error('Upload failed:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload file';
        setError(`Failed to upload ${file.name}: ${errorMessage}`);
        setUploadingDocs(prev =>
          prev.map(doc => 
            doc.id === tempId ? {...doc, status: 'error'} : doc
          )
        );
      });
    });
  };

  // 文档分析
  const analyzeDocuments = async () => {
    const docIds = selectedDocs.map(id => 
      uploadingDocs.find(d => d.id === id)?.id
    ).filter(Boolean);

    const analysis = await api.analyzeSources({
      docIds,
      instruction: "生成新药临床研究综合报告"
    });
    
    // 插入Word文档
    Word.run(context => {
      const range = context.document.getSelection();
      range.insertText(analysis.summary, 'Replace');
      return context.sync();
    });
  };

  const handleDelete = async (docId: string) => {
    try {
      // Check if document is a template
      const doc = availableSources.find(s => s.id === docId);
      if (doc?.isTemplate) {
        setError("Template documents cannot be deleted");
        return;
      }

      // Show loading state
      setError(null);
      
      // Call API to delete the document
      await api.deleteSource(docId);
      
      // Only remove from store if API call succeeds
      removeSource(docId);
      
    } catch (error) {
      console.error('Delete error:', error);
      setError(
        error.response?.data?.detail || 
        error.message || 
        "Failed to delete document"
      );
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
        columns={[
          { 
            key: 'name', 
            name: 'Document Name', 
            minWidth: 150,
            onRender: (item: DocumentItem) => (
              <Text>{item.name}</Text>
            )
          },
          { 
            key: 'size', 
            name: 'Size', 
            minWidth: 80,
            onRender: (item: DocumentItem) => (
              <Text>{item.size}</Text>
            )
          },
          { 
            key: 'status', 
            name: 'Status', 
            onRender: (item) => 
              item.status === 'uploading' ? (
                <StatusIndicator status="uploading" progress={item.progress} />
              ) : (
                <StatusIndicator status="success" />
              )
          },
          { 
            key: 'summary', 
            name: 'AI Summary', 
            minWidth: 300,
            onRender: (item: DocumentItem) => (
              <Text>{item.summary || 'No summary available'}</Text>
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
        ]}
        selectionMode={SelectionMode.multiple}
        onSelectionChange={setSelectedDocs}
      />

      <PrimaryButton 
        text="Analyze Documents" 
        onClick={analyzeDocuments}
        disabled={selectedDocs.length === 0}
      />
    </Stack>
  );
}; 