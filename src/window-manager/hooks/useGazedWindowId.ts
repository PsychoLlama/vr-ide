import React from 'react';
import type { THREE as ThreeLib } from 'aframe';

interface CameraElement extends Element {
  object3D: ThreeLib.Object3D;
}

interface PlaneEntity extends Element {
  object3D: ThreeLib.Object3D;
  getObject3D: (name: string) => ThreeLib.Object3D | undefined;
}

// THREE is a global from A-Frame
declare const THREE: typeof ThreeLib;

/**
 * Returns the id of the terminal window the camera is currently pointed
 * at, or null if the gaze ray doesn't hit any window. Used by the
 * focus-by-gaze keybinding.
 */
export function useGazedWindowId(): () => string | null {
  return React.useCallback((): string | null => {
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
  }, []);
}
