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
    // 120x38 gives roughly 16:10 aspect ratio with monospace font cells
    const terminal = new Terminal({
      cursorBlink: false,
      cursorStyle: 'block',
      cursorInactiveStyle: 'block',
      cols: 120,
      rows: 38,
      fontSize: 16,
      fontFamily: 'monospace',
      allowTransparency: false,
      // OneDarkPro theme
      theme: {
        background: '#1e1e1e',
        foreground: '#abb2bf',
        cursor: '#ffffff',
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

    // Focus the terminal so the cursor renders
    terminal.focus();

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

      // xterm uses multiple canvas layers - we need to composite them
      // Find all canvases and their dimensions
      const canvases = Array.from(canvasElements);
      const mainCanvas = canvases.reduce((largest, canvas) => {
        return canvas.width * canvas.height > largest.width * largest.height
          ? canvas
          : largest;
      });

      // Create a composite canvas to merge all layers
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = mainCanvas.width;
      compositeCanvas.height = mainCanvas.height;
      const ctx = compositeCanvas.getContext('2d')!;

      // Function to composite all xterm canvas layers
      const compositeCanvases = () => {
        ctx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        // Draw canvases in order (bottom to top)
        canvases.forEach((canvas) => {
          ctx.drawImage(canvas, 0, 0);
        });
      };

      // Initial composite
      compositeCanvases();

      // Create a Three.js texture from the composite canvas
      const texture = new THREE.CanvasTexture(compositeCanvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      textureRef.current = texture;

      // Store composite function for use in update loop
      (textureRef as any).composite = compositeCanvases;

      // Apply texture to the A-Frame plane
      const mesh = plane.getObject3D('mesh');
      mesh.material.map = texture;
      mesh.material.needsUpdate = true;

      // Connect to server once texture is ready
      connectWebSocket();

      // Continuously update the texture
      const updateTexture = () => {
        if (textureRef.current) {
          // Re-composite all canvas layers before updating texture
          (textureRef as any).composite?.();
          textureRef.current.needsUpdate = true;
        }
        animationId = requestAnimationFrame(updateTexture);
      };
      updateTexture();
    };

    // Start initialization after a short delay to let xterm set up
    animationId = requestAnimationFrame(initTexture);

    // Global keyboard handler since terminal is hidden and can't be focused
    const handleKeyDown = (e: KeyboardEvent) => {
      if (ws?.readyState !== WebSocket.OPEN) return;

      // Ignore if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      e.preventDefault();

      let data: string | null = null;

      if (e.key.length === 1) {
        // Regular character
        if (e.ctrlKey) {
          // Ctrl+key combinations (e.g., Ctrl+C = \x03)
          const code = e.key.toLowerCase().charCodeAt(0) - 96;
          if (code > 0 && code < 27) {
            data = String.fromCharCode(code);
          }
        } else if (e.altKey) {
          // Alt+key sends escape sequence
          data = '\x1b' + e.key;
        } else {
          data = e.key;
        }
      } else {
        // Special keys
        switch (e.key) {
          case 'Enter':
            data = '\r';
            break;
          case 'Backspace':
            data = '\x7f';
            break;
          case 'Tab':
            data = '\t';
            break;
          case 'Escape':
            data = '\x1b';
            break;
          case 'ArrowUp':
            data = '\x1b[A';
            break;
          case 'ArrowDown':
            data = '\x1b[B';
            break;
          case 'ArrowRight':
            data = '\x1b[C';
            break;
          case 'ArrowLeft':
            data = '\x1b[D';
            break;
          case 'Home':
            data = '\x1b[H';
            break;
          case 'End':
            data = '\x1b[F';
            break;
          case 'Delete':
            data = '\x1b[3~';
            break;
        }
      }

      if (data) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      ws?.close();
      terminal.dispose();
    };
  }, [planeRef]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        width: '1200px',
        height: '750px',
        left: '0',
        top: '0',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
};
