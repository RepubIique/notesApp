import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';

/**
 * ImageLightbox - Fullscreen image viewer with navigation and zoom controls
 * 
 * @param {Object} props
 * @param {Array<{url: string, id: string}>} props.images - Array of images to display
 * @param {number} props.initialIndex - Index of the image to display initially
 * @param {boolean} props.open - Whether the lightbox is open
 * @param {Function} props.onClose - Callback when lightbox is closed
 */
function ImageLightbox({ images = [], initialIndex = 0, open = false, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // Zoom levels: 1.0, 1.5, 2.0, 3.0
  const ZOOM_LEVELS = [1.0, 1.5, 2.0, 3.0];

  // Reset to initial index when opened
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoomLevel(1.0);
    }
  }, [open, initialIndex]);

  // Reset zoom when changing images
  useEffect(() => {
    setZoomLevel(1.0);
  }, [currentIndex]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, images.length]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    const currentZoomIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentZoomIndex < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[currentZoomIndex + 1]);
    }
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    const currentZoomIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentZoomIndex > 0) {
      setZoomLevel(ZOOM_LEVELS[currentZoomIndex - 1]);
    }
  }, [zoomLevel]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, handlePrevious, handleNext]);

  // Don't render if no images
  if (!images || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];
  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex === images.length - 1;
  const canZoomIn = zoomLevel < ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  const canZoomOut = zoomLevel > ZOOM_LEVELS[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }}
    >
      {/* Close button - top right */}
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          color: 'white',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)'
          },
          zIndex: 2
        }}
        aria-label="Close"
      >
        <CloseIcon />
      </IconButton>

      {/* Image counter - top center */}
      <Typography
        variant="body1"
        sx={{
          position: 'absolute',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '8px 16px',
          borderRadius: '4px',
          zIndex: 2
        }}
      >
        {currentIndex + 1} / {images.length}
      </Typography>

      {/* Zoom controls - top left */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          gap: 1,
          zIndex: 2
        }}
      >
        <IconButton
          onClick={handleZoomOut}
          disabled={!canZoomOut}
          sx={{
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            },
            '&:disabled': {
              color: 'rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            }
          }}
          aria-label="Zoom out"
        >
          <ZoomOutIcon />
        </IconButton>
        <IconButton
          onClick={handleZoomIn}
          disabled={!canZoomIn}
          sx={{
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            },
            '&:disabled': {
              color: 'rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            }
          }}
          aria-label="Zoom in"
        >
          <ZoomInIcon />
        </IconButton>
        <Typography
          variant="body2"
          sx={{
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '8px 12px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            minWidth: '60px',
            justifyContent: 'center'
          }}
        >
          {Math.round(zoomLevel * 100)}%
        </Typography>
      </Box>

      {/* Previous button - left side */}
      {images.length > 1 && (
        <IconButton
          onClick={handlePrevious}
          disabled={isAtStart}
          sx={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            },
            '&:disabled': {
              color: 'rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            },
            zIndex: 2
          }}
          aria-label="Previous image"
        >
          <NavigateBeforeIcon fontSize="large" />
        </IconButton>
      )}

      {/* Next button - right side */}
      {images.length > 1 && (
        <IconButton
          onClick={handleNext}
          disabled={isAtEnd}
          sx={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            },
            '&:disabled': {
              color: 'rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            },
            zIndex: 2
          }}
          aria-label="Next image"
        >
          <NavigateNextIcon fontSize="large" />
        </IconButton>
      )}

      {/* Main image display */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: zoomLevel > 1 ? 'auto' : 'hidden',
          padding: '80px 80px 40px 80px'
        }}
      >
        <img
          src={currentImage?.url}
          alt={`Image ${currentIndex + 1}`}
          style={{
            maxWidth: zoomLevel === 1 ? '100%' : 'none',
            maxHeight: zoomLevel === 1 ? '100%' : 'none',
            width: zoomLevel > 1 ? `${zoomLevel * 100}%` : 'auto',
            height: 'auto',
            objectFit: 'contain',
            transform: `scale(${zoomLevel === 1 ? 1 : 1})`,
            transition: 'transform 0.2s ease-in-out',
            cursor: zoomLevel > 1 ? 'move' : 'default'
          }}
        />
      </Box>
    </Dialog>
  );
}

export default ImageLightbox;
