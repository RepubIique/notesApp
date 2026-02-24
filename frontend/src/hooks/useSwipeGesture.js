import { useRef, useEffect } from 'react';

/**
 * Custom hook for swipe gesture detection
 * @param {Object} options - Configuration options
 * @param {Function} options.onSwipeLeft - Callback for left swipe
 * @param {Function} options.onSwipeRight - Callback for right swipe
 * @param {number} options.threshold - Minimum distance for swipe (default: 50px)
 * @param {number} options.velocityThreshold - Minimum velocity for swipe (default: 0.3)
 * @returns {Object} - Ref to attach to element and swipe state
 */
export const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  velocityThreshold = 0.3
} = {}) => {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const isSwiping = useRef(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchStartTime.current = Date.now();
      isSwiping.current = false;
    };

    const handleTouchMove = (e) => {
      if (!touchStartX.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Check if horizontal swipe (not vertical scroll)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isSwiping.current = true;
        // Prevent vertical scroll while swiping horizontally
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e) => {
      if (!touchStartX.current || !isSwiping.current) {
        touchStartX.current = 0;
        touchStartY.current = 0;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      const deltaTime = Date.now() - touchStartTime.current;
      const velocity = Math.abs(deltaX) / deltaTime;

      // Check if it's a horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Check if swipe meets threshold or velocity requirements
        if (Math.abs(deltaX) > threshold || velocity > velocityThreshold) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight(deltaX);
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft(Math.abs(deltaX));
          }
        }
      }

      // Reset
      touchStartX.current = 0;
      touchStartY.current = 0;
      touchStartTime.current = 0;
      isSwiping.current = false;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold, velocityThreshold]);

  return elementRef;
};

/**
 * Custom hook for long press detection
 * @param {Function} onLongPress - Callback when long press is detected
 * @param {number} duration - Duration in ms to trigger long press (default: 500ms)
 * @returns {Object} - Event handlers to spread on element
 */
export const useLongPress = (onLongPress, duration = 500) => {
  const timeoutRef = useRef(null);
  const isLongPress = useRef(false);

  const start = (e) => {
    isLongPress.current = false;
    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      if (onLongPress) {
        onLongPress(e);
      }
    }, duration);
  };

  const clear = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleTouchStart = (e) => {
    start(e);
  };

  const handleTouchEnd = () => {
    clear();
  };

  const handleTouchMove = () => {
    clear();
  };

  const handleMouseDown = (e) => {
    start(e);
  };

  const handleMouseUp = () => {
    clear();
  };

  const handleMouseLeave = () => {
    clear();
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    onClick: (e) => {
      // Prevent click if it was a long press
      if (isLongPress.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };
};

export default useSwipeGesture;
