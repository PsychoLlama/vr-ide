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
      // OneDarkPro theme
      theme: {
        background: '#1e1e1e',
        foreground: '#abb2bf',
        cursor: '#abb2bf',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#3e4451',
        selectionForeground: '#1e1e1e',
        black: '#1e1e1e',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#e5c07b',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#3e4451',
        brightRed: '#ff7a85',
        brightGreen: '#a8d389',
        brightYellow: '#f0d08b',
        brightBlue: '#71bfff',
        brightMagenta: '#d688ed',
        brightCyan: '#66c6d2',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);

    // Force canvas rendering instead of WebGL/DOM
    const canvasAddon = new CanvasAddon();
    terminal.loadAddon(canvasAddon);

    terminalRef.current = terminal;

    let animationId: number;
    let ws: WebSocket | null = null;

    // Connect to PTY server
    const connectWebSocket = () => {
      ws = new WebSocket('ws://127.0.0.1:8001');

      ws.onopen = () => {
        console.log('Connected to PTY server');
        // Send initial resize
        ws?.send(
          JSON.stringify({
            type: 'resize',
            cols: terminal.cols,
            rows: terminal.rows,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'output':
              terminal.write(msg.data);
              break;
            case 'exit':
              terminal.writeln(`\r\n[Process exited with code ${msg.exitCode}]`);
              break;
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from PTY server');
        terminal.writeln('\r\n[Connection closed]');
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        terminal.writeln('\r\n[Connection error - is the PTY server running?]');
      };
    };

    // Send terminal input to WebSocket
    terminal.onData((data) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Handle terminal resize
    terminal.onResize(({ cols, rows }) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

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

      // Connect to server once texture is ready
      connectWebSocket();

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

    return () => {
      cancelAnimationFrame(animationId);
      ws?.close();
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
