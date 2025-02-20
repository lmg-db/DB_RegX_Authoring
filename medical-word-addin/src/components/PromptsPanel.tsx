import * as React from 'react';
import { Stack, TextField, DefaultButton, Text, IDropdownOption, MessageBar, MessageBarType, Spinner } from '@fluentui/react';
import { usePromptStore } from '../store/promptStore';
import { Prompt } from '../store/promptStore';
import { PromptManager } from './PromptManager';
import { logService } from '../services/logService';
import { api } from '../services/api';

interface PromptsPanelProps {
  onSaveToLibrary?: () => void;
  onSaveToCustom?: () => void;
}

export const PromptsPanel: React.FC<PromptsPanelProps> = ({
  onSaveToLibrary,
  onSaveToCustom
}) => {
  const [title, setTitle] = React.useState('');
  const [task, setTask] = React.useState('');
  const [promptDetails, setPromptDetails] = React.useState('');
  const [selectedTemplates, setSelectedTemplates] = React.useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = React.useState<Prompt | null>(null);
  const { prompts, isLoading, error, loadPrompts } = usePromptStore();

  // 在组件顶部添加
  React.useEffect(() => {
    console.log('Current prompts:', prompts);
    console.log('Loading state:', isLoading);
    console.log('Error state:', error);
  }, [prompts, isLoading, error]);

  // 在useEffect中添加
  React.useEffect(() => {
    (window as any).logToWord(`Prompts loaded: ${JSON.stringify(prompts)}`);
  }, [prompts]);

  // 在useEffect中添加
  React.useEffect(() => {
    loadPrompts();
    // 每5秒轮询数据
    const interval = setInterval(loadPrompts, 5000);
    return () => clearInterval(interval);
  }, [loadPrompts]);

  // 处理选择提示词
  const handlePromptSelect = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setTitle(prompt.title);
    setTask(prompt.task || '');
    setPromptDetails(prompt.content);
    setSelectedTemplates(prompt.templates || []);
  };

  // 处理新建提示词
  const handleNewPrompt = () => {
    setSelectedPrompt(null);
    setTitle('');
    setTask('');
    setPromptDetails('');
    setSelectedTemplates([]);
  };

  // 保存提示词
  const handleSave = async (isLibrary: boolean) => {
    try {
      if (!title.trim() || !promptDetails.trim()) {
        alert('标题和内容为必填项');
        return;
      }

      const response = await api.post('/prompts', {
        title: title.trim(),
        content: promptDetails.trim(),
        model_type: "generation",
        scope: isLibrary ? "team" : "user",
        task: task.trim(),
        templates: selectedTemplates
      });

      // 刷新列表
      await loadPrompts();
      handleNewPrompt();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请检查控制台日志');
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
                  <Text
                    key={prompt.id}
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
            <DefaultButton
              text="Save to Library"
              onClick={() => handleSave(true)}
              styles={{
                root: {
                  backgroundColor: '#f3f2f1',
                  height: '28px',
                  minWidth: '100px',
                  padding: '0 10px',
                  fontSize: '12px'
                }
              }}
            />
            <DefaultButton
              text="Save to Custom"
              onClick={() => handleSave(false)}
              styles={{
                root: {
                  backgroundColor: '#e1efff',
                  height: '28px',
                  minWidth: '100px',
                  padding: '0 10px',
                  fontSize: '12px'
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
              label="Title"
              required
              value={title}
              onChange={(_, v) => setTitle(v || '')}
              errorMessage={!title ? 'Required field' : undefined}
            />
          </Stack>

          <Stack>
            <Text styles={{
              root: {
                fontSize: '13px',
                marginBottom: '4px'
              }
            }}>Task</Text>
            <TextField
              placeholder="Free Text"
              value={task}
              styles={{
                fieldGroup: {
                  height: '32px'
                },
                field: {
                  fontSize: '13px'
                }
              }}
              onChange={(_, newValue) => setTask(newValue || '')}
            />
          </Stack>

          <Stack>
            <Text styles={{
              root: {
                fontSize: '13px',
                marginBottom: '4px'
              }
            }}>Prompt Details</Text>
            <TextField
              label="Content"
              multiline
              rows={10}
              required
              value={promptDetails}
              onChange={(_, v) => setPromptDetails(v || '')}
              errorMessage={!promptDetails ? 'Required field' : undefined}
            />
          </Stack>

          <Stack>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Text styles={{
                root: {
                  fontSize: '13px',
                  marginBottom: '4px'
                }
              }}>Templates (1)</Text>
              <Text styles={{
                root: {
                  fontSize: '16px',
                  cursor: 'pointer',
                  color: '#0078d4'
                }
              }}>+</Text>
            </Stack>
            <Stack styles={{
              root: {
                backgroundColor: '#f3f2f1',
                padding: '8px 12px',
                minHeight: '32px'
              }
            }}>
              <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text styles={{
                  root: {
                    fontSize: '13px'
                  }
                }}>FDA CSR Template.pdf</Text>
                <Text styles={{
                  root: {
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: '#666'
                  }
                }}>×</Text>
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}; 