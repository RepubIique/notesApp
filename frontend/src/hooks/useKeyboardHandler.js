import { useEffect, useState, useCallback } from 'react';

/**
 * Custom hook for handling mobile keyboard behavior
 * Detects keyboard open/close and provides utilities
 * 
 * @returns {Object} - Keyboard state and utilities
 */
export const useKeyboardHandler = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    // Store initial viewport height
    const initialHeight = window.visualViewport?.height || window.innerHeight;
    setViewportHeight(initialHeight);

    /**
     * Handle viewport resize (keyboard open/close)
     */
    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDiff = initialHeight - currentHeight;

      // Keyboard is considered open if viewport shrinks by more than 150px
      if (heightDiff > 150) {
        setIsKeyboardOpen(true);
        setKeyboardHeight(heightDiff);
      } else {
        setIsKeyboardOpen(false);
        setKeyboardHeight(0);
      }

      setViewportHeight(currentHeight);
    };

    // Use visualViewport API if available (better for mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  /**
   * Hide keyboard by blurring active element
   */
  const hideKeyboard = useCallback(() => {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  }, []);

  /**
   * Scroll element into view (useful when keyboard opens)
   */
  const scrollIntoView = useCallback((element, options = {}) => {
    if (element && element.scrollIntoView) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        ...options
      });
    }
  }, []);

  return {
    isKeyboardOpen,
    keyboardHeight,
    viewportHeight,
    hideKeyboard,
    scrollIntoView
  };
};

/**
 * Hook to prevent layout shift when keyboard appears
 * Adds padding to bottom of container
 */
export const useKeyboardPadding = () => {
  const { isKeyboardOpen, keyboardHeight } = useKeyboardHandler();

  return {
    paddingBottom: isKeyboardOpen ? `${keyboardHeight}px` : '0px',
    transition: 'padding-bottom 0.3s ease'
  };
};

export default useKeyboardHandler;
