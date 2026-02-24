import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageComposer from './MessageComposer';
import { UploadProvider } from '../context/UploadContext';
import { VoiceRecordingProvider } from '../context/VoiceRecordingContext';

// Mock the API
vi.mock('../utils/api', () => ({
  messageAPI: {
    sendText: vi.fn(),
    updateTyping: vi.fn().mockResolvedValue({})
  },
  imageAPI: {
    upload: vi.fn()
  }
}));

// Mock the upload manager
vi.mock('../utils/uploadManager', () => ({
  uploadManager: {
    uploadImages: vi.fn(),
    cancelUpload: vi.fn()
  }
}));

// Mock the voice upload manager
vi.mock('../utils/voiceUploadManager', () => ({
  voiceUploadManager: {
    uploadVoiceMessage: vi.fn()
  }
}));

// Mock the audio services
vi.mock('../utils/audioRecorderService', () => ({
  default: class MockAudioRecorderService {
    async startRecording() {}
    async stopRecording() {
      return new Blob(['mock audio'], { type: 'audio/webm' });
    }
    cancelRecording() {}
    getRecordingDuration() {
      return 5;
    }
    cleanup() {}
  }
}));

vi.mock('../utils/audioCompressorService', () => ({
  default: class MockAudioCompressorService {
    async compressAudio(blob) {
      return blob;
    }
  }
}));

// Mock getUserMedia
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia
  },
  writable: true
});

describe('MessageComposer - Voice Message Integration', () => {
  const mockOnSendText = vi.fn();
  const mockOnSendImage = vi.fn();
  const conversationId = 'test-conversation';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [],
      getAudioTracks: () => []
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  const renderComponent = () => {
    return render(
      <UploadProvider>
        <VoiceRecordingProvider>
          <MessageComposer
            onSendText={mockOnSendText}
            onSendImage={mockOnSendImage}
            conversationId={conversationId}
          />
        </VoiceRecordingProvider>
      </UploadProvider>
    );
  };

  it('should render VoiceRecorder component', () => {
    renderComponent();
    
    // VoiceRecorder should have a record button
    const recordButton = screen.getByTitle('Record voice message');
    expect(recordButton).toBeInTheDocument();
  });

  it('should disable text input and send button while recording', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const recordButton = screen.getByTitle('Record voice message');
    const textInput = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    // Initially enabled
    expect(textInput).not.toBeDisabled();
    expect(sendButton).toBeDisabled(); // Disabled because text is empty
    
    // Start recording
    await user.click(recordButton);
    
    // Should be disabled during recording
    await waitFor(() => {
      expect(textInput).toBeDisabled();
    });
  });

  it('should show upload progress when uploading voice message', async () => {
    const { voiceUploadManager } = await import('../utils/voiceUploadManager');
    
    // Mock upload to simulate progress
    voiceUploadManager.uploadVoiceMessage.mockImplementation(
      (blob, fileName, convId, onProgress) => {
        // Simulate progress updates
        setTimeout(() => onProgress(50), 100);
        setTimeout(() => onProgress(100), 200);
        
        return Promise.resolve({
          success: true,
          messageId: 'msg-123',
          audioPath: 'path/to/audio.webm'
        });
      }
    );
    
    const user = userEvent.setup();
    renderComponent();
    
    const recordButton = screen.getByTitle('Record voice message');
    
    // Start recording
    await user.click(recordButton);
    
    // Wait for recording to start
    await waitFor(() => {
      expect(screen.getByTitle('Stop recording')).toBeInTheDocument();
    });
    
    // Stop recording
    const stopButton = screen.getByTitle('Stop recording');
    await user.click(stopButton);
    
    // Should show upload progress
    await waitFor(() => {
      expect(screen.getByText(/uploading voice message/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show success message after successful upload', async () => {
    const { voiceUploadManager } = await import('../utils/voiceUploadManager');
    
    voiceUploadManager.uploadVoiceMessage.mockResolvedValue({
      success: true,
      messageId: 'msg-123',
      audioPath: 'path/to/audio.webm'
    });
    
    const user = userEvent.setup();
    renderComponent();
    
    const recordButton = screen.getByTitle('Record voice message');
    
    // Start and stop recording
    await user.click(recordButton);
    await waitFor(() => {
      expect(screen.getByTitle('Stop recording')).toBeInTheDocument();
    });
    
    const stopButton = screen.getByTitle('Stop recording');
    await user.click(stopButton);
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/voice message sent successfully/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show error message with retry button on upload failure', async () => {
    const { voiceUploadManager } = await import('../utils/voiceUploadManager');
    
    voiceUploadManager.uploadVoiceMessage.mockResolvedValue({
      success: false,
      error: 'Network error'
    });
    
    const user = userEvent.setup();
    renderComponent();
    
    const recordButton = screen.getByTitle('Record voice message');
    
    // Start and stop recording
    await user.click(recordButton);
    await waitFor(() => {
      expect(screen.getByTitle('Stop recording')).toBeInTheDocument();
    });
    
    const stopButton = screen.getByTitle('Stop recording');
    await user.click(stopButton);
    
    // Should show error message with retry button
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const errorAlert = alerts.find(alert => alert.textContent.includes('Network error'));
      expect(errorAlert).toBeInTheDocument();
      expect(screen.getByTitle('Retry upload')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should retry upload when retry button is clicked', async () => {
    const { voiceUploadManager } = await import('../utils/voiceUploadManager');
    
    // First attempt fails, second succeeds
    voiceUploadManager.uploadVoiceMessage
      .mockResolvedValueOnce({
        success: false,
        error: 'Network error'
      })
      .mockResolvedValueOnce({
        success: true,
        messageId: 'msg-123',
        audioPath: 'path/to/audio.webm'
      });
    
    const user = userEvent.setup();
    renderComponent();
    
    const recordButton = screen.getByTitle('Record voice message');
    
    // Start and stop recording
    await user.click(recordButton);
    await waitFor(() => {
      expect(screen.getByTitle('Stop recording')).toBeInTheDocument();
    });
    
    const stopButton = screen.getByTitle('Stop recording');
    await user.click(stopButton);
    
    // Wait for error
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const errorAlert = alerts.find(alert => alert.textContent.includes('Network error'));
      expect(errorAlert).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Click retry
    const retryButton = screen.getByTitle('Retry upload');
    await user.click(retryButton);
    
    // Should show success after retry
    await waitFor(() => {
      expect(screen.getByText(/voice message sent successfully/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should disable image upload button while recording', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const recordButton = screen.getByTitle('Record voice message');
    const imageButton = screen.getByTitle('Upload images');
    
    // Initially enabled
    expect(imageButton).not.toBeDisabled();
    
    // Start recording
    await user.click(recordButton);
    
    // Should be disabled during recording
    await waitFor(() => {
      expect(imageButton).toBeDisabled();
    });
  });
});
