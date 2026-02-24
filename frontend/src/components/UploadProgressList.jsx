import React from 'react';
import {
  List,
  ListItem,
  Box,
  Typography,
  LinearProgress,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

/**
 * Truncates a filename if it's too long
 * @param {string} filename - The filename to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated filename
 */
function truncateFilename(filename, maxLength = 30) {
  if (filename.length <= maxLength) return filename;
  
  const extension = filename.split('.').pop();
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
  
  return `${truncatedName}...${extension}`;
}

/**
 * Gets the status icon based on upload status
 * @param {string} status - Upload status
 * @returns {JSX.Element} Status icon component
 */
function getStatusIcon(status) {
  switch (status) {
    case 'uploading':
    case 'compressing':
      return <CircularProgress size={20} sx={{ color: '#1976d2' }} />;
    case 'complete':
      return <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 20 }} />;
    case 'error':
      return <ErrorIcon sx={{ color: '#d32f2f', fontSize: 20 }} />;
    default:
      return null;
  }
}

/**
 * Gets the color for the progress bar based on status
 * @param {string} status - Upload status
 * @returns {string} MUI color name
 */
function getProgressColor(status) {
  switch (status) {
    case 'uploading':
    case 'compressing':
      return 'primary'; // blue
    case 'complete':
      return 'success'; // green
    case 'error':
      return 'error'; // red
    default:
      return 'primary';
  }
}

/**
 * UploadProgressList component
 * Displays upload progress for each file in a batch upload
 * 
 * @param {Object} props
 * @param {Array<{fileId: string, fileName: string, progress: number, status: string, errorMessage?: string}>} props.progressItems - Array of progress items
 * @param {(fileId: string) => void} props.onCancel - Callback to cancel an upload
 */
function UploadProgressList({ progressItems, onCancel }) {
  if (!progressItems || progressItems.length === 0) {
    return null;
  }

  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper', padding: 0 }}>
      {progressItems.map((item) => {
        const isInProgress = item.status === 'uploading' || item.status === 'compressing';
        const showCancel = isInProgress && onCancel;

        return (
          <ListItem
            key={item.fileId}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              padding: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:last-child': {
                borderBottom: 'none'
              }
            }}
          >
            {/* Top row: filename, status icon, cancel button */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    marginRight: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={item.fileName}
                >
                  {truncateFilename(item.fileName)}
                </Typography>
                {getStatusIcon(item.status)}
              </Box>

              {showCancel && (
                <IconButton
                  onClick={() => onCancel(item.fileId)}
                  size="small"
                  sx={{ marginLeft: 1 }}
                  title="Cancel upload"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Progress bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box sx={{ flex: 1, marginRight: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={item.progress}
                  color={getProgressColor(item.status)}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 45 }}>
                {Math.round(item.progress)}%
              </Typography>
            </Box>

            {/* Error message if present */}
            {item.status === 'error' && item.errorMessage && (
              <Typography
                variant="caption"
                color="error"
                sx={{ marginTop: 0.5 }}
              >
                {item.errorMessage}
              </Typography>
            )}
          </ListItem>
        );
      })}
    </List>
  );
}

export default UploadProgressList;
