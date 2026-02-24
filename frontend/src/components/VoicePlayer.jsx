import { useRef, useState, useEffect } from 'react';
import { IconButton, Box, Typography, LinearProgress, Slider } from '@mui/material';
import { PlayArrow, Pause, Refresh } from '@mui/icons-material';
import { errorLogger, getUserFriendlyErrorMessage } from '../utils/errorLogger';

/**
 * Formats time in seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
const formatTime = (seconds) => {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * VoicePlayer component
 * Handles playback of voice messages with controls
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 7.5
 * 
 * @param {Object} props
 * @param {string} props.audioUrl - URL of the audio file to play
 * @param {number} props.duration - Total duration in seconds
 * @param {string} props.messageId - Unique identifier for the message
 * @param {boolean} [props.autoPlay=false] - Whether to auto-play the audio
 */
function VoicePlayer({ audioUrl, duration, messageId, autoPlay = false }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  /**
   * Initialize audio element and event listeners
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    /**
     * Handle time update during playback
     * Validates: Requirements 3.4
     */
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    /**
     * Handle playback end
     * Validates: Requirements 3.7
     */
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    /**
     * Handle playback errors
     * Validates: Requirements 7.5
     */
    const handleError = (event) => {
      const audioError = audio.error;
      let errorMessage = 'Failed to load audio';
      
      if (audioError) {
        switch (audioError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading audio';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio file is corrupted or unsupported';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported';
            break;
          default:
            errorMessage = 'Failed to load audio';
        }
      }
      
      // Log playback error (Requirement 7.5)
      errorLogger.logPlaybackError(new Error(errorMessage), {
        messageId,
        audioUrl,
        errorCode: audioError?.code,
        retryCount
      });
      
      setError(errorMessage);
      setIsLoading(false);
      setIsPlaying(false);
    };

    /**
     * Handle audio loaded
     */
    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setAudioDuration(audio.duration || duration);
      
      if (autoPlay) {
        play();
      }
    };

    /**
     * Handle audio can play
     */
    const handleCanPlay = () => {
      setIsLoading(false);
    };

    // Add event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);

    // Cleanup
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      
      // Cleanup: pause and release audio resources
      try {
        audio.pause();
        audio.src = '';
        audio.load();
      } catch (err) {
        console.warn('Error cleaning up audio element:', err);
      }
    };
  }, [audioUrl, duration, autoPlay, messageId, retryCount]);

  /**
   * Play audio
   * Validates: Requirements 3.2, 7.5
   */
  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
      setIsPlaying(true);
      setError(null);
    } catch (err) {
      console.error('Playback failed:', err);
      
      // Log playback error (Requirement 7.5)
      errorLogger.logPlaybackError(err, {
        messageId,
        audioUrl,
        action: 'play'
      });
      
      const userMessage = getUserFriendlyErrorMessage(err);
      setError(userMessage);
      setIsPlaying(false);
    }
  };

  /**
   * Retry loading audio
   * Validates: Requirement 7.5
   */
  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setError(null);
      setIsLoading(true);
      setRetryCount(prev => prev + 1);
      
      // Force reload audio
      const audio = audioRef.current;
      if (audio) {
        audio.load();
      }
    } else {
      setError('Maximum retry attempts reached. Please refresh the page.');
    }
  };

  /**
   * Pause audio
   * Validates: Requirements 3.5
   */
  const pause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
  };

  /**
   * Handle play/pause button click
   * Validates: Requirements 3.2, 3.3, 3.5
   */
  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  /**
   * Seek to specific time
   * Validates: Requirements 3.6
   */
  const seek = (time) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  };

  /**
   * Handle progress bar click
   * Validates: Requirements 3.6
   */
  const handleProgressClick = (event, newValue) => {
    seek(newValue);
  };

  /**
   * Calculate progress percentage
   */
  const progressPercentage = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <Box
      data-testid={`voice-player-${messageId}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: 1,
        borderRadius: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        minWidth: '250px',
        maxWidth: '400px'
      }}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {/* Play/Pause button */}
      {/* Validates: Requirements 3.1, 3.2, 3.3 */}
      <IconButton
        onClick={handlePlayPause}
        disabled={isLoading || !!error}
        color="primary"
        size="small"
        title={isPlaying ? 'Pause' : 'Play'}
        sx={{
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)'
          }
        }}
      >
        {isPlaying ? <Pause /> : <PlayArrow />}
      </IconButton>

      {/* Progress and time display */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {/* Loading state */}
        {isLoading && (
          <LinearProgress
            sx={{
              height: 2,
              borderRadius: 1
            }}
          />
        )}

        {/* Progress bar with seek functionality */}
        {/* Validates: Requirements 3.4, 3.6 */}
        {!isLoading && !error && (
          <Slider
            value={currentTime}
            min={0}
            max={audioDuration}
            onChange={handleProgressClick}
            disabled={isLoading || !!error}
            sx={{
              height: 4,
              padding: '4px 0',
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: '0 0 0 8px rgba(25, 118, 210, 0.16)'
                }
              },
              '& .MuiSlider-rail': {
                opacity: 0.3
              }
            }}
          />
        )}

        {/* Time display */}
        {/* Validates: Requirements 3.1 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: 'text.secondary'
            }}
          >
            {formatTime(currentTime)}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: 'text.secondary'
            }}
          >
            {formatTime(audioDuration)}
          </Typography>
        </Box>
      </Box>

      {/* Error message display with retry button */}
      {/* Validates: Requirements 7.5 */}
      {error && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="caption"
            color="error"
            sx={{
              fontSize: '0.7rem',
              maxWidth: '150px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={error}
          >
            {error}
          </Typography>
          {retryCount < maxRetries && (
            <IconButton
              size="small"
              onClick={handleRetry}
              title="Retry loading audio"
              sx={{ padding: '2px' }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
    </Box>
  );
}

export default VoicePlayer;
