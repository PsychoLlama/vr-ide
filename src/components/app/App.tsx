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
        <a-sky color="#ECECEC" />
        <a-plane
          position="0 2 -4"
          rotation="0 0 0"
          width="4"
          height="2.5"
          ref={planeRef}
        />
      </a-scene>
      <XTermTexture planeRef={planeRef} />
    </div>
  );
};
