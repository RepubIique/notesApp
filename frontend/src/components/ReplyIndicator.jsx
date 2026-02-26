import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
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
  const senderName = getSenderDisplayName(originalMessage.sender, currentUserRole);
  const contentPreview = generateContentPreview(originalMessage, 100);
  const previewId = `reply-preview-${originalMessage.id}`;

  return (
    <Box
      aria-describedby={previewId}
      sx={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        height: '60px',
        padding: '0.5rem 0.75rem',
        borderRadius: '8px 8px 0 0',
        position: 'relative',
        animation: 'slideInFromBottom 0.3s ease-out'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          backgroundColor: 'primary.main',
          borderRadius: '8px 0 0 0'
        }}
      />
      <Box
        sx={{
          flex: 1,
          marginLeft: '0.75rem',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'primary.main'
            }}
          >
            {senderName}
          </Typography>
        </Box>
        <Typography
          id={previewId}
          variant="body2"
          sx={{
            fontSize: '0.875rem',
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {contentPreview}
        </Typography>
      </Box>
      <IconButton
        onClick={onCancel}
        aria-label="Cancel reply"
        title="Cancel reply"
        size="small"
        sx={{
          minWidth: '44px',
          minHeight: '44px',
          marginLeft: '0.5rem',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.05)'
          }
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

export default ReplyIndicator;
