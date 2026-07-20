import type { BookProfile } from '../types';

function getBookId(): string {
  // Use pathname only (no query, no hash) — stable across chapter changes
  const path = window.location.pathname;
  // WeChat Read: /web/reader/{bookId} — take everything after /web/reader/
  const m = path.match(/\/web\/reader\/(.+)/);
  if (m) {
    // Take just the alphanumeric+underscore book ID (first segment)
    const rest = m[1];
    const idMatch = rest.match(/^([a-zA-Z0-9_]+)/);
    if (idMatch) return idMatch[1];
    return rest;
  }
  // Fallback: use full path (stable within same book)
  return path.replace(/\/$/, '');
}

function storageKey(): string {
  return `dreamy_book_${getBookId()}`;
}

export async function getBookProfile(): Promise<BookProfile | null> {
  const key = storageKey();
  console.log('[Dreamy] getBookProfile key:', key);
  const result = await chrome.storage.local.get(key);
  const val = result[key];
  if (val && typeof val === 'object' && 'bookId' in val) {
    console.log('[Dreamy] getBookProfile found direct, chars:', (val as BookProfile).characters?.length ?? 0);
    return val as BookProfile;
  }

  // Fallback: search all dreamy_book_ keys
  const all = await chrome.storage.local.get(null);
  const bookKeys = Object.keys(all).filter((k) => k.startsWith('dreamy_book_') && all[k] && typeof all[k] === 'object' && 'bookId' in all[k]);

  if (bookKeys.length === 1) {
    // Only one profile — use it regardless of key mismatch
    const p = all[bookKeys[0]] as BookProfile;
    await chrome.storage.local.set({ [key]: p });
    console.log('[Dreamy] getBookProfile using only profile:', bookKeys[0]);
    return p;
  }

  if (bookKeys.length > 1) {
    // Multiple profiles — try exact key match first, then migrate
    for (const k of bookKeys) {
      const p = all[k] as BookProfile;
      if (p.bookId === getBookId()) {
        await chrome.storage.local.set({ [key]: p });
        console.log('[Dreamy] getBookProfile migrated:', k, '→', key);
        return p;
      }
    }
    // Last resort: return most recent
    const sorted = bookKeys.sort((a, b) => ((all[b] as BookProfile).updatedAt || 0) - ((all[a] as BookProfile).updatedAt || 0));
    console.log('[Dreamy] getBookProfile using most recent:', sorted[0]);
    return all[sorted[0]] as BookProfile;
  }

  console.log('[Dreamy] getBookProfile not found');
  return null;
}

export async function saveBookProfile(profile: BookProfile): Promise<void> {
  profile.updatedAt = Date.now();
  const key = storageKey();
  console.log('[Dreamy] saveBookProfile key:', key, 'chars:', profile.characters?.length ?? 0);
  await chrome.storage.local.set({ [key]: profile });
}

export async function deleteBookProfile(): Promise<void> {
  await chrome.storage.local.remove(storageKey());
}

export async function hasBookProfile(): Promise<boolean> {
  const p = await getBookProfile();
  return p !== null;
}

export { getBookId };
