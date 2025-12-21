import React from 'react';
import { useWindowManager } from './WindowManagerContext';
import { TerminalWindow } from './TerminalWindow';
import type { XTermTextureHandle } from './types';

/**
 * WindowRenderer renders all windows from the window manager state.
 * Each window gets its own TerminalWindow component.
 */
export const WindowRenderer: React.FC = () => {
  const {
    state,
    focusWindow,
    destroyWindow,
    registerTerminal,
    unregisterTerminal,
  } = useWindowManager();

  const windows = Array.from(state.windows.values());

  return (
    <>
      {windows.map((window) => {
        const isFocused = state.focusedWindowId === window.id;
        const isSelectMode =
          state.selectMode.active && state.selectMode.windowId === window.id;

        const handleReady = (handle: XTermTextureHandle) => {
          registerTerminal(window.id, handle);
        };

        const handleDestroy = () => {
          unregisterTerminal(window.id);
        };

        const handleExit = () => {
          destroyWindow(window.id);
        };

        const handleClick = () => {
          focusWindow(window.id);
        };

        return (
          <TerminalWindow
            key={window.id}
            window={window}
            focused={isFocused}
            selectMode={isSelectMode}
            onReady={handleReady}
            onDestroy={handleDestroy}
            onExit={handleExit}
            onClick={handleClick}
          />
        );
      })}
    </>
  );
};
