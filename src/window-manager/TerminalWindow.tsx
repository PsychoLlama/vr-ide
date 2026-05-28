import React from 'react';
import type { Entity } from 'aframe';
import type { MeshEntity } from '../react-aframe';
import type { WindowState, XTermTextureHandle } from './types';
import { XTermTexture } from '../components/xterm-texture/XTermTexture';
import { WindowBorder } from './WindowBorder';
import { useCameraDirection } from './hooks/useCameraDirection';

const DEG_TO_RAD = Math.PI / 180;

interface Props {
  /**
   * Window state containing position and rotation.
   */
  window: WindowState;
  /**
   * Whether this window is focused.
   */
  focused: boolean;
  /**
   * Whether this window is in select mode (being moved).
   */
  selectMode?: boolean;
  /**
   * Called when the terminal is ready.
   */
  onReady?: (handle: XTermTextureHandle) => void;
  /**
   * Called when the terminal is destroyed.
   */
  onDestroy?: () => void;
  /**
   * Called when the PTY process exits.
   */
  onExit?: (exitCode: number) => void;
  /**
   * Called when the window is clicked (for focus).
   */
  onClick?: () => void;
}

// Window dimensions (matching the 16:10 aspect ratio)
const WINDOW_WIDTH = 4;
const WINDOW_HEIGHT = 2.5;

// Matches the xterm theme background. Kept here so the backing plane
// stays in sync without reaching into XTermTexture.
const TERMINAL_BG = '#1e1e1e';

/**
 * TerminalWindow renders a single terminal window in 3D space.
 * Includes the terminal plane, texture, and focus border.
 */
export const TerminalWindow: React.FC<Props> = ({
  window,
  focused,
  selectMode = false,
  onReady,
  onDestroy,
  onExit,
  onClick,
}) => {
  const planeRef = React.useRef<MeshEntity | null>(null);
  const entityRef = React.useRef<Entity | null>(null);
  const getPlacement = useCameraDirection();

  const positionStr =
    `${window.position.x} ${window.position.y} ${window.position.z}` as const;
  const rotationStr =
    `${window.rotation.x} ${window.rotation.y} ${window.rotation.z}` as const;

  const handleClick = React.useCallback(() => {
    onClick?.();
  }, [onClick]);

  // While in select mode, mutate the entity's object3D pose directly from
  // the live camera each frame. React state is left alone until the user
  // confirms with Alt+M, which keeps the position/rotation attributes
  // stable and lets a cancel restore the original pose cleanly.
  React.useEffect(() => {
    if (!selectMode) return;
    const entity = entityRef.current;
    if (!entity) return;

    let raf = requestAnimationFrame(function tick() {
      const { position, rotation } = getPlacement();
      entity.object3D.position.set(position.x, position.y, position.z);
      entity.object3D.rotation.set(
        rotation.x * DEG_TO_RAD,
        rotation.y * DEG_TO_RAD,
        rotation.z * DEG_TO_RAD,
      );
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [selectMode, getPlacement]);

  // After leaving select mode, snap object3D back to whatever the store
  // actually holds. On cancel this restores the pre-drag pose (state
  // never changed); on placement it harmlessly re-applies the new pose
  // that the position/rotation attributes are already setting too.
  React.useEffect(() => {
    if (selectMode) return;
    const entity = entityRef.current;
    if (!entity) return;
    entity.object3D.position.set(
      window.position.x,
      window.position.y,
      window.position.z,
    );
    entity.object3D.rotation.set(
      window.rotation.x * DEG_TO_RAD,
      window.rotation.y * DEG_TO_RAD,
      window.rotation.z * DEG_TO_RAD,
    );
  }, [selectMode, window.position, window.rotation]);

  return (
    <a-entity ref={entityRef} position={positionStr} rotation={rotationStr}>
      {/* Dark backing plane: if the terminal texture is ever briefly
          invalid (mid-upload, material reset, etc.), this keeps the
          a-sky from showing through as a bright flash. */}
      <a-plane
        width={WINDOW_WIDTH}
        height={WINDOW_HEIGHT}
        position="0 0 -0.001"
        color={TERMINAL_BG}
        material="shader: flat"
      />

      {/* Terminal plane */}
      <a-plane
        ref={planeRef}
        width={WINDOW_WIDTH}
        height={WINDOW_HEIGHT}
        onClick={handleClick}
        data-window-id={window.id}
      />

      {/* Focus border */}
      <WindowBorder
        width={WINDOW_WIDTH}
        height={WINDOW_HEIGHT}
        focused={focused}
        selectMode={selectMode}
      />

      {/* Terminal texture (renders to hidden DOM, applies to plane) */}
      <XTermTexture
        windowId={window.id}
        planeRef={planeRef}
        onReady={onReady}
        onDestroy={onDestroy}
        onExit={onExit}
      />
    </a-entity>
  );
};
