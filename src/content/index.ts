import '../shared/platform/weread';
import { initTheme } from '../shared/theme';
import { initSelectionListener } from './selection/SelectionListener';
import { renderFloatingIcon } from './floating-icon/FloatingIcon';

const isIframe = window !== window.top;

console.log(`[Dreamy] Content script loaded — v0.3 ${isIframe ? '(iframe)' : '(main)'}`);

// Initialize theme before rendering
if (!isIframe) {
  initTheme();
}

// Create isolation container
const root = document.createElement('div');
root.id = 'dreamy-root';
document.body.appendChild(root);

// Floating icon only in main frame
if (!isIframe) {
  renderFloatingIcon();
}

// Selection listener in all frames
initSelectionListener(root);

console.log('[Dreamy] Initialization complete');
