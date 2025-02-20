import * as React from 'react';
import { Stack, Text, PrimaryButton, Spinner, DefaultButton, Label, MessageBar, MessageBarType, TextField, Dropdown, IDropdownOption, Toggle, ChoiceGroup, Panel } from '@fluentui/react';
import { useTranslationStore } from '../store/translationStore';
import { translateText, generateText, sendLog, downloadComplianceReport } from '../services/api';
import { PromptManager } from './PromptManager';
import { authService } from '../services/authService';
import { api } from '../services/api';
import { AttributeManager } from './AttributeManager';
import { useAttributeStore } from '../store/attributeStore';
import { SourcesManager } from './SourcesManager';
import { DataVisualizer } from './DataVisualizer';
import { ChatPanel } from './ChatPanel';
import { useChatStore } from '../store/chatStore';
import { PromptsPanel } from './PromptsPanel';


const containsChinese = (text: string) => {
  return /[\u4e00-\u9fa5]/.test(text);
};

export const TranslationPanel: React.FC = () => {
  const {
    isProcessing,
    selectedText,
    translatedText,
    error,
    setProcessing,
    setTranslatedText,
    setError,
    setSelectedText,
  } = useTranslationStore();

  const [generatedText, setGeneratedText] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [complianceResult, setComplianceResult] = React.useState('');
  const [isTableView, setIsTableView] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState<'mistral' | 'llama'>('mistral');
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [customPrompt, setCustomPrompt] = React.useState('');
  const [isAdmin, setIsAdmin] = React.useState(true);
  const [selectedPrompt, setSelectedPrompt] = React.useState<Prompt>();
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [selectedFunction, setSelectedFunction] = React.useState<
    'chat' | 'prompts' | 'attributes' | 'sources' | 'data'
  >('chat');  // 默认显示 RegChat
  const [actionSubMenu, setActionSubMenu] = React.useState<'translate' | 'prompt'>();
  const [translationMode, setTranslationMode] = React.useState<'fast' | 'professional'>('fast');
  const { selectedTemplate } = useAttributeStore();
  const [showAttributesPanel, setShowAttributesPanel] = React.useState(false);
  const [activePanel, setActivePanel] = React.useState<
    'translate' | 'prompt' | 'attributes' | 'sources' | 'data' | 'chat'
  >();

  const handleTranslate = async () => {
    if (!selectedText) return;

    try {
      setProcessing(true);
      const params = {
        text: selectedText,
        mode: translationMode,
        model: 'local',
        llm_model: selectedModel,
        direction: containsChinese(selectedText) ? 'zh2en' : 'en2zh'
      };
      
      const result = await translateText(params);
      setTranslatedText(result.translatedText);
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleParaphrase = async () => {
    // 实现改写功能
  };

  const replaceSelectedText = async (text: string) => {
    try {
      await Word.run(async (context) => {
        const range = context.document.getSelection();
        range.insertText(text, 'Replace');
        await context.sync();
      });
      setTranslatedText('');
      setSelectedText('');
    } catch (err) {
      setError('替换文本失败: ' + err.message);
    }
  };

  // 获取选中的文本
  const getSelectedText = async () => {
    try {
      await Word.run(async (context) => {
        const range = context.document.getSelection();
        range.load('text');
        await context.sync();
        const text = range.text.trim();
        
        console.log('Selected text:', text.length, 'Current function:', selectedFunction);
        
        if (text.length === 0 && selectedFunction !== 'chat') {
          console.log('Clearing function selection');
          setSelectedFunction(undefined);
        }
        setSelectedText(text);
      });
    } catch (error) {
      console.error('Error getting selection:', error);
      setError('Failed to get selected text');
    }
  };

  const handleSelectionChange = async () => {
    console.log('Selection changed, current function:', selectedFunction);
    
    // 定义需要保持面板开启的功能列表
    const keepOpenFunctions = ['chat', 'sources', 'attributes', 'data'];
    
    // 当指定功能激活时跳过处理
    if (selectedFunction && keepOpenFunctions.includes(selectedFunction)) {
      console.log('Skipping selection change handling for', selectedFunction);
      return;
    }

    // 原有重置逻辑保持不变
    console.log('Resetting states for non-whitelist function');
    setTranslatedText('');
    setGeneratedText('');
    setComplianceResult('');
    setError('');
    
    await getSelectedText();
  };

  const handleGenerate = async () => {
    if (!selectedText) {
      setError('Please select text to process');
      return;
    }
    
    try {
      setIsGenerating(true);
      setError('');
      setTranslatedText('');
      setComplianceResult('');
      
      const result = await generateText({
        text: selectedText,
        template: 'csr',
        llm_model: selectedModel
      });
      
      setGeneratedText(result.generatedText);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplianceCheck = async () => {
    if (!selectedText) return;
    
    try {
      const result = await generateText({
        text: selectedText,
        template: 'compliance-check',
        llm_model: 'llama'
      });
      setComplianceResult(result.generatedText);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatComplianceResult = (result: string) => {
    // 分割不同部分
    const sections = result.split(/\d+\.\s+/);
    
    // 移除空部分
    const validSections = sections.filter(s => s.trim());
    
    // 格式化每个部分
    return validSections.map((section, index) => {
      // 找到原始的序号
      const match = result.match(new RegExp(`${index + 1}\\.\\s+(.*?):`));
      const title = match ? match[1] : `Section ${index + 1}`;
      
      // 特殊处理参考文献部分
      if (title.includes('References')) {
        const refs = section.split(/(?=•\s+)/).filter(Boolean);
        
        const formattedRefs = refs
          .map(ref => {
            const cleanRef = ref.replace(/^•\s+/, '').trim();
            const urlMatch = cleanRef.match(/\((https?:\/\/[^)]+)\)/);
            if (urlMatch) {
              const text = cleanRef.replace(/\s*\(https?:\/\/[^)]+\)/, '').trim();
              return `${text}\n     ${urlMatch[1]}`;
            }
            return cleanRef;
          })
          .filter(Boolean);
        
        return `${index + 1}. ${title}:\n${formattedRefs.map(ref => `   • ${ref}`).join('\n\n')}`;
      } else {
        // 处理其他部分
        const content = section
          .split(/(?=•\s+|[a-z]\)\s+)/)  // 按bullet points和字母编号分割
          .map(item => {
            // 处理字母编号的子项
            if (item.match(/^[a-z]\)\s+/)) {
              return '   ' + item.trim();  // 增加缩进
            }
            // 处理普通项
            return item.replace(/^•\s+/, '').trim();
          })
          .filter(Boolean)
          // 移除与标题重复的第一个项
          .filter((item, idx, arr) => {
            if (idx === 0) {
              return !item.includes(title);
            }
            return true;
          });
        
        return `${index + 1}. ${title}:\n${content.map(item => 
          item.startsWith('   ') ? item : `   • ${item}`
        ).join('\n')}`;
      }
    }).join('\n\n');
  };

  const handleDownload = async () => {
    if (!complianceResult) return;
    
    try {
      setIsDownloading(true);
      setError('');
      
      const fileName = `compliance_report_${new Date().toISOString().split('T')[0]}.docx`;
      await downloadComplianceReport({
        content: formatComplianceResult(complianceResult),
        fileName: fileName
      });
      
    } catch (err) {
      console.error('Download error:', err);
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  React.useEffect(() => {
    const init = async () => {
      try {
        // 注册选择变化事件处理器
        Office.context.document.addHandlerAsync(
          Office.EventType.DocumentSelectionChanged,
          handleSelectionChange
        );
      } catch (error) {
        console.error('Failed to register selection handler:', error);
      }
    };
    init();

    // 清理函数
    return () => {
      Office.context.document.removeHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        { handler: handleSelectionChange },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Failed) {
            console.error('Failed to remove selection handler:', result.error);
          }
        }
      );
    };
  }, []);

  // 在组件中添加useEffect监听文本选中状态
  React.useEffect(() => {
    const checkSelection = async () => {
      try {
        await Word.run(async (context) => {
          const range = context.document.getSelection();
          range.load('text');
          await context.sync();
          const text = range.text.trim();
          
          // 仅当不在白名单功能时清除状态
          if (text.length === 0 && !keepOpenFunctions.includes(selectedFunction)) {
            console.log('Clearing function selection');
            setSelectedFunction(undefined);
          }
        });
      } catch (error) {
        console.error('Error checking selection:', error);
      }
    };
    
    const interval = setInterval(checkSelection, 500);
    return () => clearInterval(interval);
  }, [selectedFunction]); // 添加依赖项

  // 将生成的文本转换为表格格式
  const convertToTable = (text: string) => {
    try {
      const sections = text.split('\n').filter(line => line.trim());
      const tableRows: { 
        header: string; 
        content: string; 
        level: number;
        type: 'section' | 'subsection' | 'content' | 'list-item';
        parent?: string;
      }[] = [];
      
      let currentContext = {
        section: '',
        subsection: '',
        content: [] as string[]
      };
      
      sections.forEach(line => {
        const trimmedLine = line.trim();
        
        // 主要章节标题 (e.g., "**Ethics**", "**Study Design**")
        if (/^\*\*[^*]+\*\*$/.test(trimmedLine)) {
          // 保存之前的内容
          if (currentContext.content.length > 0) {
            tableRows.push({
              header: currentContext.subsection || currentContext.section,
              content: currentContext.content.join('\n'),
              level: currentContext.subsection ? 2 : 1,
              type: 'content',
              parent: currentContext.section
            });
            currentContext.content = [];
          }
          
          currentContext.section = trimmedLine;
          currentContext.subsection = '';
          
          tableRows.push({
            header: trimmedLine,
            content: '',
            level: 1,
            type: 'section'
          });
        }
        // 子标题 (e.g., "IRB/IEC approvals", "Ethical conduct statement")
        else if (/^[A-Za-z].*:$/.test(trimmedLine)) {
          if (currentContext.content.length > 0) {
            tableRows.push({
              header: currentContext.subsection || currentContext.section,
              content: currentContext.content.join('\n'),
              level: 2,
              type: 'content',
              parent: currentContext.section
            });
            currentContext.content = [];
          }
          
          currentContext.subsection = trimmedLine;
          tableRows.push({
            header: trimmedLine,
            content: '',
            level: 2,
            type: 'subsection',
            parent: currentContext.section
          });
        }
        // 列表项 (e.g., "* Ethics Committee Approval", "* Informed Consent")
        else if (/^\*\s+/.test(trimmedLine)) {
          tableRows.push({
            header: trimmedLine.replace(/^\*\s+/, ''),
            content: '',
            level: 3,
            type: 'list-item',
            parent: currentContext.subsection || currentContext.section
          });
        }
        // 普通内容
        else if (trimmedLine) {
          currentContext.content.push(trimmedLine);
        }
      });
      
      // 添加最后剩余的内容
      if (currentContext.content.length > 0) {
        tableRows.push({
          header: currentContext.subsection || currentContext.section,
          content: currentContext.content.join('\n'),
          level: currentContext.subsection ? 2 : 1,
          type: 'content',
          parent: currentContext.section
        });
      }
      
      return tableRows;
    } catch (error) {
      console.error('转换表格失败:', error);
      return [];
    }
  };

  const handlePromptSelect = (content: string, modelType?: 'generation' | 'compliance') => {
    setCustomPrompt(content);
    if (modelType === 'compliance') {
      setSelectedModel('llama'); // 合规检查使用Llama
    } else {
      setSelectedModel('mistral'); // 默认使用Mistral
    }
  };

  const handleExecute = async () => {
    console.log('[DEBUG] Execution params:', {
      hasText: !!selectedText,
      hasPrompt: !!selectedPrompt,
      promptId: selectedPrompt?.id
    });
    
    if (!selectedText || !selectedPrompt) {
      setError('Please select text and a prompt first');
      return;
    }

    try {
      setIsExecuting(true);
      setError('');
      setTranslatedText(''); // 清空之前的结果
      setGeneratedText('');
      setComplianceResult('');
      
      const response = await api.post('/api/execute', {
        text: selectedText,
        prompt_id: selectedPrompt.id,
        model: selectedModel
      });
      
      setTranslatedText(response.data.result);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  // 处理功能选择
  const handleFunctionSelect = (functionName: string) => {
    setSelectedFunction(functionName as any);
  };

  // 返回主界面
  const handleBack = () => {
    setSelectedFunction(undefined);
  };

  const getButtonStyles = (functionName: string) => ({
    root: {
      minWidth: 120,
      height: 40,
      backgroundColor: selectedFunction === functionName ? '#0078d4' : '#ffffff',
      color: selectedFunction === functionName ? '#ffffff' : '#0078d4',
      border: '1px solid #0078d4',
      borderRadius: 4,
      ':hover': {
        backgroundColor: selectedFunction === functionName ? '#106ebe' : '#f0f8ff',
        color: selectedFunction === functionName ? '#ffffff' : '#0078d4'
      }
    }
  });

  return (
    <Stack styles={{
      root: {
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        padding: '0',
        color: '#333',
        fontFamily: 'Arial, sans-serif',
        position: 'relative'
      }
    }}>
      {/* 主要内容区域 */}
      <Stack tokens={{ childrenGap: 20 }} styles={{
        root: {
          maxWidth: '1200px',
          margin: '20px auto',
          padding: '0 20px',
          paddingBottom: '60px'
        }
      }}>
        {/* Logo */}
        <Stack.Item align="center">
          <img 
            src="/assets/logo1.svg" 
            alt="DoubleBridge Logo" 
            style={{
              height: '50px',
              marginBottom: '20px'
            }}
          />
        </Stack.Item>
      
        {/* 在后台保持模型选择逻辑，但不在界面显示 */}
        <input type="hidden" value={selectedModel} />
      
        {/* 错误信息 */}
      {error && (
        <Stack.Item>
            <MessageBar 
              messageBarType={MessageBarType.error}
              styles={{
                root: {
                  borderRadius: '6px',
                  border: '1px solid #d83b01'
                }
              }}
            >
              {error}
            </MessageBar>
        </Stack.Item>
      )}
      
        {/* 导航按钮组 */}
        <Stack horizontal tokens={{ childrenGap: 10 }} horizontalAlign="center" wrap>
          <PrimaryButton
            text="RegChat"
            onClick={() => handleFunctionSelect('chat')}
            checked={selectedFunction === 'chat'}
            styles={getButtonStyles('chat')}
          />
          <PrimaryButton
            text="Prompts"
            onClick={() => handleFunctionSelect('prompts')}
            checked={selectedFunction === 'prompts'}
            styles={getButtonStyles('prompts')}
          />
          <PrimaryButton
            text="Attributes"
            onClick={() => handleFunctionSelect('attributes')}
            checked={selectedFunction === 'attributes'}
            styles={getButtonStyles('attributes')}
          />
          <PrimaryButton
            text="Sources"
            onClick={() => handleFunctionSelect('sources')}
            checked={selectedFunction === 'sources'}
            styles={getButtonStyles('sources')}
          />
          <PrimaryButton
            text="Data Sections"
            onClick={() => handleFunctionSelect('data')}
            checked={selectedFunction === 'data'}
            styles={getButtonStyles('data')}
          />
        </Stack>

        {/* 子页面内容区域 */}
        <Stack.Item styles={{
          root: {
            marginTop: 20,
            padding: 20,
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }
        }}>
          {selectedFunction === 'chat' && <ChatPanel onClose={() => {}} />}
          {selectedFunction === 'prompts' && <PromptsPanel />}
          {selectedFunction === 'attributes' && <AttributeManager />}
          {selectedFunction === 'sources' && <SourcesManager />}
          {selectedFunction === 'data' && <DataVisualizer />}
        </Stack.Item>

        {/* 处理中状态 */}
        {(isProcessing || isGenerating || isChecking) && (
          <Stack.Item>
            <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="center" horizontalAlign="center">
              <Spinner label="Processing..." />
            </Stack>
          </Stack.Item>
        )}

        {/* 执行中状态 */}
        {isExecuting && (
      <Stack.Item>
            <Spinner 
              label="Processing..." 
              labelPosition="right"
              styles={{
                root: {
                  margin: '20px 0',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px'
                }
              }}
            />
          </Stack.Item>
        )}

        {/* 结果显示 */}
        {(translatedText || generatedText || complianceResult) && selectedText && (
          <Stack.Item>
            <Stack tokens={{ childrenGap: 10 }}>
              <Label styles={{ root: { fontSize: '18px', fontWeight: '600', color: '#004085' } }}>
                {selectedPrompt?.title ? `${selectedPrompt.title} Result` : 'Execution Result'}
              </Label>
              
              {isExecuting ? (
                <Spinner label="Processing..." ariaLive="assertive" labelPosition="right" />
              ) : (
                <Text styles={{ 
                  root: { 
                    backgroundColor: '#e6f3ff', 
                    padding: 10,
                    borderRadius: '4px',
                    border: '1px solid #c7e0f4',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.5',
                    fontSize: '14px'
                  }
                }}>
                  {translatedText || generatedText || complianceResult}
                </Text>
              )}
            </Stack>
          </Stack.Item>
        )}
      </Stack>

      {/* 固定在底部的AI提示 */}
      <Stack.Item styles={{
        root: {
          position: 'absolute',
          bottom: '20px',
          width: '100%',
          textAlign: 'center'
        }
      }}>
        <Text styles={{
          root: {
            color: '#666',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px'
          }
        }}>
          <span>⚡ Real-time processing powered by</span>
          <span style={{ 
            fontWeight: 'bold', 
            fontStyle: 'italic',
            color: '#0078d4'
          }}>DoubleBridge Technologies GenAI</span>
        </Text>
      </Stack.Item>
    </Stack>
  );
}; 