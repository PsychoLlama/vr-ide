import { keyEventToInput } from '../key-event-to-input';
import { getCameraPlacement, getGazedWindowId } from './camera';
import { createWindow as storeCreateWindow, WindowStore } from './store';
import type { WindowManager } from './window-manager';

/**
 * Subset of KeyboardEvent the dispatcher actually reads. Decoupled
 * from the DOM type so a relay receiver can synthesise one from a JSON
 * payload without going through the browser's event constructors.
 */
export interface DispatchableKeyEvent {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export interface DispatcherDeps {
  store: WindowStore;
  manager: WindowManager;
}

/**
 * Single source of truth for key handling: Alt-keys → window actions,
 * Escape → launcher/select-mode cancel, everything else → focused
 * terminal. Returns true when the event was consumed so a DOM-bound
 * caller can decide whether to preventDefault.
 *
 * Pure function over the store + terminal registry. Used by both the
 * local KeyboardHandler (real keydown events) and the keyboard relay
 * receiver (events arriving from a remote sender).
 */
export function dispatchKeyEvent(
  event: DispatchableKeyEvent,
  deps: DispatcherDeps,
): boolean {
  const { store, manager } = deps;
  const state = store.getState();

  if (event.altKey) {
    switch (event.key.toLowerCase()) {
      case ' ':
        store.dispatch({ type: 'OPEN_LAUNCHER' });
        return true;
      case 'n':
      case 'enter': {
        const { position, rotation } = getCameraPlacement();
        storeCreateWindow(store, position, rotation);
        return true;
      }
      case 'w':
        if (state.focusedWindowId) {
          store.dispatch({
            type: 'DESTROY_WINDOW',
            payload: { id: state.focusedWindowId },
          });
        }
        return true;
      case 'f': {
        const id = getGazedWindowId();
        if (id) {
          store.dispatch({ type: 'FOCUS_WINDOW', payload: { id } });
        }
        return true;
      }
      case 'm':
        if (state.selectMode.active) {
          const { position, rotation } = getCameraPlacement();
          store.dispatch({
            type: 'PLACE_SELECTED_WINDOW',
            payload: { position, rotation },
          });
        } else if (state.focusedWindowId) {
          store.dispatch({ type: 'START_SELECT_MODE' });
        }
        return true;
      case 'q': {
        // Drop out of immersive WebXR back to the embedded scene. The
        // primary trigger is the relay tab, since the headset's own
        // system-level gesture works in-headset.
        const scene = document.querySelector('a-scene');
        void scene?.exitVR();
        return true;
      }
    }
  }

  if (event.key === 'Escape') {
    if (state.launcherOpen) {
      store.dispatch({ type: 'CLOSE_LAUNCHER' });
      return true;
    }
    if (state.selectMode.active) {
      store.dispatch({ type: 'CANCEL_SELECT_MODE' });
      return true;
    }
  }

  if (state.selectMode.active || state.launcherOpen) return false;
  if (!state.focusedWindowId) return false;

  const input = keyEventToInput(event);
  if (input === null) return false;

  return manager.sendInput(state.focusedWindowId, input);
}
