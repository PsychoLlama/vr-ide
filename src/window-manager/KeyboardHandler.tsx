import React from 'react';
import { useWindowManager } from './WindowManagerContext';
import { useCameraDirection } from './hooks/useCameraDirection';

/**
 * KeyboardHandler manages global keybindings and routes input to focused terminal.
 *
 * Keybindings:
 * - Alt+P: Open launcher
 * - Alt+N or Alt+Enter: Create new window at gaze position
 * - Alt+W: Close focused window
 * - Alt+Space: Toggle select/place mode
 * - Escape: Cancel select mode / close launcher
 * - All other keys: Sent to focused terminal
 */
export const KeyboardHandler: React.FC = () => {
  const {
    state,
    createWindow,
    destroyWindow,
    startSelectMode,
    placeSelectedWindow,
    cancelSelectMode,
    openLauncher,
    closeLauncher,
    sendInputToFocused,
  } = useWindowManager();

  const getPlacement = useCameraDirection();

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Alt key combinations
      if (event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'p': {
            // Alt+P: Open launcher
            event.preventDefault();
            openLauncher();
            return;
          }

          case 'n':
          case 'enter': {
            // Alt+N or Alt+Enter: Create new window at gaze position
            event.preventDefault();
            const { position, rotation } = getPlacement();
            createWindow(position, rotation);
            return;
          }

          case 'w': {
            // Alt+W: Close focused window
            event.preventDefault();
            if (state.focusedWindowId) {
              destroyWindow(state.focusedWindowId);
            }
            return;
          }

          case ' ': {
            // Alt+Space: Toggle select/place mode
            event.preventDefault();
            if (state.selectMode.active) {
              // Place the selected window
              const { position, rotation } = getPlacement();
              placeSelectedWindow(position, rotation);
            } else if (state.focusedWindowId) {
              // Enter select mode
              startSelectMode();
            }
            return;
          }
        }
      }

      // Escape: Close launcher or cancel select mode
      if (event.key === 'Escape') {
        if (state.launcherOpen) {
          event.preventDefault();
          closeLauncher();
          return;
        }
        if (state.selectMode.active) {
          event.preventDefault();
          cancelSelectMode();
          return;
        }
      }

      // Don't forward events to terminal during select mode or when launcher is open
      if (state.selectMode.active || state.launcherOpen) {
        return;
      }

      // Don't forward if no focused window
      if (!state.focusedWindowId) {
        return;
      }

      // Don't forward if user is in a text input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Forward key to focused terminal
      // Convert keyboard event to terminal input
      const input = keyEventToInput(event);
      if (input) {
        event.preventDefault();
        sendInputToFocused(input);
      }
    };

    // Use capture phase to intercept before xterm's input handler
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    state.focusedWindowId,
    state.selectMode.active,
    state.launcherOpen,
    createWindow,
    destroyWindow,
    startSelectMode,
    placeSelectedWindow,
    cancelSelectMode,
    openLauncher,
    closeLauncher,
    sendInputToFocused,
    getPlacement,
  ]);

  return null;
};

/**
 * Converts a keyboard event to terminal input string.
 */
function keyEventToInput(event: KeyboardEvent): string | null {
  const { key, ctrlKey, altKey } = event;

  // Handle control sequences
  if (ctrlKey) {
    const char = key.toLowerCase();
    // Ctrl+A through Ctrl+Z
    if (char.length === 1 && char >= 'a' && char <= 'z') {
      return String.fromCharCode(char.charCodeAt(0) - 96);
    }
    // Special control characters
    switch (char) {
      case '[':
        return '\x1b';
      case '\\':
        return '\x1c';
      case ']':
        return '\x1d';
      case '^':
        return '\x1e';
      case '_':
        return '\x1f';
    }
  }

  // Don't forward Alt combinations (they're handled above)
  if (altKey) {
    return null;
  }

  // Handle special keys
  switch (key) {
    case 'Enter':
      return '\r';
    case 'Backspace':
      return '\x7f';
    case 'Tab':
      return '\t';
    case 'Escape':
      return '\x1b';
    case 'ArrowUp':
      return '\x1b[A';
    case 'ArrowDown':
      return '\x1b[B';
    case 'ArrowRight':
      return '\x1b[C';
    case 'ArrowLeft':
      return '\x1b[D';
    case 'Home':
      return '\x1b[H';
    case 'End':
      return '\x1b[F';
    case 'PageUp':
      return '\x1b[5~';
    case 'PageDown':
      return '\x1b[6~';
    case 'Delete':
      return '\x1b[3~';
    case 'Insert':
      return '\x1b[2~';
  }

  // Regular printable characters
  if (key.length === 1) {
    return key;
  }

  return null;
}
