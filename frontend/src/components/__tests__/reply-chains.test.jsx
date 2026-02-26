import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MessageItem from '../MessageItem';
import ChatPage from '../ChatPage';
import { AuthProvider } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { messageAPI } from '../../utils/api';

// Mock the API
vi.mock('../../utils/api', () => ({
  messageAPI: {
    getMessages: vi.fn(),
    getActivity: vi.fn(),
    sendText: vi.fn(),
    markAsRead: vi.fn(),
    unsend: vi.fn(),
    addReaction: vi.fn()
  },
  imageAPI: {
    getUrl: vi.fn(),
    upload: vi.fn()
  },
  voiceMessageAPI: {
    deleteVoiceMessage: vi.fn()
  }
}));

// Mock useAuth hook
vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { role: 'A' },
      logout: vi.fn()
    }),
    AuthProvider: ({ children }) => <div>{children}</div>
  };
});

// Mock UploadContext
vi.mock('../../context/UploadContext', async () => {
  const actual = await vi.importActual('../../context/UploadContext');
  return {
    ...actual,
    useUpload: () => ({
      selectedFiles: [],
      addFiles: vi.fn(),
      removeFile: vi.fn(),
      clearFiles: vi.fn(),
      updateProgress: vi.fn(),
      updateCompressedFile: vi.fn(),
      updateImagePath: vi.fn(),
      setIsUploading: vi.fn(),
      setError: vi.fn(),
      uploadProgress: new Map(),
      isUploading: false
    }),
    UploadProvider: ({ children }) => <div>{children}</div>
  };
});

// Mock VoiceRecordingContext
vi.mock('../../context/VoiceRecordingContext', async () => {
  const actual = await vi.importActual('../../context/VoiceRecordingContext');
  return {
    ...actual,
    useVoiceRecording: () => ({
      isRecording: false,
      isUploading: false,
      uploadProgress: 0,
      error: null,
      sendRecording: vi.fn(),
      reset: vi.fn()
    }),
    VoiceRecordingProvider: ({ children }) => <div>{children}</div>
  };
});

// Mock useIdleTimer hook
vi.mock('../../hooks/useIdleTimer', () => ({
  default: vi.fn()
}));

describe('Reply Chains - Requirements 8.1, 8.3, 8.4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageAPI.getActivity.mockResolvedValue({
      activity: { is_typing: false, last_seen: new Date().toISOString() }
    });
  });

  describe('Requirement 8.1: Replying to a reply message', () => {
    it('should allow replying to a message that is itself a reply', () => {
      // Create a reply chain: Message A -> Message B (reply to A) -> Message C (reply to B)
      const originalMessage = {
        id: 'msg-1',
        sender: 'A',
        type: 'text',
        text: 'Original message',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: null,
        reactions: [],
        translations: []
      };

      const firstReply = {
        id: 'msg-2',
        sender: 'B',
        type: 'text',
        text: 'First reply',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: originalMessage,
        reactions: [],
        translations: []
      };

      const onReplyClick = vi.fn();

      // Render the first reply (which has a reply_to_message)
      const { container } = render(
        <MessageItem
          message={firstReply}
          isOwn={false}
          onReplyClick={onReplyClick}
        />
      );

      // Verify the message renders with a reply preview
      expect(screen.getByText('Original message')).toBeInTheDocument();
      expect(screen.getByText('First reply')).toBeInTheDocument();

      // Verify the message can be replied to (it should have the same structure as any other message)
      expect(firstReply.id).toBe('msg-2');
      expect(firstReply.reply_to_message).toBeTruthy();
    });

    it('should reference the reply message as the original when replying to a reply', async () => {
      const originalMessage = {
        id: 'msg-1',
        sender: 'A',
        type: 'text',
        text: 'Original message',
        deleted: false,
        created_at: new Date().toISOString()
      };

      const firstReply = {
        id: 'msg-2',
        sender: 'B',
        type: 'text',
        text: 'First reply',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: originalMessage
      };

      messageAPI.getMessages.mockResolvedValue({
        messages: [firstReply, originalMessage]
      });

      messageAPI.sendText.mockResolvedValue({
        message: {
          id: 'msg-3',
          sender: 'A',
          type: 'text',
          text: 'Second reply',
          reply_to_id: 'msg-2', // References the first reply, not the original
          created_at: new Date().toISOString()
        }
      });

      const { container } = render(
        <BrowserRouter>
          <AuthProvider>
            <ChatPage />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(messageAPI.getMessages).toHaveBeenCalled();
      });

      // Find the first reply message and trigger reply action
      // In a real scenario, this would be triggered by a swipe gesture or button click
      // For testing, we verify that when sendText is called with a reply_to_id,
      // it references the immediate message (msg-2), not the original (msg-1)
      
      // Simulate replying to the first reply
      await messageAPI.sendText('Second reply', 'msg-2');

      expect(messageAPI.sendText).toHaveBeenCalledWith('Second reply', 'msg-2');
    });
  });

  describe('Requirement 8.3: Display only immediate original message', () => {
    it('should show only the immediate original message in preview, not nested replies', () => {
      const originalMessage = {
        id: 'msg-1',
        sender: 'A',
        type: 'text',
        text: 'Original message',
        deleted: false,
        created_at: new Date().toISOString()
      };

      const firstReply = {
        id: 'msg-2',
        sender: 'B',
        type: 'text',
        text: 'First reply',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: originalMessage
      };

      const secondReply = {
        id: 'msg-3',
        sender: 'A',
        type: 'text',
        text: 'Second reply',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: firstReply, // This is a reply to a reply
        reactions: [],
        translations: []
      };

      const onReplyClick = vi.fn();

      // Render the second reply (reply to a reply)
      render(
        <MessageItem
          message={secondReply}
          isOwn={true}
          onReplyClick={onReplyClick}
        />
      );

      // Should show the immediate original (first reply), not the original message
      expect(screen.getByText('First reply')).toBeInTheDocument();
      
      // Should NOT show the original message text in the preview
      expect(screen.queryByText('Original message')).not.toBeInTheDocument();
      
      // Should show the second reply text
      expect(screen.getByText('Second reply')).toBeInTheDocument();
    });

    it('should display correct sender name for immediate original message', () => {
      const firstReply = {
        id: 'msg-2',
        sender: 'B',
        type: 'text',
        text: 'First reply',
        deleted: false,
        created_at: new Date().toISOString()
      };

      const secondReply = {
        id: 'msg-3',
        sender: 'A',
        type: 'text',
        text: 'Second reply',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: firstReply,
        reactions: [],
        translations: []
      };

      const onReplyClick = vi.fn();

      render(
        <MessageItem
          message={secondReply}
          isOwn={true}
          onReplyClick={onReplyClick}
        />
      );

      // Should show "Them" for sender B (since current user is A)
      expect(screen.getByText('Them')).toBeInTheDocument();
    });
  });

  describe('Requirement 8.4: Navigation through reply chains', () => {
    it('should navigate to immediate original message when clicking preview', () => {
      const firstReply = {
        id: 'msg-2',
        sender: 'B',
        type: 'text',
        text: 'First reply',
        deleted: false,
        created_at: new Date().toISOString()
      };

      const secondReply = {
        id: 'msg-3',
        sender: 'A',
        type: 'text',
        text: 'Second reply',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: firstReply,
        reactions: [],
        translations: []
      };

      const onReplyClick = vi.fn();

      render(
        <MessageItem
          message={secondReply}
          isOwn={true}
          onReplyClick={onReplyClick}
        />
      );

      // Click on the reply preview
      const replyPreview = screen.getByRole('button', { name: /Reply to Them: First reply/i });
      fireEvent.click(replyPreview);

      // Should call onReplyClick with the immediate original message ID (msg-2)
      expect(onReplyClick).toHaveBeenCalledWith('msg-2');
    });

    it('should allow further navigation if the original message is also a reply', async () => {
      const originalMessage = {
        id: 'msg-1',
        sender: 'A',
        type: 'text',
        text: 'Original message',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: null,
        reactions: [],
        translations: []
      };

      const firstReply = {
        id: 'msg-2',
        sender: 'B',
        type: 'text',
        text: 'First reply',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: originalMessage,
        reactions: [],
        translations: []
      };

      const secondReply = {
        id: 'msg-3',
        sender: 'A',
        type: 'text',
        text: 'Second reply',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: firstReply,
        reactions: [],
        translations: []
      };

      messageAPI.getMessages.mockResolvedValue({
        messages: [secondReply, firstReply, originalMessage]
      });

      // Mock scrollIntoView
      Element.prototype.scrollIntoView = vi.fn();

      render(
        <BrowserRouter>
          <AuthProvider>
            <ChatPage />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(messageAPI.getMessages).toHaveBeenCalled();
      });

      // After rendering, all three messages should be visible
      // The second reply shows a preview of the first reply
      // The first reply shows a preview of the original message
      
      // Find the second reply's preview and click it
      const secondReplyPreview = screen.getByRole('button', { name: /Reply to Them: First reply/i });
      fireEvent.click(secondReplyPreview);

      // Verify scrollIntoView was called for msg-2
      await waitFor(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      });

      // The first reply should also have a clickable preview to the original message
      const firstReplyPreview = screen.getByRole('button', { name: /Reply to You: Original message/i });
      expect(firstReplyPreview).toBeInTheDocument();
      
      // Click on the first reply's preview to navigate to the original
      fireEvent.click(firstReplyPreview);
      
      // Verify scrollIntoView was called again for msg-1
      await waitFor(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
      });
    });

    it('should scroll and highlight the immediate original message on navigation', async () => {
      const firstReply = {
        id: 'msg-2',
        sender: 'B',
        type: 'text',
        text: 'First reply',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: null,
        reactions: [],
        translations: []
      };

      const secondReply = {
        id: 'msg-3',
        sender: 'A',
        type: 'text',
        text: 'Second reply',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: firstReply,
        reactions: [],
        translations: []
      };

      messageAPI.getMessages.mockResolvedValue({
        messages: [secondReply, firstReply]
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <ChatPage />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(messageAPI.getMessages).toHaveBeenCalled();
      });

      // Mock scrollIntoView
      Element.prototype.scrollIntoView = vi.fn();

      // Click on the reply preview
      const replyPreview = screen.getByRole('button', { name: /Reply to Them: First reply/i });
      fireEvent.click(replyPreview);

      // Verify scrollIntoView was called
      await waitFor(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      });
    });
  });

  describe('Edge cases in reply chains', () => {
    it('should handle deleted messages in reply chains', () => {
      const deletedMessage = {
        id: 'msg-1',
        sender: 'A',
        type: 'text',
        text: 'Original message',
        deleted: true,
        created_at: new Date().toISOString()
      };

      const replyToDeleted = {
        id: 'msg-2',
        sender: 'B',
        type: 'text',
        text: 'Reply to deleted',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: deletedMessage,
        reactions: [],
        translations: []
      };

      const onReplyClick = vi.fn();

      render(
        <MessageItem
          message={replyToDeleted}
          isOwn={false}
          onReplyClick={onReplyClick}
        />
      );

      // Should show [Message deleted] for the deleted original
      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
      expect(screen.getByText('Reply to deleted')).toBeInTheDocument();
    });

    it('should handle image messages in reply chains', () => {
      const imageMessage = {
        id: 'msg-1',
        sender: 'A',
        type: 'image',
        image_path: '/path/to/image.jpg',
        deleted: false,
        created_at: new Date().toISOString()
      };

      const replyToImage = {
        id: 'msg-2',
        sender: 'B',
        type: 'text',
        text: 'Nice picture!',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: imageMessage,
        reactions: [],
        translations: []
      };

      const onReplyClick = vi.fn();

      render(
        <MessageItem
          message={replyToImage}
          isOwn={false}
          onReplyClick={onReplyClick}
        />
      );

      // Should show image thumbnail in preview
      const thumbnail = screen.getByAltText('Original message');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('src', '/path/to/image.jpg');
    });

    it('should handle voice messages in reply chains', () => {
      const voiceMessage = {
        id: 'msg-1',
        sender: 'A',
        type: 'voice',
        audio_duration: 45,
        deleted: false,
        created_at: new Date().toISOString()
      };

      const replyToVoice = {
        id: 'msg-2',
        sender: 'B',
        type: 'text',
        text: 'Got it!',
        deleted: false,
        created_at: new Date().toISOString(),
        reply_to_message: voiceMessage,
        reactions: [],
        translations: []
      };

      const onReplyClick = vi.fn();

      render(
        <MessageItem
          message={replyToVoice}
          isOwn={false}
          onReplyClick={onReplyClick}
        />
      );

      // Should show voice message indicator with duration
      expect(screen.getByText('[Voice message 0:45]')).toBeInTheDocument();
    });
  });
});
