import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessageItem from './MessageItem';
import { imageAPI } from '../utils/api';

// Mock the imageAPI
vi.mock('../utils/api', () => ({
  imageAPI: {
    getUrl: vi.fn()
  }
}));

describe('MessageItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Text Messages', () => {
    it('displays text content for text messages', () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'text',
        text: 'Hello, world!',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      render(<MessageItem message={message} isOwn={false} />);
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });

    it('displays timestamp for messages', () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'text',
        text: 'Test',
        created_at: '2024-01-01T10:30:00Z',
        deleted: false,
        reactions: []
      };

      render(<MessageItem message={message} isOwn={false} />);
      // Timestamp should be displayed (format may vary by locale)
      expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
    });
  });

  describe('Deleted Messages', () => {
    it('displays "[Message deleted]" for deleted messages', () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'text',
        text: 'Original text',
        created_at: '2024-01-01T10:00:00Z',
        deleted: true,
        reactions: []
      };

      render(<MessageItem message={message} isOwn={false} />);
      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
      expect(screen.queryByText('Original text')).not.toBeInTheDocument();
    });

    it('does not show unsend button for deleted messages', () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'text',
        text: 'Test',
        created_at: '2024-01-01T10:00:00Z',
        deleted: true,
        reactions: []
      };

      const { container } = render(<MessageItem message={message} isOwn={true} />);
      
      // Hover to show actions
      const messageContainer = container.firstChild;
      fireEvent.mouseEnter(messageContainer);

      // Unsend button should not be present for deleted messages
      const buttons = container.querySelectorAll('button');
      // Should only have emoji button, not unsend button
      expect(buttons.length).toBe(1);
    });
  });

  describe('Image Messages', () => {
    it('displays inline image for image messages', async () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'image',
        image_path: 'path/to/image.jpg',
        image_name: 'test.jpg',
        image_mime: 'image/jpeg',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      imageAPI.getUrl.mockResolvedValue({ url: 'https://example.com/image.jpg' });

      render(<MessageItem message={message} isOwn={false} />);

      // Should show loading state initially
      expect(screen.getByText('Loading image...')).toBeInTheDocument();

      // Wait for image to load
      await waitFor(() => {
        const img = screen.getByAltText('test.jpg');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
      });

      expect(imageAPI.getUrl).toHaveBeenCalledWith('1');
    });

    it('calls onImageClick when image is clicked', async () => {
      const onImageClick = vi.fn();
      const message = {
        id: '1',
        sender: 'A',
        type: 'image',
        image_path: 'path/to/image.jpg',
        image_name: 'test.jpg',
        image_mime: 'image/jpeg',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      imageAPI.getUrl.mockResolvedValue({ url: 'https://example.com/image.jpg' });

      render(<MessageItem message={message} isOwn={false} onImageClick={onImageClick} />);

      // Wait for image to load
      await waitFor(() => {
        const img = screen.getByAltText('test.jpg');
        expect(img).toBeInTheDocument();
      });

      // Click the image
      const img = screen.getByAltText('test.jpg');
      fireEvent.click(img);

      // Verify onImageClick was called with correct parameters
      expect(onImageClick).toHaveBeenCalledWith('1', 'https://example.com/image.jpg');
    });

    it('applies cursor pointer style to images', async () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'image',
        image_path: 'path/to/image.jpg',
        image_name: 'test.jpg',
        image_mime: 'image/jpeg',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      imageAPI.getUrl.mockResolvedValue({ url: 'https://example.com/image.jpg' });

      render(<MessageItem message={message} isOwn={false} />);

      // Wait for image to load
      await waitFor(() => {
        const img = screen.getByAltText('test.jpg');
        expect(img).toBeInTheDocument();
      });

      const img = screen.getByAltText('test.jpg');
      expect(img).toHaveStyle({ cursor: 'pointer' });
    });

    it('displays error placeholder when image fails to load', async () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'image',
        image_path: 'path/to/image.jpg',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      imageAPI.getUrl.mockRejectedValue(new Error('Failed to load'));

      render(<MessageItem message={message} isOwn={false} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });
    });

    it('does not fetch image URL for deleted image messages', () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'image',
        image_path: 'path/to/image.jpg',
        created_at: '2024-01-01T10:00:00Z',
        deleted: true,
        reactions: []
      };

      render(<MessageItem message={message} isOwn={false} />);

      expect(imageAPI.getUrl).not.toHaveBeenCalled();
      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
    });
  });

  describe('Reactions', () => {
    it('displays reactions below message with counts', () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'text',
        text: 'Test',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: [
          { id: 'r1', message_id: '1', user_role: 'A', emoji: '👍', created_at: '2024-01-01T10:01:00Z' },
          { id: 'r2', message_id: '1', user_role: 'B', emoji: '👍', created_at: '2024-01-01T10:02:00Z' },
          { id: 'r3', message_id: '1', user_role: 'A', emoji: '❤️', created_at: '2024-01-01T10:03:00Z' }
        ]
      };

      render(<MessageItem message={message} isOwn={false} />);

      // Should show thumbs up with count 2
      expect(screen.getByText(/👍\s+2/)).toBeInTheDocument();
      // Should show heart with count 1
      expect(screen.getByText(/❤️\s+1/)).toBeInTheDocument();
    });

    it('displays reactions for deleted messages', () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'text',
        text: 'Test',
        created_at: '2024-01-01T10:00:00Z',
        deleted: true,
        reactions: [
          { id: 'r1', message_id: '1', user_role: 'A', emoji: '👍', created_at: '2024-01-01T10:01:00Z' }
        ]
      };

      render(<MessageItem message={message} isOwn={false} />);

      expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
      expect(screen.getByText(/👍\s+1/)).toBeInTheDocument();
    });

    it('shows emoji reaction picker on hover', () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'text',
        text: 'Test',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const messageContainer = container.firstChild;
      
      // Hover to show actions
      fireEvent.mouseEnter(messageContainer);

      // Click emoji button
      const emojiButton = screen.getByTitle('Add reaction');
      fireEvent.click(emojiButton);

      // Emoji picker should be visible with common emojis
      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('😂')).toBeInTheDocument();
    });

    it('handles emoji reaction click', () => {
      const onReact = vi.fn();
      const message = {
        id: '1',
        sender: 'A',
        type: 'text',
        text: 'Test',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      const { container } = render(<MessageItem message={message} isOwn={false} onReact={onReact} />);
      
      const messageContainer = container.firstChild;
      
      // Hover and open emoji picker
      fireEvent.mouseEnter(messageContainer);
      const emojiButton = screen.getByTitle('Add reaction');
      fireEvent.click(emojiButton);

      // Click on thumbs up emoji
      const thumbsUpButton = screen.getAllByText('👍').find(el => el.tagName === 'BUTTON');
      fireEvent.click(thumbsUpButton);

      expect(onReact).toHaveBeenCalledWith('1', '👍');
    });
  });

  describe('Unsend Functionality', () => {
    it('shows unsend button for own messages on hover', () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'text',
        text: 'Test',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      const { container } = render(<MessageItem message={message} isOwn={true} />);
      
      const messageContainer = container.firstChild;
      
      // Initially, unsend button should not be visible
      expect(screen.queryByTitle('Unsend message')).not.toBeInTheDocument();

      // Hover to show actions
      fireEvent.mouseEnter(messageContainer);

      // Unsend button should now be visible
      expect(screen.getByTitle('Unsend message')).toBeInTheDocument();
    });

    it('does not show unsend button for other user messages', () => {
      const message = {
        id: '1',
        sender: 'B',
        type: 'text',
        text: 'Test',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const messageContainer = container.firstChild;
      
      // Hover to show actions
      fireEvent.mouseEnter(messageContainer);

      // Unsend button should not be present
      expect(screen.queryByTitle('Unsend message')).not.toBeInTheDocument();
    });

    it('handles unsend click', () => {
      const onUnsend = vi.fn();
      const message = {
        id: '1',
        sender: 'A',
        type: 'text',
        text: 'Test',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      const { container } = render(<MessageItem message={message} isOwn={true} onUnsend={onUnsend} />);
      
      const messageContainer = container.firstChild;
      
      // Hover and click unsend
      fireEvent.mouseEnter(messageContainer);
      const unsendButton = screen.getByTitle('Unsend message');
      fireEvent.click(unsendButton);

      expect(onUnsend).toHaveBeenCalledWith('1');
    });
  });

  describe('Message Styling', () => {
    it('applies correct styling for own messages', () => {
      const message = {
        id: '1',
        sender: 'A',
        type: 'text',
        text: 'Test',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      const { container } = render(<MessageItem message={message} isOwn={true} />);
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toHaveStyle({ alignSelf: 'flex-end' });
    });

    it('applies correct styling for other user messages', () => {
      const message = {
        id: '1',
        sender: 'B',
        type: 'text',
        text: 'Test',
        created_at: '2024-01-01T10:00:00Z',
        deleted: false,
        reactions: []
      };

      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toHaveStyle({ alignSelf: 'flex-start' });
    });
  });
});
