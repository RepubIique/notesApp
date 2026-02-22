import React, { useState, useRef } from 'react';

function MessageComposer({ onSendText, onSendImage }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    
    // Don't send empty messages
    if (!text.trim()) {
      return;
    }

    try {
      await onSendText(text);
      // Clear input after successful send
      setText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Could add error UI here
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
    <div style={styles.container}>
      <form onSubmit={handleTextSubmit} style={styles.form}>
        {/* Hidden image input triggered by icon */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleImageSelect}
          style={styles.hiddenInput}
          disabled={uploading}
        />
        
        {/* Image upload icon button */}
        <button
          type="button"
          onClick={handleImageIconClick}
          disabled={uploading}
          style={{
            ...styles.imageButton,
            ...(uploading ? styles.imageButtonDisabled : {})
          }}
          title="Upload image"
        >
          {uploading ? '⏳' : '📷'}
        </button>

        {/* Text input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          style={styles.textInput}
          disabled={uploading}
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!text.trim() || uploading}
          style={{
            ...styles.sendButton,
            ...(!text.trim() || uploading ? styles.sendButtonDisabled : {})
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    padding: '1rem',
    backgroundColor: 'white',
    borderTop: '1px solid #e0e0e0'
  },
  form: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  hiddenInput: {
    display: 'none'
  },
  imageButton: {
    padding: '0.5rem',
    fontSize: '1.5rem',
    backgroundColor: 'transparent',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '40px',
    minHeight: '40px'
  },
  imageButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  textInput: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    outline: 'none'
  },
  sendButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  }
};

export default MessageComposer;
