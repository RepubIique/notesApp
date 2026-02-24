import React, { useEffect, useState, useRef } from 'react';
import { IconButton, Box, Typography, CircularProgress, Button } from '@mui/material';
import { Mic, Stop, Close, FiberManualRecord, Send, Replay, PlayArrow, Pause } from '@mui/icons-material';
import { useVoiceRecording } from '../context/VoiceRecordingContext';

/**
 * Formats duration in seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time string
 */
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * VoiceRecorder component
 * Handles the UI and logic for recording voice messages
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1
 * 
 * @param {Object} props
 * @param {(audioBlob: Blob, duration: number) => void} props.onRecordingComplete - Callback when recording is finalized
 * @param {() => void} props.onCancel - Callback when recording is cancelled
 * @param {number} [props.maxDuration=300] - Maximum recording duration in seconds (default: 5 minutes)
 */
function VoiceRecorder({ onRecordingComplete, onCancel, maxDuration = 300 }) {
  const {
    isRecording,
    duration,
    recordingBlob,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError
  } = useVoiceRecording();

  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Preview playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  /**
   * Check microphone permission status on mount
   */
  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'microphone' });
          setPermissionStatus(result.state);
          
          // Listen for permission changes
          result.addEventListener('change', () => {
            setPermissionStatus(result.state);
          });
        }
      } catch (err) {
        // Permission API not supported or query failed
        console.log('Permission API not available:', err);
      }
    };

    checkPermission();
  }, []);

  /**
   * Handle recording completion - enter preview mode
   */
  useEffect(() => {
    if (recordingBlob && !isRecording && !isPreviewMode) {
      // Enter preview mode instead of immediately sending
      setIsPreviewMode(true);
      setPreviewBlob(recordingBlob);
      setPreviewDuration(duration);
      
      // Create object URL for preview playback
      const url = URL.createObjectURL(recordingBlob);
      setPreviewUrl(url);
    }
  }, [recordingBlob, isRecording, duration, isPreviewMode]);

  /**
   * Cleanup preview URL on unmount or when preview changes
   */
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /**
   * Auto-stop at max duration
   */
  useEffect(() => {
    if (isRecording && duration >= maxDuration) {
      handleStop();
    }
  }, [isRecording, duration, maxDuration]);

  /**
   * Handle record button click
   * Validates: Requirements 1.1, 1.2
   */
  const handleRecord = async () => {
    setIsCheckingPermission(true);
    clearError();
    
    try {
      await startRecording();
      setPermissionStatus('granted');
    } catch (err) {
      // Error is handled in context, just update permission status if denied
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
      }
    } finally {
      setIsCheckingPermission(false);
    }
  };

  /**
   * Handle stop button click
   * Validates: Requirements 1.4
   */
  const handleStop = () => {
    stopRecording();
  };

  /**
   * Handle cancel button click
   * Validates: Requirements 1.5
   */
  const handleCancel = () => {
    cancelRecording();
    
    // Clean up preview state
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setIsPreviewMode(false);
    setPreviewBlob(null);
    setPreviewDuration(0);
    setPreviewUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    
    onCancel();
  };

  /**
   * Handle send button click in preview mode
   */
  const handleSend = () => {
    if (previewBlob) {
      onRecordingComplete(previewBlob, previewDuration);
      
      // Clean up preview state
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setIsPreviewMode(false);
      setPreviewBlob(null);
      setPreviewDuration(0);
      setPreviewUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  /**
   * Handle re-record button click in preview mode
   */
  const handleReRecord = () => {
    // Clean up preview state
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setIsPreviewMode(false);
    setPreviewBlob(null);
    setPreviewDuration(0);
    setPreviewUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Cancel current recording and allow new recording
    cancelRecording();
  };

  /**
   * Handle play/pause in preview mode
   */
  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  /**
   * Handle audio time update
   */
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  /**
   * Handle audio ended
   */
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  /**
   * Handle progress bar click for seeking
   */
  const handleSeek = (event) => {
    if (!audioRef.current) return;

    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * audioRef.current.duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: 1,
        borderRadius: 1,
        backgroundColor: isRecording ? 'rgba(244, 67, 54, 0.05)' : isPreviewMode ? 'rgba(25, 118, 210, 0.05)' : 'transparent',
        transition: 'background-color 0.3s ease'
      }}
    >
      {isPreviewMode ? (
        <>
          {/* Preview mode UI */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flex: 1
            }}
          >
            {/* Play/Pause button */}
            <IconButton
              onClick={handlePlayPause}
              size="small"
              color="primary"
              title={isPlaying ? 'Pause' : 'Play preview'}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>

            {/* Progress bar and time */}
            <Box sx={{ flex: 1, minWidth: 100 }}>
              <Box
                onClick={handleSeek}
                sx={{
                  height: 4,
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  borderRadius: 2,
                  cursor: 'pointer',
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.15)'
                  }
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    backgroundColor: 'primary.main',
                    borderRadius: 2,
                    width: `${previewDuration > 0 ? (currentTime / previewDuration) * 100 : 0}%`,
                    transition: 'width 0.1s linear'
                  }}
                />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  fontFamily: 'monospace'
                }}
              >
                {formatDuration(currentTime)} / {formatDuration(previewDuration)}
              </Typography>
            </Box>

            {/* Hidden audio element for playback */}
            {previewUrl && (
              <audio
                ref={audioRef}
                src={previewUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleAudioEnded}
                style={{ display: 'none' }}
              />
            )}
          </Box>

          {/* Re-record button */}
          <Button
            onClick={handleReRecord}
            startIcon={<Replay />}
            size="small"
            variant="outlined"
            color="secondary"
            sx={{ minWidth: 'auto' }}
          >
            Re-record
          </Button>

          {/* Send button */}
          <Button
            onClick={handleSend}
            startIcon={<Send />}
            size="small"
            variant="contained"
            color="primary"
          >
            Send
          </Button>

          {/* Cancel button */}
          <IconButton
            onClick={handleCancel}
            size="small"
            color="error"
            title="Cancel"
          >
            <Close />
          </IconButton>
        </>
      ) : !isRecording ? (
        <>
          {/* Record button */}
          <IconButton
            onClick={handleRecord}
            disabled={isCheckingPermission}
            color="primary"
            title="Record voice message"
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)'
              }
            }}
          >
            {isCheckingPermission ? <CircularProgress size={24} /> : <Mic />}
          </IconButton>

          {/* Permission status display */}
          {permissionStatus === 'denied' && (
            <Typography
              variant="caption"
              color="error"
              sx={{ fontSize: '0.75rem' }}
            >
              Microphone access denied
            </Typography>
          )}
        </>
      ) : (
        <>
          {/* Recording indicator with pulsing animation */}
          {/* Validates: Requirements 8.1 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <FiberManualRecord
              sx={{
                color: '#f44336',
                fontSize: '1rem',
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%': {
                    opacity: 1,
                    transform: 'scale(1)'
                  },
                  '50%': {
                    opacity: 0.5,
                    transform: 'scale(1.1)'
                  },
                  '100%': {
                    opacity: 1,
                    transform: 'scale(1)'
                  }
                }
              }}
            />
            
            {/* Duration timer */}
            {/* Validates: Requirements 1.3 */}
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 500,
                minWidth: '45px',
                color: '#f44336'
              }}
            >
              {formatDuration(duration)}
            </Typography>

            {/* Max duration indicator */}
            {duration >= maxDuration * 0.9 && (
              <Typography
                variant="caption"
                color="error"
                sx={{ fontSize: '0.7rem' }}
              >
                (max: {formatDuration(maxDuration)})
              </Typography>
            )}
          </Box>

          {/* Stop button */}
          <IconButton
            onClick={handleStop}
            color="primary"
            title="Stop recording"
            sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.2)'
              }
            }}
          >
            <Stop />
          </IconButton>

          {/* Cancel button */}
          <IconButton
            onClick={handleCancel}
            color="error"
            title="Cancel recording"
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(244, 67, 54, 0.08)'
              }
            }}
          >
            <Close />
          </IconButton>
        </>
      )}

      {/* Error message display */}
      {error && (
        <Typography
          variant="caption"
          color="error"
          sx={{
            fontSize: '0.75rem',
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={error}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}

export default VoiceRecorder;
