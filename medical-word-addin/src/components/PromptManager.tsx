import React, { useState, useEffect } from 'react';
import { Stack, Dropdown, IDropdownOption, TextField, PrimaryButton, DefaultButton, Dialog, DialogFooter, DialogType, Label, useId, MessageBar, MessageBarType, DropdownMenuItemType, Text, IconButton, mergeStyleSets, Spinner, IStyleFunctionOrObject } from '@fluentui/react';
import { getPrompts, managePrompt, Prompt } from '../services/api';
import { useId as useIdHooks } from '@fluentui/react-hooks';

interface PromptManagerProps {
  onPromptSelect: (content: string, modelType?: 'generation' | 'compliance') => void;
  onExecute: (promptContent: string) => void;
  selectedModel: 'mistral' | 'llama';
  isAdminUser: boolean;
  selectedPrompt?: Prompt;
  onSelectedPromptChange: (prompt: Prompt | undefined) => void;
  onSwitchToPrompts: () => void;
  styles?: IStyleFunctionOrObject<any, any>;
}

const PromptManager: React.FC<PromptManagerProps> = ({ onPromptSelect, onExecute, selectedModel, isAdminUser, selectedPrompt, onSelectedPromptChange, onSwitchToPrompts }) => {
  const [prompts, setPrompts] = useState<{ user: Prompt[]; default: Prompt[] }>({ user: [], default: [] });
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newPrompt, setNewPrompt] = useState<Partial<Prompt>>({
    title: '',
    content: '',
    modelType: 'generation'
  });
  const messageId = `prompt-msg-${Date.now()}`;
  const [operationStatus, setOperationStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);

  const styles = mergeStyleSets({
    promptOption: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingRight: 8,
      '& button': {
        visibility: 'hidden'
      },
      '&:hover button': {
        visibility: 'visible'
      }
    }
  });

  useEffect(() => {
    const loadPrompts = async () => {
      const timeout = setTimeout(() => {
        setOperationStatus({ 
          type: 'error', 
          message: 'Request timeout. Please check your network connection.' 
        });
        setIsLoadingPrompts(false);
      }, 10000); // 10秒超时

      try {
        setIsLoadingPrompts(true);
        const response = await getPrompts();
        setPrompts({
          user: response.userPrompts || [],
          default: response.defaultPrompts || []
        });
      } catch (error) {
        console.error('加载提示词失败:', error);
        setOperationStatus({ 
          type: 'error', 
          message: 'Failed to load prompts. Please check your network connection.' 
        });
      } finally {
        clearTimeout(timeout);
        setIsLoadingPrompts(false);
      }
    };

    loadPrompts();
  }, []);

  const handleSave = async () => {
    if (!selectedPrompt) return;
    
    if (editContent.length < 50) {
      showMessage('error', 'Prompt content too short (min 50 characters)');
      return;
    }

    try {
      await managePrompt({
        action: 'update',
        prompt: {
          ...selectedPrompt,
          content: editContent
        }
      });
      await loadPrompts();
      setIsEditing(false);
      showMessage('success', 'Prompt updated successfully');
    } catch (error) {
      console.error('Error saving prompt:', error);
      showMessage('error', `Error: ${error.message}`);
    }
  };

  const handleCreate = async () => {
    try {
      if (!newPrompt.title || !newPrompt.content) {
        Office.context.ui.displayDialogAsync(
          'data:text/plain,' + encodeURIComponent('Title and content are required'),
          { height: 40, width: 300 }
        );
        return;
      }
      
      const response = await managePrompt({
        action: 'create',
        prompt: {
          ...newPrompt,
          modelType: selectedModel === 'llama' ? 'compliance' : 'generation',
          scope: 'team'
        }
      });
      
      setShowNewDialog(false);
      await loadPrompts();
    } catch (error) {
      console.error('Create error:', error);
      Office.context.ui.displayDialogAsync(
        'data:text/plain,' + encodeURIComponent('Failed to create prompt: ' + error.message),
        { height: 60, width: 300 }
      );
    }
  };

  const showMessage = (type: 'success' | 'error', message: string) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), 3000);
  };

  const handleTemplateSelect = (prompt: Prompt) => {
    onSelectedPromptChange(prompt);
    onPromptSelect(prompt.content, prompt.modelType);
  };

  const getOptionIcon = (category?: string) => {
    switch (category) {
      case 'regulatory': return 'Ribbon';
      case 'csr': return 'Documentation';
      default: return 'Edit';
    }
  };

  const promptOptions: IDropdownOption[] = [
    {
      key: 'predefined-header',
      text: 'Predefined Prompts',
      itemType: DropdownMenuItemType.Header
    },
    // 使用原有的预定义提示词
    ...prompts.default.map(p => ({
      key: p.id,
      text: p.title,
      data: p
    })),
    {
      key: 'custom-header',
      text: 'Custom Prompts',
      itemType: DropdownMenuItemType.Header
    },
    // 只显示用户实际创建的自定义提示词
    ...(prompts.user || [])
      .filter(p => p.scope === 'user' || p.scope === 'team')  // 只显示用户或团队范围的提示词
      .map(p => ({
        key: p.id,
        text: p.title,
        data: p
      }))
  ];

  const onRenderOption = (option?: IDropdownOption): JSX.Element => {
    if (option?.itemType === DropdownMenuItemType.Header) {
      return (
        <div style={{ 
          padding: '8px 16px', 
          fontWeight: 600,
          fontSize: '12px',
          color: '#666'
        }}>
          {option.text}
        </div>
      );
    }

    const prompt = option?.data as Prompt;
    return (
      <div style={{
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>{option?.text}</span>
      </div>
    );
  };

  const TemplatePreview: React.FC<{ content: string }> = ({ content }) => {
    const sections = content.split(/\d+\.\s+/).filter(s => s.trim());
    
    return (
      <div style={{ 
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: 4,
        padding: 15,
        marginTop: 10
      }}>
        {sections.map((section, index) => (
          <div key={index} style={{ marginBottom: 15 }}>
            <Text variant="mediumPlus" block styles={{ root: { color: '#004b87', fontWeight: 600 } }}>
              Section {index + 1}
            </Text>
            <Text styles={{ root: { whiteSpace: 'pre-wrap', color: '#212529' } }}>
              {section}
            </Text>
          </div>
        ))}
      </div>
    );
  };

  const handleEdit = () => {
    if (selectedPrompt) {
      // 切换到 Prompts 界面并传递要编辑的提示词
      onSwitchToPrompts();
      // 可以通过 URL 参数或状态管理传递要编辑的提示词 ID
    }
  };

  const canEdit = isAdminUser;

  return (
    <Stack tokens={{ childrenGap: 4 }}>
      <Text variant="mediumPlus" styles={{ 
        root: { 
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '4px'
        } 
      }}>
        Available Prompts
      </Text>
      <Stack horizontal tokens={{ childrenGap: 8 }} styles={{
        root: {
          alignItems: 'center',
        }
      }}>
        <Dropdown
          placeholder="Select a prompt"
          options={promptOptions}
          selectedKey={selectedPrompt?.id}
          onChange={(_, option) => {
            if (option) {
              const selected = [...prompts.default, ...prompts.user].find(p => p.id === option.key);
              onSelectedPromptChange(selected);
            }
          }}
          styles={{
            dropdown: { 
              minWidth: 200,
              height: '28px'
            },
            title: {
              height: '28px',
              lineHeight: '26px',
              border: '1px solid #EDEBE9'
            }
          }}
        />
        <DefaultButton
          text="Edit"
          onClick={handleEdit}
          disabled={!selectedPrompt || (selectedPrompt.isDefault && !canEdit)}
          styles={{
            root: {
              height: '28px',
              padding: '0 12px',
              minWidth: '60px'
            }
          }}
        />
        <PrimaryButton
          text="New"
          onClick={onSwitchToPrompts}
          styles={{
            root: {
              height: '28px',
              padding: '0 12px',
              minWidth: '60px'
            }
          }}
        />
        {selectedPrompt && (
          <PrimaryButton
            text="Execute"
            onClick={() => {
              if (selectedPrompt) {
                onExecute(selectedPrompt.content);
              }
            }}
            styles={{
              root: {
                backgroundColor: '#28a745',
                borderColor: '#28a745',
                height: '28px',
                padding: '0 12px',
                minWidth: '70px',
                ':hover': {
                  backgroundColor: '#218838',
                  borderColor: '#1e7e34'
                }
              }
            }}
          />
        )}
      </Stack>

      <Dialog
        hidden={!isEditing}
        onDismiss={() => setIsEditing(false)}
        dialogContentProps={{
          type: DialogType.largeHeader,
          title: 'Edit Full Prompt',
          styles: {
            main: { 
              maxWidth: '800px !important',
              minHeight: '600px'
            }
          }
        }}
      >
        <TextField
          label="Prompt Content"
          multiline
          autoAdjustHeight
          rows={25}
          resizable={false}
          styles={{
            fieldGroup: { 
              fontFamily: 'monospace',
              fontSize: '0.9em'
            }
          }}
          value={editContent}
          onChange={(_, v) => setEditContent(v || '')}
        />
        <DialogFooter>
          <PrimaryButton onClick={handleSave} text="Save" />
          <DefaultButton onClick={() => setIsEditing(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>

      <Dialog
        hidden={!showNewDialog}
        onDismiss={() => setShowNewDialog(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Create New Prompt',
        }}
      >
        <TextField
          label="Title"
          required
          onChange={(_, v) => setNewPrompt(p => ({ ...p, title: v }))}
        />
        <TextField
          label="Content"
          multiline
          rows={10}
          required
          onChange={(_, v) => setNewPrompt(p => ({ ...p, content: v }))}
        />
        <DialogFooter>
          <PrimaryButton onClick={handleCreate} text="Create" />
          <DefaultButton onClick={() => setShowNewDialog(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>

      {operationStatus && (
        <MessageBar
          messageBarType={operationStatus.type === 'success' ? MessageBarType.success : MessageBarType.error}
          styles={{ root: { marginTop: 10 } }}
        >
          {operationStatus.message}
        </MessageBar>
      )}
    </Stack>
  );
};

PromptManager.defaultProps = {
  isAdminUser: false
};

export { PromptManager }; 