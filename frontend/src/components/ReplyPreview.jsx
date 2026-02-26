import React from 'react';
import { Box, Typography } from '@mui/material';
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
    <Box
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Reply to ${senderName}: ${contentPreview}`}
      sx={{
        position: 'relative',
        borderRadius: '8px',
        padding: { xs: '6px', sm: '8px' },
        marginBottom: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s, opacity 0.2s',
        minHeight: { xs: '40px', sm: '44px' },
        display: 'flex',
        alignItems: 'center',
        backgroundColor: isOwnMessage ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.08)',
        maxWidth: '100%',
        '&:hover': {
          opacity: 0.8
        }
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: 'primary.main',
          borderRadius: '8px 0 0 8px'
        }}
      />
      <Box
        sx={{
          flex: 1,
          marginLeft: { xs: '8px', sm: '10px' },
          overflow: 'hidden',
          minWidth: 0
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: { xs: '0.7rem', sm: '0.75rem' },
            fontWeight: 600,
            color: 'primary.main',
            marginBottom: '2px',
            display: 'block'
          }}
        >
          {senderName}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: { xs: '6px', sm: '8px' },
          minWidth: 0
        }}>
          {showImageThumbnail && (
            <Box
              component="img"
              src={originalMessage.image_path}
              alt="Original message"
              sx={{
                width: { xs: '32px', sm: '40px' },
                height: { xs: '32px', sm: '40px' },
                objectFit: 'cover',
                borderRadius: '4px',
                flexShrink: 0
              }}
            />
          )}
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              color: 'text.secondary',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              flex: 1,
              minWidth: 0
            }}
          >
            {contentPreview}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default ReplyPreview;
