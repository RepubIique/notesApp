import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
    const deltaY = clientY - dragStartRef.current.y;

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
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Chat</h1>
          {otherUserActivity?.is_typing && (
            <div style={styles.typingIndicator}>
              {getRoleName(currentUser === 'A' ? 'B' : 'A')} is typing
              <span className="typing-dots">
                <span>.</span><span>.</span><span>.</span>
              </span>
            </div>
          )}
        </div>
        <div style={styles.userInfo}>
          <span>Logged in as: {getRoleName(user?.role)}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>
      <div style={styles.content}>
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
      </div>
      
      {/* Floating Action Button */}
      <a
        href={isDragging ? undefined : "https://facebook.com"}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...styles.fab,
          bottom: `${fabPosition.bottom}px`,
          right: `${fabPosition.right}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        title="Open Facebook"
        onMouseDown={handleFabMouseDown}
        onTouchStart={handleFabTouchStart}
        onClick={(e) => {
          if (isDragging) {
            e.preventDefault();
          }
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </a>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5',
    position: 'relative'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  title: {
    margin: 0,
    fontSize: '1.5rem'
  },
  typingIndicator: {
    fontSize: '0.875rem',
    color: '#666',
    marginTop: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  fab: {
    position: 'fixed',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#1877f2',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    textDecoration: 'none',
    transition: 'box-shadow 0.3s ease',
    zIndex: 1000,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none'
  }
};

export default ChatPage;
