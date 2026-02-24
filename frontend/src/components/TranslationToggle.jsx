import React from 'react';
import { Chip } from '@mui/material';
import { Translate as TranslateIcon } from '@mui/icons-material';

/**
 * TranslationToggle component
 * Switches between original and translated message text
 * 
 * @param {Object} props
 * @param {boolean} props.showOriginal - Whether currently showing original text
 * @param {() => void} props.onToggle - Callback when toggle is clicked
 * @param {string} props.sourceLanguage - Source language code ('en', 'zh-CN', 'zh-TW')
 * @param {string} props.targetLanguage - Target language code ('en', 'zh-CN', 'zh-TW')
 */
function TranslationToggle({
  showOriginal,
  onToggle,
  sourceLanguage,
  targetLanguage
}) {
  // Map language codes to display labels
  const getLanguageLabel = (langCode) => {
    const labels = {
      'en': 'EN',
      'zh-CN': '中文',
      'zh-TW': '繁體'
    };
    return labels[langCode] || (langCode ? langCode.toUpperCase() : '');
  };

  // Determine current display state
  const currentLabel = showOriginal 
    ? `Original (${getLanguageLabel(sourceLanguage)})`
    : `Translated (${getLanguageLabel(targetLanguage)})`;

  return (
    <Chip
      icon={<TranslateIcon />}
      label={currentLabel}
      onClick={onToggle}
      color={showOriginal ? 'default' : 'primary'}
      variant={showOriginal ? 'outlined' : 'filled'}
      size="small"
      sx={{
        // Touch-friendly size (44x44px minimum height)
        minHeight: '32px',
        height: 'auto',
        padding: '6px 4px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        // Ensure touch target is at least 44px
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          minWidth: '44px',
          minHeight: '44px',
          zIndex: -1
        },
        '&:hover': {
          backgroundColor: showOriginal 
            ? 'rgba(0, 0, 0, 0.04)' 
            : 'rgba(25, 118, 210, 0.12)'
        },
        '&:active': {
          transform: 'scale(0.98)'
        },
        // Mobile-friendly spacing
        '@media (max-width: 600px)': {
          fontSize: '0.8125rem',
          padding: '8px 6px'
        }
      }}
      aria-label={`Toggle to ${showOriginal ? 'translated' : 'original'} text`}
      role="button"
      tabIndex={0}
    />
  );
}

export default TranslationToggle;
