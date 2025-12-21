import React from 'react';
import type { Vector3, TerminalRegistry, XTermTextureHandle } from './types';
import {
  WindowManagerContext,
  WindowManagerContextValue,
  initialState,
  windowManagerReducer,
} from './WindowManagerContext';

let windowIdCounter = 0;

function generateWindowId(): string {
  return `window-${++windowIdCounter}`;
}

interface WindowManagerProviderProps {
  children: React.ReactNode;
}

export const WindowManagerProvider: React.FC<WindowManagerProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = React.useReducer(windowManagerReducer, initialState);
  const terminalRegistry = React.useRef<TerminalRegistry>(new Map());

  const registerTerminal = React.useCallback(
    (id: string, handle: XTermTextureHandle) => {
      terminalRegistry.current.set(id, handle);
    },
    []
  );

  const unregisterTerminal = React.useCallback((id: string) => {
    terminalRegistry.current.delete(id);
  }, []);

  const createWindow = React.useCallback(
    (position: Vector3, rotation: Vector3): string => {
      const id = generateWindowId();
      dispatch({
        type: 'CREATE_WINDOW',
        payload: {
          id,
          position,
          rotation,
          createdAt: Date.now(),
        },
      });
      return id;
    },
    []
  );

  const destroyWindow = React.useCallback((id: string) => {
    dispatch({ type: 'DESTROY_WINDOW', payload: { id } });
  }, []);

  const focusWindow = React.useCallback((id: string) => {
    dispatch({ type: 'FOCUS_WINDOW', payload: { id } });
  }, []);

  const getFocusedWindow = React.useCallback(() => {
    if (!state.focusedWindowId) return null;
    return state.windows.get(state.focusedWindowId) ?? null;
  }, [state.focusedWindowId, state.windows]);

  const startSelectMode = React.useCallback(() => {
    dispatch({ type: 'START_SELECT_MODE' });
  }, []);

  const placeSelectedWindow = React.useCallback(
    (position: Vector3, rotation: Vector3) => {
      dispatch({ type: 'PLACE_SELECTED_WINDOW', payload: { position, rotation } });
    },
    []
  );

  const cancelSelectMode = React.useCallback(() => {
    dispatch({ type: 'CANCEL_SELECT_MODE' });
  }, []);

  const sendInputToFocused = React.useCallback(
    (data: string) => {
      if (!state.focusedWindowId) return;
      const handle = terminalRegistry.current.get(state.focusedWindowId);
      if (handle) {
        handle.sendInput(data);
      }
    },
    [state.focusedWindowId]
  );

  const contextValue: WindowManagerContextValue = React.useMemo(
    () => ({
      state,
      dispatch,
      terminalRegistry,
      registerTerminal,
      unregisterTerminal,
      createWindow,
      destroyWindow,
      focusWindow,
      getFocusedWindow,
      startSelectMode,
      placeSelectedWindow,
      cancelSelectMode,
      sendInputToFocused,
    }),
    [
      state,
      registerTerminal,
      unregisterTerminal,
      createWindow,
      destroyWindow,
      focusWindow,
      getFocusedWindow,
      startSelectMode,
      placeSelectedWindow,
      cancelSelectMode,
      sendInputToFocused,
    ]
  );

  return (
    <WindowManagerContext.Provider value={contextValue}>
      {children}
    </WindowManagerContext.Provider>
  );
};
