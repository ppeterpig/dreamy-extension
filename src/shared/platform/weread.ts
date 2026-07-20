import type { PlatformAdapter } from './adapter';
import { registerAdapter } from './adapter';

const wereadAdapter: PlatformAdapter = {
  name: '微信讀書',
  match: (url: string) => url.includes('weread.qq.com'),
  getContentArea: () => document.querySelector('.readerContainer') ?? document.body,
  getTextContainer: () =>
    document.querySelector('.readerContent') ??
    document.querySelector('.app_content') ??
    document.body,
};

registerAdapter(wereadAdapter);
