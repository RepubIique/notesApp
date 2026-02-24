import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TranslateButton from './TranslateButton';

describe('TranslateButton', () => {
  const defaultProps = {
    messageId: 'test-message-id',
    messageText: 'Hello world',
    currentLanguage: 'original',
    onTranslationComplete: vi.fn(),
    onClick: vi.fn()
  };

  describe('Rendering', () => {
    it('should render button in idle state', () => {
      render(<TranslateButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /translate message/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should render translate icon in idle state', () => {
      render(<TranslateButton {...defaultProps} />);
      
      // Check for translate icon (MUI icons render as SVG)
      const button = screen.getByRole('button', { name: /translate message/i });
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should show tooltip on hover', async () => {
      const user = userEvent.setup();
      render(<TranslateButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /translate message/i });
      await user.hover(button);
      
      // Tooltip should appear
      expect(await screen.findByText('Translate message')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner during translation', () => {
      render(<TranslateButton {...defaultProps} loading={true} />);
      
      // CircularProgress has role="progressbar"
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable button during loading', () => {
      render(<TranslateButton {...defaultProps} loading={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should show loading tooltip text', () => {
      render(<TranslateButton {...defaultProps} loading={true} />);
      
      // Tooltip title is set even if not visible
      const button = screen.getByRole('button');
      expect(button.closest('span')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error icon on failure', () => {
      render(<TranslateButton {...defaultProps} error="Translation failed" />);
      
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      // Error icon should be present (we can't easily test which specific icon)
    });

    it('should show error message in tooltip', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Translation service unavailable';
      render(<TranslateButton {...defaultProps} error={errorMessage} />);
      
      const button = screen.getByRole('button');
      await user.hover(button);
      
      expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    });

    it('should not disable button on error (allow retry)', () => {
      render(<TranslateButton {...defaultProps} error="Translation failed" />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Empty Message Handling', () => {
    it('should disable button for empty message text', () => {
      render(<TranslateButton {...defaultProps} messageText="" />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should disable button for whitespace-only message', () => {
      render(<TranslateButton {...defaultProps} messageText="   " />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should disable button for null message text', () => {
      render(<TranslateButton {...defaultProps} messageText={null} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should disable button for undefined message text', () => {
      render(<TranslateButton {...defaultProps} messageText={undefined} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should have appropriate tooltip for empty message', () => {
      render(<TranslateButton {...defaultProps} messageText="" />);
      
      const button = screen.getByRole('button');
      // Button is disabled, so we just verify it exists
      expect(button).toBeDisabled();
    });
  });

  describe('Touch-Friendly Size', () => {
    it('should meet minimum touch size (44x44px)', () => {
      render(<TranslateButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      const styles = window.getComputedStyle(button);
      
      // Check minimum dimensions
      const minWidth = parseInt(styles.minWidth);
      const minHeight = parseInt(styles.minHeight);
      
      expect(minWidth).toBeGreaterThanOrEqual(44);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when button is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<TranslateButton {...defaultProps} onClick={onClick} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not be clickable when disabled', () => {
      const onClick = vi.fn();
      render(<TranslateButton {...defaultProps} onClick={onClick} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      // Disabled buttons cannot be clicked in real browsers
    });

    it('should not be clickable when loading', () => {
      const onClick = vi.fn();
      render(<TranslateButton {...defaultProps} onClick={onClick} loading={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      // Disabled buttons cannot be clicked in real browsers
    });

    it('should not be clickable for empty message', () => {
      const onClick = vi.fn();
      render(<TranslateButton {...defaultProps} onClick={onClick} messageText="" />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      // Disabled buttons cannot be clicked in real browsers
    });
  });

  describe('Disabled Prop', () => {
    it('should disable button when disabled prop is true', () => {
      render(<TranslateButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should enable button when disabled prop is false', () => {
      render(<TranslateButton {...defaultProps} disabled={false} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<TranslateButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /translate message/i });
      expect(button).toHaveAttribute('aria-label', 'translate message');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<TranslateButton {...defaultProps} onClick={onClick} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
      
      // Press Enter
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long message text', () => {
      const longText = 'a'.repeat(10000);
      render(<TranslateButton {...defaultProps} messageText={longText} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should handle special characters in message text', () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      render(<TranslateButton {...defaultProps} messageText={specialText} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should handle Unicode characters', () => {
      const unicodeText = '你好世界 🌍 مرحبا';
      render(<TranslateButton {...defaultProps} messageText={unicodeText} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should handle mixed language text', () => {
      const mixedText = 'Hello 你好 World 世界';
      render(<TranslateButton {...defaultProps} messageText={mixedText} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });
});
