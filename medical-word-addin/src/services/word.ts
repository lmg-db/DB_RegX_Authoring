export const Word = {
  run: (callback: (context: any) => Promise<void>) => {
    // Office.js 实现
    return window.Word.run(callback);
  }
}; 