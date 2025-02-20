/// <reference types="office-js" />

declare module '@fluentui/react';
declare module 'zustand';
declare module 'axios';

interface Window {
  Office: typeof Office;
} 