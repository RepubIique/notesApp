import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  IconButton,
  Box
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

/**
 * Formats file size in bytes to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * ImagePreviewDialog component
 * Displays a modal dialog with thumbnails of selected images before upload
 * 
 * @param {Object} props
 * @param {Array<{id: string, file: File, previewUrl: string}>} props.files - Array of selected files with preview URLs
 * @param {boolean} props.open - Whether the dialog is open
 * @param {() => void} props.onClose - Callback when dialog is closed/cancelled
 * @param {() => void} props.onConfirm - Callback when user confirms to send images
 * @param {(fileId: string) => void} props.onRemoveFile - Callback to remove a specific file
 */
function ImagePreviewDialog({ files, open, onClose, onConfirm, onRemoveFile }) {
  const fileCount = files.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Preview Images
        <Typography variant="body2" color="text.secondary">
          {fileCount} {fileCount === 1 ? 'image' : 'images'} selected
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2}>
          {files.map((fileData) => (
            <Grid
              item
              xs={6}  // 2 columns on mobile
              sm={6}  // 2 columns on small screens
              md={3}  // 4 columns on desktop
              key={fileData.id}
            >
              <Card sx={{ position: 'relative' }}>
                {/* Remove button */}
                <IconButton
                  onClick={() => onRemoveFile(fileData.id)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    },
                    zIndex: 1,
                    padding: '4px'
                  }}
                  size="small"
                  title="Remove image"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>

                {/* Thumbnail */}
                <CardMedia
                  component="img"
                  height="150"
                  image={fileData.previewUrl}
                  alt={fileData.file.name}
                  sx={{
                    objectFit: 'cover',
                    width: '100%'
                  }}
                />

                {/* File info */}
                <CardContent sx={{ padding: 1, '&:last-child': { paddingBottom: 1 } }}>
                  <Typography
                    variant="body2"
                    noWrap
                    title={fileData.file.name}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    {fileData.file.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem' }}
                  >
                    {formatFileSize(fileData.file.size)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          disabled={fileCount === 0}
        >
          Send {fileCount} {fileCount === 1 ? 'Image' : 'Images'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImagePreviewDialog;
