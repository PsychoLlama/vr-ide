import React from 'react';
import { WindowStore } from '../vr/store';
import type {
  WindowManagerState,
  Vector3,
  TerminalRegistry,
  TerminalInputSink,
  WindowState,
} from './types';

export interface WindowManagerContextValue {
  /**
   * Current snapshot of the store. Updated via `useSyncExternalStore`
   * so it stays consistent with any imperative subscribers.
   */
  state: WindowManagerState;

  /**
   * Underlying store. Exposed so non-React subscribers (the VR core)
   * can attach without going through React.
   */
  store: WindowStore;

  // Terminal registry for input routing
  terminalRegistry: React.RefObject<TerminalRegistry>;
  registerTerminal: (id: string, sendInput: TerminalInputSink) => void;
  unregisterTerminal: (id: string) => void;

  // Convenience methods
  createWindow: (position: Vector3, rotation: Vector3) => string;
  destroyWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  getFocusedWindow: () => WindowState | null;

  // Select mode
  startSelectMode: () => void;
  placeSelectedWindow: (position: Vector3, rotation: Vector3) => void;
  cancelSelectMode: () => void;

  // Launcher
  openLauncher: () => void;
  closeLauncher: () => void;

  // Send input to focused terminal
  sendInputToFocused: (data: string) => void;
}

export const WindowManagerContext =
  React.createContext<WindowManagerContextValue | null>(null);

export function useWindowManager(): WindowManagerContextValue {
  const context = React.useContext(WindowManagerContext);
  if (!context) {
    throw new Error(
      'useWindowManager must be used within a WindowManagerProvider',
    );
  }
  return context;
}
