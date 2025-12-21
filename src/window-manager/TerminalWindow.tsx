import React from 'react';
import type { MeshEntity } from '../react-aframe';
import type { WindowState, XTermTextureHandle } from './types';
import { XTermTexture } from '../components/xterm-texture/XTermTexture';
import { WindowBorder } from './WindowBorder';

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

  const positionStr =
    `${window.position.x} ${window.position.y} ${window.position.z}` as const;
  const rotationStr =
    `${window.rotation.x} ${window.rotation.y} ${window.rotation.z}` as const;

  const handleClick = React.useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <a-entity position={positionStr} rotation={rotationStr}>
      {/* Terminal plane */}
      <a-plane
        ref={planeRef}
        width={WINDOW_WIDTH}
        height={WINDOW_HEIGHT}
        onClick={handleClick}
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
