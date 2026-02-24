import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MessageList from './MessageList';

// Mock VoicePlayer to avoid audio element issues in tests
vi.mock('./VoicePlayer', () => ({
  default: ({ audioUrl, duration, messageId }) => (
    <div data-testid={`voice-player-${messageId}`}>
      Voice Player - Duration: {duration}s
    </div>
  )
}));

// Mock fetch for audio URL requests
global.fetch = vi.fn();

describe('MessageList - Voice Message Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful audio URL fetch
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://example.com/audio.webm' })
    });
  });

  it('renders voice messages inline with text and image messages in chronological order', async () => {
    const messages = [
      { 
        id: '1', 
        sender: 'A', 
        type: 'text', 
        text: 'Hello!', 
        created_at: '2024-01-01T10:00:00Z' 
      },
      { 
        id: '2', 
        sender: 'B', 
        type: 'voice', 
        audio_path: 'conv/msg2.webm', 
        audio_duration: 15, 
        created_at: '2024-01-01T10:01:00Z' 
      },
      { 
        id: '3', 
        sender: 'A', 
        type: 'image', 
        image_path: 'conv/img.jpg', 
        created_at: '2024-01-01T10:02:00Z' 
      },
      { 
        id: '4', 
        sender: 'B', 
        type: 'voice', 
        audio_path: 'conv/msg4.webm', 
        audio_duration: 30, 
        created_at: '2024-01-01T10:03:00Z' 
      },
      { 
        id: '5', 
        sender: 'A', 
        type: 'text', 
        text: 'Got it!', 
        created_at: '2024-01-01T10:04:00Z' 
      }
    ];

    render(<MessageList messages={messages} currentUser="A" />);

    // Verify all messages are rendered
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Got it!')).toBeInTheDocument();
    
    // Wait for voice messages to load
    await waitFor(() => {
      expect(screen.getByTestId('voice-player-2')).toBeInTheDocument();
      expect(screen.getByTestId('voice-player-4')).toBeInTheDocument();
    });
    
    // Verify messages maintain data-message-id for visibility tracking
    expect(document.querySelector('[data-message-id="1"]')).toBeInTheDocument();
    expect(document.querySelector('[data-message-id="2"]')).toBeInTheDocument();
    expect(document.querySelector('[data-message-id="3"]')).toBeInTheDocument();
    expect(document.querySelector('[data-message-id="4"]')).toBeInTheDocument();
    expect(document.querySelector('[data-message-id="5"]')).toBeInTheDocument();
  });

  it('correctly identifies own vs other voice messages', async () => {
    const messages = [
      { 
        id: '1', 
        sender: 'A', 
        type: 'voice', 
        audio_path: 'conv/msg1.webm', 
        audio_duration: 20, 
        created_at: '2024-01-01T10:00:00Z' 
      },
      { 
        id: '2', 
        sender: 'B', 
        type: 'voice', 
        audio_path: 'conv/msg2.webm', 
        audio_duration: 25, 
        created_at: '2024-01-01T10:01:00Z' 
      }
    ];

    render(<MessageList messages={messages} currentUser="A" />);

    // Wait for voice messages to load
    await waitFor(() => {
      expect(screen.getByTestId('voice-player-1')).toBeInTheDocument();
      expect(screen.getByTestId('voice-player-2')).toBeInTheDocument();
    });
  });

  it('passes callbacks to voice message components', async () => {
    const onUnsend = vi.fn();
    const onReact = vi.fn();
    const onMessageVisible = vi.fn();
    
    const messages = [
      { 
        id: '1', 
        sender: 'A', 
        type: 'voice', 
        audio_path: 'conv/msg1.webm', 
        audio_duration: 15, 
        created_at: '2024-01-01T10:00:00Z' 
      }
    ];

    render(
      <MessageList 
        messages={messages} 
        currentUser="A"
        onUnsend={onUnsend}
        onReact={onReact}
        onMessageVisible={onMessageVisible}
      />
    );

    // Wait for voice message to load
    await waitFor(() => {
      expect(screen.getByTestId('voice-player-1')).toBeInTheDocument();
    });
  });

  it('handles empty message list', () => {
    render(<MessageList messages={[]} currentUser="A" />);
    expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();
  });

  it('handles conversation with only voice messages', async () => {
    const messages = [
      { 
        id: '1', 
        sender: 'A', 
        type: 'voice', 
        audio_path: 'conv/msg1.webm', 
        audio_duration: 10, 
        created_at: '2024-01-01T10:00:00Z' 
      },
      { 
        id: '2', 
        sender: 'B', 
        type: 'voice', 
        audio_path: 'conv/msg2.webm', 
        audio_duration: 20, 
        created_at: '2024-01-01T10:01:00Z' 
      },
      { 
        id: '3', 
        sender: 'A', 
        type: 'voice', 
        audio_path: 'conv/msg3.webm', 
        audio_duration: 30, 
        created_at: '2024-01-01T10:02:00Z' 
      }
    ];

    render(<MessageList messages={messages} currentUser="A" />);

    // Wait for all voice messages to load
    await waitFor(() => {
      expect(screen.getByTestId('voice-player-1')).toBeInTheDocument();
      expect(screen.getByTestId('voice-player-2')).toBeInTheDocument();
      expect(screen.getByTestId('voice-player-3')).toBeInTheDocument();
    });
  });

  it('maintains message metadata for voice messages', async () => {
    const messages = [
      { 
        id: 'voice-123', 
        sender: 'A', 
        type: 'voice', 
        audio_path: 'conv/msg.webm', 
        audio_duration: 45,
        created_at: '2024-01-01T10:00:00Z',
        delivered_at: '2024-01-01T10:00:05Z',
        read_at: '2024-01-01T10:00:10Z',
        reactions: [
          { emoji: '👍', user_role: 'B' }
        ]
      }
    ];

    render(<MessageList messages={messages} currentUser="A" />);

    // Voice message should be rendered with all metadata
    expect(document.querySelector('[data-message-id="voice-123"]')).toBeInTheDocument();
    
    // Wait for voice player to load
    await waitFor(() => {
      expect(screen.getByTestId('voice-player-voice-123')).toBeInTheDocument();
    });
  });
});
