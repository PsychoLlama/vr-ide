import { style } from '@vanilla-extract/css';

export const page = style({
  minHeight: '100vh',
  background: '#1e1e1e',
  color: '#abb2bf',
  fontFamily: 'Inter Variable, system-ui, sans-serif',
});

export const content = style({
  maxWidth: '720px',
  margin: '0 auto',
  padding: '2rem',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const heading = style({
  fontSize: '1.5rem',
  fontWeight: 600,
  margin: 0,
});

export const subheading = style({
  fontSize: '0.875rem',
  color: '#5c6370',
  margin: 0,
});

export const card = style({
  background: '#2a2d35',
  border: '1px solid #3e4451',
  borderRadius: '6px',
  padding: '1rem 1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const cardLabel = style({
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#5c6370',
});

export const cardValue = style({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.95rem',
  color: '#abb2bf',
  wordBreak: 'break-all',
});

export const statusOk = style({
  color: '#98c379',
});

export const statusWarn = style({
  color: '#e5c07b',
});

export const statusError = style({
  color: '#e06c75',
});

export const captureHint = style({
  fontSize: '0.875rem',
  color: '#5c6370',
});

export const lastKey = style({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.875rem',
  color: '#61afef',
  minHeight: '1.2em',
});
