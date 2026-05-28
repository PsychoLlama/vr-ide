import type { THREE as ThreeLib } from 'aframe';
import type { Vector3 } from './types';

declare const THREE: typeof ThreeLib;

interface CameraElement extends Element {
  object3D: ThreeLib.Object3D;
}

interface PlaneEntity extends Element {
  object3D: ThreeLib.Object3D;
  getObject3D: (name: string) => ThreeLib.Object3D | undefined;
}

// Default position when the camera hasn't mounted yet (initial render
// before A-Frame has wired up its scene graph).
const DEFAULT_POSITION: Vector3 = { x: 0, y: 1.6, z: -4 };

// Distance in front of the camera at which to place new/moved windows.
const PLACEMENT_DISTANCE = 4;

/**
 * Position four metres ahead of the camera along its gaze ray. Used
 * for placing newly-spawned windows and for the live follow-the-gaze
 * placement during select mode. Orientation is no longer returned —
 * the WindowManager's per-frame billboard tick keeps every window
 * facing the camera regardless of where it ends up.
 */
export function getCameraPlacement(): Vector3 {
  if (typeof document === 'undefined') return DEFAULT_POSITION;

  const cameraEl = document.querySelector('[camera]');
  if (!cameraEl) return DEFAULT_POSITION;

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

  return {
    x: cameraPosition.x + cameraDirection.x * PLACEMENT_DISTANCE,
    y: cameraPosition.y + cameraDirection.y * PLACEMENT_DISTANCE,
    z: cameraPosition.z + cameraDirection.z * PLACEMENT_DISTANCE,
  };
}

/**
 * World-space position of the active A-Frame camera. Returned via an
 * existing `THREE.Vector3` so callers can avoid per-frame allocation.
 * Returns false when the camera element isn't mounted yet.
 */
export function readCameraPosition(out: ThreeLib.Vector3): boolean {
  if (typeof document === 'undefined') return false;
  const cameraEl = document.querySelector<CameraElement>('[camera]');
  if (!cameraEl) return false;
  cameraEl.object3D.getWorldPosition(out);
  return true;
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
