export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface WindowState {
  id: string;
  position: Vector3;
  rotation: Vector3;
  cols: number;
  rows: number;
  createdAt: number;
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
  | {
      type: 'UPDATE_WINDOW_POSITION';
      payload: { id: string; position: Vector3; rotation: Vector3 };
    }
  | { type: 'START_SELECT_MODE' }
  | {
      type: 'PLACE_SELECTED_WINDOW';
      payload: { position: Vector3; rotation: Vector3 };
    }
  | { type: 'CANCEL_SELECT_MODE' }
  | {
      type: 'RESIZE_WINDOW';
      payload: { id: string; cols: number; rows: number };
    }
  | { type: 'OPEN_LAUNCHER' }
  | { type: 'CLOSE_LAUNCHER' };

/**
 * Per-window keystroke sink. Populated by the scene-side
 * `WindowController` and read by the dispatcher to route input to the
 * focused terminal.
 */
export type TerminalInputSink = (data: string) => void;

/**
 * Registry of per-window input sinks, keyed by window id.
 */
export type TerminalRegistry = Map<string, TerminalInputSink>;
