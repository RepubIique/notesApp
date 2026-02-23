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
  Chip
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
import { messageAPI, imageAPI } from '../utils/api';

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
  const pollingIntervalRef = useRef(null);
  const visibleMessagesRef = useRef(new Set());
  
  // FAB dragging state
  const [fabPosition, setFabPosition] = useState({ bottom: 80, right: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, bottom: 80, right: 24 });

  // Fetch current user role on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (user?.role) {
        setCurrentUser(user.role);
      }
    };
    fetchCurrentUser();
  }, [user]);

  // Start polling for messages and activity every 2 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch messages and activity in parallel
        const [messagesResponse, activityResponse] = await Promise.all([
          messageAPI.getMessages(50),
          messageAPI.getActivity()
        ]);
        
        setMessages(messagesResponse.messages || []);
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
    try {
      await messageAPI.unsend(messageId);
      // Updated message will appear in the next poll
    } catch (error) {
      console.error('Failed to unsend message:', error);
    }
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
        <Toolbar>
          <FitnessCenterIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 700 }}>
            FitTrack
          </Typography>
          <Tabs value={location.pathname} onChange={handleTabChange} sx={{ mr: 2 }}>
            <Tab label="Fitness" value="/" />
            <Tab label="Profile" value="/chat" />
          </Tabs>
          <Chip label={`Logged in as: ${getRoleName(user?.role)}`} sx={{ mr: 2 }} />
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            size="small"
          >
            Logout
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
        />
        <MessageComposer
          onSendText={handleSendText}
          onSendImage={handleSendImage}
        />
      </Box>
      
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
