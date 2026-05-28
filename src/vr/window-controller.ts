import type { Entity, THREE as ThreeLib } from 'aframe';
import type { Vector3, WindowState } from './types';
import { TerminalController } from './terminal-controller';
import { CELL_HEIGHT_M, CELL_WIDTH_M } from './sizing';

declare const THREE: typeof ThreeLib;

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
 * The controller does not subscribe to the store or own a RAF. The
 * parent `WindowManager` drives orientation per frame via `faceCamera`
 * and position during select mode via `setSelectModePose`.
 */
export class WindowController {
  readonly id: string;
  private readonly callbacks: WindowControllerCallbacks;
  private readonly root: Entity;
  private readonly backingPlane: Entity;
  private readonly terminalPlane: Entity;
  private readonly borderPlanes: Entity[];
  private readonly terminal: TerminalController;
  private readonly clickHandler: () => void;
  // Reused per-frame scratch vector so `faceCamera` doesn't allocate.
  private readonly lookAtTarget = new THREE.Vector3();

  private cols: number;
  private rows: number;
  private focused = false;
  private selectMode = false;
  private disposed = false;

  constructor(
    parent: Element,
    initial: WindowState,
    callbacks: WindowControllerCallbacks,
  ) {
    this.id = initial.id;
    this.callbacks = callbacks;
    this.cols = initial.cols;
    this.rows = initial.rows;

    this.root = document.createElement('a-entity');
    this.applyPosition(initial.position);

    // Dark backing plane: if the terminal texture is ever briefly
    // invalid (mid-upload, material reset, etc.), this keeps the a-sky
    // from showing through as a bright flash.
    this.backingPlane = document.createElement('a-plane');
    this.backingPlane.setAttribute('position', '0 0 -0.001');
    this.backingPlane.setAttribute('color', TERMINAL_BG);
    this.backingPlane.setAttribute('material', 'shader: flat');
    this.root.appendChild(this.backingPlane);

    this.terminalPlane = document.createElement('a-plane');
    this.terminalPlane.dataset.windowId = this.id;
    this.clickHandler = () => callbacks.onClick();
    this.terminalPlane.addEventListener('click', this.clickHandler);
    this.root.appendChild(this.terminalPlane);

    this.borderPlanes = this.buildBorder();
    this.applyGeometry();

    parent.appendChild(this.root);

    this.terminal = new TerminalController({
      windowId: this.id,
      cols: this.cols,
      rows: this.rows,
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
   * Apply a new position from the store. Skipped while select mode is
   * driving the entity directly each frame — the next sync after
   * select mode ends will re-apply whatever the store ultimately
   * holds.
   */
  setPosition(position: Vector3): void {
    if (this.selectMode) return;
    this.applyPosition(position);
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
  }

  /**
   * Drive object3D.position directly. Called by the manager's per-frame
   * tick while this window is in select mode so the window follows the
   * camera's gaze without touching the position attribute. Once select
   * mode ends, the next store sync re-applies the attribute.
   */
  setSelectModePose(position: Vector3): void {
    this.root.object3D.position.set(position.x, position.y, position.z);
  }

  /**
   * Rotate the entity so its terminal face (+Z) points at the given
   * world-space camera position. lookAt orients -Z toward the target,
   * so we point it at the camera's mirror across the window position;
   * +Z then naturally points back at the real camera.
   */
  faceCamera(cameraPos: ThreeLib.Vector3): void {
    const windowPos = this.root.object3D.position;
    this.lookAtTarget.copy(windowPos).multiplyScalar(2).sub(cameraPos);
    this.root.object3D.lookAt(this.lookAtTarget);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.terminalPlane.removeEventListener('click', this.clickHandler);
    this.terminal.dispose();
    this.root.remove();
    this.callbacks.onTerminalDispose();
  }

  private applyPosition(position: Vector3): void {
    this.root.setAttribute(
      'position',
      `${position.x} ${position.y} ${position.z}`,
    );
    // The attribute set above propagates to object3D.position
    // synchronously via A-Frame's position component, but mirroring it
    // here keeps things robust against attribute-cache no-ops if the
    // value didn't change.
    this.root.object3D.position.set(position.x, position.y, position.z);
  }

  private buildBorder(): Entity[] {
    // Order matters: indices 0..3 are top, bottom, left, right. Width,
    // height, and position are set later in applyGeometry().
    return Array.from({ length: 4 }, () => {
      const plane = document.createElement('a-plane');
      plane.setAttribute('material', 'shader: flat');
      plane.setAttribute('color', BORDER_COLORS.unfocused);
      this.root.appendChild(plane);
      return plane;
    });
  }

  /**
   * Recompute plane sizes and border-edge positions from the current
   * cols/rows. Called on construct and on `setSize`.
   */
  private applyGeometry(): void {
    const width = this.cols * CELL_WIDTH_M;
    const height = this.rows * CELL_HEIGHT_M;

    this.backingPlane.setAttribute('width', String(width));
    this.backingPlane.setAttribute('height', String(height));
    this.terminalPlane.setAttribute('width', String(width));
    this.terminalPlane.setAttribute('height', String(height));

    const halfW = width / 2;
    const halfH = height / 2;
    const t = BORDER_THICKNESS;
    const z = BORDER_Z_OFFSET;

    const edges: Array<{ w: number; h: number; pos: string }> = [
      { w: width + t * 2, h: t, pos: `0 ${halfH + t / 2} ${z}` },
      { w: width + t * 2, h: t, pos: `0 ${-halfH - t / 2} ${z}` },
      { w: t, h: height, pos: `${-halfW - t / 2} 0 ${z}` },
      { w: t, h: height, pos: `${halfW + t / 2} 0 ${z}` },
    ];

    edges.forEach(({ w, h, pos }, i) => {
      const plane = this.borderPlanes[i];
      plane.setAttribute('width', String(w));
      plane.setAttribute('height', String(h));
      plane.setAttribute('position', pos);
    });
  }

  /**
   * Resize the window's terminal grid. Updates the plane and border
   * geometry, then forwards to the terminal (which signals the PTY).
   */
  setSize(cols: number, rows: number): void {
    if (this.cols === cols && this.rows === rows) return;
    this.cols = cols;
    this.rows = rows;
    this.applyGeometry();
    this.terminal.setSize(cols, rows);
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
