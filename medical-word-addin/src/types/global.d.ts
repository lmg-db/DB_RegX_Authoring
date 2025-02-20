/// <reference types="office-js" />
/// <reference types="react" />

declare const Office: any;

declare module 'react';
declare module 'react-dom';
declare module 'axios';
declare module '@fluentui/react';
declare module 'zustand';

declare module '@fluentui/react' {
  export * from '@fluentui/react/lib/index';
}

declare global {
  interface Window {
    Word: {
      run: <T>(callback: (context: any) => Promise<T>) => Promise<T>;
    }
  }
}

export {}; 