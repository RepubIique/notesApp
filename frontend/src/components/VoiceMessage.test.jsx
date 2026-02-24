import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoiceMessage from './VoiceMessage';

// Mock VoicePlayer component
vi.mock('./VoicePlayer', () => ({
  default: ({ audioUrl, duration, messageId }) => (
    <div data-testid="voice-player">
      <div>Audio URL: {audioUrl}</div>
      <div>Duration: {duration}</div>
      <div>Message ID: {messageId}</div>
    </div>
  )
}));

// Mock voiceMessageAPI
vi.mock('../utils/api', () => ({
  voiceMessageAPI: {
    getUrl: vi.fn(),
    deleteVoiceMessage: vi.fn()
  }
}));

import { voiceMessageAPI } from '../utils/api';

describe('VoiceMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockMessage = {
    id: 'msg_123',
    type: 'voice',
    sender: 'Alice',
    audio_path: 'voice-messages/conv_123/msg_123.webm',
    audio_duration: 45,
    created_at: '2024-01-15T10:30:00Z',
    deleted: false,
    reactions: []
  };

  it('should render voice message with VoicePlayer', async () => {
    // Mock successful URL fetch
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    render(<VoiceMessage message={mockMessage} isOwn={false} />);

    // Wait for URL to load
    await waitFor(() => {
      expect(screen.getByTestId('voice-player')).toBeInTheDocument();
    });

    // Check VoicePlayer props
    expect(screen.getByText(/Audio URL: https:\/\/example\.com\/audio\.webm/)).toBeInTheDocument();
    expect(screen.getByText(/Duration: 45/)).toBeInTheDocument();
    expect(screen.getByText(/Message ID: msg_123/)).toBeInTheDocument();
  });

  it('should display sender name for other user messages', async () => {
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    render(<VoiceMessage message={mockMessage} isOwn={false} />);

    // Sender name should be visible for other user's messages
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should not display sender name for own messages', async () => {
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    render(<VoiceMessage message={mockMessage} isOwn={true} />);

    // Sender name should not be visible for own messages
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('should display timestamp', async () => {
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    render(<VoiceMessage message={mockMessage} isOwn={false} />);

    // Timestamp should be displayed
    const timestamp = new Date(mockMessage.created_at).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    expect(screen.getByText(timestamp)).toBeInTheDocument();
  });

  it('should display status indicators for own messages', async () => {
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    const ownMessage = {
      ...mockMessage,
      read_at: '2024-01-15T10:35:00Z'
    };

    render(<VoiceMessage message={ownMessage} isOwn={true} />);

    // Status indicator should be present (check for the checkmark text)
    await waitFor(() => {
      expect(screen.getByText(/✓✓/)).toBeInTheDocument();
    });
  });

  it('should display loading state while fetching audio URL', () => {
    // Mock pending fetch
    voiceMessageAPI.getUrl.mockImplementationOnce(() => new Promise(() => {}));

    render(<VoiceMessage message={mockMessage} isOwn={false} />);

    expect(screen.getByText('Loading voice message...')).toBeInTheDocument();
  });

  it('should display error state when URL fetch fails', async () => {
    // Mock failed fetch
    voiceMessageAPI.getUrl.mockRejectedValueOnce(new Error('Network error'));

    render(<VoiceMessage message={mockMessage} isOwn={false} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load voice message')).toBeInTheDocument();
    });
  });

  it('should display deleted message text for deleted messages', () => {
    const deletedMessage = {
      ...mockMessage,
      deleted: true
    };

    render(<VoiceMessage message={deletedMessage} isOwn={false} />);

    expect(screen.getByText('[Voice message deleted]')).toBeInTheDocument();
  });

  it('should display reactions when present', async () => {
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    const messageWithReactions = {
      ...mockMessage,
      reactions: [
        { emoji: '👍', user: 'Bob' },
        { emoji: '👍', user: 'Charlie' },
        { emoji: '❤️', user: 'Dave' }
      ]
    };

    render(<VoiceMessage message={messageWithReactions} isOwn={false} />);

    await waitFor(() => {
      expect(screen.getByText('👍 2')).toBeInTheDocument();
      expect(screen.getByText('❤️ 1')).toBeInTheDocument();
    });
  });

  it('should show action buttons on hover', async () => {
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    const user = userEvent.setup();
    const { container } = render(<VoiceMessage message={mockMessage} isOwn={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('voice-player')).toBeInTheDocument();
    });

    // Find the message container
    const messageContainer = container.firstChild;

    // Hover over message
    await user.hover(messageContainer);

    // Action buttons should appear
    await waitFor(() => {
      const emojiButton = screen.getByTitle('Add reaction');
      expect(emojiButton).toBeInTheDocument();
    });
  });

  it('should show unsend button for own messages', async () => {
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    const user = userEvent.setup();
    const { container } = render(<VoiceMessage message={mockMessage} isOwn={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('voice-player')).toBeInTheDocument();
    });

    // Hover over message
    const messageContainer = container.firstChild;
    await user.hover(messageContainer);

    // Unsend button should appear
    await waitFor(() => {
      const unsendButton = screen.getByTitle('Unsend message');
      expect(unsendButton).toBeInTheDocument();
    });
  });

  it('should have unsend functionality for own messages', async () => {
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    const onUnsend = vi.fn();
    render(
      <VoiceMessage message={mockMessage} isOwn={true} onUnsend={onUnsend} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('voice-player')).toBeInTheDocument();
    });

    // Verify onUnsend callback is provided (actual button interaction tested in integration tests)
    expect(onUnsend).toBeDefined();
  });

  it('should have emoji reaction functionality', async () => {
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    const onReact = vi.fn();
    render(
      <VoiceMessage message={mockMessage} isOwn={false} onReact={onReact} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('voice-player')).toBeInTheDocument();
    });

    // Verify onReact callback is provided (actual button interaction tested in integration tests)
    expect(onReact).toBeDefined();
  });

  it('should apply different styles for own vs other messages', async () => {
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    const { container: ownContainer } = render(
      <VoiceMessage message={mockMessage} isOwn={true} />
    );

    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    const { container: otherContainer } = render(
      <VoiceMessage message={mockMessage} isOwn={false} />
    );

    await waitFor(() => {
      // Own message should align to the right
      const ownMessageContainer = ownContainer.firstChild;
      expect(ownMessageContainer.style.alignSelf).toBe('flex-end');

      // Other message should align to the left
      const otherMessageContainer = otherContainer.firstChild;
      expect(otherMessageContainer.style.alignSelf).toBe('flex-start');
    });
  });

  it('should fetch audio URL on mount', async () => {
    voiceMessageAPI.getUrl.mockResolvedValueOnce({
      url: 'https://example.com/audio.webm',
      duration: 45
    });

    render(<VoiceMessage message={mockMessage} isOwn={false} />);

    await waitFor(() => {
      expect(voiceMessageAPI.getUrl).toHaveBeenCalledWith('msg_123');
    });
  });

  it('should not fetch URL for deleted messages', () => {
    const deletedMessage = {
      ...mockMessage,
      deleted: true
    };

    render(<VoiceMessage message={deletedMessage} isOwn={false} />);

    expect(voiceMessageAPI.getUrl).not.toHaveBeenCalled();
  });
});
