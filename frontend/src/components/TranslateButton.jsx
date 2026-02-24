import React from 'react';
import { IconButton, CircularProgress, Tooltip } from '@mui/material';
import { Translate as TranslateIcon, Error as ErrorIcon } from '@mui/icons-material';

/**
 * TranslateButton component
 * Provides translation action for messages with loading and error states
 * 
 * @param {Object} props
 * @param {string} props.messageId - UUID of the message to translate
 * @param {string} props.messageText - Original message text (for validation)
 * @param {string} props.currentLanguage - Current display language ('original', 'en', 'zh-CN', 'zh-TW')
 * @param {(translation: Object) => void} props.onTranslationComplete - Callback with translation data
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {boolean} props.loading - Whether translation is in progress
 * @param {string|null} props.error - Error message if translation failed
 * @param {() => void} props.onClick - Click handler
 */
function TranslateButton({ 
  messageId, 
  messageText,
  currentLanguage,
  onTranslationComplete,
  disabled = false,
  loading = false,
  error = null,
  onClick
}) {
  // Disable button for empty messages
  const isEmpty = !messageText || messageText.trim().length === 0;
  const isDisabled = disabled || isEmpty || loading;

  // Determine button content based on state
  const getButtonContent = () => {
    if (loading) {
      return <CircularProgress size={20} />;
    }
    if (error) {
      return <ErrorIcon sx={{ color: '#f44336' }} />;
    }
    return <TranslateIcon />;
  };

  // Determine tooltip text
  const getTooltipText = () => {
    if (isEmpty) {
      return 'Cannot translate empty message';
    }
    if (loading) {
      return 'Translating...';
    }
    if (error) {
      return error;
    }
    return 'Translate message';
  };

  return (
    <Tooltip title={getTooltipText()} arrow>
      <span>
        <IconButton
          onClick={onClick}
          disabled={isDisabled}
          color="primary"
          sx={{
            // Touch-friendly size (44x44px minimum)
            minWidth: '44px',
            minHeight: '44px',
            padding: '10px',
            '&:hover': {
              backgroundColor: 'rgba(0, 123, 255, 0.08)'
            },
            '&.Mui-disabled': {
              opacity: 0.5
            }
          }}
          aria-label="translate message"
        >
          {getButtonContent()}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default TranslateButton;
