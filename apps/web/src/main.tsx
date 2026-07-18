import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';

const rootElement = document.getElementById('root');

if (rootElement === null) {
    throw new Error(
        '[SACS] Root element #root not found. Check index.html.',
    );
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);