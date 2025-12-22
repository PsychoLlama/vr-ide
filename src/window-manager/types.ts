import type { THREE as ThreeLib } from 'aframe';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type WindowType = 'terminal' | 'browser';

export interface WindowState {
  id: string;
  type: WindowType;
  position: Vector3;
  rotation: Vector3;
  createdAt: number;
  // Browser-specific state
  url?: string;
}

export interface SelectModeState {
  active: boolean;
  windowId: string | null;
}

export interface WindowManagerState {
  windows: Map<string, WindowState>;
  focusedWindowId: string | null;
  focusHistory: string[];
  selectMode: SelectModeState;
  launcherOpen: boolean;
}

export type WindowManagerAction =
  | { type: 'CREATE_WINDOW'; payload: WindowState }
  | { type: 'DESTROY_WINDOW'; payload: { id: string } }
  | { type: 'FOCUS_WINDOW'; payload: { id: string } }
  | { type: 'UPDATE_WINDOW_POSITION'; payload: { id: string; position: Vector3; rotation: Vector3 } }
  | { type: 'UPDATE_BROWSER_URL'; payload: { id: string; url: string } }
  | { type: 'START_SELECT_MODE' }
  | { type: 'PLACE_SELECTED_WINDOW'; payload: { position: Vector3; rotation: Vector3 } }
  | { type: 'CANCEL_SELECT_MODE' }
  | { type: 'OPEN_LAUNCHER' }
  | { type: 'CLOSE_LAUNCHER' };

/**
 * Handle exposed by XTermTexture for sending input to the terminal.
 */
export interface XTermTextureHandle {
  sendInput: (data: string) => void;
  getTexture: () => ThreeLib.CanvasTexture | null;
}

/**
 * Registry of terminal handles indexed by window ID.
 */
export type TerminalRegistry = Map<string, XTermTextureHandle>;
