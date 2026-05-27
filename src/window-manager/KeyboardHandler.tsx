import React from 'react';
import { useKeyDispatcher } from './useKeyDispatcher';

/**
 * KeyboardHandler captures local DOM keydown events and feeds them to
 * the shared dispatcher. The remote keyboard relay (KeyboardRelay) does
 * the same with events arriving over the WebSocket — both end up running
 * the same logic via `useKeyDispatcher`.
 */
export const KeyboardHandler: React.FC = () => {
  const dispatch = useKeyDispatcher();

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't intercept typing in actual text fields (rare in VR, but the
      // launcher's search input is one).
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (dispatch(event)) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [dispatch]);

  return null;
};
