import AFRAME from 'aframe';

interface RafEntry {
  id: number;
  cb: FrameRequestCallback;
}

const nativeRaf = window.requestAnimationFrame.bind(window);

let queue: RafEntry[] = [];
let nextId = 1;
let installed = false;

const drain = (time: number) => {
  if (queue.length === 0) return;
  const draining = queue;
  queue = [];
  for (const entry of draining) {
    try {
      entry.cb(time);
    } catch (err) {
      console.error('[xr-raf-bridge] rAF callback threw:', err);
    }
  }
};

const drainLoop = (time: number) => {
  drain(time);
  nativeRaf(drainLoop);
};

if (!AFRAME.components['xr-raf-bridge']) {
  AFRAME.registerComponent('xr-raf-bridge', {
    tick(time: number) {
      drain(time);
    },
  });
}

/**
 * Quest's browser pauses the page's compositor while immersive WebXR is
 * active, which silently freezes window.requestAnimationFrame. A-Frame's
 * renderer keeps ticking via XRSession.requestAnimationFrame through
 * Three's xr.setAnimationLoop, so we route window.rAF through a queue
 * and drain it from two sources: a native rAF chain (which fires
 * outside VR) and A-Frame's tick (which fires inside VR via
 * session.rAF). xterm's internal scheduler and the XTermTexture
 * composite loop then keep painting in both modes — and we don't
 * deadlock Three's own non-XR animation loop, which itself rides on
 * window.rAF and would otherwise wedge on the patch.
 */
export function installXrRafBridge(scene: Element) {
  if (installed) return;
  installed = true;

  scene.setAttribute('xr-raf-bridge', '');

  window.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.push({ id, cb });
    return id;
  };

  window.cancelAnimationFrame = (id) => {
    queue = queue.filter((entry) => entry.id !== id);
  };

  nativeRaf(drainLoop);

  // Pending native rAFs may not survive the transition out of VR on every
  // browser. Re-arm the loop on exit so the page doesn't wedge.
  scene.addEventListener('exit-vr', () => {
    nativeRaf(drainLoop);
  });
}
