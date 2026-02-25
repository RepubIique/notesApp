import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  }
}));

// Mock the useIdleTimer hook
vi.mock('../hooks/useIdleTimer', () => ({
  default: vi.fn()
}));

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful auth check
    api.authAPI.me.mockResolvedValue({ role: 'A' });
    // Mock successful message fetch
    api.messageAPI.getMessages.mockResolvedValue({ messages: [] });
    // Mock successful activity fetch
    api.messageAPI.getActivity.mockResolvedValue({ activity: null });
  });

  afterEach(() => {
    vi.clearAllTimers();
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

  it('should render ChatPage with header', async () => {
    renderChatPage();
    
    await waitFor(() => {
      expect(screen.getByText('FitTrack')).toBeInTheDocument();
    });
  });

  it('should fetch messages on mount', async () => {
    renderChatPage();
    
    await waitFor(() => {
      expect(api.messageAPI.getMessages).toHaveBeenCalledWith(50);
    });
  });

  it('should poll messages every 2 seconds', async () => {
    vi.useFakeTimers();
    renderChatPage();

    // Wait for initial render
    await vi.waitFor(() => {
      expect(api.messageAPI.getMessages).toHaveBeenCalled();
    }, { timeout: 1000 });

    const initialCallCount = api.messageAPI.getMessages.mock.calls.length;

    // Advance time by 2 seconds
    await vi.advanceTimersByTimeAsync(2000);
    expect(api.messageAPI.getMessages).toHaveBeenCalledTimes(initialCallCount + 1);

    // Advance time by another 2 seconds
    await vi.advanceTimersByTimeAsync(2000);
    expect(api.messageAPI.getMessages).toHaveBeenCalledTimes(initialCallCount + 2);

    vi.useRealTimers();
  });

  it('should render MessageList and MessageComposer components', async () => {
    renderChatPage();
    
    // MessageComposer should have text input
    const textInput = await screen.findByPlaceholderText('Type a message...', {}, { timeout: 1000 });
    expect(textInput).toBeInTheDocument();
    
    // MessageComposer should have send button
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('should display current user role', async () => {
    renderChatPage();
    
    const roleText = await screen.findByText(/黄/i, {}, { timeout: 1000 });
    expect(roleText).toBeInTheDocument();
  });

  it('should have logout button', async () => {
    renderChatPage();
    
    const logoutButton = await screen.findByText('Logout', {}, { timeout: 1000 });
    expect(logoutButton).toBeInTheDocument();
  });
});
