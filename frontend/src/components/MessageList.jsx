import React, { useRef, useEffect, useState } from 'react';
import MessageItem from './MessageItem';

function MessageList({ messages, currentUser, onUnsend, onReact, onLoadMore }) {
  const listRef = useRef(null);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCount && isAtBottom) {
      scrollToBottom();
    }
    setPrevMessageCount(messages.length);
  }, [messages.length, prevMessageCount, isAtBottom]);

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
          <MessageItem
            key={message.id}
            message={message}
            isOwn={message.sender === currentUser}
            onUnsend={onUnsend}
            onReact={onReact}
          />
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
