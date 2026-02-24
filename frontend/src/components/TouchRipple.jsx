import React, { useState, useCallback } from 'react';
import { Box } from '@mui/material';

/**
 * TouchRipple Component
 * Adds Material Design ripple effect to touch interactions
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child elements
 * @param {string} props.color - Ripple color (default: rgba(255,255,255,0.3))
 * @param {number} props.duration - Animation duration in ms (default: 600)
 * @param {Object} props.sx - Additional MUI sx props
 */
function TouchRipple({ children, color = 'rgba(255, 255, 255, 0.3)', duration = 600, sx = {}, ...props }) {
  const [ripples, setRipples] = useState([]);

  /**
   * Create ripple on touch/click
   */
  const createRipple = useCallback((event) => {
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    
    // Calculate ripple position
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate ripple size (diameter of circle that covers container)
    const size = Math.max(rect.width, rect.height) * 2;
    
    const newRipple = {
      x,
      y,
      size,
      id: Date.now()
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, duration);
  }, [duration]);

  /**
   * Handle touch start
   */
  const handleTouchStart = (e) => {
    createRipple(e);
    if (props.onTouchStart) {
      props.onTouchStart(e);
    }
  };

  /**
   * Handle mouse down (for desktop testing)
   */
  const handleMouseDown = (e) => {
    createRipple(e);
    if (props.onMouseDown) {
      props.onMouseDown(e);
    }
  };

  return (
    <Box
      {...props}
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseDown}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
        ...sx
      }}
    >
      {children}
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <Box
          key={ripple.id}
          sx={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            borderRadius: '50%',
            backgroundColor: color,
            transform: 'translate(-50%, -50%) scale(0)',
            animation: `ripple ${duration}ms ease-out`,
            pointerEvents: 'none',
            '@keyframes ripple': {
              '0%': {
                transform: 'translate(-50%, -50%) scale(0)',
                opacity: 1
              },
              '100%': {
                transform: 'translate(-50%, -50%) scale(1)',
                opacity: 0
              }
            }
          }}
        />
      ))}
    </Box>
  );
}

export default TouchRipple;
