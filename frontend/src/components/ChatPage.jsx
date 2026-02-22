import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useIdleTimer from '../hooks/useIdleTimer';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import { messageAPI, imageAPI } from '../utils/api';

function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const pollingIntervalRef = useRef(null);

  // Fetch current user role on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (user?.role) {
        setCurrentUser(user.role);
      }
    };
    fetchCurrentUser();
  }, [user]);

  // Start polling for messages every 2 seconds
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await messageAPI.getMessages(50);
        setMessages(response.messages || []);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    // Fetch messages immediately on mount
    fetchMessages();

    // Start polling every 2 seconds
    pollingIntervalRef.current = setInterval(fetchMessages, 2000);

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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Chat</h1>
        <div style={styles.userInfo}>
          <span>Logged in as: Identity {user?.role}</span>
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
