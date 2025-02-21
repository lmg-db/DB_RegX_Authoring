import { useDebugStore } from '../store/debugStore';
import { MainInterface } from './MainInterface';
import { DebugPanel } from './DebugPanel';
import React from 'react';

const App = () => {
  const { showDebug } = useDebugStore();
  
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        useDebugStore.getState().toggleDebug();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="app-container">
      <MainInterface />
      {showDebug && <DebugPanel />}
    </div>
  );
};

export default App; 