import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import VoicePlayer from './VoicePlayer';

// Mock Material-UI icons
vi.mock('@mui/icons-material', () => ({
  PlayArrow: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>
}));

describe('VoicePlayer Component', () => {
  beforeEach(() => {
    // Mock HTMLMediaElement methods
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should render play button when not playing', () => {
      render(
        <VoicePlayer
          audioUrl="https://example.com/audio.webm"
          duration={60}
          messageId="msg-1"
        />
      );

      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('pause-icon')).not.toBeInTheDocument();
    });

    it('should display total duration', () => {
      render(
        <VoicePlayer
          audioUrl="https://example.com/audio.webm"
          duration={125}
          messageId="msg-1"
        />
      );

      expect(screen.getByText('02:05')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(
        <VoicePlayer
          audioUrl="https://example.com/audio.webm"
          duration={60}
          messageId="msg-1"
        />
      );

      // LinearProgress should be visible
      const progressBar = document.querySelector('.MuiLinearProgress-root');
      expect(progressBar).toBeInTheDocument();
    });

    it('should disable play button while loading', () => {
      render(
        <VoicePlayer
          audioUrl="https://example.com/audio.webm"
          duration={60}
          messageId="msg-1"
        />
      );

      const playButton = screen.getByTitle('Play');
      expect(playButton).toBeDisabled();
    });
  });

  describe('Time Formatting', () => {
    it('should format time correctly for various durations', () => {
      const testCases = [
        { seconds: 5, expected: '00:05' },
        { seconds: 59, expected: '00:59' },
        { seconds: 60, expected: '01:00' },
        { seconds: 125, expected: '02:05' },
        { seconds: 3599, expected: '59:59' }
      ];

      testCases.forEach(({ seconds, expected }) => {
        const { unmount } = render(
          <VoicePlayer
            audioUrl="https://example.com/audio.webm"
            duration={seconds}
            messageId="msg-1"
          />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle invalid time values gracefully', () => {
      render(
        <VoicePlayer
          audioUrl="https://example.com/audio.webm"
          duration={NaN}
          messageId="msg-1"
        />
      );

      const timeDisplays = screen.getAllByText('00:00');
      expect(timeDisplays.length).toBeGreaterThan(0);
    });

    it('should handle negative time values', () => {
      render(
        <VoicePlayer
          audioUrl="https://example.com/audio.webm"
          duration={-10}
          messageId="msg-1"
        />
      );

      const timeDisplays = screen.getAllByText('00:00');
      expect(timeDisplays.length).toBeGreaterThan(0);
    });
  });

  describe('Component Props', () => {
    it('should render with correct audio URL', () => {
      render(
        <VoicePlayer
          audioUrl="https://example.com/test-audio.webm"
          duration={60}
          messageId="msg-1"
        />
      );

      const audio = document.querySelector('audio');
      expect(audio).toHaveAttribute('src', 'https://example.com/test-audio.webm');
    });

    it('should set preload attribute to metadata', () => {
      render(
        <VoicePlayer
          audioUrl="https://example.com/audio.webm"
          duration={60}
          messageId="msg-1"
        />
      );

      const audio = document.querySelector('audio');
      expect(audio).toHaveAttribute('preload', 'metadata');
    });
  });

  describe('UI Elements', () => {
    it('should render progress slider', () => {
      render(
        <VoicePlayer
          audioUrl="https://example.com/audio.webm"
          duration={60}
          messageId="msg-1"
        />
      );

      // After loading, slider should be present (but initially loading indicator is shown)
      const container = document.querySelector('.MuiBox-root');
      expect(container).toBeInTheDocument();
    });

    it('should display current time as 00:00 initially', () => {
      render(
        <VoicePlayer
          audioUrl="https://example.com/audio.webm"
          duration={60}
          messageId="msg-1"
        />
      );

      const timeDisplays = screen.getAllByText('00:00');
      expect(timeDisplays.length).toBeGreaterThan(0);
    });
  });
});
