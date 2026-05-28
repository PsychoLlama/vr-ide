import React from 'react';
import { WindowStore, createWindow as storeCreateWindow } from '../vr/store';
import type { Vector3, TerminalRegistry, TerminalInputSink } from './types';
import {
  WindowManagerContext,
  WindowManagerContextValue,
} from './WindowManagerContext';

interface WindowManagerProviderProps {
  children: React.ReactNode;
}

export const WindowManagerProvider: React.FC<WindowManagerProviderProps> = ({
  children,
}) => {
  const storeRef = React.useRef<WindowStore | null>(null);
  storeRef.current ??= new WindowStore();
  const store = storeRef.current;

  const state = React.useSyncExternalStore(store.subscribe, store.getState);

  const terminalRegistry = React.useRef<TerminalRegistry>(new Map());

  const registerTerminal = React.useCallback(
    (id: string, sendInput: TerminalInputSink) => {
      terminalRegistry.current.set(id, sendInput);
    },
    [],
  );

  const unregisterTerminal = React.useCallback((id: string) => {
    terminalRegistry.current.delete(id);
  }, []);

  const createWindow = React.useCallback(
    (position: Vector3, rotation: Vector3): string => {
      return storeCreateWindow(store, position, rotation);
    },
    [store],
  );

  const destroyWindow = React.useCallback(
    (id: string) => {
      store.dispatch({ type: 'DESTROY_WINDOW', payload: { id } });
    },
    [store],
  );

  const focusWindow = React.useCallback(
    (id: string) => {
      store.dispatch({ type: 'FOCUS_WINDOW', payload: { id } });
    },
    [store],
  );

  const getFocusedWindow = React.useCallback(() => {
    const current = store.getState();
    if (!current.focusedWindowId) return null;
    return current.windows.get(current.focusedWindowId) ?? null;
  }, [store]);

  const startSelectMode = React.useCallback(() => {
    store.dispatch({ type: 'START_SELECT_MODE' });
  }, [store]);

  const placeSelectedWindow = React.useCallback(
    (position: Vector3, rotation: Vector3) => {
      store.dispatch({
        type: 'PLACE_SELECTED_WINDOW',
        payload: { position, rotation },
      });
    },
    [store],
  );

  const cancelSelectMode = React.useCallback(() => {
    store.dispatch({ type: 'CANCEL_SELECT_MODE' });
  }, [store]);

  const openLauncher = React.useCallback(() => {
    store.dispatch({ type: 'OPEN_LAUNCHER' });
  }, [store]);

  const closeLauncher = React.useCallback(() => {
    store.dispatch({ type: 'CLOSE_LAUNCHER' });
  }, [store]);

  const sendInputToFocused = React.useCallback(
    (data: string) => {
      const current = store.getState();
      if (!current.focusedWindowId) return;
      const send = terminalRegistry.current.get(current.focusedWindowId);
      if (send) send(data);
    },
    [store],
  );

  const contextValue: WindowManagerContextValue = React.useMemo(
    () => ({
      state,
      store,
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
      openLauncher,
      closeLauncher,
      sendInputToFocused,
    }),
    [
      state,
      store,
      registerTerminal,
      unregisterTerminal,
      createWindow,
      destroyWindow,
      focusWindow,
      getFocusedWindow,
      startSelectMode,
      placeSelectedWindow,
      cancelSelectMode,
      openLauncher,
      closeLauncher,
      sendInputToFocused,
    ],
  );

  return (
    <WindowManagerContext.Provider value={contextValue}>
      {children}
    </WindowManagerContext.Provider>
  );
};
