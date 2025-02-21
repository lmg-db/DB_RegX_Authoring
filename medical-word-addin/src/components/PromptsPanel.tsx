import * as React from 'react';
import { Stack, TextField, DefaultButton, Text, IDropdownOption, MessageBar, MessageBarType, Spinner, IconButton, PrimaryButton } from '@fluentui/react';
import { usePromptStore } from '../store/promptStore';
import { Prompt } from '../store/promptStore';
import { PromptManager } from './PromptManager';
import { logService } from '../services/logService';
import { api } from '../services/api';

interface PromptsPanelProps {
  onSaveToLibrary?: () => void;
  onSaveToCustom?: () => void;
  selectedModel: string;
  onPromptSelect: (prompt: Prompt) => void;
  initialPromptId?: string;
}

export const PromptsPanel: React.FC<PromptsPanelProps> = ({
  onSaveToLibrary,
  onSaveToCustom,
  selectedModel,
  onPromptSelect,
  initialPromptId
}) => {
  const [title, setTitle] = React.useState('');
  const [task, setTask] = React.useState('');
  const [promptDetails, setPromptDetails] = React.useState('');
  const [selectedPrompt, setSelectedPrompt] = React.useState<Prompt | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const { 
    prompts, 
    isLoading, 
    error, 
    loadPrompts 
  } = usePromptStore();

  // 在useEffect中添加
  React.useEffect(() => {
    const loadData = async () => {
      try {
        usePromptStore.setState({ isLoading: true });
        await loadPrompts();
        usePromptStore.setState({ isLoading: false });
      } catch (error) {
        console.error('Failed to load prompts:', error);
        usePromptStore.setState({ isLoading: false });
      }
    };
    loadData();
  }, [loadPrompts]);

  // 修改 useEffect，在找到提示词后立即设置表单内容
  React.useEffect(() => {
    if (initialPromptId) {
      const prompt = prompts.find(p => p.id === initialPromptId);
      if (prompt) {
        setSelectedPrompt(prompt);
        setIsEditing(true);
        // 立即设置表单内容
        setTitle(prompt.title);
        setTask(prompt.task || '');
        setPromptDetails(prompt.content);
      }
    }
  }, [initialPromptId, prompts]); // 添加 prompts 作为依赖

  // 处理选择提示词
  const handlePromptSelect = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setTitle(prompt.title);
    setTask(prompt.task || '');
    setPromptDetails(prompt.content);
  };

  // 处理新建提示词
  const handleNewPrompt = () => {
    setSelectedPrompt(null);
    setTitle('');
    setTask('');
    setPromptDetails('');
  };

  // 保存提示词
  const handleSave = async (isLibrary: boolean) => {
    try {
      usePromptStore.setState({ isLoading: true });
      
      const method = selectedPrompt ? 'put' : 'post';
      const url = selectedPrompt ? `/api/prompts/${selectedPrompt.id}` : '/api/prompts';

      await api[method](url, {
        title: title.trim(),
        content: promptDetails.trim(),
        model_type: "generation",
        scope: isLibrary ? "team" : "user",
        task: task.trim()
      });

      await loadPrompts();
      handleNewPrompt();
    } catch (error) {
      console.error('保存失败:', error);
      Office.context.ui.displayDialogAsync(
        'data:text/plain,' + encodeURIComponent(`保存失败: ${error.message}`),
        { height: 60, width: 300 }
      );
    } finally {
      usePromptStore.setState({ isLoading: false });
    }
  };

  // 显示预定义模板
  const libraryPrompts = prompts.filter(p => 
    p.isLibrary && 
    (p.model_type === 'generation' || p.model_type === 'compliance')
  );

  // 显示用户提示词 
  const userPrompts = prompts.filter(p => !p.isLibrary);

  const handleDelete = async () => {
    if (!selectedPrompt) return;

    try {
      console.log('Deleting prompt ID:', selectedPrompt.id);
      await api.delete(`/api/prompts/${selectedPrompt.id}`);
      await loadPrompts();
      handleNewPrompt();
    } catch (error) {
      console.error('Delete error details:', error.response?.data || error.message);
      Office.context.ui.displayDialogAsync(
        'data:text/plain,' + encodeURIComponent(`删除失败: ${error.message}`),
        { height: 60, width: 300 }
      );
    }
  };

  return (
    <Stack horizontal styles={{
      root: {
        minHeight: '600px',
        gap: '20px'
      }
    }}>
      {/* 左侧导航栏 */}
      <Stack styles={{
        root: {
          width: '160px',
          borderRight: '1px solid #e1e1e1',
          padding: '16px'
        }
      }}>
        <DefaultButton
          text="New Prompt"
          onClick={handleNewPrompt}
          styles={{
            root: {
              backgroundColor: '#f3f2f1',
              marginBottom: '16px',
              height: '28px',
              fontSize: '12px'
            }
          }}
        />

        <Text
          variant="mediumPlus"
          styles={{
            root: {
              fontWeight: 600,
              marginBottom: '8px',
              fontSize: '12px'
            }
          }}
        >
          Prompts Library
        </Text>

        {isLoading && <Text>Loading...</Text>}
        {error && (
          <MessageBar messageBarType={MessageBarType.error}>
            {error}
          </MessageBar>
        )}

        <Stack tokens={{ childrenGap: 6 }}>
          {isLoading ? (
            <Spinner label="Loading prompts..." />
          ) : error ? (
            <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>
          ) : (
            prompts.length === 0 ? (
              <Text styles={{ root: { color: '#666', fontStyle: 'italic' } }}>
                No prompts available
              </Text>
            ) : (
              prompts
                .filter(prompt => prompt.scope === 'team')
                .map(prompt => (
                  <div key={prompt.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <Text
                      onClick={() => handlePromptSelect(prompt)}
                      styles={{
                        root: {
                          color: selectedPrompt?.id === prompt.id ? '#0078d4' : '#666',
                          cursor: 'pointer',
                          padding: '6px 8px',
                          fontSize: '12px',
                          backgroundColor: selectedPrompt?.id === prompt.id ? '#f3f2f1' : 'transparent',
                          ':hover': {
                            backgroundColor: '#f3f2f1'
                          }
                        }
                      }}
                    >
                      {prompt.title}
                    </Text>
                  </div>
                ))
            )
          )}
        </Stack>
      </Stack>

      {/* 右侧内容区 */}
      <Stack grow styles={{
        root: {
          padding: '16px',
          minWidth: '500px'
        }
      }}>
        <Stack horizontal horizontalAlign="space-between" styles={{
          root: {
            marginBottom: '16px',
            alignItems: 'center'
          }
        }}>
          <Text variant="large" styles={{
            root: {
              fontSize: '14px',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }
          }}>
            {selectedPrompt ? `Current Prompt - ${selectedPrompt.title}` : 'New Prompt'}
          </Text>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <PrimaryButton
              text="Save"
              onClick={() => handleSave(true)}
              styles={{
                root: {
                  backgroundColor: '#0078d4',
                  color: 'white',
                  fontSize: '12px',
                  minWidth: 80,
                  padding: '0 8px'
                }
              }}
            />
            <DefaultButton
              text="Delete"
              onClick={async () => {
                if (selectedPrompt) {
                  await handleDelete();
                }
              }}
              styles={{
                root: {
                  backgroundColor: '#d13438',
                  color: 'white',
                  fontSize: '12px',
                  minWidth: 80,
                  padding: '0 8px'
                }
              }}
            />
          </Stack>
        </Stack>

        <Stack tokens={{ childrenGap: 12 }}>
          <Stack>
            <Text styles={{
              root: {
                fontSize: '13px',
                marginBottom: '4px'
              }
            }}>Title</Text>
            <TextField
              required
              value={title}
              onChange={(_, v) => setTitle(v || '')}
              errorMessage={!title ? 'Required field' : undefined}
              styles={{
                fieldGroup: {
                  height: '32px'
                }
              }}
            />
          </Stack>

          <Stack>
            <Text styles={{
              root: {
                fontSize: '13px',
                marginBottom: '4px'
              }
            }}>Task Description</Text>
            <TextField
              multiline
              rows={3}
              value={task}
              onChange={(_, v) => setTask(v || '')}
              styles={{
                field: {
                  minHeight: '60px'
                }
              }}
            />
          </Stack>

          <Stack>
            <Text styles={{
              root: {
                fontSize: '13px',
                marginBottom: '4px'
              }
            }}>Prompt Content</Text>
            <TextField
              multiline
              required
              rows={12}
              value={promptDetails}
              onChange={(_, v) => setPromptDetails(v || '')}
              errorMessage={!promptDetails ? 'Required field' : undefined}
              styles={{
                field: {
                  minHeight: '240px'
                }
              }}
            />
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}; 