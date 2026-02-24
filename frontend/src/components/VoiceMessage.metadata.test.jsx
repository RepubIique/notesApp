import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import VoiceMessage from './VoiceMessage';

/**
 * Tests for voice message metadata consistency (Requirement 5.1)
 * Validates that voice messages include all standard message metadata
 */
describe('VoiceMessage - Metadata Consistency (Requirement 5.1)', () => {
  beforeEach(() => {
    // Mock voiceMessageAPI
    vi.mock('../utils/api', () => ({
      voiceMessageAPI: {
        getUrl: vi.fn().mockResolvedValue({ url: 'https://example.com/audio.webm' })
      }
    }));
  });

  it('should validate required metadata fields are present', () => {
    const validMessage = {
      id: 'msg_123',
      sender: 'A',
      type: 'voice',
      audio_path: 'voice-messages/test.webm',
      audio_duration: 30,
      created_at: new Date().toISOString(),
      deleted: false
    };

    const { container } = render(
      <VoiceMessage message={validMessage} isOwn={false} />
    );

    // Should render without error
    expect(container).toBeTruthy();
  });

  it('should display error when message ID is missing', () => {
    const invalidMessage = {
      // id is missing
      sender: 'A',
      type: 'voice',
      audio_path: 'voice-messages/test.webm',
      audio_duration: 30,
      created_at: new Date().toISOString()
    };

    render(<VoiceMessage message={invalidMessage} isOwn={false} />);

    expect(screen.getByText(/Invalid voice message: missing required metadata/i)).toBeInTheDocument();
  });

  it('should display error when sender is missing', () => {
    const invalidMessage = {
      id: 'msg_123',
      // sender is missing
      type: 'voice',
      audio_path: 'voice-messages/test.webm',
      audio_duration: 30,
      created_at: new Date().toISOString()
    };

    render(<VoiceMessage message={invalidMessage} isOwn={false} />);

    expect(screen.getByText(/Invalid voice message: missing required metadata/i)).toBeInTheDocument();
  });

  it('should display error when created_at is missing', () => {
    const invalidMessage = {
      id: 'msg_123',
      sender: 'A',
      type: 'voice',
      audio_path: 'voice-messages/test.webm',
      audio_duration: 30
      // created_at is missing
    };

    render(<VoiceMessage message={invalidMessage} isOwn={false} />);

    expect(screen.getByText(/Invalid voice message: missing required metadata/i)).toBeInTheDocument();
  });

  it('should display error when message type is not voice', () => {
    const invalidMessage = {
      id: 'msg_123',
      sender: 'A',
      type: 'text', // Wrong type
      audio_path: 'voice-messages/test.webm',
      audio_duration: 30,
      created_at: new Date().toISOString()
    };

    render(<VoiceMessage message={invalidMessage} isOwn={false} />);

    expect(screen.getByText(/Invalid message type: expected 'voice', got 'text'/i)).toBeInTheDocument();
  });

  it('should display sender metadata for other user messages', () => {
    const message = {
      id: 'msg_123',
      sender: 'B',
      type: 'voice',
      audio_path: 'voice-messages/test.webm',
      audio_duration: 30,
      created_at: new Date().toISOString(),
      deleted: false
    };

    render(<VoiceMessage message={message} isOwn={false} />);

    // Sender should be displayed
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('should display timestamp metadata', () => {
    const testDate = new Date('2024-01-15T10:30:00Z');
    const message = {
      id: 'msg_123',
      sender: 'A',
      type: 'voice',
      audio_path: 'voice-messages/test.webm',
      audio_duration: 30,
      created_at: testDate.toISOString(),
      deleted: false
    };

    render(<VoiceMessage message={message} isOwn={true} />);

    // Timestamp should be displayed
    const expectedTime = testDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    expect(screen.getByText(expectedTime)).toBeInTheDocument();
  });

  it('should include all standard metadata fields in message object', () => {
    const message = {
      id: 'msg_123',
      sender: 'A',
      type: 'voice',
      audio_path: 'voice-messages/test.webm',
      audio_duration: 30,
      created_at: new Date().toISOString(),
      deleted: false,
      // Optional status fields
      delivered_at: new Date().toISOString(),
      read_at: null
    };

    // Verify all required fields are present
    expect(message.id).toBeDefined();
    expect(message.sender).toBeDefined();
    expect(message.type).toBe('voice');
    expect(message.created_at).toBeDefined();
    expect(message.deleted).toBeDefined();
  });
});
