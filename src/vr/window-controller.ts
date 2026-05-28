import type { Entity, THREE as ThreeLib } from 'aframe';
import type { WindowState } from '../window-manager/types';
import { TerminalController } from './terminal-controller';

declare const THREE: typeof ThreeLib;

const DEG_TO_RAD = Math.PI / 180;

// Window dimensions (matching the 16:10 aspect ratio).
const WINDOW_WIDTH = 4;
const WINDOW_HEIGHT = 2.5;

// Matches the xterm theme background; kept here so the backing plane
// stays in sync without reaching into TerminalController.
const TERMINAL_BG = '#1e1e1e';

const BORDER_THICKNESS = 0.02;
const BORDER_Z_OFFSET = 0.001;
const BORDER_COLORS = {
  focused: '#61afef',
  unfocused: '#3e4451',
  selectMode: '#e5c07b',
};

export interface WindowControllerCallbacks {
  /**
   * Fires when the user clicks the terminal plane. The store decides
   * what to do (typically focus the window).
   */
  onClick: () => void;
  /**
   * Fires when the PTY exits server-side.
   */
  onExit: (exitCode: number) => void;
  /**
   * Provides the live camera-relative placement during select mode.
   * Called per frame; should be cheap.
   */
  getSelectPlacement: () => {
    position: WindowState['position'];
    rotation: WindowState['rotation'];
  };
  /**
   * Exposes the terminal handle so the dispatcher can route keystrokes
   * to whichever window is focused.
   */
  onTerminalReady: (sendInput: (data: string) => void) => void;
  /**
   * Mirrors the prior `unregisterTerminal` hook so the React-side
   * registry can drop stale handles on dispose.
   */
  onTerminalDispose: () => void;
}

/**
 * Imperative owner of one terminal window in the scene. Holds its
 * a-entity (with backing plane, terminal plane, four border planes) and
 * the `TerminalController` whose texture is bound to the terminal
 * plane's material.
 *
 * The controller does not subscribe to the store itself; the parent
 * `WindowManager` calls `setPose` / `setFocused` / `setSelectMode` as
 * store snapshots arrive.
 */
export class WindowController {
  readonly id: string;
  private readonly callbacks: WindowControllerCallbacks;
  private readonly root: Entity;
  private readonly terminalPlane: Entity;
  private readonly borderPlanes: Entity[];
  private readonly terminal: TerminalController;
  private readonly clickHandler: () => void;

  private focused = false;
  private selectMode = false;
  private selectRafId = 0;
  private disposed = false;

  constructor(
    parent: Element,
    initial: WindowState,
    callbacks: WindowControllerCallbacks,
  ) {
    this.id = initial.id;
    this.callbacks = callbacks;

    this.root = document.createElement('a-entity');
    this.applyPose(initial.position, initial.rotation);

    // Dark backing plane: if the terminal texture is ever briefly
    // invalid (mid-upload, material reset, etc.), this keeps the a-sky
    // from showing through as a bright flash.
    const backingPlane = document.createElement('a-plane');
    backingPlane.setAttribute('width', String(WINDOW_WIDTH));
    backingPlane.setAttribute('height', String(WINDOW_HEIGHT));
    backingPlane.setAttribute('position', '0 0 -0.001');
    backingPlane.setAttribute('color', TERMINAL_BG);
    backingPlane.setAttribute('material', 'shader: flat');
    this.root.appendChild(backingPlane);

    this.terminalPlane = document.createElement('a-plane');
    this.terminalPlane.setAttribute('width', String(WINDOW_WIDTH));
    this.terminalPlane.setAttribute('height', String(WINDOW_HEIGHT));
    this.terminalPlane.dataset.windowId = this.id;
    this.clickHandler = () => callbacks.onClick();
    this.terminalPlane.addEventListener('click', this.clickHandler);
    this.root.appendChild(this.terminalPlane);

    this.borderPlanes = this.buildBorder();

    parent.appendChild(this.root);

    this.terminal = new TerminalController({
      windowId: this.id,
      onTextureReady: (texture) => {
        this.bindTextureToPlane(texture);
      },
      onReady: () => {
        callbacks.onTerminalReady((data) => this.terminal.sendInput(data));
      },
      onExit: (code) => callbacks.onExit(code),
    });
  }

  /**
   * Apply a new pose from the store. Quietly skipped while select mode
   * is driving the entity directly each frame; the post-select-mode
   * snap-back in `setSelectMode(false)` will reapply the latest pose.
   */
  setPose(
    position: WindowState['position'],
    rotation: WindowState['rotation'],
  ): void {
    if (this.selectMode) return;
    this.applyPose(position, rotation);
  }

  setFocused(focused: boolean): void {
    if (this.focused === focused) return;
    this.focused = focused;
    this.updateBorderColor();
  }

  setSelectMode(active: boolean): void {
    if (this.selectMode === active) return;
    this.selectMode = active;
    this.updateBorderColor();

    if (active) {
      // While select mode is on, drive object3D directly from the live
      // camera. Position/rotation attributes are left alone so a cancel
      // restores cleanly to whatever the store still holds.
      const tick = () => {
        if (!this.selectMode || this.disposed) return;
        const { position, rotation } = this.callbacks.getSelectPlacement();
        this.root.object3D.position.set(position.x, position.y, position.z);
        this.root.object3D.rotation.set(
          rotation.x * DEG_TO_RAD,
          rotation.y * DEG_TO_RAD,
          rotation.z * DEG_TO_RAD,
        );
        this.selectRafId = requestAnimationFrame(tick);
      };
      this.selectRafId = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(this.selectRafId);
      this.selectRafId = 0;
      // After leaving select mode, the store's pose attributes are
      // authoritative again. Snap object3D back to match — on cancel
      // this restores the pre-drag pose; on placement it harmlessly
      // re-applies the new pose the attributes already set.
      const posAttr = this.root.getAttribute('position') as {
        x: number;
        y: number;
        z: number;
      } | null;
      const rotAttr = this.root.getAttribute('rotation') as {
        x: number;
        y: number;
        z: number;
      } | null;
      if (posAttr) {
        this.root.object3D.position.set(posAttr.x, posAttr.y, posAttr.z);
      }
      if (rotAttr) {
        this.root.object3D.rotation.set(
          rotAttr.x * DEG_TO_RAD,
          rotAttr.y * DEG_TO_RAD,
          rotAttr.z * DEG_TO_RAD,
        );
      }
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.selectRafId);
    this.terminalPlane.removeEventListener('click', this.clickHandler);
    this.terminal.dispose();
    this.root.remove();
    this.callbacks.onTerminalDispose();
  }

  private applyPose(
    position: WindowState['position'],
    rotation: WindowState['rotation'],
  ): void {
    this.root.setAttribute(
      'position',
      `${position.x} ${position.y} ${position.z}`,
    );
    this.root.setAttribute(
      'rotation',
      `${rotation.x} ${rotation.y} ${rotation.z}`,
    );
  }

  private buildBorder(): Entity[] {
    const halfWidth = WINDOW_WIDTH / 2;
    const halfHeight = WINDOW_HEIGHT / 2;
    const t = BORDER_THICKNESS;
    const z = BORDER_Z_OFFSET;

    const edges: Array<{ w: number; h: number; pos: string }> = [
      { w: WINDOW_WIDTH + t * 2, h: t, pos: `0 ${halfHeight + t / 2} ${z}` },
      { w: WINDOW_WIDTH + t * 2, h: t, pos: `0 ${-halfHeight - t / 2} ${z}` },
      { w: t, h: WINDOW_HEIGHT, pos: `${-halfWidth - t / 2} 0 ${z}` },
      { w: t, h: WINDOW_HEIGHT, pos: `${halfWidth + t / 2} 0 ${z}` },
    ];

    return edges.map(({ w, h, pos }) => {
      const plane = document.createElement('a-plane');
      plane.setAttribute('width', String(w));
      plane.setAttribute('height', String(h));
      plane.setAttribute('position', pos);
      plane.setAttribute('material', 'shader: flat');
      plane.setAttribute('color', BORDER_COLORS.unfocused);
      this.root.appendChild(plane);
      return plane;
    });
  }

  private updateBorderColor(): void {
    const color = this.selectMode
      ? BORDER_COLORS.selectMode
      : this.focused
        ? BORDER_COLORS.focused
        : BORDER_COLORS.unfocused;
    for (const plane of this.borderPlanes) {
      plane.setAttribute('color', color);
    }
  }

  private bindTextureToPlane(texture: ThreeLib.CanvasTexture): void {
    const mesh = this.terminalPlane.getObject3D('mesh') as
      | ThreeLib.Mesh
      | undefined;
    if (!mesh) return;
    mesh.material = new THREE.MeshBasicMaterial({ map: texture });
  }
}
