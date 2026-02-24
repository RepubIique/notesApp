import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Tabs,
  Tab,
  Fab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  FitnessCenter as FitnessCenterIcon,
  Logout as LogoutIcon,
  Facebook as FacebookIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import useIdleTimer from '../hooks/useIdleTimer';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import ImageLightbox from './ImageLightbox';
import { messageAPI, imageAPI, voiceMessageAPI } from '../utils/api';

// Map role to display name
const getRoleName = (role) => {
  return role === 'A' ? '黄' : '白';
};

function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [otherUserActivity, setOtherUserActivity] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pollingIntervalRef = useRef(null);
  const visibleMessagesRef = useRef(new Set());
  const initialLoadRef = useRef(true);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  
  // FAB dragging state
  const [fabPosition, setFabPosition] = useState({ bottom: 80, right: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, bottom: 80, right: 24 });
  
  // Confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  // Fetch current user role on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (user?.role) {
        setCurrentUser(user.role);
      }
    };
    fetchCurrentUser();
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Start polling for messages and activity every 2 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only fetch the latest 50 messages for polling (don't replace older loaded messages)
        const [messagesResponse, activityResponse] = await Promise.all([
          messageAPI.getMessages(50),
          messageAPI.getActivity()
        ]);
        
        const latestMessages = messagesResponse.messages || [];
        
        // On initial load, just set the messages
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          setMessages(latestMessages);
          setHasMoreMessages(latestMessages.length === 50);
        } else {
          // For subsequent polls, merge with existing messages
          // Keep older messages that were loaded via pagination
          setMessages(prev => {
            // Get IDs of latest messages
            const latestIds = new Set(latestMessages.map(m => m.id));
            
            // Keep older messages that aren't in the latest batch
            const olderMessages = prev.filter(m => !latestIds.has(m.id));
            
            // Combine: latest messages first, then older messages
            return [...latestMessages, ...olderMessages];
          });
        }
        
        setOtherUserActivity(activityResponse.activity);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    // Fetch data immediately on mount
    fetchData();

    // Start polling every 2 seconds
    pollingIntervalRef.current = setInterval(fetchData, 2000);

    // Stop polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Auto-lock after 90 seconds of inactivity
  const handleIdle = async () => {
    // Clear auth state and redirect to login
    await logout();
    navigate('/login');
  };

  // Use idle timer hook with 90 second timeout
  useIdleTimer(handleIdle, 90000);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleTabChange = (event, newValue) => {
    navigate(newValue);
  };

  // Handle message send
  const handleSendText = async (text) => {
    try {
      await messageAPI.sendText(text);
      // Message will appear in the next poll
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  // Handle image upload
  const handleSendImage = async (imageFile) => {
    try {
      await imageAPI.upload(imageFile);
      // Image message will appear in the next poll
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  };

  // Handle message unsend
  const handleUnsend = async (messageId) => {
    // Find the message to check if it's a voice message
    const message = messages.find(m => m.id === messageId);
    
    // If it's a voice message, show confirmation dialog
    if (message && message.type === 'voice') {
      setMessageToDelete(messageId);
      setDeleteConfirmOpen(true);
      return;
    }
    
    // For non-voice messages, delete immediately
    try {
      await messageAPI.unsend(messageId);
      // Updated message will appear in the next poll
    } catch (error) {
      console.error('Failed to unsend message:', error);
    }
  };

  // Handle confirmed voice message deletion
  const handleConfirmDelete = async () => {
    if (!messageToDelete) return;
    
    try {
      await voiceMessageAPI.deleteVoiceMessage(messageToDelete);
      // Updated message will appear in the next poll
      setDeleteConfirmOpen(false);
      setMessageToDelete(null);
    } catch (error) {
      console.error('Failed to delete voice message:', error);
      // Show error to user (could add a snackbar here)
      alert('Failed to delete voice message. Please try again.');
    }
  };

  // Handle cancel deletion
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setMessageToDelete(null);
  };

  // Handle emoji reaction
  const handleReact = async (messageId, emoji) => {
    try {
      await messageAPI.addReaction(messageId, emoji);
      // Updated reactions will appear in the next poll
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  // Handle message visibility (for marking as read)
  const handleMessageVisible = async (messageId) => {
    // Only mark messages from other user as read
    const message = messages.find(m => m.id === messageId);
    if (!message || message.sender === currentUser || message.read_at) {
      return;
    }

    // Track visible messages to avoid duplicate API calls
    if (visibleMessagesRef.current.has(messageId)) {
      return;
    }

    visibleMessagesRef.current.add(messageId);

    try {
      await messageAPI.markAsRead([messageId]);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      // Remove from tracking on error so it can be retried
      visibleMessagesRef.current.delete(messageId);
    }
  };

  // Handle image click to open lightbox
  const handleImageClick = async (messageId, imageUrl) => {
    // Gather all images from the conversation
    const allImages = [];
    let clickedImageIndex = 0;

    // Iterate through messages to collect all image messages
    for (const msg of messages) {
      if (msg.type === 'image' && !msg.deleted) {
        try {
          // Fetch the image URL if not already available
          let url = imageUrl;
          if (msg.id !== messageId) {
            const response = await imageAPI.getUrl(msg.id);
            url = response.url;
          }
          
          // Track the index of the clicked image
          if (msg.id === messageId) {
            clickedImageIndex = allImages.length;
          }
          
          allImages.push({
            id: msg.id,
            url: url
          });
        } catch (error) {
          console.error(`Failed to fetch URL for image ${msg.id}:`, error);
        }
      }
    }

    // Open lightbox with all images
    setLightboxImages(allImages);
    setLightboxInitialIndex(clickedImageIndex);
    setLightboxOpen(true);
  };

  // Handle lightbox close
  const handleLightboxClose = () => {
    setLightboxOpen(false);
  };

  // Handle loading more messages (pagination)
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMoreMessages) {
      return;
    }

    try {
      setIsLoadingMore(true);
      
      // Get the oldest message timestamp
      const oldestMessage = messages[messages.length - 1];
      if (!oldestMessage) {
        setHasMoreMessages(false);
        return;
      }

      // Fetch older messages
      const response = await messageAPI.getMessages(50, oldestMessage.created_at);
      const olderMessages = response.messages || [];

      if (olderMessages.length === 0) {
        setHasMoreMessages(false);
      } else {
        // Deduplicate and append older messages
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = olderMessages.filter(m => !existingIds.has(m.id));
          return [...prev, ...newMessages];
        });
        
        // If we got fewer than 50 messages, we've reached the end
        if (olderMessages.length < 50) {
          setHasMoreMessages(false);
        }
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // FAB drag handlers
  const handleFabMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      bottom: fabPosition.bottom,
      right: fabPosition.right
    };
  };

  const handleFabTouchStart = (e) => {
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      bottom: fabPosition.bottom,
      right: fabPosition.right
    };
  };

  const handleFabMove = (clientX, clientY) => {
    if (!isDragging) return;

    const deltaX = dragStartRef.current.x - clientX;
    const deltaY = dragStartRef.current.y - clientY; // Fixed: inverted the calculation

    setFabPosition({
      bottom: dragStartRef.current.bottom + deltaY,
      right: dragStartRef.current.right + deltaX
    });
  };

  const handleFabMouseMove = (e) => {
    handleFabMove(e.clientX, e.clientY);
  };

  const handleFabTouchMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      handleFabMove(touch.clientX, touch.clientY);
    }
  };

  const handleFabEnd = () => {
    setIsDragging(false);
  };

  // Add/remove global event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleFabMouseMove);
      document.addEventListener('mouseup', handleFabEnd);
      document.addEventListener('touchmove', handleFabTouchMove, { passive: false });
      document.addEventListener('touchend', handleFabEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleFabMouseMove);
      document.removeEventListener('mouseup', handleFabEnd);
      document.removeEventListener('touchmove', handleFabTouchMove);
      document.removeEventListener('touchend', handleFabEnd);
    };
  }, [isDragging, fabPosition]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'grey.50' }}>
      {/* App Bar with Navigation */}
      <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'white', color: 'text.primary' }}>
        <Toolbar sx={{ gap: { xs: 1, sm: 2 } }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              mr: { xs: 1, sm: 2 }
            }}
            onClick={() => navigate('/')}
          >
            <FitnessCenterIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h1" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
              FitTrack
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Tabs value={location.pathname} onChange={handleTabChange} sx={{ minHeight: 48 }}>
            <Tab label="Fitness" value="/" sx={{ minWidth: { xs: 80, sm: 120 }, px: { xs: 1, sm: 2 } }} />
            <Tab label="Profile" value="/chat" sx={{ minWidth: { xs: 80, sm: 120 }, px: { xs: 1, sm: 2 } }} />
          </Tabs>
          <Chip 
            label={`Logged in as: ${getRoleName(user?.role)}`} 
            sx={{ mx: 1, display: { xs: 'none', md: 'flex' } }} 
          />
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />}
            onClick={handleLogout}
            size="small"
            sx={{ minWidth: { xs: 40, sm: 'auto' }, px: { xs: 1, sm: 2 } }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Logout</Box>
            <LogoutIcon sx={{ display: { xs: 'inline-flex', sm: 'none' } }} />
          </Button>
        </Toolbar>
      </AppBar>

      {/* Typing Indicator */}
      {otherUserActivity?.is_typing && (
        <Box sx={{ bgcolor: 'info.light', px: 2, py: 1 }}>
          <Typography variant="body2" color="info.dark">
            {getRoleName(currentUser === 'A' ? 'B' : 'A')} is typing
            <span className="typing-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </Typography>
        </Box>
      )}

      {/* Chat Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MessageList
          messages={messages}
          currentUser={currentUser}
          onUnsend={handleUnsend}
          onReact={handleReact}
          onMessageVisible={handleMessageVisible}
          onImageClick={handleImageClick}
          onLoadMore={handleLoadMore}
          hasMoreMessages={hasMoreMessages}
          isLoadingMore={isLoadingMore}
        />
        <MessageComposer
          onSendText={handleSendText}
          onSendImage={handleSendImage}
        />
      </Box>
      
      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
        open={lightboxOpen}
        onClose={handleLightboxClose}
      />
      
      {/* Voice Message Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Voice Message?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this voice message? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Floating Action Button */}
      <Fab
        color="primary"
        component="a"
        href={isDragging ? undefined : "https://facebook.com"}
        sx={{
          position: 'fixed',
          bottom: `${fabPosition.bottom}px`,
          right: `${fabPosition.right}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          bgcolor: '#1877f2',
          '&:hover': { bgcolor: '#166fe5' }
        }}
        onMouseDown={handleFabMouseDown}
        onTouchStart={handleFabTouchStart}
        onClick={(e) => {
          if (isDragging) {
            e.preventDefault();
          }
        }}
      >
        <FacebookIcon />
      </Fab>
    </Box>
  );
}

export default ChatPage;
