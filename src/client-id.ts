const STORAGE_KEY = 'vr-ide:client-id';

/**
 * Returns this browser's persistent client ID, generating one on first
 * use. The PTY server gates connections on whether the ID appears in
 * `.authorized-clients.json`.
 */
export function getClientId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
