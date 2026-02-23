import React, { useState, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Button,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { messageAPI } from '../utils/api';

function MessageComposer({ onSendText, onSendImage }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    
    // Don't send empty messages
    if (!text.trim()) {
      return;
    }

    // Clear typing status immediately
    clearTypingStatus();

    try {
      await onSendText(text);
      // Clear input after successful send
      setText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Could add error UI here
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    // Handle typing indicator
    if (newText.trim()) {
      // User is typing
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        messageAPI.updateTyping(true).catch(err => 
          console.error('Failed to update typing status:', err)
        );
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to clear typing status after 3 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        clearTypingStatus();
      }, 3000);
    } else {
      // Input is empty, clear typing status
      clearTypingStatus();
    }
  };

  const clearTypingStatus = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      messageAPI.updateTyping(false).catch(err => 
        console.error('Failed to clear typing status:', err)
      );
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate image file type before upload
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      alert('Only image files are allowed (JPEG, PNG, GIF, WebP)');
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploading(true);
    try {
      await onSendImage(file);
      // Clear the file input after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      // Could add error UI here
    } finally {
      setUploading(false);
    }
  };

  const handleImageIconClick = () => {
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };

  return (
    <Box
      component="form"
      onSubmit={handleTextSubmit}
      sx={{
        p: 2,
        bgcolor: 'white',
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        gap: 1,
        alignItems: 'center'
      }}
    >
      {/* Hidden image input triggered by icon */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleImageSelect}
        style={{ display: 'none' }}
        disabled={uploading}
      />
      
      {/* Image upload icon button */}
      <IconButton
        onClick={handleImageIconClick}
        disabled={uploading}
        color="primary"
        title="Upload image"
      >
        {uploading ? <CircularProgress size={24} /> : <ImageIcon />}
      </IconButton>

      {/* Text input */}
      <TextField
        fullWidth
        value={text}
        onChange={handleTextChange}
        placeholder="Type a message..."
        disabled={uploading}
        variant="outlined"
        size="small"
      />

      {/* Send button */}
      <Button
        type="submit"
        variant="contained"
        disabled={!text.trim() || uploading}
        endIcon={<SendIcon />}
      >
        Send
      </Button>
    </Box>
  );
}

export default MessageComposer;
