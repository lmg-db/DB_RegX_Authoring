import * as React from 'react';
import { Stack, TextField, PrimaryButton, IconButton, Text, MessageBar, MessageBarType, Spinner, DefaultButton, Dropdown, Icon } from '@fluentui/react';
import { useChatStore } from '../store/chatStore';
import { useSourceStore } from '../store/sourceStore';
import { PromptManager } from './PromptManager';
import { usePromptStore } from '../store/promptStore';
import { authService } from '../services/authService';
import { TranslationDialog } from './TranslationDialog';
import { useTranslationStore } from '../store/translationStore';
import { api } from '../services/api';
import { PromptsPanel } from './PromptsPanel';

type ChatModel = 'mistral' | 'llama' | 'azure';

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
  const [showPrompts, setShowPrompts] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState<ChatModel>('mistral');

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

  const getSessionTitle = (content: string) => {
    const cleanContent = content.replace(/[\r\n]/g, ' ');
    const words = cleanContent.split(' ');
    const maxWords = 3;  // 最多显示3个单词
    
    if (words.length <= maxWords) {
      return cleanContent;
    }
    
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const handleExportChat = async () => {
    try {
      if (!currentSession) throw new Error('No active chat session');
      
      // 获取当前Word文档内容
      const docText = await Word.run(async (context) => {
        const body = context.document.body;
        body.load('text');
        await context.sync();
        return body.text;
      });

      // 调用后端接口
      const response = await api.post('/api/export-chat', {
        messages: currentSession.messages,
        documentText: docText
      }, {
        responseType: 'blob'
      });

      // 添加响应日志
      console.log('API响应:', response);
      console.log('Blob类型:', response.data.type);
      console.log('Blob大小:', response.data.size);

      // 创建下载链接
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat_export_${new Date().toISOString()}.docx`;
      link.style.display = 'none'; // 隐藏链接
      
      // 添加点击事件监听
      link.onclick = () => {
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      };

      document.body.appendChild(link);
      link.click();
      
    } catch (error) {
      console.error('Export failed:', error);
      Office.context.ui.displayDialogAsync(
        `data:text/plain,${encodeURIComponent(`Export failed: ${error.message}`)}`,
        { height: 60, width: 300 }
      );
    }
  };

  // 修改插入函数
  const handleInsertToDocument = async () => {
    try {
      if (!currentSession || currentSession.messages.length === 0) {
        throw new Error('No messages to insert');
      }

      const lastAIMessage = [...currentSession.messages]
        .reverse()
        .find(msg => !msg.isUser);
      
      if (!lastAIMessage) {
        throw new Error('No AI response found');
      }

      // 插入到当前光标位置
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertText(
          lastAIMessage.content + '\n', 
          Word.InsertLocation.replace  // 替换当前选中内容
        );
        await context.sync();
      });

      // 显示成功提示
      Office.context.ui.displayDialogAsync(
        'data:text/plain,' + encodeURIComponent('Inserted successfully'),
        { height: 60, width: 300 }
      );

    } catch (error) {
      console.error('Insert failed:', error);
      Office.context.ui.displayDialogAsync(
        'data:text/plain,' + encodeURIComponent(`Insert failed: ${error.message}`),
        { height: 60, width: 300 }
      );
    }
  };

  return (
    <Stack horizontal styles={{ 
      root: { 
        height: '600px',
        gap: '20px',
        width: '100%',
        justifyContent: 'flex-start',
        padding: '10px'
      } 
    }}>
      {!showPrompts ? (
        // 原有的聊天界面
        <>
          {/* 历史会话侧边栏 */}
          <Stack styles={{ 
            root: { 
              width: '150px',
              borderRight: '1px solid #e1e1e1',
              backgroundColor: '#f8f9fa',
              padding: '10px 2px',
              borderRadius: '4px',
              height: '580px',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              alignItems: 'center'
            } 
          }}>
            {/* New Chat 按钮 */}
            <Stack.Item styles={{
              root: {
                width: '100%',
                display: 'flex',
                justifyContent: 'center'
              }
            }}>
              <DefaultButton
                text="New Chat"
                onClick={createNewSession}
                styles={{
                  root: {
                    backgroundColor: '#0078d4',
                    color: 'white',
                    width: '135px',
                    marginBottom: '10px',
                    height: '32px'
                  }
                }}
              />
            </Stack.Item>

            {/* 历史会话列表 */}
            <Stack.Item grow styles={{ 
              root: { 
                overflowY: 'auto',
                overflowX: 'hidden',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              } 
            }}>
              {sessions.map((session) => (
                <Stack 
                  key={session.id}
                  styles={{
                    root: {
                      marginBottom: '8px',
                      width: '135px',
                      position: 'relative'
                    }
                  }}
                >
                  <DefaultButton
                    text={session.messages.length > 0 
                      ? getSessionTitle(session.messages[0].content)
                      : `Chat ${sessions.indexOf(session) + 1}`
                    }
                    onClick={() => switchSession(session.id)}
                    checked={session.id === currentSessionId}
                    styles={{
                      root: {
                        textAlign: 'center',
                        backgroundColor: session.id === currentSessionId ? '#e1efff' : 'transparent',
                        border: '1px solid #EDEBE9',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        height: '32px',
                        width: '135px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.2',
                        fontSize: '13px'
                      }
                    }}
                  />
                  <IconButton
                    styles={{
                      root: {
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                        padding: '0',
                        backgroundColor: 'white',
                        border: '1px solid #EDEBE9',
                        borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        '&::after': {
                          content: '"×"',
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '14px',
                          color: '#666',
                          lineHeight: '1'
                        },
                        selectors: {
                          ':hover': {
                            backgroundColor: '#f8f8f8',
                            '&::after': {
                              color: '#d13438'
                            }
                          }
                        }
                      },
                      icon: {
                        display: 'none'
                      }
                    }}
                    onClick={() => deleteSession(session.id)}
                    ariaLabel="Delete chat session"
                  />
                </Stack>
              ))}
            </Stack.Item>
          </Stack>

          {/* 主对话区域 */}
          <Stack styles={{ 
            root: { 
              height: '620px',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              gap: '8px',
              width: '480px',
              maxWidth: '480px',
              minWidth: '480px'
            } 
          }}>
            {/* 模型选择器 */}
            <Stack.Item styles={{ 
              root: { 
                alignSelf: 'flex-end',  
                marginBottom: 3
              } 
            }}>
              <Dropdown
                selectedKey={selectedModel}
                options={[
                  { key: 'mistral', text: 'Mistral (Local)' },
                  { key: 'llama', text: 'Llama (Local)' },
                  { key: 'azure', text: 'Azure GPT-4o (Cloud)' }
                ]}
                onChange={(_, item) => item && setSelectedModel(item.key as ChatModel)}
                styles={{
                  dropdown: { width: 120 },  // 稍微加宽一点
                  title: { 
                    fontSize: '14px',  // 调整字体大小
                    height: '32px',    // 调整高度
                    lineHeight: '30px', // 文字垂直居中
                    border: '1px solid #c8c6c4',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    paddingLeft: '12px',  // 文字左对齐
                    paddingRight: '30px', // 为下拉箭头留出空间
                    display: 'flex',
                    alignItems: 'center',  // 文字垂直居中
                    justifyContent: 'flex-start' // 文字左对齐
                  },
                  caretDown: { 
                    fontSize: '12px',
                    color: '#666',
                    right: '8px'  // 调整下拉箭头位置
                  },
                  dropdownItemsWrapper: {
                    maxHeight: '300px'  // 下拉列表最大高度
                  },
                  dropdownItem: {
                    fontSize: '14px',  // 下拉选项字体大小
                    height: '32px',    // 下拉选项高度
                    lineHeight: '30px' // 下拉选项文字垂直居中
                  }
                }}
              />
            </Stack.Item>

            {/* 对话显示区域 */}
            <Stack.Item grow styles={{
              root: {
                backgroundColor: 'white',
                border: '1px solid #0078d4',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                height: '300px',
                width: '100%'
              }
            }}>
              {/* 消息历史区域 */}
              <Stack.Item grow styles={{
                root: {
                  overflowY: 'auto',
                  padding: '16px',
                  height: '100%',
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
                        maxWidth: '100%',
                        width: 'fit-content',
                        backgroundColor: msg.isUser ? '#e1efff' : '#f3f2f1',
                        color: '#333',
                        borderRadius: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        alignSelf: msg.isUser ? 'flex-end' : 'flex-start'
                      }
                    }}
                  >
                    <Text styles={{
                      root: {
                        width: '100%',
                        maxWidth: '400px',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
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
                <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
                  <DefaultButton
                    text="Translate"
                    disabled={!selectedText}
                    onClick={() => setIsTranslateDialogOpen(true)}
                    styles={{
                      root: {
                        height: '32px',
                        width: '120px',
                        padding: '0 12px',
                        backgroundColor: '#0078d4',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '13px',
                        ':disabled': {
                          backgroundColor: '#f3f2f1',
                          color: '#a19f9d'
                        }
                      }
                    }}
                  />
                  <DefaultButton
                    text="Export Chat"
                    onClick={handleExportChat}
                    iconProps={{ iconName: 'Download' }}
                    styles={{
                      root: {
                        height: '32px',
                        width: '120px',
                        padding: '0 12px',
                        backgroundColor: '#0078d4',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '13px'
                      }
                    }}
                  />
                  <DefaultButton
                    text="Insert to Document"
                    onClick={handleInsertToDocument}
                    styles={{
                      root: {
                        height: '32px',
                        width: '120px',
                        padding: '0 12px',
                        backgroundColor: '#0078d4',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '13px'
                      }
                    }}
                  />
                </Stack>
              </Stack>
            </Stack.Item>

            {/* 提示词管理区域 */}
            <PromptManager
              onPromptSelect={handlePromptSelect}
              onExecute={handleExecute}
              selectedModel={selectedModel}
              onSelectedModelChange={setSelectedModel}
              isAdminUser={isAdmin}
              selectedPrompt={selectedPrompt}
              onSelectedPromptChange={setSelectedPrompt}
              onSwitchToPrompts={() => setShowPrompts(true)}
              styles={{
                root: {
                  display: 'flex',
                  flexDirection: 'column'
                }
              }}
            />

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
                  {availableSources
                    .filter(doc => doc.vectorized && doc.analyzed) // 只显示已向量化且已分析的文档
                    .map(doc => (
                      <DefaultButton
                        key={doc.id}
                        text={doc.name}
                        checked={selectedSources.includes(doc.id)}
                        onClick={() => toggleSource(doc.id)}
                        styles={{
                          root: {
                            backgroundColor: selectedSources.includes(doc.id) 
                              ? '#e1efff' 
                              : 'white',
                            border: '1px solid #EDEBE9'
                          }
                        }}
                      />
                    ))}
                </Stack>
              </Stack>
            </Stack.Item>
          </Stack>
        </>
      ) : (
        // Prompts 界面
        <Stack styles={{
          root: {
            width: '100%',
            height: '100%'
          }
        }}>
          <PromptsPanel
            selectedModel={selectedModel}
            initialPromptId={selectedPrompt?.id}
            onPromptSelect={(prompt) => {
              setSelectedPrompt(prompt);
              setShowPrompts(false);
            }}
          />
        </Stack>
      )}

      {/* 翻译对话框 */}
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