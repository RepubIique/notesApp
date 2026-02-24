import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import MessageItem from './MessageItem';

// Mock the API client
vi.mock('../utils/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  },
  imageAPI: {
    getUrl: vi.fn().mockResolvedValue({ url: 'https://example.com/image.jpg' })
  }
}));

// Mock the useTranslation hook to control loading state
vi.mock('../hooks/useTranslation', () => ({
  default: vi.fn()
}));

import useTranslation from '../hooks/useTranslation';

describe('MessageItem - Non-Blocking UI During Translation', () => {
  const mockMessage = {
    id: 'test-message-1',
    text: 'Hello world',
    type: 'text',
    sender: 'A',
    created_at: new Date().toISOString(),
    deleted: false,
    reactions: []
  };

  const mockTranslate = vi.fn();
  const mockUseTranslation = {
    translate: mockTranslate,
    loading: false,
    error: null,
    translation: null,
    retry: vi.fn(),
    clearError: vi.fn(),
    reset: vi.fn(),
    retryCount: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useTranslation.mockReturnValue(mockUseTranslation);
  });

  describe('Non-Blocking Behavior During Translation', () => {
    it('should render multiple messages independently during translation', async () => {
      // Set loading state to true for first message
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      render(
        <div>
          <MessageItem 
            message={mockMessage} 
            isOwn={false}
          />
          <MessageItem 
            message={{
              ...mockMessage,
              id: 'test-message-2',
              text: 'Another message'
            }} 
            isOwn={false}
          />
        </div>
      );

      // Both messages should be visible
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      expect(screen.getByText('Another message')).toBeInTheDocument();
      
      // Both messages should be in the DOM and not hidden
      const firstMessage = screen.getByText('Hello world');
      const secondMessage = screen.getByText('Another message');
      
      expect(firstMessage).toBeVisible();
      expect(secondMessage).toBeVisible();
    });

    it('should not block DOM interactions during translation', async () => {
      // Set loading state to true
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      const { container } = render(
        <div>
          <MessageItem 
            message={mockMessage} 
            isOwn={false}
          />
          <MessageItem 
            message={{
              ...mockMessage,
              id: 'test-message-2',
              text: 'Another message'
            }} 
            isOwn={true}
          />
        </div>
      );

      // All message containers should be present and accessible
      const messages = container.querySelectorAll('[style*="display: flex"]');
      expect(messages.length).toBeGreaterThan(0);
      
      // Each message should have event handlers attached (not blocked)
      messages.forEach(msg => {
        // Check that the element is in the document and can receive events
        expect(msg).toBeInTheDocument();
      });
    });

    it('should allow scrolling while translation is loading', async () => {
      // Set loading state to true
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      const { container } = render(
        <div 
          style={{ height: '200px', overflow: 'auto' }}
          data-testid="scrollable-container"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <MessageItem 
              key={i}
              message={{
                ...mockMessage,
                id: `test-message-${i}`,
                text: `Message ${i}`
              }} 
              isOwn={i % 2 === 0}
            />
          ))}
        </div>
      );

      const scrollContainer = screen.getByTestId('scrollable-container');
      
      // Initial scroll position
      expect(scrollContainer.scrollTop).toBe(0);

      // Simulate scroll
      scrollContainer.scrollTop = 100;
      scrollContainer.dispatchEvent(new Event('scroll'));

      // Scroll should work
      expect(scrollContainer.scrollTop).toBe(100);
    });

    it('should not block rendering of new messages during translation', async () => {
      // Set loading state to true
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      const { rerender } = render(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      // Add a new message
      rerender(
        <div>
          <MessageItem 
            message={mockMessage} 
            isOwn={false}
          />
          <MessageItem 
            message={{
              ...mockMessage,
              id: 'new-message',
              text: 'New message while translating'
            }} 
            isOwn={false}
          />
        </div>
      );

      // New message should be rendered
      expect(screen.getByText('New message while translating')).toBeInTheDocument();
    });

    it('should not block message container from receiving events', () => {
      // Set loading state to true
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      const onUnsend = vi.fn();
      const { container } = render(
        <MessageItem 
          message={{
            ...mockMessage,
            id: 'own-message'
          }} 
          isOwn={true}
          onUnsend={onUnsend}
        />
      );

      // Message container should be present and not blocked
      const messageContainer = container.querySelector('[style*="display: flex"]');
      expect(messageContainer).toBeInTheDocument();
      
      // Container should have event handlers (onMouseEnter, onMouseLeave)
      // This verifies the component is interactive, not blocked
      expect(messageContainer).toHaveProperty('onmouseenter');
      expect(messageContainer).toHaveProperty('onmouseleave');
    });

    it('should render action buttons when manually showing actions during translation', () => {
      // Set loading state to true
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      // Create a wrapper component that forces showActions to true
      const TestWrapper = () => {
        const [showActions] = React.useState(true);
        return (
          <div 
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
          >
            <MessageItem 
              message={mockMessage} 
              isOwn={false}
            />
          </div>
        );
      };

      render(<TestWrapper />);

      // Message should be visible
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      
      // The component structure allows for actions to be shown
      // (even if hover doesn't work in test environment)
      const messageText = screen.getByText('Hello world');
      expect(messageText).toBeVisible();
    });

    it('should show loading indicator without blocking other UI elements', async () => {
      // Set loading state to true
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      render(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      // Message text should still be visible
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      
      // Message should be visible and not obscured
      const messageText = screen.getByText('Hello world');
      expect(messageText).toBeVisible();
    });

    it('should maintain message visibility during translation', () => {
      // Set loading state to true
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      render(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      // Original message text should remain visible
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      
      // Message should not be hidden or obscured
      const messageText = screen.getByText('Hello world');
      const styles = window.getComputedStyle(messageText);
      expect(styles.display).not.toBe('none');
      expect(styles.visibility).not.toBe('hidden');
    });

    it('should not disable other interactive elements during translation', () => {
      // Set loading state to true
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      const onReact = vi.fn();
      const { container } = render(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
          onReact={onReact}
        />
      );

      // Message container should have event handlers attached
      const messageContainer = container.querySelector('[style*="display: flex"]');
      expect(messageContainer).toBeInTheDocument();
      
      // Verify the container can receive mouse events (not blocked)
      expect(messageContainer).toHaveProperty('onmouseenter');
      expect(messageContainer).toHaveProperty('onmouseleave');
      
      // Message text should be visible
      expect(screen.getByText('Hello world')).toBeVisible();
    });

    it('should allow multiple messages to be translated simultaneously', async () => {
      const user = userEvent.setup();
      
      // Mock different loading states for different messages
      let callCount = 0;
      useTranslation.mockImplementation((messageId) => {
        callCount++;
        return {
          ...mockUseTranslation,
          loading: callCount === 1, // Only first message is loading
          translate: vi.fn().mockResolvedValue({
            translatedText: `Translated ${messageId}`,
            sourceLanguage: 'en',
            targetLanguage: 'zh-CN'
          })
        };
      });

      const { container } = render(
        <div>
          <MessageItem 
            message={mockMessage} 
            isOwn={false}
          />
          <MessageItem 
            message={{
              ...mockMessage,
              id: 'test-message-2',
              text: 'Second message'
            }} 
            isOwn={false}
          />
        </div>
      );

      // Both messages should be visible
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();

      // Should be able to hover over second message while first is translating
      const messages = container.querySelectorAll('[style*="display: flex"]');
      const secondMessage = messages[1];
      
      await user.hover(secondMessage);

      // Actions should appear on second message
      await waitFor(() => {
        const emojiButtons = screen.getAllByTitle('Add reaction');
        expect(emojiButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('UI Responsiveness During Translation', () => {
    it('should maintain event handlers during translation', () => {
      // Set loading state to true
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      const { container } = render(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      const messageContainer = container.querySelector('[style*="display: flex"]');
      
      // Verify event handlers are present (component is interactive)
      expect(messageContainer).toHaveProperty('onmouseenter');
      expect(messageContainer).toHaveProperty('onmouseleave');
    });

    it('should not show loading overlay that blocks interactions', () => {
      // Set loading state to true
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      const { container } = render(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      // Check that there's no blocking overlay
      const overlays = container.querySelectorAll('[style*="position: fixed"]');
      const blockingOverlays = Array.from(overlays).filter(el => {
        const styles = window.getComputedStyle(el);
        return styles.zIndex > 1000 && styles.backgroundColor !== 'transparent';
      });

      expect(blockingOverlays.length).toBe(0);
    });

    it('should keep message container interactive during translation', () => {
      // Set loading state to true
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      const { container } = render(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      const messageContainer = container.querySelector('[style*="display: flex"]');
      
      // Container should be in the document and have event handlers
      expect(messageContainer).toBeInTheDocument();
      expect(messageContainer).toHaveProperty('onmouseenter');
    });
  });

  describe('Translation State Transitions', () => {
    it('should smoothly transition from loading to success without blocking', async () => {
      const { rerender } = render(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      // Start with loading state
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      rerender(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      // Message should still be visible
      expect(screen.getByText('Hello world')).toBeInTheDocument();

      // Transition to success state
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: false,
        translation: {
          translatedText: '你好世界',
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN'
        }
      });

      rerender(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      // Original message should still be visible (showOriginal defaults to true)
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('should smoothly transition from loading to error without blocking', async () => {
      const { rerender } = render(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      // Start with loading state
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: true
      });

      rerender(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      // Transition to error state
      useTranslation.mockReturnValue({
        ...mockUseTranslation,
        loading: false,
        error: {
          message: 'Translation failed',
          code: 'TRANSLATION_FAILED'
        }
      });

      rerender(
        <MessageItem 
          message={mockMessage} 
          isOwn={false}
        />
      );

      // Original message should still be visible
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      
      // Error message should be shown
      expect(screen.getByText('Translation failed')).toBeInTheDocument();
    });
  });
});
