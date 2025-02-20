import * as React from 'react';
import { TranslationPanel } from '../components/TranslationPanel';
import { DebugPanel } from '../components/DebugPanel';

export const Taskpane: React.FC = () => {
  React.useEffect(() => {
    (window as any).logDebug('Taskpane 组件已加载');
  }, []);

  const testBackendConnection = async () => {
    try {
      (window as any).logDebug('开始测试后端连接');
      const response = await fetch('https://localhost:8000/test-connection', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      const data = await response.json();
      (window as any).logDebug('后端响应: ' + JSON.stringify(data));
    } catch (error) {
      (window as any).logDebug('后端连接失败: ' + error.message);
      if (error instanceof TypeError) {
        (window as any).logDebug('错误类型: ' + error.name);
        (window as any).logDebug('错误堆栈: ' + error.stack);
      }
    }
  };

  const testWordInteraction = async () => {
    try {
      (window as any).logDebug('开始测试 Word 交互');
      await Word.run(async (context) => {
        const range = context.document.getSelection();
        range.load('text');
        await context.sync();
        (window as any).logDebug('选中的文本: ' + range.text);
      });
    } catch (error) {
      (window as any).logDebug('Word 交互失败: ' + error.message);
    }
  };

  return (
    <div>
      <TranslationPanel />
      <DebugPanel />
      <div className="debug-info">
        {/* 调试信息内容 */}
      </div>
    </div>
  );
}; 