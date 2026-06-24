import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { QueryProvider } from './providers/QueryProvider.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            fontSize: '13px',
            fontWeight: '600',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#1e293b' },
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#1e293b' },
          },
        }}
      />
    </QueryProvider>
  </StrictMode>
);
