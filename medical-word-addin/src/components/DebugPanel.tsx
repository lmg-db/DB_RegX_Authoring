import React from 'react';
import { useDebugStore } from '../store/debugStore';

export const DebugPanel = () => {
  const { showDebug, toggleDebug } = useDebugStore();
  const [logs, setLogs] = React.useState<string[]>([]);

  React.useEffect(() => {
    const storedLogs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
    setLogs(storedLogs);
  }, []);

  return showDebug ? (
    <div className="debug-panel">
      <button onClick={toggleDebug}>Hide Debug</button>
      <div style={{ position: 'fixed', bottom: 0, right: 0, background: 'white', border: '1px solid #ccc', padding: 10, zIndex: 9999 }}>
        <h3>Debug Logs</h3>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {logs.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      </div>
    </div>
  ) : null;
}; 