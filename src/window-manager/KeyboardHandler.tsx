import React from 'react';
import { dispatchKeyEvent } from '../vr/dispatcher';
import { useWindowManager } from './WindowManagerContext';

/**
 * KeyboardHandler captures local DOM keydown events and feeds them to
 * the shared dispatcher. The remote keyboard relay (KeyboardRelay) does
 * the same with events arriving over the WebSocket — both end up
 * running the same logic via `dispatchKeyEvent`.
 */
export const KeyboardHandler: React.FC = () => {
  const { store, terminalRegistry } = useWindowManager();

  React.useEffect(() => {
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

      const consumed = dispatchKeyEvent(event, {
        store,
        terminals: terminalRegistry.current,
      });
      if (consumed) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [store, terminalRegistry]);

  return null;
};
