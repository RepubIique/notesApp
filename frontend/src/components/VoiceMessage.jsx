import { useState, useEffect } from 'react';
import VoicePlayer from './VoicePlayer';
import VoiceMessageErrorBoundary from './VoiceMessageErrorBoundary';
import VoiceMessageSkeleton from './VoiceMessageSkeleton';
import { voiceMessageAPI } from '../utils/api';
import { errorLogger } from '../utils/errorLogger';

/**
 * VoiceMessage component
 * Wrapper component that displays a voice message in the chat
 * 
 * Requirements: 2.5, 5.1, 5.2, 8.3
 * 
 * @param {Object} props
 * @param {Object} props.message - Message object with voice metadata
 * @param {string} props.message.id - Message ID
 * @param {string} props.message.sender - Sender (A or B)
 * @param {string} props.message.type - Message type (should be 'voice')
 * @param {string} props.message.audio_path - Audio file path
 * @param {number} props.message.audio_duration - Duration in seconds
 * @param {string} props.message.created_at - ISO timestamp
 * @param {boolean} props.message.deleted - Deletion flag
 * @param {boolean} props.isOwn - Whether this is the current user's message
 * @param {Function} [props.onUnsend] - Callback for unsending message
 * @param {Function} [props.onReact] - Callback for adding reaction
 */
function VoiceMessage({ message, isOwn, onUnsend, onReact }) {
  // Validate required metadata (Requirement 5.1)
  if (!message || !message.id || !message.sender || !message.created_at) {
    console.error('VoiceMessage: Missing required metadata', message);
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#fee',
        borderRadius: '8px',
        color: '#c00'
      }}>
        Invalid voice message: missing required metadata
      </div>
    );
  }
  
  // Validate message type
  if (message.type !== 'voice') {
    console.error('VoiceMessage: Invalid message type', message.type);
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#fee',
        borderRadius: '8px',
        color: '#c00'
      }}>
        Invalid message type: expected 'voice', got '{message.type}'
      </div>
    );
  }
  
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);
  const [urlError, setUrlError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  // Common emojis for the reaction picker
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

  // Fetch audio URL for playback
  useEffect(() => {
    if (message.deleted) {
      setIsLoadingUrl(false);
      return;
    }

    // Fetch the signed URL for the audio file
    const fetchAudioUrl = async () => {
      try {
        const response = await voiceMessageAPI.getUrl(message.id);
        setAudioUrl(response.url);
        setIsLoadingUrl(false);
        setUrlError(false);
      } catch (error) {
        console.error('Error fetching audio URL:', error);
        
        // Log error for monitoring (Requirement 7.5)
        errorLogger.logPlaybackError(error, {
          messageId: message.id,
          action: 'fetchAudioUrl',
          retryCount
        });
        
        setUrlError(true);
        setIsLoadingUrl(false);
      }
    };

    fetchAudioUrl();
  }, [message.id, message.deleted, retryCount]);

  /**
   * Retry fetching audio URL
   * Validates: Requirement 7.5
   */
  const handleRetryFetch = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setIsLoadingUrl(true);
      setUrlError(false);
    }
  };

  const handleUnsendClick = () => {
    if (onUnsend) {
      onUnsend(message.id);
    }
  };

  const handleEmojiClick = (emoji) => {
    if (onReact) {
      onReact(message.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  // Group reactions by emoji and count them
  const reactionCounts = {};
  if (message.reactions && message.reactions.length > 0) {
    message.reactions.forEach(reaction => {
      if (reactionCounts[reaction.emoji]) {
        reactionCounts[reaction.emoji]++;
      } else {
        reactionCounts[reaction.emoji] = 1;
      }
    });
  }

  // Show loading skeleton while fetching URL (Requirement 8.4)
  if (isLoadingUrl && !message.deleted) {
    return <VoiceMessageSkeleton isOwn={isOwn} />;
  }

  return (
    <VoiceMessageErrorBoundary
      errorMessage="Failed to display voice message"
      onReset={handleRetryFetch}
    >
      <div 
        style={{
          ...styles.container, 
          ...(isOwn ? styles.ownMessage : styles.otherMessage),
          // Highlight during playback (Requirement 8.3)
          ...(isPlaying ? styles.playingHighlight : {}),
          // Fade-in animation
          animation: 'fadeIn 0.3s ease-in-out'
        }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => {
          setShowActions(false);
          setShowEmojiPicker(false);
        }}
      >
      {/* Sender information (if not own message) - Requirement 2.5 */}
      {!isOwn && message.sender && (
        <div style={styles.senderName}>
          {message.sender}
        </div>
      )}

      <div style={{
        ...styles.messageContent,
        backgroundColor: isOwn ? '#007bff' : '#fff'
      }}>
        {/* Voice message content */}
        {message.deleted ? (
          <div style={{
            ...styles.deletedText,
            color: isOwn ? 'rgba(255,255,255,0.7)' : '#999'
          }}>
            [Voice message deleted]
          </div>
        ) : urlError ? (
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>
              Failed to load voice message
            </div>
            {retryCount < maxRetries && (
              <button
                style={styles.retryButton}
                onClick={handleRetryFetch}
                title="Retry loading"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <div 
            style={styles.voicePlayerWrapper}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            <VoicePlayer
              audioUrl={audioUrl}
              duration={message.audio_duration || 0}
              messageId={message.id}
            />
          </div>
        )}

        {/* Reactions display */}
        {Object.keys(reactionCounts).length > 0 && (
          <div style={styles.reactionsContainer}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <span key={emoji} style={styles.reactionBadge}>
                {emoji} {count}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons (shown on hover) */}
        {showActions && !message.deleted && (
          <div style={{
            ...styles.actionsContainer, 
            ...(isOwn ? styles.actionsRight : styles.actionsLeft)
          }}>
            {/* Emoji reaction button */}
            <button 
              style={styles.actionButton}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add reaction"
            >
              😊
            </button>

            {/* Unsend button (only for own messages) */}
            {isOwn && (
              <button 
                style={{...styles.actionButton, ...styles.unsendButton}}
                onClick={handleUnsendClick}
                title="Unsend message"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Emoji picker (shown when emoji button clicked) */}
        {showEmojiPicker && (
          <div style={{
            ...styles.emojiPicker, 
            ...(isOwn ? styles.emojiPickerRight : styles.emojiPickerLeft)
          }}>
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                style={styles.emojiButton}
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timestamp and status indicators - Requirement 2.5 */}
      <div style={styles.timestamp}>
        {new Date(message.created_at).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
        {/* Message status indicators (for own messages) */}
        {isOwn && !message.deleted && (
          <span style={{
            ...styles.statusIndicator,
            color: message.read_at ? '#4CAF50' : '#999'
          }}>
            {message.read_at ? ' ✓✓' : message.delivered_at ? ' ✓' : ' ⏱'}
          </span>
        )}
      </div>
      </div>
    </VoiceMessageErrorBoundary>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '0.75rem',
    maxWidth: '100%',
    position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  ownMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end'
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start'
  },
  // Highlight during playback (Requirement 8.3)
  playingHighlight: {
    transform: 'scale(1.02)',
    filter: 'brightness(1.05)',
    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.2)'
  },
  senderName: {
    fontSize: '0.75rem',
    color: '#666',
    marginBottom: '0.25rem',
    fontWeight: '500'
  },
  messageContent: {
    padding: '0.5rem 0.75rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    position: 'relative',
    minWidth: '250px',
    maxWidth: '400px'
  },
  voicePlayerWrapper: {
    // Wrapper for VoicePlayer to handle events
  },
  deletedText: {
    fontSize: '0.9375rem',
    fontStyle: 'italic',
    padding: '0.5rem 0'
  },
  loadingText: {
    fontSize: '0.875rem',
    color: '#666',
    padding: '0.5rem 0'
  },
  errorText: {
    fontSize: '0.875rem',
    color: '#dc3545',
    padding: '0.5rem 0'
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0'
  },
  retryButton: {
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  reactionsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.25rem',
    marginTop: '0.5rem'
  },
  reactionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.125rem 0.5rem',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: '12px',
    fontSize: '0.75rem'
  },
  actionsContainer: {
    position: 'absolute',
    top: '-8px',
    display: 'flex',
    gap: '0.25rem',
    backgroundColor: 'white',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
    padding: '0.25rem',
    zIndex: 5
  },
  actionsRight: {
    right: '0'
  },
  actionsLeft: {
    left: '0'
  },
  actionButton: {
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },
  unsendButton: {
    color: '#dc3545'
  },
  emojiPicker: {
    position: 'absolute',
    top: '24px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    padding: '0.5rem',
    display: 'flex',
    gap: '0.25rem',
    zIndex: 10
  },
  emojiPickerRight: {
    right: '0'
  },
  emojiPickerLeft: {
    left: '0'
  },
  emojiButton: {
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '1.25rem',
    padding: '0.25rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },
  timestamp: {
    fontSize: '0.6875rem',
    color: '#999',
    marginTop: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  statusIndicator: {
    fontSize: '0.75rem'
  }
};

export default VoiceMessage;
