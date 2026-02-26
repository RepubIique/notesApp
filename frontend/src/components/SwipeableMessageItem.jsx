import React, { useState, useRef } from 'react';
import { Box, IconButton } from '@mui/material';
import { Reply, Delete } from '@mui/icons-material';
import MessageItem from './MessageItem';
import { lightHaptic, mediumHaptic } from '../utils/haptics';
import { useLongPress } from '../hooks/useSwipeGesture';

/**
 * SwipeableMessageItem Component
 * Wraps MessageItem with swipe gestures and long-press reactions
 * 
 * Features:
 * - Swipe right to reply
 * - Swipe left to delete (own messages only)
 * - Long press for quick reactions
 * - Haptic feedback
 */
function SwipeableMessageItem({ 
  message, 
  isOwn, 
  onUnsend, 
  onReact, 
  onImageClick,
  onReply,
  onReplyClick
}) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showHoverActions, setShowHoverActions] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const elementRef = useRef(null);
  const isMouseDown = useRef(false);

  const swipeThreshold = 80; // pixels to trigger action
  const maxSwipe = 120; // maximum swipe distance

  // Common emojis for quick reactions
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  /**
   * Handle touch start
   */
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    setIsSwiping(false);
  };

  /**
   * Handle mouse down (for desktop drag)
   */
  const handleMouseDown = (e) => {
    // Ignore if clicking on interactive elements
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('[role="button"]')) {
      return;
    }
    
    isMouseDown.current = true;
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    setIsSwiping(false);
    e.preventDefault();
  };

  /**
   * Handle touch move - track swipe
   */
  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Check if horizontal swipe (not vertical scroll)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsSwiping(true);
      
      // Swipe right to reply (any message)
      if (deltaX > 0) {
        const clampedSwipe = Math.min(deltaX, maxSwipe);
        setSwipeX(clampedSwipe);
        
        // Haptic feedback at threshold
        if (clampedSwipe >= swipeThreshold && swipeX < swipeThreshold) {
          lightHaptic();
        }
      }
      // Swipe left to delete (own messages only)
      else if (deltaX < 0 && isOwn && !message.deleted) {
        const clampedSwipe = Math.max(deltaX, -maxSwipe);
        setSwipeX(clampedSwipe);
        
        // Haptic feedback at threshold
        if (Math.abs(clampedSwipe) >= swipeThreshold && Math.abs(swipeX) < swipeThreshold) {
          lightHaptic();
        }
      }

      // Prevent scroll while swiping
      e.preventDefault();
    }
  };

  /**
   * Handle mouse move (for desktop drag)
   */
  const handleMouseMove = (e) => {
    if (!isMouseDown.current) return;

    const deltaX = e.clientX - touchStartX.current;
    const deltaY = e.clientY - touchStartY.current;

    // Check if horizontal drag (not vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsSwiping(true);
      
      // Drag right to reply (any message)
      if (deltaX > 0) {
        const clampedSwipe = Math.min(deltaX, maxSwipe);
        setSwipeX(clampedSwipe);
      }
      // Drag left to delete (own messages only)
      else if (deltaX < 0 && isOwn && !message.deleted) {
        const clampedSwipe = Math.max(deltaX, -maxSwipe);
        setSwipeX(clampedSwipe);
      }
    }
  };

  /**
   * Handle touch end - trigger action if threshold met
   */
  const handleTouchEnd = () => {
    if (!isSwiping) {
      setSwipeX(0);
      return;
    }

    // Swipe right to reply
    if (swipeX >= swipeThreshold) {
      mediumHaptic();
      if (onReply) {
        onReply(message);
      }
    }
    // Swipe left to delete
    else if (swipeX <= -swipeThreshold && isOwn && !message.deleted) {
      mediumHaptic();
      if (onUnsend) {
        onUnsend(message.id);
      }
    }

    // Reset
    setSwipeX(0);
    setIsSwiping(false);
  };

  /**
   * Handle mouse up (for desktop drag)
   */
  const handleMouseUp = () => {
    if (!isMouseDown.current) return;
    
    isMouseDown.current = false;

    if (!isSwiping) {
      setSwipeX(0);
      return;
    }

    // Drag right to reply
    if (swipeX >= swipeThreshold) {
      if (onReply) {
        onReply(message);
      }
    }
    // Drag left to delete
    else if (swipeX <= -swipeThreshold && isOwn && !message.deleted) {
      if (onUnsend) {
        onUnsend(message.id);
      }
    }

    // Reset
    setSwipeX(0);
    setIsSwiping(false);
  };

  /**
   * Handle mouse leave - cancel drag if mouse leaves element
   */
  const handleMouseLeave = () => {
    if (isMouseDown.current) {
      isMouseDown.current = false;
      setSwipeX(0);
      setIsSwiping(false);
    }
  };

  /**
   * Handle long press for reactions
   */
  const longPressHandlers = useLongPress(() => {
    mediumHaptic();
    setShowReactions(true);
  }, 500);

  /**
   * Handle reaction selection
   */
  const handleReactionSelect = (emoji) => {
    lightHaptic();
    if (onReact) {
      onReact(message.id, emoji);
    }
    setShowReactions(false);
  };

  /**
   * Calculate swipe progress (0 to 1)
   */
  const swipeProgress = Math.min(Math.abs(swipeX) / swipeThreshold, 1);

  return (
    <Box
      ref={elementRef}
      onMouseEnter={() => setShowHoverActions(true)}
      onMouseLeave={() => {
        setShowHoverActions(false);
        handleMouseLeave();
      }}
      sx={{
        position: 'relative',
        touchAction: isSwiping ? 'none' : 'auto',
        userSelect: 'none'
      }}
    >
      {/* Swipe action indicators */}
      {swipeX !== 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            zIndex: 0,
            ...(swipeX > 0 ? {
              left: 0,
              paddingLeft: '16px'
            } : {
              right: 0,
              paddingRight: '16px'
            })
          }}
        >
          {swipeX > 0 ? (
            <Reply
              sx={{
                color: 'primary.main',
                opacity: swipeProgress,
                transform: `scale(${0.8 + swipeProgress * 0.4})`,
                transition: 'all 0.1s ease'
              }}
            />
          ) : (
            <Delete
              sx={{
                color: 'error.main',
                opacity: swipeProgress,
                transform: `scale(${0.8 + swipeProgress * 0.4})`,
                transition: 'all 0.1s ease'
              }}
            />
          )}
        </Box>
      )}

      {/* Desktop hover actions */}
      {showHoverActions && !isSwiping && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
            display: 'flex',
            gap: '4px',
            ...(isOwn ? {
              left: '8px'
            } : {
              right: '8px'
            })
          }}
        >
          <IconButton
            size="small"
            onClick={() => onReply && onReply(message)}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.1)'
              },
              transition: 'all 0.2s ease'
            }}
            title="Reply to this message"
          >
            <Reply fontSize="small" color="primary" />
          </IconButton>
        </Box>
      )}

      {/* Message content */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        {...longPressHandlers}
        sx={{
          position: 'relative',
          zIndex: 1,
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
          cursor: isMouseDown.current ? 'grabbing' : 'default'
        }}
      >
        <MessageItem
          message={message}
          isOwn={isOwn}
          onUnsend={onUnsend}
          onReact={onReact}
          onImageClick={onImageClick}
          onReplyClick={onReplyClick}
        />
      </Box>

      {/* Quick reactions popup (long press) */}
      {showReactions && (
        <>
          {/* Backdrop */}
          <Box
            onClick={() => setShowReactions(false)}
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 1000,
              animation: 'fadeIn 0.2s ease'
            }}
          />

          {/* Reactions popup */}
          <Box
            sx={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              zIndex: 1001,
              display: 'flex',
              gap: '8px',
              animation: 'scaleIn 0.2s ease',
              '@keyframes fadeIn': {
                from: { opacity: 0 },
                to: { opacity: 1 }
              },
              '@keyframes scaleIn': {
                from: { opacity: 0, transform: 'translate(-50%, -50%) scale(0.8)' },
                to: { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }
              }
            }}
          >
            {quickReactions.map((emoji) => (
              <IconButton
                key={emoji}
                onClick={() => handleReactionSelect(emoji)}
                sx={{
                  fontSize: '32px',
                  width: '56px',
                  height: '56px',
                  transition: 'transform 0.2s ease',
                  '&:active': {
                    transform: 'scale(1.2)'
                  }
                }}
              >
                {emoji}
              </IconButton>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

export default SwipeableMessageItem;
