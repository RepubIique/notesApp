import React, { useRef, useEffect, useState } from 'react';
import MessageItem from './MessageItem';

function MessageList({ messages, currentUser, onUnsend, onReact, onLoadMore, onMessageVisible }) {
  const listRef = useRef(null);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const observerRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCount && isAtBottom) {
      scrollToBottom();
    }
    setPrevMessageCount(messages.length);
  }, [messages.length, prevMessageCount, isAtBottom]);

  // Set up Intersection Observer for marking messages as read
  useEffect(() => {
    if (!onMessageVisible) return;

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              onMessageVisible(messageId);
            }
          }
        });
      },
      {
        root: listRef.current,
        threshold: 0.5 // Message is considered visible when 50% is in view
      }
    );

    // Observe all message elements
    const messageElements = listRef.current?.querySelectorAll('[data-message-id]');
    messageElements?.forEach((el) => observerRef.current.observe(el));

    // Cleanup
    return () => {
      observerRef.current?.disconnect();
    };
  }, [messages, onMessageVisible]);

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  // Handle scroll event for pagination
  const handleScroll = () => {
    if (!listRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    
    // Check if user is at the bottom
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);

    // Load more messages when scrolled to top
    if (scrollTop === 0 && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <div 
      ref={listRef}
      onScroll={handleScroll}
      style={styles.container}
    >
      {messages.length === 0 ? (
        <div style={styles.emptyState}>
          No messages yet. Start the conversation!
        </div>
      ) : (
        // Display messages in newest-first order (reverse chronological)
        messages.map((message) => (
          <div key={message.id} data-message-id={message.id}>
            <MessageItem
              message={message}
              isOwn={message.sender === currentUser}
              onUnsend={onUnsend}
              onReact={onReact}
            />
          </div>
        ))
      )}
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column-reverse', // Newest first (at bottom)
    gap: '0.5rem'
  },
  emptyState: {
    textAlign: 'center',
    color: '#666',
    padding: '2rem',
    fontSize: '0.875rem'
  }
};

export default MessageList;
