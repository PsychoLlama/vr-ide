import React from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { CanvasAddon } from '@xterm/addon-canvas';
import '@xterm/xterm/css/xterm.css';
import type { THREE as ThreeLib } from 'aframe';
import type { MeshEntity } from '../../react-aframe';

declare global {
  const THREE: typeof ThreeLib;
}

interface Props {
  /**
   * Ref to the A-Frame mesh entity where the terminal texture will be applied.
   */
  planeRef: React.RefObject<MeshEntity | null>;
}

/**
 * XTermTexture mounts an xterm.js terminal and renders it as a texture
 * on a Three.js mesh (via A-Frame).
 */
export const XTermTexture: React.FC<Props> = ({ planeRef }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const terminalRef = React.useRef<Terminal | null>(null);
  const textureRef = React.useRef<ThreeLib.CanvasTexture | null>(null);

  React.useEffect(() => {
    if (!containerRef.current || !planeRef.current) return;

    const container = containerRef.current;
    const plane = planeRef.current;

    // Create and mount the terminal
    const terminal = new Terminal({
      cursorBlink: true,
      cols: 80,
      rows: 24,
      fontSize: 16,
      fontFamily: 'monospace',
      allowTransparency: false,
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        cursorAccent: '#1e1e2e',
        selectionBackground: '#585b70',
        black: '#45475a',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#f5c2e7',
        cyan: '#94e2d5',
        white: '#bac2de',
        brightBlack: '#585b70',
        brightRed: '#f38ba8',
        brightGreen: '#a6e3a1',
        brightYellow: '#f9e2af',
        brightBlue: '#89b4fa',
        brightMagenta: '#f5c2e7',
        brightCyan: '#94e2d5',
        brightWhite: '#a6adc8',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);

    // Force canvas rendering instead of WebGL/DOM
    const canvasAddon = new CanvasAddon();
    terminal.loadAddon(canvasAddon);

    terminalRef.current = terminal;

    // Write some demo content
    terminal.writeln('Welcome to VR Terminal!');
    terminal.writeln('');
    terminal.write('$ ');

    let animationId: number;

    // Wait a frame for xterm to fully render its canvas
    const initTexture = () => {
      // xterm 5.x creates canvas elements inside the terminal container
      const canvasElements = container.querySelectorAll('canvas');

      if (canvasElements.length === 0) {
        // Try again next frame
        animationId = requestAnimationFrame(initTexture);
        return;
      }

      // Find the largest canvas (the main rendering canvas)
      let terminalCanvas: HTMLCanvasElement | null = null;
      let maxArea = 0;
      canvasElements.forEach((canvas) => {
        const area = canvas.width * canvas.height;
        if (area > maxArea) {
          maxArea = area;
          terminalCanvas = canvas;
        }
      });

      if (!terminalCanvas) {
        console.error('Could not find xterm canvas element');
        return;
      }

      // Create a Three.js texture from the terminal canvas
      const texture = new THREE.CanvasTexture(terminalCanvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      textureRef.current = texture;

      // Apply texture to the A-Frame plane
      const mesh = plane.getObject3D('mesh');
      mesh.material.map = texture;
      mesh.material.needsUpdate = true;

      // Continuously update the texture
      const updateTexture = () => {
        if (textureRef.current) {
          textureRef.current.needsUpdate = true;
        }
        animationId = requestAnimationFrame(updateTexture);
      };
      updateTexture();
    };

    // Start initialization after a short delay to let xterm set up
    animationId = requestAnimationFrame(initTexture);

    // Handle keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      // Send key to terminal
      if (e.key.length === 1) {
        terminal.write(e.key);
      } else if (e.key === 'Enter') {
        terminal.writeln('');
        terminal.write('$ ');
      } else if (e.key === 'Backspace') {
        terminal.write('\b \b');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      terminal.dispose();
    };
  }, [planeRef]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        width: '800px',
        height: '600px',
        left: '0',
        top: '0',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
};
