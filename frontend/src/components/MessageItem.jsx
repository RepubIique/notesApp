import React, { useState, useEffect } from 'react';
import { imageAPI } from '../utils/api';

function MessageItem({ message, isOwn, onUnsend, onReact, onImageClick }) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Common emojis for the reaction picker
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

  // Fetch image URL for image messages
  useEffect(() => {
    if (message.type === 'image' && !message.deleted) {
      imageAPI.getUrl(message.id)
        .then(response => setImageUrl(response.url))
        .catch(() => setImageError(true));
    }
  }, [message.id, message.type, message.deleted]);

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

  return (
    <div 
      style={{...styles.container, ...(isOwn ? styles.ownMessage : styles.otherMessage)}}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      <div style={{
        ...styles.messageContent,
        backgroundColor: isOwn ? '#007bff' : '#fff'
      }}>
        {/* Message content */}
        {message.deleted ? (
          <div style={{
            ...styles.deletedText,
            color: isOwn ? 'rgba(255,255,255,0.7)' : '#999'
          }}>[Message deleted]</div>
        ) : message.type === 'text' ? (
          <div style={{
            ...styles.textContent,
            color: isOwn ? '#fff' : '#333'
          }}>{message.text}</div>
        ) : message.type === 'image' ? (
          <div style={styles.imageContainer}>
            {imageError ? (
              <div style={styles.imageError}>Failed to load image</div>
            ) : imageUrl ? (
              <img 
                src={imageUrl} 
                alt={message.image_name || 'Shared image'} 
                style={styles.image}
                onError={() => setImageError(true)}
                onClick={() => onImageClick && onImageClick(message.id, imageUrl)}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              />
            ) : (
              <div style={styles.imageLoading}>Loading image...</div>
            )}
          </div>
        ) : null}

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
        {showActions && (
          <div style={{...styles.actionsContainer, ...(isOwn ? styles.actionsRight : styles.actionsLeft)}}>
            {/* Emoji reaction button */}
            <button 
              style={styles.actionButton}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add reaction"
            >
              😊
            </button>

            {/* Unsend button (only for own messages) */}
            {isOwn && !message.deleted && (
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
          <div style={{...styles.emojiPicker, ...(isOwn ? styles.emojiPickerRight : styles.emojiPickerLeft)}}>
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

      {/* Timestamp and status */}
      <div style={styles.timestamp}>
        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '0.75rem',
    maxWidth: '100%',
    position: 'relative'
  },
  ownMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end'
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start'
  },
  messageContent: {
    padding: '0.5rem 0.75rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    position: 'relative',
    wordBreak: 'break-word',
    minWidth: '60px'
  },
  textContent: {
    fontSize: '0.9375rem',
    lineHeight: '1.4'
  },
  deletedText: {
    fontSize: '0.9375rem',
    fontStyle: 'italic'
  },
  imageContainer: {
    maxWidth: '100%'
  },
  image: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '4px',
    display: 'block',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease-in-out'
  },
  imageLoading: {
    padding: '2rem',
    color: '#666',
    fontSize: '0.875rem'
  },
  imageError: {
    padding: '2rem',
    color: '#dc3545',
    fontSize: '0.875rem',
    backgroundColor: '#f8d7da',
    borderRadius: '4px'
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
    padding: '0.25rem'
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

export default MessageItem;
