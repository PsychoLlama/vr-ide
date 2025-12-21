import React from 'react';
import type {
  WindowManagerState,
  WindowManagerAction,
  WindowState,
  Vector3,
  TerminalRegistry,
  XTermTextureHandle,
} from './types';

const initialState: WindowManagerState = {
  windows: new Map(),
  focusedWindowId: null,
  focusHistory: [],
  selectMode: { active: false, windowId: null },
  launcherOpen: false,
  browserOpen: false,
};

function windowManagerReducer(
  state: WindowManagerState,
  action: WindowManagerAction
): WindowManagerState {
  switch (action.type) {
    case 'CREATE_WINDOW': {
      const newWindows = new Map(state.windows);
      newWindows.set(action.payload.id, action.payload);

      // Focus the new window and add to history
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

      // Remove from history
      const newHistory = state.focusHistory.filter((wid) => wid !== id);

      // Focus previous window if destroying focused one
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
        // Cancel select mode if the selected window was destroyed
        selectMode:
          state.selectMode.windowId === id
            ? { active: false, windowId: null }
            : state.selectMode,
      };
    }

    case 'FOCUS_WINDOW': {
      const { id } = action.payload;
      if (!state.windows.has(id)) return state;

      // Remove from history if present, then add to end
      const newHistory = state.focusHistory.filter((wid) => wid !== id);
      newHistory.push(id);

      return {
        ...state,
        focusedWindowId: id,
        focusHistory: newHistory,
      };
    }

    case 'UPDATE_WINDOW_POSITION': {
      const { id, position, rotation } = action.payload;
      const window = state.windows.get(id);
      if (!window) return state;

      const newWindows = new Map(state.windows);
      newWindows.set(id, { ...window, position, rotation });

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

      const { position, rotation } = action.payload;
      const windowId = state.selectMode.windowId;
      const window = state.windows.get(windowId);
      if (!window) return state;

      const newWindows = new Map(state.windows);
      newWindows.set(windowId, { ...window, position, rotation });

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

    case 'OPEN_BROWSER': {
      return {
        ...state,
        browserOpen: true,
      };
    }

    case 'CLOSE_BROWSER': {
      return {
        ...state,
        browserOpen: false,
      };
    }

    default:
      return state;
  }
}

export interface WindowManagerContextValue {
  state: WindowManagerState;
  dispatch: React.Dispatch<WindowManagerAction>;

  // Terminal registry for input routing
  terminalRegistry: React.RefObject<TerminalRegistry>;
  registerTerminal: (id: string, handle: XTermTextureHandle) => void;
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

  // Browser
  openBrowser: () => void;
  closeBrowser: () => void;

  // Send input to focused terminal
  sendInputToFocused: (data: string) => void;
}

export const WindowManagerContext =
  React.createContext<WindowManagerContextValue | null>(null);

export function useWindowManager(): WindowManagerContextValue {
  const context = React.useContext(WindowManagerContext);
  if (!context) {
    throw new Error(
      'useWindowManager must be used within a WindowManagerProvider'
    );
  }
  return context;
}

export { initialState, windowManagerReducer };
