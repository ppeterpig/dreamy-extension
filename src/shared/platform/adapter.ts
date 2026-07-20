export interface PlatformAdapter {
  name: string;
  match: (url: string) => boolean;
  getContentArea: () => Element | null;
  getTextContainer: () => Element | null;
}

const adapters: PlatformAdapter[] = [];

export function registerAdapter(adapter: PlatformAdapter): void {
  adapters.push(adapter);
}

export function getAdapter(url: string): PlatformAdapter | null {
  return adapters.find((a) => a.match(url)) ?? null;
}
