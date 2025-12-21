/**
 * Messages sent from client to PTY server.
 */
export type ClientMessage =
  | { type: 'input'; data: string }
  | { type: 'resize'; cols: number; rows: number };

/**
 * Messages sent from PTY server to client.
 */
export type ServerMessage =
  | { type: 'output'; data: string }
  | { type: 'exit'; exitCode: number; signal: number };

/**
 * Type guard to check if a value is a valid ServerMessage.
 */
export function isServerMessage(value: unknown): value is ServerMessage {
  if (typeof value !== 'object' || value === null) return false;
  const msg = value as Record<string, unknown>;

  if (msg.type === 'output') {
    return typeof msg.data === 'string';
  }
  if (msg.type === 'exit') {
    return typeof msg.exitCode === 'number' && typeof msg.signal === 'number';
  }
  return false;
}

/**
 * Type guard to check if a value is a valid ClientMessage.
 */
export function isClientMessage(value: unknown): value is ClientMessage {
  if (typeof value !== 'object' || value === null) return false;
  const msg = value as Record<string, unknown>;

  if (msg.type === 'input') {
    return typeof msg.data === 'string';
  }
  if (msg.type === 'resize') {
    return typeof msg.cols === 'number' && typeof msg.rows === 'number';
  }
  return false;
}
