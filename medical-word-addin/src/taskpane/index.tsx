import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Taskpane } from './taskpane';

/* global document, Office */

Office.initialize = async (reason) => {
  try {
    (window as any).logDebug('Office.initialize 开始');
    ReactDOM.render(
      <Taskpane />,
      document.getElementById('container')
    );
    (window as any).logDebug('Office.initialize 完成');
  } catch (error) {
    (window as any).logDebug('Office.initialize 失败: ' + error.message);
    console.error('Office 初始化失败:', error);
  }
}; 