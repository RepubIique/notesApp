import { useRef, useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { PlayArrow, Pause } from '@mui/icons-material';
import { errorLogger, getUserFriendlyErrorMessage } from '../utils/errorLogger';
import { lightHaptic, errorHaptic } from '../utils/haptics';
import TouchRipple from './TouchRipple';

/**
 * Formats time in seconds to MM:SS format
 */
const formatTime = (seconds) => {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * VoicePlayerMobile component
 * Mobile-optimized voice player with larger touch targets
 * 
 * Features:
 * - 48x48px minimum touch targets
 * - Touch ripple effects
 * - Haptic feedback
 * - Optimized for one-handed use
 */
function VoicePlayerMobile({ audioUrl, duration, messageId, autoPlay = false }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioDuration, setAudioDuration] = useState(duration);

  /**
   * Initialize audio element
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleError = (event) => {
      const audioError = audio.error;
      let errorMessage = 'Failed to load audio';
      
      if (audioError) {
        switch (audioError.code) {
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio corrupted';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Format not supported';
            break;
          default:
            errorMessage = 'Playback failed';
        }
      }
      
      errorLogger.logPlaybackError(new Error(errorMessage), {
        messageId,
        audioUrl,
        errorCode: audioError?.code
      });
      
      setError(errorMessage);
      setIsLoading(false);
      setIsPlaying(false);
      errorHaptic();
    };

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setAudioDuration(audio.duration || duration);
      
      if (autoPlay) {
        play();
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      
      try {
        audio.pause();
        audio.src = '';
        audio.load();
      } catch (err) {
        console.warn('Error cleaning up audio:', err);
      }
    };
  }, [audioUrl, duration, autoPlay, messageId]);

  /**
   * Play audio
   */
  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
      setIsPlaying(true);
      setError(null);
      lightHaptic();
    } catch (err) {
      console.error('Playback failed:', err);
      errorLogger.logPlaybackError(err, { messageId, audioUrl });
      setError(getUserFriendlyErrorMessage(err));
      setIsPlaying(false);
      errorHaptic();
    }
  };

  /**
   * Pause audio
   */
  const pause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    lightHaptic();
  };

  /**
   * Handle play/pause
   */
  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  /**
   * Handle progress bar touch
   */
  const handleProgressTouch = (event) => {
    const audio = audioRef.current;
    if (!audio || isLoading || error) return;

    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const touchX = event.touches ? event.touches[0].clientX : event.clientX;
    const clickX = touchX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * audioDuration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
    lightHaptic();
  };

  const progressPercentage = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        padding: '12px',
        borderRadius: '12px',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        minWidth: '280px',
        maxWidth: '100%'
      }}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {/* Play/Pause button - 48x48px touch target */}
      <TouchRipple
        onClick={handlePlayPause}
        disabled={isLoading || !!error}
        sx={{
          width: '48px',
          height: '48px',
          minWidth: '48px',
          minHeight: '48px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isLoading || error ? 'rgba(0, 0, 0, 0.12)' : 'primary.main',
          color: 'white',
          cursor: isLoading || error ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          '&:active': {
            transform: 'scale(0.95)'
          }
        }}
      >
        {isLoading ? (
          <CircularProgress size={24} sx={{ color: 'white' }} />
        ) : isPlaying ? (
          <Pause sx={{ fontSize: '28px' }} />
        ) : (
          <PlayArrow sx={{ fontSize: '28px' }} />
        )}
      </TouchRipple>

      {/* Progress and time */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {/* Progress bar - larger touch target (min 44px height) */}
        <Box
          onTouchStart={handleProgressTouch}
          onMouseDown={handleProgressTouch}
          sx={{
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            cursor: isLoading || error ? 'not-allowed' : 'pointer',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              borderRadius: '3px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Progress fill */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${progressPercentage}%`,
                backgroundColor: 'primary.main',
                borderRadius: '3px',
                transition: 'width 0.1s linear'
              }}
            />
            
            {/* Playhead indicator */}
            {!isLoading && !error && (
              <Box
                sx={{
                  position: 'absolute',
                  left: `${progressPercentage}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '16px',
                  height: '16px',
                  backgroundColor: 'primary.main',
                  borderRadius: '50%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.1s linear'
                }}
              />
            )}
          </Box>
        </Box>

        {/* Time display */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'text.secondary'
            }}
          >
            {formatTime(currentTime)}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'text.secondary'
            }}
          >
            {formatTime(audioDuration)}
          </Typography>
        </Box>

        {/* Error message */}
        {error && (
          <Typography
            variant="caption"
            color="error"
            sx={{
              fontSize: '0.7rem',
              textAlign: 'center'
            }}
          >
            {error}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default VoicePlayerMobile;
