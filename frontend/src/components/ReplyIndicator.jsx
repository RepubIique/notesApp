import React from 'react';
import { generateContentPreview, getSenderDisplayName } from '../utils/messageUtils';

/**
 * ReplyIndicator component displays above the message input field when a reply is active.
 * Shows the original message being replied to with sender name, content preview, and close button.
 * 
 * @param {Object} props
 * @param {Object} props.originalMessage - The message being replied to
 * @param {string} props.originalMessage.id - Message ID
 * @param {string} props.originalMessage.sender - Sender identifier ('A' or 'B')
 * @param {string} props.originalMessage.type - Message type ('text', 'image', 'voice')
 * @param {string} [props.originalMessage.text] - Message text content
 * @param {number} [props.originalMessage.audio_duration] - Audio duration in seconds
 * @param {boolean} props.originalMessage.deleted - Whether the message is deleted
 * @param {Function} props.onCancel - Callback function when close button is clicked
 * @param {string} [props.currentUserRole] - Current user's role ('A' or 'B'), defaults to 'A'
 */
function ReplyIndicator({ originalMessage, onCancel, currentUserRole = 'A' }) {
  const [isHovering, setIsHovering] = React.useState(false);
  const senderName = getSenderDisplayName(originalMessage.sender, currentUserRole);
  const contentPreview = generateContentPreview(originalMessage, 100);
  const previewId = `reply-preview-${originalMessage.id}`;

  return (
    <div style={styles.container} aria-describedby={previewId}>
      <div style={styles.leftBorder} />
      <div style={styles.content}>
        <div style={styles.header}>
          <span style={styles.senderName}>{senderName}</span>
        </div>
        <div id={previewId} style={styles.preview}>{contentPreview}</div>
      </div>
      <button
        style={{
          ...styles.closeButton,
          ...(isHovering ? styles.closeButtonHover : {})
        }}
        onClick={onCancel}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        aria-label="Cancel reply"
        title="Cancel reply"
      >
        ✕
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    height: '60px',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px 8px 0 0',
    position: 'relative',
    animation: 'slideInFromBottom 0.3s ease-out'
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '3px',
    backgroundColor: '#007bff',
    borderRadius: '8px 0 0 0'
  },
  content: {
    flex: 1,
    marginLeft: '0.75rem',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.25rem'
  },
  senderName: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#007bff'
  },
  preview: {
    fontSize: '0.875rem',
    color: '#666',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  closeButton: {
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '1.25rem',
    color: '#999',
    padding: '0.5rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s, color 0.2s',
    minWidth: '44px',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '0.5rem'
  },
  closeButtonHover: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    color: '#666'
  }
};

export default ReplyIndicator;
