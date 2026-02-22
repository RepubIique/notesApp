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
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5'
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
  }
};

export default ChatPage;
