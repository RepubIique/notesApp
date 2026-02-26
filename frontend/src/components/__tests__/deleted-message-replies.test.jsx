import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ReplyIndicator from '../ReplyIndicator';
import ReplyPreview from '../ReplyPreview';
import { generateContentPreview } from '../../utils/messageUtils';

describe('Deleted Message Replies - Task 14.1', () => {
  describe('ReplyIndicator with deleted messages', () => {
    it('shows "[Message deleted]" for deleted text messages', () => {
      const deletedMessage = {
        id: '123',
        sender: 'A',
        type: 'text',
        text: 'This was the original text',
        deleted: true
      };

      render(
        <ReplyIndicator
          originalMessage={deletedMessage}
          onCancel={() => {}}
          currentUserRole="B"
        />
      );

      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
      expect(screen.queryByText('This was the original text')).not.toBeInTheDocument();
    });

    it('shows "[Message deleted]" for deleted image messages', () => {
      const deletedImageMessage = {
        id: '456',
        sender: 'B',
        type: 'image',
        deleted: true
      };

      render(
        <ReplyIndicator
          originalMessage={deletedImageMessage}
          onCancel={() => {}}
          currentUserRole="A"
        />
      );

      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
      expect(screen.queryByText('[Image]')).not.toBeInTheDocument();
    });

    it('shows "[Message deleted]" for deleted voice messages', () => {
      const deletedVoiceMessage = {
        id: '789',
        sender: 'A',
        type: 'voice',
        audio_duration: 45,
        deleted: true
      };

      render(
        <ReplyIndicator
          originalMessage={deletedVoiceMessage}
          onCancel={() => {}}
          currentUserRole="A"
        />
      );

      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
      expect(screen.queryByText(/Voice message/)).not.toBeInTheDocument();
    });
  });

  describe('ReplyPreview with deleted messages', () => {
    it('shows "[Message deleted]" for deleted text messages', () => {
      const deletedMessage = {
        id: '123',
        sender: 'A',
        type: 'text',
        text: 'Original message content',
        deleted: true
      };

      render(
        <ReplyPreview
          originalMessage={deletedMessage}
          onClick={() => {}}
          currentUserRole="B"
          isOwnMessage={false}
        />
      );

      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
      expect(screen.queryByText('Original message content')).not.toBeInTheDocument();
    });

    it('shows "[Message deleted]" for deleted image messages', () => {
      const deletedImageMessage = {
        id: '456',
        sender: 'B',
        type: 'image',
        image_path: '/path/to/image.jpg',
        deleted: true
      };

      render(
        <ReplyPreview
          originalMessage={deletedImageMessage}
          onClick={() => {}}
          currentUserRole="A"
          isOwnMessage={true}
        />
      );

      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
      // Should not show image thumbnail for deleted messages
      expect(screen.queryByRole('img', { name: 'Original message' })).not.toBeInTheDocument();
    });

    it('shows "[Message deleted]" for deleted voice messages', () => {
      const deletedVoiceMessage = {
        id: '789',
        sender: 'A',
        type: 'voice',
        audio_duration: 120,
        deleted: true
      };

      render(
        <ReplyPreview
          originalMessage={deletedVoiceMessage}
          onClick={() => {}}
          currentUserRole="A"
          isOwnMessage={true}
        />
      );

      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
      expect(screen.queryByText(/Voice message/)).not.toBeInTheDocument();
    });

    it('navigation still works for deleted messages', () => {
      const deletedMessage = {
        id: 'deleted-123',
        sender: 'B',
        type: 'text',
        text: 'Deleted content',
        deleted: true
      };

      const mockOnClick = vi.fn();

      render(
        <ReplyPreview
          originalMessage={deletedMessage}
          onClick={mockOnClick}
          currentUserRole="A"
          isOwnMessage={false}
        />
      );

      // Click on the reply preview
      const preview = screen.getByRole('button');
      fireEvent.click(preview);

      // Verify onClick was called with the correct message ID
      expect(mockOnClick).toHaveBeenCalledWith('deleted-123');
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('keyboard navigation works for deleted messages', () => {
      const deletedMessage = {
        id: 'deleted-456',
        sender: 'A',
        type: 'text',
        deleted: true
      };

      const mockOnClick = vi.fn();

      render(
        <ReplyPreview
          originalMessage={deletedMessage}
          onClick={mockOnClick}
          currentUserRole="B"
          isOwnMessage={false}
        />
      );

      const preview = screen.getByRole('button');

      // Test Enter key
      fireEvent.keyDown(preview, { key: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledWith('deleted-456');

      // Test Space key
      fireEvent.keyDown(preview, { key: ' ' });
      expect(mockOnClick).toHaveBeenCalledWith('deleted-456');

      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateContentPreview with deleted messages', () => {
    it('returns "[Message deleted]" for deleted text messages', () => {
      const message = {
        type: 'text',
        text: 'Some text content',
        deleted: true
      };

      expect(generateContentPreview(message)).toBe('[Message deleted]');
    });

    it('returns "[Message deleted]" for deleted image messages', () => {
      const message = {
        type: 'image',
        deleted: true
      };

      expect(generateContentPreview(message)).toBe('[Message deleted]');
    });

    it('returns "[Message deleted]" for deleted voice messages', () => {
      const message = {
        type: 'voice',
        audio_duration: 60,
        deleted: true
      };

      expect(generateContentPreview(message)).toBe('[Message deleted]');
    });

    it('prioritizes deleted flag over message type', () => {
      // Even with valid content, deleted flag takes precedence
      const messages = [
        { type: 'text', text: 'Hello world', deleted: true },
        { type: 'image', image_path: '/path.jpg', deleted: true },
        { type: 'voice', audio_duration: 30, deleted: true }
      ];

      messages.forEach(message => {
        expect(generateContentPreview(message)).toBe('[Message deleted]');
      });
    });
  });

  describe('Edge cases for deleted message replies', () => {
    it('handles deleted message with missing text field', () => {
      const message = {
        id: '123',
        sender: 'A',
        type: 'text',
        text: null,
        deleted: true
      };

      render(
        <ReplyIndicator
          originalMessage={message}
          onCancel={() => {}}
          currentUserRole="A"
        />
      );

      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
    });

    it('handles deleted message with missing audio_duration', () => {
      const message = {
        id: '456',
        sender: 'B',
        type: 'voice',
        audio_duration: null,
        deleted: true
      };

      render(
        <ReplyPreview
          originalMessage={message}
          onClick={() => {}}
          currentUserRole="A"
          isOwnMessage={false}
        />
      );

      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
    });

    it('ARIA label includes "[Message deleted]" for screen readers', () => {
      const deletedMessage = {
        id: '789',
        sender: 'A',
        type: 'text',
        text: 'Original text',
        deleted: true
      };

      render(
        <ReplyPreview
          originalMessage={deletedMessage}
          onClick={() => {}}
          currentUserRole="A"
          isOwnMessage={false}
        />
      );

      const preview = screen.getByRole('button');
      expect(preview).toHaveAttribute('aria-label', 'Reply to You: [Message deleted]');
    });
  });
});
