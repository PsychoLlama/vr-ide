import type {
  Vector3,
  WindowManagerAction,
  WindowManagerState,
  WindowState,
} from './types';
import { DEFAULT_COLS, DEFAULT_ROWS, clampCols, clampRows } from './sizing';

export const initialState: WindowManagerState = {
  windows: new Map(),
  focusedWindowId: null,
  focusHistory: [],
  selectMode: { active: false, windowId: null },
  launcherOpen: false,
};

/**
 * Pure reducer over `WindowManagerState`. Lifted verbatim from the
 * previous React-only context reducer so behaviour is unchanged.
 */
export function windowManagerReducer(
  state: WindowManagerState,
  action: WindowManagerAction,
): WindowManagerState {
  switch (action.type) {
    case 'CREATE_WINDOW': {
      const newWindows = new Map(state.windows);
      newWindows.set(action.payload.id, action.payload);

      const newHistory = [...state.focusHistory, action.payload.id];

      return {
        ...state,
        windows: newWindows,
        focusedWindowId: action.payload.id,
        focusHistory: newHistory,
      };
    }

    case 'DESTROY_WINDOW': {
      const { id } = action.payload;
      const newWindows = new Map(state.windows);
      newWindows.delete(id);

      const newHistory = state.focusHistory.filter((wid) => wid !== id);

      let newFocusId = state.focusedWindowId;
      if (state.focusedWindowId === id) {
        newFocusId =
          newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
      }

      return {
        ...state,
        windows: newWindows,
        focusedWindowId: newFocusId,
        focusHistory: newHistory,
        selectMode:
          state.selectMode.windowId === id
            ? { active: false, windowId: null }
            : state.selectMode,
      };
    }

    case 'FOCUS_WINDOW': {
      const { id } = action.payload;
      if (!state.windows.has(id)) return state;

      const newHistory = state.focusHistory.filter((wid) => wid !== id);
      newHistory.push(id);

      return {
        ...state,
        focusedWindowId: id,
        focusHistory: newHistory,
      };
    }

    case 'UPDATE_WINDOW_POSITION': {
      const { id, position } = action.payload;
      const window = state.windows.get(id);
      if (!window) return state;

      const newWindows = new Map(state.windows);
      newWindows.set(id, { ...window, position });

      return {
        ...state,
        windows: newWindows,
      };
    }

    case 'START_SELECT_MODE': {
      if (!state.focusedWindowId) return state;

      return {
        ...state,
        selectMode: {
          active: true,
          windowId: state.focusedWindowId,
        },
      };
    }

    case 'PLACE_SELECTED_WINDOW': {
      if (!state.selectMode.active || !state.selectMode.windowId) return state;

      const { position } = action.payload;
      const windowId = state.selectMode.windowId;
      const window = state.windows.get(windowId);
      if (!window) return state;

      const newWindows = new Map(state.windows);
      newWindows.set(windowId, { ...window, position });

      return {
        ...state,
        windows: newWindows,
        selectMode: { active: false, windowId: null },
      };
    }

    case 'CANCEL_SELECT_MODE': {
      return {
        ...state,
        selectMode: { active: false, windowId: null },
      };
    }

    case 'RESIZE_WINDOW': {
      const { id, cols, rows } = action.payload;
      const window = state.windows.get(id);
      if (!window) return state;

      const nextCols = clampCols(cols);
      const nextRows = clampRows(rows);
      if (window.cols === nextCols && window.rows === nextRows) return state;

      const newWindows = new Map(state.windows);
      newWindows.set(id, { ...window, cols: nextCols, rows: nextRows });

      return {
        ...state,
        windows: newWindows,
      };
    }

    case 'OPEN_LAUNCHER': {
      return {
        ...state,
        launcherOpen: true,
      };
    }

    case 'CLOSE_LAUNCHER': {
      return {
        ...state,
        launcherOpen: false,
      };
    }

    default:
      return state;
  }
}

export type Listener = () => void;

/**
 * Tiny subscribable store wrapping `windowManagerReducer`. Designed to
 * be consumed both by React (via `useSyncExternalStore`) and by plain
 * imperative subscribers in the VR core.
 */
export class WindowStore {
  private state: WindowManagerState = initialState;
  private readonly listeners = new Set<Listener>();

  getState = (): WindowManagerState => this.state;

  dispatch = (action: WindowManagerAction): void => {
    const next = windowManagerReducer(this.state, action);
    if (next === this.state) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

let nextWindowId = 0;
export function generateWindowId(): string {
  return `window-${++nextWindowId}`;
}

/**
 * Convenience action creator that mints a fresh window id alongside
 * dispatching the create action. Kept here so both the React path and
 * the imperative dispatcher use the same id generator.
 */
export function createWindow(store: WindowStore, position: Vector3): string {
  const id = generateWindowId();
  const window: WindowState = {
    id,
    position,
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    createdAt: Date.now(),
  };
  store.dispatch({ type: 'CREATE_WINDOW', payload: window });
  return id;
}
