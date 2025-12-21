import React from 'react';
import 'aframe';
import type { Entity, THREE as ThreeLib } from 'aframe';
import { container } from './App.css';

declare global {
  const THREE: typeof ThreeLib;
}

const canvas = new OffscreenCanvas(256, 256);
const ctx = canvas.getContext('2d');

function render(texture: ThreeLib.CanvasTexture, object: ThreeLib.Object3D) {
  if (!ctx) {
    throw new Error('2d context not supported');
  }

  // Create a rainbow gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);

  // Get the current time for smooth animation
  const time = performance.now() * 0.001;

  // Add color stops with shifting hues based on time
  gradient.addColorStop(0, `hsl(${(time * 20) % 360}, 100%, 50%)`);
  gradient.addColorStop(0.2, `hsl(${(time * 20 + 72) % 360}, 100%, 50%)`);
  gradient.addColorStop(0.4, `hsl(${(time * 20 + 144) % 360}, 100%, 50%)`);
  gradient.addColorStop(0.6, `hsl(${(time * 20 + 216) % 360}, 100%, 50%)`);
  gradient.addColorStop(0.8, `hsl(${(time * 20 + 288) % 360}, 100%, 50%)`);
  gradient.addColorStop(1, `hsl(${(time * 20) % 360}, 100%, 50%)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  texture.needsUpdate = true;
  requestAnimationFrame(() => {
    render(texture, object);
  });
}

const isEntity = (node: null | HTMLElement): node is Entity => {
  return node?.tagName === 'A-PLANE';
};

export const App = () => {
  const planeRef = React.useRef<Entity>(null);

  React.useEffect(() => {
    if (isEntity(planeRef.current)) {
      const texture = new THREE.CanvasTexture(canvas);
      const object = planeRef.current.getObject3D('mesh');
      object.material.map = texture;
      object.material.needsUpdate = true;
      render(texture, object);
    }
  }, []);

  return (
    <div className={container}>
      <a-scene embedded>
        <a-box position="-1 0.5 -3" rotation="0 45 0" color="#4CC3D9" />
        <a-sphere position="0 1.25 -5" radius="1.25" color="#EF2D5E" />
        <a-cylinder
          position="1 0.75 -3"
          radius="0.5"
          height="1.5"
          color="#FFC65D"
        />
        <a-plane
          position="0 0 -4"
          rotation="-90 0 0"
          width="4"
          height="4"
          color="#7BC8A4"
        />
        <a-sky color="#ECECEC" />
        <a-plane
          position="0 2 -4"
          rotation="0 0 0"
          width="4"
          height="4"
          ref={planeRef}
        />
      </a-scene>
    </div>
  );
};
