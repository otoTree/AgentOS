import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initElectroview } from './rpc';
import './output.css';

const startElectroview = () => {
  const globalAny = window as typeof window & {
    __electrobunRpcSocketPort?: number;
    __electrobunWebviewId?: number;
  };
  if (!globalAny.__electrobunRpcSocketPort || !globalAny.__electrobunWebviewId) {
    console.log("[RPC] Waiting for electrobun globals");
    setTimeout(startElectroview, 50);
    return;
  }
  console.log("[RPC] Electrobun globals ready", {
    webviewId: globalAny.__electrobunWebviewId,
    port: globalAny.__electrobunRpcSocketPort
  });
  import('electrobun/view').then(() => {
    initElectroview();
  });
};

startElectroview();

const root = createRoot(document.getElementById('app')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
