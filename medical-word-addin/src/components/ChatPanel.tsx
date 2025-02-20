import * as React from 'react';
import { Stack, TextField, PrimaryButton, IconButton, Text, MessageBar, MessageBarType, Spinner, DefaultButton } from '@fluentui/react';
import { useChatStore } from '../store/chatStore';
import { useSourceStore } from '../store/sourceStore';
import { PromptManager } from './PromptManager';
import { usePromptStore } from '../store/promptStore';
import { authService } from '../services/authService';
import { TranslationDialog } from './TranslationDialog';
import { useTranslationStore } from '../store/translationStore';

export const ChatPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    status,
    currentSessionId,
    sessions,
    newMessage,
    error,
    setNewMessage,
    initializeChat,
    sendMessage,
    createNewSession,
    switchSession,
    deleteSession,
    set
  } = useChatStore();

  const { availableSources, selectedSources, toggleSource } = useSourceStore();
  const { selectedPrompt, setSelectedPrompt } = usePromptStore();
  const [isAdmin] = React.useState(authService.isAdminUser());
  const [isTranslateDialogOpen, setIsTranslateDialogOpen] = React.useState(false);
  const [selectedText, setSelectedText] = React.useState('');
  const { translate } = useTranslationStore();

  const currentSession = sessions.find(s => s.id === currentSessionId);

  React.useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // 监听文本选择
  React.useEffect(() => {
    const checkSelection = async () => {
      try {
        await window.Word.run(async (context) => {
          const selection = context.document.getSelection();
          selection.load('text');
          await context.sync();
          const text = selection.text.trim();
          // 如果没有选中文本，清除状态
          if (!text) {
            setSelectedText('');
            if (isTranslateDialogOpen) {
              setIsTranslateDialogOpen(false);
            }
          } else {
            setSelectedText(text);
          }
        });
      } catch (error) {
        console.error('Failed to get selection:', error);
        setSelectedText('');
        if (isTranslateDialogOpen) {
          setIsTranslateDialogOpen(false);
        }
      }
    };
    
    // 立即检查当前选择
    checkSelection();
    
    Office.context.document.addHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      checkSelection
    );
    
    return () => {
      Office.context.document.removeHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        checkSelection
      );
    };
  }, [isTranslateDialogOpen]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      const docText = await window.Word.run(async (context) => {
        const body = context.document.body;
        body.load('text');
        await context.sync();
        return body.text;
      });

      if (!docText || docText.trim().length < 50) {
        throw new Error('Document must contain at least 50 characters');
      }

      const selectedDocs = availableSources.filter(s => 
        selectedSources.includes(s.id)
      );

      await sendMessage(newMessage.trim(), docText, selectedDocs);
      setNewMessage('');
    } catch (error) {
      set({ 
        status: 'error',
        error: error.message || 'Failed to send message'
      });
    }
  };

  const handlePromptSelect = (content: string) => {
    setNewMessage(content);
  };

  const handleExecute = async () => {
    if (!selectedPrompt) return;
    setNewMessage(selectedPrompt.content);
  };

  return (
    <Stack horizontal styles={{ 
      root: { 
        height: 'calc(100vh - 100px)',
        gap: '20px',
        width: '100%',
        justifyContent: 'flex-start',
        padding: '10px'
      } 
    }}>
      {/* 历史会话侧边栏 */}
      <Stack styles={{ 
        root: { 
          width: '125px',
          borderRight: '1px solid #e1e1e1',
          backgroundColor: '#f8f9fa',
          padding: '10px',
          borderRadius: '4px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        } 
      }}>
        <Stack.Item>
          <DefaultButton
            text="New Chat"
            onClick={createNewSession}
            styles={{
              root: {
                backgroundColor: '#0078d4',
                color: 'white',
                width: '100%',
                marginBottom: '10px'
              }
            }}
          />
        </Stack.Item>

        {/* 历史会话列表 */}
        <Stack.Item grow styles={{ 
          root: { 
            overflowY: 'auto',
            overflowX: 'hidden'
          } 
        }}>
          {sessions.map((session) => (
            <DefaultButton
              key={session.id}
              text={session.messages.length > 0 
                ? session.messages[0].content.slice(0, 30) + '...'
                : `New Chat ${sessions.indexOf(session) + 1}`
              }
              onClick={() => switchSession(session.id)}
              checked={session.id === currentSessionId}
              styles={{
                root: {
                  textAlign: 'left',
                  marginBottom: '8px',
                  backgroundColor: session.id === currentSessionId ? '#e1efff' : 'transparent',
                  border: '1px solid #EDEBE9',
                  borderRadius: '4px',
                  padding: '12px',
                  height: 'auto',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }
              }}
            />
          ))}
        </Stack.Item>
      </Stack>

      {/* 主对话区域 */}
      <Stack styles={{ 
        root: { 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: '8px'
        } 
      }}>
        {/* 对话显示区域 */}
        <Stack.Item grow styles={{
          root: {
            backgroundColor: 'white',
            border: '1px solid #0078d4',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            width: '100%'
          }
        }}>
          {/* 消息历史区域 */}
          <Stack.Item grow styles={{
            root: {
              overflowY: 'auto',
              padding: '16px',
              flex: 1,
              width: '100%'
            }
          }}>
            {status === 'initializing' && (
              <Spinner label="Initializing chat..." />
            )}
            {status === 'loading' && (
              <Spinner label="Processing..." />
            )}
            {currentSession?.messages.map((msg, index) => (
              <Stack
                key={index}
                horizontalAlign={msg.isUser ? 'end' : 'start'}
                styles={{
                  root: {
                    padding: '8px 12px',
                    margin: '4px 0',
                    maxWidth: msg.isUser ? '80%' : '85%',
                    backgroundColor: msg.isUser ? '#e1efff' : '#f3f2f1',
                    color: '#333',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Text styles={{
                  root: {
                    width: '100%',
                    wordBreak: 'break-word'
                  }
                }}>
                  {msg.content}
                </Text>
              </Stack>
            ))}
          </Stack.Item>

          {/* 输入区域 */}
          <Stack.Item styles={{
            root: {
              borderTop: '1px solid #EDEBE9',
              padding: '8px',
              backgroundColor: '#fff'
            }
          }}>
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="end">
              <Stack.Item styles={{
                root: {
                  width: 'calc(100% - 40px)'
                }
              }}>
                <TextField
                  value={newMessage}
                  onChange={(_, value) => setNewMessage(value || '')}
                  placeholder="Provide your instructions here and click on the send icon."
                  multiline
                  autoAdjustHeight
                  styles={{ 
                    root: { width: '100%' },
                    field: {
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      minHeight: '32px',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      padding: '6px 10px',
                      lineHeight: '20px'
                    },
                    fieldGroup: {
                      height: 'auto',
                      minHeight: '6px',
                      maxHeight: '150px'
                    },
                    wrapper: {
                      height: 'auto',
                      minHeight: '32px',
                      maxHeight: '150px'
                    }
                  }}
                  onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={status !== 'ready'}
                />
              </Stack.Item>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: status === 'ready' && newMessage.trim() ? 'pointer' : 'default',
                  opacity: status === 'ready' && newMessage.trim() ? 1 : 0.5,
                  marginBottom: '1px'
                }}
                onClick={handleSend}
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none"
                  style={{
                    transform: 'rotate(-45deg)'
                  }}
                >
                  <path
                    d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
                    fill="#4894fe"
                  />
                </svg>
              </div>
            </Stack>
          </Stack.Item>
        </Stack.Item>

        {/* Quick Actions 区域 */}
        <Stack.Item styles={{
          root: {
            backgroundColor: '#f8f9fa',
            padding: '8px',
            borderRadius: '4px'
          }
        }}>
          <Stack>
            <Text variant="mediumPlus" styles={{ 
              root: { 
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600'
              } 
            }}>
              Quick Actions
            </Text>
            <Stack horizontal wrap tokens={{ childrenGap: 4 }}>
              <DefaultButton
                text="Translate"
                disabled={!selectedText}
                onClick={() => setIsTranslateDialogOpen(true)}
                styles={{
                  root: {
                    height: '28px',
                    padding: '0 12px',
                    border: '1px solid #0078d4',
                    color: '#0078d4'
                  }
                }}
              />
              <DefaultButton
                text="Save to Prompts"
                styles={{
                  root: {
                    height: '28px',
                    padding: '0 12px'
                  }
                }}
              />
              <DefaultButton
                text="Insert to Document"
                styles={{
                  root: {
                    height: '28px',
                    padding: '0 12px'
                  }
                }}
              />
            </Stack>
          </Stack>
        </Stack.Item>

        {/* 提示词管理区域 */}
        <Stack.Item styles={{
          root: {
            backgroundColor: '#f8f9fa',
            padding: '8px',
            borderRadius: '4px',
            marginTop: '4px'
          }
        }}>
          <PromptManager
            onPromptSelect={handlePromptSelect}
            onExecute={handleExecute}
            selectedModel="mistral"
            isAdminUser={isAdmin}
            selectedPrompt={selectedPrompt}
            onSelectedPromptChange={setSelectedPrompt}
            styles={{
              root: {
                display: 'flex',
                flexDirection: 'column'
              }
            }}
          />
        </Stack.Item>

        {/* 可选文档区域 */}
        <Stack.Item styles={{
          root: {
            backgroundColor: '#f8f9fa',
            padding: '8px',
            borderRadius: '4px',
            minHeight: '70px'
          }
        }}>
          <Stack>
            <Text variant="mediumPlus" styles={{ 
              root: { 
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600'
              } 
            }}>
              Available Sources
            </Text>
            <Stack horizontal wrap tokens={{ childrenGap: 4 }}>
              {availableSources.map(doc => (
                <DefaultButton
                  key={doc.id}
                  text={doc.name}
                  checked={selectedSources.includes(doc.id)}
                  onClick={() => toggleSource(doc.id)}
                  styles={{
                    root: {
                      backgroundColor: selectedSources.includes(doc.id) ? '#e1efff' : 'white',
                      border: '1px solid #EDEBE9',
                      margin: '2px',
                      minWidth: 'auto',
                      maxWidth: '200px',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      height: '28px',
                      padding: '0 8px'
                    }
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </Stack.Item>
      </Stack>

      {/* 复用翻译对话框 */}
      <TranslationDialog
        isOpen={isTranslateDialogOpen}
        onDismiss={() => setIsTranslateDialogOpen(false)}
        defaultText={selectedText}
        onTranslate={async (text: string, targetLanguage: string) => {
          try {
            const result = await translate(text, targetLanguage);
            return result;
          } catch (error) {
            console.error('Translation failed:', error);
            throw error;
          }
        }}
      />
    </Stack>
  );
}; 