import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserAppShell } from './components/shell/BrowserAppShell';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserAppShell>
      <App />
    </BrowserAppShell>
  </React.StrictMode>
);