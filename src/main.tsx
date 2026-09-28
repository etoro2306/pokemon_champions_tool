import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { DexProvider } from './data/DexContext';
import { StoreProvider } from './state/store';
import { ToastProvider } from './components/ui';
import './styles/global.css';
import './styles/pages.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DexProvider>
      <StoreProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </StoreProvider>
    </DexProvider>
  </StrictMode>,
);
