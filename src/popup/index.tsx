import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './Popup';
import '../styles/global.css';
import { initTheme } from '../shared/theme';

initTheme().then(() => {
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
});
