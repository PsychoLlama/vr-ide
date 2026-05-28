/**
 * Window-size constants and clamps. Centralised so the dispatcher's
 * resize step, the reducer's bounds check, and the controllers'
 * geometry derivation all agree on one set of numbers.
 */

export const DEFAULT_COLS = 120;
export const DEFAULT_ROWS = 38;

export const MIN_COLS = 40;
export const MIN_ROWS = 13;

export const MAX_COLS = 200;
export const MAX_ROWS = 63;

// One Alt+= / Alt+- press steps by this much. Ratio (16:5) is chosen
// to track the default 120:38 aspect closely so the window doesn't
// drift toward weird proportions over multiple resizes.
export const STEP_COLS = 16;
export const STEP_ROWS = 5;

// Physical metres per cell — sized so a default 120 × 38 grid fills a
// 4 × 2.5 m plane with the right cell aspect for 16px monospace.
export const CELL_WIDTH_M = 4 / DEFAULT_COLS;
export const CELL_HEIGHT_M = 2.5 / DEFAULT_ROWS;

// Off-screen host-pixels per cell. xterm sizes its canvas from its
// own font metrics; these just give the hidden container enough room
// to lay out without overflow at any supported grid size.
export const HIDDEN_PX_PER_COL = 12;
export const HIDDEN_PX_PER_ROW = 22;

export function clampCols(cols: number): number {
  return Math.max(MIN_COLS, Math.min(MAX_COLS, cols));
}

export function clampRows(rows: number): number {
  return Math.max(MIN_ROWS, Math.min(MAX_ROWS, rows));
}
