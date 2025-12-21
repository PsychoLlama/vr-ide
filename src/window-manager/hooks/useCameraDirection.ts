import React from 'react';
import type { THREE as ThreeLib } from 'aframe';
import type { Vector3 } from '../types';

interface CameraPlacement {
  position: Vector3;
  rotation: Vector3;
}

interface CameraElement extends Element {
  object3D: ThreeLib.Object3D;
}

// THREE is a global from A-Frame
declare const THREE: typeof ThreeLib;

/**
 * Returns the current camera position and forward direction.
 * Used for placing windows in front of the user's view.
 */
export function useCameraDirection(): () => CameraPlacement {
  const getPlacement = React.useCallback((): CameraPlacement => {
    // Get camera element
    const cameraEl = document.querySelector('[camera]');
    if (!cameraEl) {
      // Default placement if camera not found
      return {
        position: { x: 0, y: 1.6, z: -4 },
        rotation: { x: 0, y: 0, z: 0 },
      };
    }

    // Get camera's world position and direction
    const camera = cameraEl as CameraElement;
    const object3D = camera.object3D;
    const cameraPosition = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();

    object3D.getWorldPosition(cameraPosition);
    object3D.getWorldDirection(cameraDirection);

    // THREE.js cameras look down -Z, so getWorldDirection returns the opposite
    // of where the camera is actually looking. Negate to get the look direction.
    cameraDirection.negate();

    // Place window 4 units in front of camera
    const distance = 4;
    const position: Vector3 = {
      x: cameraPosition.x + cameraDirection.x * distance,
      y: cameraPosition.y + cameraDirection.y * distance,
      z: cameraPosition.z + cameraDirection.z * distance,
    };

    // Calculate rotation to face the camera
    // The window should face back toward the camera (opposite of look direction)
    const angleY = Math.atan2(-cameraDirection.x, -cameraDirection.z) * (180 / Math.PI);
    const rotation: Vector3 = {
      x: 0,
      y: angleY,
      z: 0,
    };

    return { position, rotation };
  }, []);

  return getPlacement;
}
