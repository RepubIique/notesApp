import React from 'react';
import { generateContentPreview, getSenderDisplayName } from '../utils/messageUtils';

/**
 * ReplyPreview component displays within a message bubble to show the original message being replied to.
 * Shows sender name, content preview, and is clickable to navigate to the original message.
 * 
 * @param {Object} props
 * @param {Object} props.originalMessage - The original message being replied to
 * @param {string} props.originalMessage.id - Message ID
 * @param {string} props.originalMessage.sender - Sender identifier ('A' or 'B')
 * @param {string} props.originalMessage.type - Message type ('text', 'image', 'voice')
 * @param {string} [props.originalMessage.text] - Message text content
 * @param {string} [props.originalMessage.image_path] - Image path for image messages
 * @param {number} [props.originalMessage.audio_duration] - Audio duration in seconds
 * @param {boolean} props.originalMessage.deleted - Whether the message is deleted
 * @param {Function} props.onClick - Callback function when preview is clicked, receives message ID
 * @param {string} [props.currentUserRole] - Current user's role ('A' or 'B'), defaults to 'A'
 * @param {boolean} [props.isOwnMessage] - Whether this is the current user's message
 */
function ReplyPreview({ originalMessage, onClick, currentUserRole = 'A', isOwnMessage = false }) {
  const [isHovering, setIsHovering] = React.useState(false);
  const senderName = getSenderDisplayName(originalMessage.sender, currentUserRole);
  const contentPreview = generateContentPreview(originalMessage, 100);

  const handleClick = () => {
    onClick(originalMessage.id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(originalMessage.id);
    }
  };

  // For image messages, show thumbnail if available
  const showImageThumbnail = originalMessage.type === 'image' && 
                             originalMessage.image_path && 
                             !originalMessage.deleted;

  return (
    <div
      style={{
        ...styles.container,
        ...(isOwnMessage ? styles.containerOwn : styles.containerOther),
        ...(isHovering ? styles.containerHover : {})
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      role="button"
      tabIndex={0}
      aria-label={`Reply to ${senderName}: ${contentPreview}`}
    >
      <div style={styles.leftBorder} />
      <div style={styles.content}>
        <div style={styles.senderName}>{senderName}</div>
        <div style={styles.previewContent}>
          {showImageThumbnail && (
            <img
              src={originalMessage.image_path}
              alt="Original message"
              style={styles.thumbnail}
            />
          )}
          <div style={styles.preview}>{contentPreview}</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    borderRadius: '8px',
    padding: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center'
  },
  containerOwn: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)'
  },
  containerOther: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)'
  },
  containerHover: {
    opacity: 0.8
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '2px',
    backgroundColor: '#007bff',
    borderRadius: '8px 0 0 8px'
  },
  content: {
    flex: 1,
    marginLeft: '10px',
    overflow: 'hidden'
  },
  senderName: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#007bff',
    marginBottom: '4px'
  },
  previewContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  thumbnail: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px',
    flexShrink: 0
  },
  preview: {
    fontSize: '0.8125rem',
    color: '#666',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1
  }
};

export default ReplyPreview;
