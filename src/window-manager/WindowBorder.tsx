import React from 'react';

interface Props {
  /**
   * Width of the window (matches a-plane width).
   */
  width: number;
  /**
   * Height of the window (matches a-plane height).
   */
  height: number;
  /**
   * Border thickness.
   */
  thickness?: number;
  /**
   * Whether this window is focused.
   */
  focused: boolean;
  /**
   * Whether this window is in select mode (being moved).
   */
  selectMode?: boolean;
}

// OneDarkPro theme colors
const COLORS = {
  focused: '#61afef', // Blue
  unfocused: '#3e4451', // Gray
  selectMode: '#e5c07b', // Yellow
};

/**
 * WindowBorder renders four thin a-planes forming a border around a window.
 * Color indicates focus state.
 */
export const WindowBorder: React.FC<Props> = ({
  width,
  height,
  thickness = 0.02,
  focused,
  selectMode = false,
}) => {
  const color = selectMode
    ? COLORS.selectMode
    : focused
      ? COLORS.focused
      : COLORS.unfocused;

  // Position the border slightly in front of the terminal plane to avoid z-fighting
  const zOffset = 0.001;

  // Calculate edge positions
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return (
    <a-entity>
      {/* Top edge */}
      <a-plane
        width={width + thickness * 2}
        height={thickness}
        color={color}
        position={`0 ${halfHeight + thickness / 2} ${zOffset}`}
        material="shader: flat"
      />

      {/* Bottom edge */}
      <a-plane
        width={width + thickness * 2}
        height={thickness}
        color={color}
        position={`0 ${-halfHeight - thickness / 2} ${zOffset}`}
        material="shader: flat"
      />

      {/* Left edge */}
      <a-plane
        width={thickness}
        height={height}
        color={color}
        position={`${-halfWidth - thickness / 2} 0 ${zOffset}`}
        material="shader: flat"
      />

      {/* Right edge */}
      <a-plane
        width={thickness}
        height={height}
        color={color}
        position={`${halfWidth + thickness / 2} 0 ${zOffset}`}
        material="shader: flat"
      />
    </a-entity>
  );
};
