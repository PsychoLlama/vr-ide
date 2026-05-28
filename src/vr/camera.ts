import type { THREE as ThreeLib } from 'aframe';
import type { Vector3 } from '../window-manager/types';

declare const THREE: typeof ThreeLib;

interface CameraPlacement {
  position: Vector3;
  rotation: Vector3;
}

interface CameraElement extends Element {
  object3D: ThreeLib.Object3D;
}

interface PlaneEntity extends Element {
  object3D: ThreeLib.Object3D;
  getObject3D: (name: string) => ThreeLib.Object3D | undefined;
}

// Default placement when the camera hasn't mounted yet (initial render
// before A-Frame has wired up its scene graph).
const DEFAULT_PLACEMENT: CameraPlacement = {
  position: { x: 0, y: 1.6, z: -4 },
  rotation: { x: 0, y: 0, z: 0 },
};

// Distance in front of the camera at which to place new/moved windows.
const PLACEMENT_DISTANCE = 4;

/**
 * Camera position plus a window pose four metres ahead, facing back at
 * the camera. Used for placing newly-spawned windows and for the live
 * follow-the-gaze placement during select mode.
 */
export function getCameraPlacement(): CameraPlacement {
  if (typeof document === 'undefined') return DEFAULT_PLACEMENT;

  const cameraEl = document.querySelector('[camera]');
  if (!cameraEl) return DEFAULT_PLACEMENT;

  const camera = cameraEl as CameraElement;
  const object3D = camera.object3D;
  const cameraPosition = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();

  object3D.getWorldPosition(cameraPosition);
  object3D.getWorldDirection(cameraDirection);

  // THREE.js cameras look down -Z, so getWorldDirection returns the
  // opposite of where the camera is actually looking. Negate to get the
  // look direction.
  cameraDirection.negate();

  const position: Vector3 = {
    x: cameraPosition.x + cameraDirection.x * PLACEMENT_DISTANCE,
    y: cameraPosition.y + cameraDirection.y * PLACEMENT_DISTANCE,
    z: cameraPosition.z + cameraDirection.z * PLACEMENT_DISTANCE,
  };

  // Rotate the window to face back toward the camera.
  const angleY =
    Math.atan2(-cameraDirection.x, -cameraDirection.z) * (180 / Math.PI);

  return {
    position,
    rotation: { x: 0, y: angleY, z: 0 },
  };
}

/**
 * Id of the terminal window the camera is currently pointed at, or
 * null if the gaze ray misses every window. Powers the focus-by-gaze
 * keybinding.
 */
export function getGazedWindowId(): string | null {
  if (typeof document === 'undefined') return null;

  const cameraEl = document.querySelector('[camera]');
  if (!cameraEl) return null;
  const camera = cameraEl as CameraElement;

  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3();
  camera.object3D.getWorldPosition(origin);
  camera.object3D.getWorldDirection(direction);
  // A-Frame's camera object3D is a Group; getWorldDirection returns +Z,
  // but the camera looks down -Z. Negate to get the actual gaze ray.
  direction.negate();

  const raycaster = new THREE.Raycaster(origin, direction);

  const meshToId = new Map<ThreeLib.Object3D, string>();
  const planes = document.querySelectorAll<PlaneEntity>(
    'a-plane[data-window-id]',
  );
  planes.forEach((plane) => {
    const id = plane.getAttribute('data-window-id');
    if (!id) return;
    const mesh = plane.getObject3D('mesh');
    if (!mesh) return;
    meshToId.set(mesh, id);
  });

  const hits = raycaster.intersectObjects(Array.from(meshToId.keys()), false);
  if (hits.length === 0) return null;
  return meshToId.get(hits[0].object) ?? null;
}
