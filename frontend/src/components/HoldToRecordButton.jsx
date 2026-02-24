import React, { useRef, useState, useEffect } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Mic, Close, Send } from '@mui/icons-material';
import { mediumHaptic, successHaptic, errorHaptic, lightHaptic } from '../utils/haptics';

/**
 * HoldToRecordButton Component
 * Implements WhatsApp-style hold-to-record with slide-to-cancel
 * 
 * Features:
 * - Hold to start recording
 * - Slide left to cancel
 * - Release to stop and preview
 * - Haptic feedback on interactions
 */
function HoldToRecordButton({ onRecordingComplete, onCancel, isRecording, duration, onStartRecording, onStopRecording, onCancelRecording }) {
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isTouching, setIsTouching] = useState(false);
  const [slideDistance, setSlideDistance] = useState(0);
  const [showCancelHint, setShowCancelHint] = useState(false);
  const buttonRef = useRef(null);
  const cancelThreshold = 120; // pixels to slide left to cancel

  /**
   * Format duration to MM:SS
   */
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle touch start - begin recording
   */
  const handleTouchStart = async (e) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    setCurrentX(touch.clientX);
    setIsTouching(true);
    setSlideDistance(0);
    setShowCancelHint(false);

    // Haptic feedback
    mediumHaptic();

    // Start recording
    try {
      await onStartRecording();
    } catch (error) {
      errorHaptic();
      setIsTouching(false);
    }
  };

  /**
   * Handle touch move - track slide distance
   */
  const handleTouchMove = (e) => {
    if (!isTouching) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    setCurrentX(touch.clientX);

    // Only track horizontal movement (left swipe)
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0) {
      const distance = Math.abs(deltaX);
      setSlideDistance(distance);

      // Show cancel hint when sliding
      if (distance > 30) {
        setShowCancelHint(true);
        lightHaptic();
      }

      // Cancel if threshold reached
      if (distance >= cancelThreshold) {
        handleCancel();
      }
    }
  };

  /**
   * Handle touch end - stop recording and preview
   */
  const handleTouchEnd = () => {
    if (!isTouching) return;

    setIsTouching(false);
    setSlideDistance(0);
    setShowCancelHint(false);

    // If not cancelled, stop recording
    if (slideDistance < cancelThreshold) {
      mediumHaptic();
      onStopRecording();
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    errorHaptic();
    setIsTouching(false);
    setSlideDistance(0);
    setShowCancelHint(false);
    onCancelRecording();
  };

  /**
   * Calculate opacity for cancel hint
   */
  const cancelOpacity = Math.min(slideDistance / cancelThreshold, 1);

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: '60px',
        touchAction: 'none', // Prevent default touch behaviors
        userSelect: 'none'
      }}
    >
      {isRecording ? (
        <>
          {/* Recording UI */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              borderRadius: '12px',
              position: 'relative',
              overflow: 'hidden',
              transform: `translateX(${-slideDistance}px)`,
              transition: isTouching ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            {/* Slide to cancel background indicator */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${(slideDistance / cancelThreshold) * 100}%`,
                backgroundColor: 'rgba(244, 67, 54, 0.2)',
                transition: 'width 0.1s linear'
              }}
            />

            {/* Recording indicator */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                zIndex: 1
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#f44336',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                    '50%': { opacity: 0.5, transform: 'scale(1.1)' }
                  }
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: '#f44336',
                  minWidth: '45px'
                }}
              >
                {formatDuration(duration)}
              </Typography>
            </Box>

            {/* Slide to cancel hint */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: showCancelHint ? '#f44336' : '#999',
                  fontSize: '0.875rem',
                  fontWeight: showCancelHint ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}
              >
                {showCancelHint ? '← Slide to cancel' : 'Recording...'}
              </Typography>
            </Box>

            {/* Cancel icon (appears when sliding) */}
            {showCancelHint && (
              <Close
                sx={{
                  color: '#f44336',
                  opacity: cancelOpacity,
                  transition: 'opacity 0.1s linear',
                  zIndex: 1
                }}
              />
            )}
          </Box>
        </>
      ) : (
        <>
          {/* Hold to record button */}
          <Box
            ref={buttonRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'primary.main',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              '&:active': {
                transform: 'scale(0.95)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }
            }}
          >
            <Mic sx={{ fontSize: '28px' }} />
          </Box>

          {/* Hint text */}
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              bottom: '-20px',
              fontSize: '0.7rem',
              color: 'text.secondary',
              whiteSpace: 'nowrap'
            }}
          >
            Hold to record
          </Typography>
        </>
      )}
    </Box>
  );
}

export default HoldToRecordButton;
