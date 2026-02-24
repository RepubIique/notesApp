import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { Close, Send, Replay, PlayArrow, Pause } from '@mui/icons-material';
import { useVoiceRecording } from '../context/VoiceRecordingContext';
import HoldToRecordButton from './HoldToRecordButton';
import { successHaptic, errorHaptic } from '../utils/haptics';

/**
 * Formats duration in seconds to MM:SS format
 */
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * VoiceRecorderMobile component
 * Mobile-optimized voice recorder with hold-to-record gesture
 * 
 * Features:
 * - Hold to record
 * - Slide to cancel
 * - Release to preview
 * - Haptic feedback
 */
function VoiceRecorderMobile({ onRecordingComplete, onCancel, maxDuration = 300 }) {
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

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Preview playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  /**
   * Handle recording completion - enter preview mode
   */
  useEffect(() => {
    if (recordingBlob && !isRecording && !isPreviewMode) {
      // Enter preview mode
      setIsPreviewMode(true);
      setPreviewBlob(recordingBlob);
      setPreviewDuration(duration);
      
      // Create object URL for preview playback
      const url = URL.createObjectURL(recordingBlob);
      setPreviewUrl(url);
      
      // Haptic feedback
      successHaptic();
    }
  }, [recordingBlob, isRecording, duration, isPreviewMode]);

  /**
   * Cleanup preview URL
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
      stopRecording();
    }
  }, [isRecording, duration, maxDuration, stopRecording]);

  /**
   * Handle start recording
   */
  const handleStartRecording = async () => {
    clearError();
    try {
      await startRecording();
    } catch (err) {
      errorHaptic();
      throw err;
    }
  };

  /**
   * Handle stop recording
   */
  const handleStopRecording = () => {
    stopRecording();
  };

  /**
   * Handle cancel recording
   */
  const handleCancelRecording = () => {
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
    
    errorHaptic();
    onCancel();
  };

  /**
   * Handle send
   */
  const handleSend = () => {
    if (previewBlob) {
      successHaptic();
      onRecordingComplete(previewBlob, previewDuration);
      
      // Clean up
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
   * Handle re-record
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
    
    cancelRecording();
  };

  /**
   * Handle play/pause
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
   * Handle time update
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
   * Handle seek
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
        width: '100%',
        padding: '12px',
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {isPreviewMode ? (
        /* Preview Mode */
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            width: '100%',
            padding: '12px 16px',
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
            borderRadius: '16px'
          }}
        >
          {/* Play/Pause button */}
          <IconButton
            onClick={handlePlayPause}
            size="large"
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              width: '48px',
              height: '48px',
              '&:hover': {
                backgroundColor: 'primary.dark'
              }
            }}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>

          {/* Progress and time */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              onClick={handleSeek}
              sx={{
                height: 6,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                borderRadius: 3,
                cursor: 'pointer',
                position: 'relative',
                marginBottom: '4px'
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  backgroundColor: 'primary.main',
                  borderRadius: 3,
                  width: `${previewDuration > 0 ? (currentTime / previewDuration) * 100 : 0}%`,
                  transition: 'width 0.1s linear'
                }}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                fontFamily: 'monospace'
              }}
            >
              {formatDuration(currentTime)} / {formatDuration(previewDuration)}
            </Typography>
          </Box>

          {/* Hidden audio element */}
          {previewUrl && (
            <audio
              ref={audioRef}
              src={previewUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleAudioEnded}
              style={{ display: 'none' }}
            />
          )}

          {/* Re-record button */}
          <IconButton
            onClick={handleReRecord}
            size="large"
            sx={{
              width: '48px',
              height: '48px'
            }}
          >
            <Replay />
          </IconButton>

          {/* Send button */}
          <IconButton
            onClick={handleSend}
            size="large"
            sx={{
              backgroundColor: 'success.main',
              color: 'white',
              width: '48px',
              height: '48px',
              '&:hover': {
                backgroundColor: 'success.dark'
              }
            }}
          >
            <Send />
          </IconButton>
        </Box>
      ) : (
        /* Recording Mode */
        <HoldToRecordButton
          onRecordingComplete={onRecordingComplete}
          onCancel={onCancel}
          isRecording={isRecording}
          duration={duration}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onCancelRecording={handleCancelRecording}
        />
      )}

      {/* Error message */}
      {error && (
        <Typography
          variant="caption"
          color="error"
          sx={{
            position: 'absolute',
            bottom: '4px',
            fontSize: '0.75rem',
            textAlign: 'center'
          }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}

export default VoiceRecorderMobile;
