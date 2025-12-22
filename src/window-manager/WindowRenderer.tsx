import React from 'react';
import { useWindowManager } from './WindowManagerContext';
import { TerminalWindow } from './TerminalWindow';
import { BrowserWindow3D } from './BrowserWindow3D';
import type { XTermTextureHandle } from './types';

/**
 * WindowRenderer renders all windows from the window manager state.
 * Each window gets its own component based on its type.
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

        const handleClick = () => {
          focusWindow(window.id);
        };

        if (window.type === 'browser') {
          return (
            <BrowserWindow3D
              key={window.id}
              window={window}
              focused={isFocused}
              selectMode={isSelectMode}
              onClick={handleClick}
            />
          );
        }

        // Default to terminal window
        const handleReady = (handle: XTermTextureHandle) => {
          registerTerminal(window.id, handle);
        };

        const handleDestroy = () => {
          unregisterTerminal(window.id);
        };

        const handleExit = () => {
          destroyWindow(window.id);
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
