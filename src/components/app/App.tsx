import React from 'react';
import 'aframe';
import type { MeshEntity } from '../../react-aframe';
import { container } from './App.css';
import { XTermTexture } from '../xterm-texture/XTermTexture';

export const App = () => {
  const planeRef = React.useRef<MeshEntity>(null);

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
      <XTermTexture planeRef={planeRef} />
    </div>
  );
};
