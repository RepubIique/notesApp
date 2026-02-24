import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ChatPage from './ChatPage';
import { AuthProvider } from '../context/AuthContext';
import { UploadProvider } from '../context/UploadContext';
import { VoiceRecordingProvider } from '../context/VoiceRecordingContext';
import * as api from '../utils/api';

// Mock the API modules
vi.mock('../utils/api', () => ({
  authAPI: {
    me: vi.fn(),
    logout: vi.fn()
  },
  messageAPI: {
    getMessages: vi.fn(),
    sendText: vi.fn(),
    unsend: vi.fn(),
    addReaction: vi.fn(),
    getActivity: vi.fn(),
    markAsRead: vi.fn(),
    updateTyping: vi.fn()
  },
  imageAPI: {
    upload: vi.fn(),
    getUrl: vi.fn()
  },
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

// Mock the useIdleTimer hook
vi.mock('../hooks/useIdleTimer', () => ({
  default: vi.fn()
}));

describe('ChatPage - Translation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful auth check
    api.authAPI.me.mockResolvedValue({ role: 'A' });
    // Mock successful activity fetch
    api.messageAPI.getActivity.mockResolvedValue({ activity: null });
  });

  const renderChatPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <UploadProvider>
            <VoiceRecordingProvider>
              <ChatPage />
            </VoiceRecordingProvider>
          </UploadProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('should render messages with translation data', async () => {
    // Mock messages with translation data
    const mockMessages = [
      {
        id: '1',
        sender: 'B',
        type: 'text',
        text: 'Hello',
        created_at: new Date().toISOString(),
        deleted: false,
        translations: [
          {
            id: 't1',
            message_id: '1',
            source_language: 'en',
            target_language: 'zh-CN',
            translated_text: '你好',
            created_at: new Date().toISOString()
          }
        ],
        translation_preference: {
          show_original: true,
          target_language: 'zh-CN'
        },
        reactions: []
      }
    ];

    api.messageAPI.getMessages.mockResolvedValue({ messages: mockMessages });

    renderChatPage();

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    // Verify the message is rendered
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should pass translation props to MessageItem', async () => {
    // Mock messages with translation data
    const mockMessages = [
      {
        id: '2',
        sender: 'A',
        type: 'text',
        text: '你好',
        created_at: new Date().toISOString(),
        deleted: false,
        translations: [
          {
            id: 't2',
            message_id: '2',
            source_language: 'zh-CN',
            target_language: 'en',
            translated_text: 'Hello',
            created_at: new Date().toISOString()
          }
        ],
        translation_preference: {
          show_original: false,
          target_language: 'en'
        },
        reactions: []
      }
    ];

    api.messageAPI.getMessages.mockResolvedValue({ messages: mockMessages });

    renderChatPage();

    // Wait for messages to load
    await waitFor(() => {
      // Since show_original is false, should show translated text
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });

  it('should handle messages without translations', async () => {
    // Mock messages without translation data
    const mockMessages = [
      {
        id: '3',
        sender: 'B',
        type: 'text',
        text: 'Test message',
        created_at: new Date().toISOString(),
        deleted: false,
        translations: [],
        reactions: []
      }
    ];

    api.messageAPI.getMessages.mockResolvedValue({ messages: mockMessages });

    renderChatPage();

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Verify the message is rendered
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });
});
