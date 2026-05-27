import React from 'react';
import { useWindowManager } from './WindowManagerContext';
import { useCameraDirection } from './hooks/useCameraDirection';
import { keyEventToInput } from '../key-event-to-input';

/**
 * Subset of KeyboardEvent the dispatcher actually reads. Decoupled from
 * the DOM type so a relay receiver can synthesise one from a JSON
 * payload without going through the browser's event constructors.
 */
export interface DispatchableKeyEvent {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

/**
 * Single source of truth for key handling: Alt-keys → window actions,
 * Escape → launcher/select-mode cancel, everything else → focused
 * terminal. Returns true when the event was consumed so a DOM-bound
 * caller can decide whether to preventDefault.
 *
 * Used by both the in-headset KeyboardHandler (real keydown events) and
 * the keyboard relay receiver (events arriving from a remote sender).
 */
export function useKeyDispatcher(): (event: DispatchableKeyEvent) => boolean {
  const {
    state,
    createWindow,
    destroyWindow,
    startSelectMode,
    placeSelectedWindow,
    cancelSelectMode,
    openLauncher,
    closeLauncher,
    sendInputToFocused,
  } = useWindowManager();

  const getPlacement = useCameraDirection();

  // Latest state via ref so the returned function can stay stable across
  // state changes — important because the relay receiver registers it as
  // a long-lived WebSocket handler.
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  return React.useCallback(
    (event: DispatchableKeyEvent): boolean => {
      const current = stateRef.current;

      if (event.altKey) {
        switch (event.key.toLowerCase()) {
          case ' ':
            openLauncher();
            return true;
          case 'n':
          case 'enter': {
            const { position, rotation } = getPlacement();
            createWindow(position, rotation);
            return true;
          }
          case 'w':
            if (current.focusedWindowId) {
              destroyWindow(current.focusedWindowId);
            }
            return true;
          case 'm':
            if (current.selectMode.active) {
              const { position, rotation } = getPlacement();
              placeSelectedWindow(position, rotation);
            } else if (current.focusedWindowId) {
              startSelectMode();
            }
            return true;
          case 'q': {
            // Drop out of immersive WebXR back to the embedded scene. The
            // primary trigger is the relay tab, since the headset's own
            // system-level gesture works in-headset.
            const scene = document.querySelector('a-scene');
            scene?.exitVR();
            return true;
          }
        }
      }

      if (event.key === 'Escape') {
        if (current.launcherOpen) {
          closeLauncher();
          return true;
        }
        if (current.selectMode.active) {
          cancelSelectMode();
          return true;
        }
      }

      if (current.selectMode.active || current.launcherOpen) return false;
      if (!current.focusedWindowId) return false;

      const input = keyEventToInput(event);
      if (input === null) return false;
      sendInputToFocused(input);
      return true;
    },
    [
      createWindow,
      destroyWindow,
      startSelectMode,
      placeSelectedWindow,
      cancelSelectMode,
      openLauncher,
      closeLauncher,
      sendInputToFocused,
      getPlacement,
    ],
  );
}
