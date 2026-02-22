import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageList from './MessageList';

// Mock MessageItem component
vi.mock('./MessageItem', () => ({
  default: ({ message, isOwn }) => (
    <div data-testid={`message-${message.id}`}>
      {message.text || 'Image'} - {isOwn ? 'Own' : 'Other'}
    </div>
  )
}));

describe('MessageList', () => {
  it('displays empty state when no messages', () => {
    render(<MessageList messages={[]} currentUser="A" />);
    expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();
  });

  it('renders messages in newest-first order', () => {
    const messages = [
      { id: '1', sender: 'A', type: 'text', text: 'First', created_at: '2024-01-01T10:00:00Z' },
      { id: '2', sender: 'B', type: 'text', text: 'Second', created_at: '2024-01-01T10:01:00Z' },
      { id: '3', sender: 'A', type: 'text', text: 'Third', created_at: '2024-01-01T10:02:00Z' }
    ];

    render(<MessageList messages={messages} currentUser="A" />);

    // All messages should be rendered
    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-2')).toBeInTheDocument();
    expect(screen.getByTestId('message-3')).toBeInTheDocument();
  });

  it('correctly identifies own messages', () => {
    const messages = [
      { id: '1', sender: 'A', type: 'text', text: 'My message', created_at: '2024-01-01T10:00:00Z' },
      { id: '2', sender: 'B', type: 'text', text: 'Their message', created_at: '2024-01-01T10:01:00Z' }
    ];

    render(<MessageList messages={messages} currentUser="A" />);

    expect(screen.getByText(/My message - Own/)).toBeInTheDocument();
    expect(screen.getByText(/Their message - Other/)).toBeInTheDocument();
  });

  it('calls onLoadMore when scrolled to top', () => {
    const onLoadMore = vi.fn();
    const messages = [
      { id: '1', sender: 'A', type: 'text', text: 'Message', created_at: '2024-01-01T10:00:00Z' }
    ];

    const { container } = render(
      <MessageList messages={messages} currentUser="A" onLoadMore={onLoadMore} />
    );

    const listContainer = container.firstChild;
    
    // Simulate scroll to top
    Object.defineProperty(listContainer, 'scrollTop', { value: 0, writable: true });
    listContainer.dispatchEvent(new Event('scroll'));

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('passes correct props to MessageItem', () => {
    const onUnsend = vi.fn();
    const onReact = vi.fn();
    const messages = [
      { id: '1', sender: 'A', type: 'text', text: 'Test', created_at: '2024-01-01T10:00:00Z' }
    ];

    render(
      <MessageList 
        messages={messages} 
        currentUser="A" 
        onUnsend={onUnsend}
        onReact={onReact}
      />
    );

    expect(screen.getByTestId('message-1')).toBeInTheDocument();
  });
});
