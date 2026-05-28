import type { Scene } from 'aframe';
import { getClientId } from '../client-id';
import { isRelayKeyEvent } from '../keyboard-relay-protocol';
import { getCameraPlacement } from './camera';
import { dispatchKeyEvent } from './dispatcher';
import type { WindowStore } from './store';
import { WindowManager } from './window-manager';

/**
 * Boots the imperative VR core against an already-mounted A-Frame
 * scene: spawns the `WindowManager`, attaches the local keyboard
 * listener, opens the keyboard-relay and session-presence sockets, and
 * returns a teardown that reverses each of those in order.
 *
 * Everything React used to do via per-concern glue components
 * (`KeyboardHandler`, `KeyboardRelay`, `SessionPresence`,
 * `SceneWindows`) collapses into this one function.
 */
export function mountVrCore(scene: Scene, store: WindowStore): () => void {
  const manager = new WindowManager({
    parent: scene,
    store,
    getSelectPlacement: getCameraPlacement,
  });
  manager.start();

  const detachKeyboard = attachLocalKeyboard(store, manager);
  const closeRelay = openKeyboardRelay(store, manager);
  const closePresence = openSessionPresence(scene);

  return () => {
    closePresence();
    closeRelay();
    detachKeyboard();
    manager.stop();
  };
}

function attachLocalKeyboard(
  store: WindowStore,
  manager: WindowManager,
): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Don't intercept typing in actual text fields (rare in VR, but
    // the launcher's search input is one).
    const target = event.target as HTMLElement | null;
    if (
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.isContentEditable
    ) {
      return;
    }

    if (dispatchKeyEvent(event, { store, manager })) {
      event.preventDefault();
    }
  };

  window.addEventListener('keydown', handleKeyDown, true);
  return () => window.removeEventListener('keydown', handleKeyDown, true);
}

function openKeyboardRelay(
  store: WindowStore,
  manager: WindowManager,
): () => void {
  const clientId = getClientId();
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(
    `${wsProtocol}//${location.host}/keyboard/${clientId}`,
  );

  ws.onmessage = (event: MessageEvent<string>) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!isRelayKeyEvent(parsed)) return;
    dispatchKeyEvent(parsed, { store, manager });
  };

  return () => ws.close();
}

function openSessionPresence(scene: Scene): () => void {
  const clientId = getClientId();
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(
    `${wsProtocol}//${location.host}/session/${clientId}`,
  );

  let intentionalClose = false;
  ws.addEventListener('close', () => {
    if (intentionalClose) return;
    if (scene.is('vr-mode')) {
      void scene.exitVR();
    }
  });

  return () => {
    intentionalClose = true;
    ws.close();
  };
}
