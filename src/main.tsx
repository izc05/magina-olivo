import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/tokens.css';
import './styles/global.css';
import './styles/field.css';
import './styles/field-map-v2.css';
import './styles/responsive.css';
import './styles/navigation-v2.css';
import './styles/polish-v23.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
