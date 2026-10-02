import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Global Unhandled Window Error Handlers
window.onerror = function (message, source, lineno, colno, error) {
  console.error('CryptoTrace Global Window Error:', { message, source, lineno, colno, error });
};

window.onunhandledrejection = function (event) {
  console.error('CryptoTrace Unhandled Promise Rejection:', event.reason);
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
