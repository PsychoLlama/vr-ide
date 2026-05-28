import React from 'react';
import '@xterm/xterm/css/xterm.css';
import type { THREE as ThreeLib } from 'aframe';
import type { MeshEntity } from '../../react-aframe';
import type { XTermTextureHandle } from '../../window-manager/types';
import { TerminalController } from '../../vr/terminal-controller';

declare global {
  const THREE: typeof ThreeLib;
}

interface Props {
  /**
   * Unique identifier for this terminal window.
   */
  windowId: string;
  /**
   * Ref to the A-Frame mesh entity where the terminal texture will be applied.
   */
  planeRef: React.RefObject<MeshEntity | null>;
  /**
   * Called when the terminal is ready to receive input.
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
}

/**
 * Thin React wrapper around `TerminalController`. The controller owns the
 * xterm instance, its hidden DOM host, the WebSocket, and the Three.js
 * texture; this component just binds its lifetime to the React tree and
 * applies the produced texture to the referenced a-plane's mesh.
 */
export const XTermTexture: React.FC<Props> = ({
  windowId,
  planeRef,
  onReady,
  onDestroy,
  onExit,
}) => {
  // Hold the latest callbacks in refs so the mount effect doesn't re-run
  // (and tear down the controller + websocket) whenever the parent
  // re-renders with fresh closures.
  const onReadyRef = React.useRef(onReady);
  const onDestroyRef = React.useRef(onDestroy);
  const onExitRef = React.useRef(onExit);
  React.useEffect(() => {
    onReadyRef.current = onReady;
    onDestroyRef.current = onDestroy;
    onExitRef.current = onExit;
  }, [onReady, onDestroy, onExit]);

  React.useEffect(() => {
    const plane = planeRef.current;
    if (!plane) return;

    const controller = new TerminalController({
      windowId,
      onTextureReady: (texture) => {
        const mesh = plane.getObject3D('mesh') as ThreeLib.Mesh;
        mesh.material = new THREE.MeshBasicMaterial({ map: texture });
      },
      onReady: () => {
        onReadyRef.current?.({
          sendInput: (data) => controller.sendInput(data),
          getTexture: () => controller.getTexture(),
        });
      },
      onExit: (code) => {
        onExitRef.current?.(code);
      },
    });

    return () => {
      controller.dispose();
      onDestroyRef.current?.();
    };
  }, [windowId, planeRef]);

  return null;
};
