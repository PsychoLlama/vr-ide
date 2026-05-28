import type { THREE as ThreeLib } from 'aframe';
import { readCameraPosition } from './camera';
import type { TerminalInputSink, TerminalRegistry, Vector3 } from './types';
import type { WindowStore } from './store';
import { WindowController } from './window-controller';

declare const THREE: typeof ThreeLib;

export interface WindowManagerOptions {
  /**
   * Parent element to append window entities to (typically the
   * `<a-scene>`).
   */
  parent: Element;
  /**
   * Shared store. Both this manager and any React UI read/write through
   * the same instance.
   */
  store: WindowStore;
  /**
   * Returns the live camera-relative position used to follow the user's
   * gaze during select mode.
   */
  getSelectPlacement: () => Vector3;
}

/**
 * Mirrors the store's window list onto a set of imperative
 * `WindowController` instances. One subscription, one diff pass per
 * mutation. Also runs a single per-frame tick that points every
 * window at the camera (billboarding) and drives the select-mode
 * window's position from the gaze placement.
 */
export class WindowManager {
  private readonly controllers = new Map<string, WindowController>();
  private readonly terminals: TerminalRegistry = new Map();
  private readonly options: WindowManagerOptions;
  private readonly cameraPos = new THREE.Vector3();
  private unsubscribe: (() => void) | null = null;
  private rafId = 0;

  constructor(options: WindowManagerOptions) {
    this.options = options;
  }

  start(): void {
    if (this.unsubscribe) return;
    this.sync();
    this.unsubscribe = this.options.store.subscribe(() => this.sync());
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    for (const controller of this.controllers.values()) {
      controller.dispose();
    }
    this.controllers.clear();
    this.terminals.clear();
  }

  /**
   * Send a keystroke to the terminal owned by `id`. Returns true if the
   * id matched a ready terminal — the dispatcher uses this to decide
   * whether the event was consumed.
   */
  sendInput(id: string, data: string): boolean {
    const send = this.terminals.get(id);
    if (!send) return false;
    send(data);
    return true;
  }

  private registerTerminal = (id: string, sink: TerminalInputSink): void => {
    this.terminals.set(id, sink);
  };

  private unregisterTerminal = (id: string): void => {
    this.terminals.delete(id);
  };

  private sync(): void {
    const state = this.options.store.getState();

    // Reconcile lifecycle: spawn controllers for new windows, dispose
    // controllers whose windows are gone.
    for (const window of state.windows.values()) {
      const existing = this.controllers.get(window.id);
      if (existing) {
        existing.setPosition(window.position);
        existing.setSize(window.cols, window.rows);
      } else {
        const controller = new WindowController(this.options.parent, window, {
          onClick: () =>
            this.options.store.dispatch({
              type: 'FOCUS_WINDOW',
              payload: { id: window.id },
            }),
          onExit: () =>
            this.options.store.dispatch({
              type: 'DESTROY_WINDOW',
              payload: { id: window.id },
            }),
          onTerminalReady: (sendInput) =>
            this.registerTerminal(window.id, sendInput),
          onTerminalDispose: () => this.unregisterTerminal(window.id),
        });
        this.controllers.set(window.id, controller);
      }
    }

    for (const [id, controller] of this.controllers) {
      if (!state.windows.has(id)) {
        controller.dispose();
        this.controllers.delete(id);
      }
    }

    // Apply focus + select-mode flags.
    for (const [id, controller] of this.controllers) {
      controller.setFocused(state.focusedWindowId === id);
      controller.setSelectMode(
        state.selectMode.active && state.selectMode.windowId === id,
      );
    }
  }

  /**
   * Per-frame tick: position the select-mode window along the gaze,
   * then point every window at the camera. One querySelector and one
   * `getWorldPosition` per frame regardless of window count.
   */
  private tick = (): void => {
    this.rafId = requestAnimationFrame(this.tick);

    if (!readCameraPosition(this.cameraPos)) return;

    const state = this.options.store.getState();
    const selectId = state.selectMode.active ? state.selectMode.windowId : null;
    const selectPosition = selectId ? this.options.getSelectPlacement() : null;

    for (const [id, controller] of this.controllers) {
      if (id === selectId && selectPosition) {
        controller.setSelectModePose(selectPosition);
      }
      controller.faceCamera(this.cameraPos);
    }
  };
}
