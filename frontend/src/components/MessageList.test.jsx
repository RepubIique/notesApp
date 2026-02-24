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

// Mock VoiceMessage component
vi.mock('./VoiceMessage', () => ({
  default: ({ message, isOwn }) => (
    <div data-testid={`voice-message-${message.id}`}>
      Voice Message - {isOwn ? 'Own' : 'Other'}
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

  it('renders voice messages using VoiceMessage component', () => {
    const messages = [
      { id: '1', sender: 'A', type: 'voice', audio_path: 'path/to/audio.webm', audio_duration: 30, created_at: '2024-01-01T10:00:00Z' },
      { id: '2', sender: 'B', type: 'text', text: 'Text message', created_at: '2024-01-01T10:01:00Z' }
    ];

    render(<MessageList messages={messages} currentUser="A" />);

    // Voice message should use VoiceMessage component
    expect(screen.getByTestId('voice-message-1')).toBeInTheDocument();
    expect(screen.getByText(/Voice Message - Own/)).toBeInTheDocument();
    
    // Text message should use MessageItem component
    expect(screen.getByTestId('message-2')).toBeInTheDocument();
  });

  it('handles mixed message types in chronological order', () => {
    const messages = [
      { id: '1', sender: 'A', type: 'text', text: 'First', created_at: '2024-01-01T10:00:00Z' },
      { id: '2', sender: 'B', type: 'voice', audio_path: 'path/to/audio.webm', audio_duration: 15, created_at: '2024-01-01T10:01:00Z' },
      { id: '3', sender: 'A', type: 'image', image_path: 'path/to/image.jpg', created_at: '2024-01-01T10:02:00Z' },
      { id: '4', sender: 'B', type: 'voice', audio_path: 'path/to/audio2.webm', audio_duration: 45, created_at: '2024-01-01T10:03:00Z' }
    ];

    render(<MessageList messages={messages} currentUser="A" />);

    // All messages should be rendered
    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByTestId('voice-message-2')).toBeInTheDocument();
    expect(screen.getByTestId('message-3')).toBeInTheDocument();
    expect(screen.getByTestId('voice-message-4')).toBeInTheDocument();
  });

  it('passes onUnsend and onReact to VoiceMessage component', () => {
    const onUnsend = vi.fn();
    const onReact = vi.fn();
    const messages = [
      { id: '1', sender: 'A', type: 'voice', audio_path: 'path/to/audio.webm', audio_duration: 20, created_at: '2024-01-01T10:00:00Z' }
    ];

    render(
      <MessageList 
        messages={messages} 
        currentUser="A" 
        onUnsend={onUnsend}
        onReact={onReact}
      />
    );

    expect(screen.getByTestId('voice-message-1')).toBeInTheDocument();
  });
});
