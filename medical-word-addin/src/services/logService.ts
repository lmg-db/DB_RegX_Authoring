export const logService = {
  log: (message: string) => {
    // 写入Word文档注释
    Word.run(async (context) => {
      const range = context.document.getSelection();
      range.insertComment(message, "DebugLog");
      await context.sync();
    }).catch(error => {
      console.error('Word comment error:', error);
    });
    
    // 显示任务窗格通知
    Office.context.ui.displayDialogAsync(
      `data:text/plain,${encodeURIComponent(message)}`,
      { height: 40, width: 300 }
    );
    
    // 写入本地存储
    const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
    logs.push(new Date().toISOString() + ': ' + message);
    localStorage.setItem('debugLogs', JSON.stringify(logs));
  }
}; 