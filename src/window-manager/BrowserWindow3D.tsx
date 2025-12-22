import React from 'react';
import type { MeshEntity } from '../react-aframe';
import type { WindowState } from './types';
import { WindowBorder } from './WindowBorder';
import { useWindowManager } from './WindowManagerContext';

// THREE.js types from A-Frame's global
declare const THREE: typeof import('three');

interface Props {
  /**
   * Window state containing position, rotation, and URL.
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
   * Called when the window is clicked (for focus).
   */
  onClick?: () => void;
}

// Window dimensions (matching terminal aspect ratio)
const WINDOW_WIDTH = 4;
const WINDOW_HEIGHT = 2.5;

// Iframe dimensions in pixels
const IFRAME_WIDTH = 800;
const IFRAME_HEIGHT = 500;

/**
 * BrowserWindow3D renders a browser window in 3D space.
 * Uses an A-Frame plane as a background and positions an actual
 * iframe using CSS 3D transforms to overlay it in 3D space.
 */
export const BrowserWindow3D: React.FC<Props> = ({
  window,
  focused,
  selectMode = false,
  onClick,
}) => {
  const { updateBrowserUrl } = useWindowManager();
  const planeRef = React.useRef<MeshEntity | null>(null);
  const iframeContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [urlInput, setUrlInput] = React.useState(window.url ?? 'https://example.com');
  const [currentUrl, setCurrentUrl] = React.useState(window.url ?? 'https://example.com');

  const positionStr =
    `${window.position.x} ${window.position.y} ${window.position.z}` as const;
  const rotationStr =
    `${window.rotation.x} ${window.rotation.y} ${window.rotation.z}` as const;

  // Update iframe position to match 3D position
  React.useEffect(() => {
    // Guard for SSR
    if (typeof window === 'undefined') return;

    const container = iframeContainerRef.current;
    if (!container) return;

    const scene = document.querySelector('a-scene') as (HTMLElement & { camera: THREE.Camera; canvas: HTMLCanvasElement }) | null;
    if (!scene) return;

    let animationId: number;

    const updatePosition = () => {
      const camera = scene.camera;
      const plane = planeRef.current;

      if (!camera || !plane?.object3D) {
        animationId = requestAnimationFrame(updatePosition);
        return;
      }

      // Get the world position of the plane
      const worldPos = new THREE.Vector3();
      plane.object3D.getWorldPosition(worldPos);

      // Project to screen coordinates
      const screenPos = worldPos.clone().project(camera);

      // Convert to CSS coordinates
      const canvas = scene.canvas;
      const halfWidth = canvas.clientWidth / 2;
      const halfHeight = canvas.clientHeight / 2;

      const screenX = screenPos.x * halfWidth + halfWidth;
      const screenY = -screenPos.y * halfHeight + halfHeight;

      // Calculate scale based on distance from camera
      const cameraPos = new THREE.Vector3();
      camera.getWorldPosition(cameraPos);
      const distance = cameraPos.distanceTo(worldPos);

      // Scale factor: at distance 4, we want the iframe to match the plane size
      // The plane is 4 units wide, and we want it to be IFRAME_WIDTH pixels
      const fov = camera.fov * (Math.PI / 180);
      const visibleHeight = 2 * Math.tan(fov / 2) * distance;
      const pixelsPerUnit = canvas.clientHeight / visibleHeight;
      const scale = (WINDOW_WIDTH * pixelsPerUnit) / IFRAME_WIDTH;

      // Get the world rotation
      const worldQuaternion = new THREE.Quaternion();
      plane.object3D.getWorldQuaternion(worldQuaternion);

      // Get camera rotation
      const cameraQuaternion = new THREE.Quaternion();
      camera.getWorldQuaternion(cameraQuaternion);

      // Calculate relative rotation (plane relative to camera)
      const relativeQuaternion = cameraQuaternion.clone().invert().multiply(worldQuaternion);

      // Convert to Euler for checking if facing camera
      const euler = new THREE.Euler().setFromQuaternion(relativeQuaternion);

      // Hide if facing away from camera (Y rotation > 90 degrees from front)
      const facingAway = Math.abs(euler.y) > Math.PI / 2;

      // Also hide if behind camera
      const behindCamera = screenPos.z > 1;

      if (facingAway || behindCamera) {
        container.style.display = 'none';
      } else {
        container.style.display = 'block';
        container.style.left = `${screenX}px`;
        container.style.top = `${screenY}px`;

        // Apply 3D rotation to match the plane's orientation
        // Convert Euler angles to degrees for CSS
        const rotX = euler.x * (180 / Math.PI);
        const rotY = euler.y * (180 / Math.PI);
        const rotZ = euler.z * (180 / Math.PI);

        // Combine translate, scale, and 3D rotation
        // Note: CSS rotations are applied in reverse order (rotateZ, rotateY, rotateX)
        container.style.transform = `translate(-50%, -50%) perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`;

        // Adjust z-index based on distance (closer = higher)
        container.style.zIndex = String(Math.floor(1000 - distance * 10));
      }

      animationId = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleClick = React.useCallback(() => {
    onClick?.();
  }, [onClick]);

  const handleNavigate = React.useCallback(() => {
    let url = urlInput.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setCurrentUrl(url);
    updateBrowserUrl(window.id, url);
  }, [urlInput, window.id, updateBrowserUrl]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleNavigate();
      }
      // Stop propagation to prevent window manager from handling these keys
      e.stopPropagation();
    },
    [handleNavigate]
  );

  return (
    <>
      {/* 3D placeholder plane */}
      <a-entity position={positionStr} rotation={rotationStr}>
        <a-plane
          ref={planeRef}
          width={WINDOW_WIDTH}
          height={WINDOW_HEIGHT}
          color="#1e1e1e"
          onClick={handleClick}
        />
        <WindowBorder
          width={WINDOW_WIDTH}
          height={WINDOW_HEIGHT}
          focused={focused}
          selectMode={selectMode}
        />
      </a-entity>

      {/* DOM overlay for iframe */}
      <div
        ref={iframeContainerRef}
        style={styles.container}
        onClick={handleClick}
      >
        {/* URL bar */}
        <div style={styles.urlBar}>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.urlInput}
            placeholder="Enter URL..."
          />
          <button onClick={handleNavigate} style={styles.goButton}>
            Go
          </button>
        </div>
        {/* Iframe */}
        <iframe
          src={currentUrl}
          style={styles.iframe}
          sandbox="allow-scripts allow-same-origin allow-forms"
          referrerPolicy="no-referrer"
          title="Browser"
        />
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    width: `${IFRAME_WIDTH}px`,
    height: `${IFRAME_HEIGHT}px`,
    pointerEvents: 'auto',
    transformOrigin: 'center center',
    transformStyle: 'preserve-3d',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#282c34',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  urlBar: {
    display: 'flex',
    padding: '4px',
    backgroundColor: '#21252b',
    gap: '4px',
  },
  urlInput: {
    flex: 1,
    padding: '6px 8px',
    fontSize: '12px',
    backgroundColor: '#1e1e1e',
    border: '1px solid #3e4451',
    borderRadius: '3px',
    color: '#abb2bf',
    outline: 'none',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  goButton: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#61afef',
    border: 'none',
    borderRadius: '3px',
    color: '#1e1e1e',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  iframe: {
    flex: 1,
    width: '100%',
    border: 'none',
    backgroundColor: 'white',
  },
};
