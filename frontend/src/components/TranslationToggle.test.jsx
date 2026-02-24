import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TranslationToggle from './TranslationToggle';

describe('TranslationToggle', () => {
  const defaultProps = {
    showOriginal: true,
    onToggle: vi.fn(),
    sourceLanguage: 'en',
    targetLanguage: 'zh-CN'
  };

  describe('Rendering', () => {
    it('should render toggle chip', () => {
      render(<TranslationToggle {...defaultProps} />);
      
      const chip = screen.getByRole('button');
      expect(chip).toBeInTheDocument();
    });

    it('should display "Original" label when showing original', () => {
      render(<TranslationToggle {...defaultProps} showOriginal={true} />);
      
      expect(screen.getByText(/Original \(EN\)/i)).toBeInTheDocument();
    });

    it('should display "Translated" label when showing translation', () => {
      render(<TranslationToggle {...defaultProps} showOriginal={false} />);
      
      expect(screen.getByText(/Translated \(中文\)/i)).toBeInTheDocument();
    });

    it('should display translate icon', () => {
      render(<TranslationToggle {...defaultProps} />);
      
      const chip = screen.getByRole('button');
      const svg = chip.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Language Labels', () => {
    it('should display English label correctly', () => {
      render(<TranslationToggle {...defaultProps} sourceLanguage="en" showOriginal={true} />);
      
      expect(screen.getByText(/Original \(EN\)/i)).toBeInTheDocument();
    });

    it('should display Chinese Simplified label correctly', () => {
      render(<TranslationToggle {...defaultProps} targetLanguage="zh-CN" showOriginal={false} />);
      
      expect(screen.getByText(/Translated \(中文\)/i)).toBeInTheDocument();
    });

    it('should display Chinese Traditional label correctly', () => {
      render(<TranslationToggle {...defaultProps} targetLanguage="zh-TW" showOriginal={false} />);
      
      expect(screen.getByText(/Translated \(繁體\)/i)).toBeInTheDocument();
    });

    it('should handle unknown language codes gracefully', () => {
      render(<TranslationToggle {...defaultProps} sourceLanguage="fr" showOriginal={true} />);
      
      expect(screen.getByText(/Original \(FR\)/i)).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('should use outlined variant when showing original', () => {
      const { container } = render(<TranslationToggle {...defaultProps} showOriginal={true} />);
      
      const chip = container.querySelector('.MuiChip-outlined');
      expect(chip).toBeInTheDocument();
    });

    it('should use filled variant when showing translation', () => {
      const { container } = render(<TranslationToggle {...defaultProps} showOriginal={false} />);
      
      const chip = container.querySelector('.MuiChip-filled');
      expect(chip).toBeInTheDocument();
    });

    it('should use default color when showing original', () => {
      const { container } = render(<TranslationToggle {...defaultProps} showOriginal={true} />);
      
      const chip = container.querySelector('.MuiChip-colorDefault');
      expect(chip).toBeInTheDocument();
    });

    it('should use primary color when showing translation', () => {
      const { container } = render(<TranslationToggle {...defaultProps} showOriginal={false} />);
      
      const chip = container.querySelector('.MuiChip-colorPrimary');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onToggle when clicked', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<TranslationToggle {...defaultProps} onToggle={onToggle} />);
      
      const chip = screen.getByRole('button');
      await user.click(chip);
      
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should be keyboard accessible with Enter key', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<TranslationToggle {...defaultProps} onToggle={onToggle} />);
      
      const chip = screen.getByRole('button');
      chip.focus();
      
      expect(chip).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(onToggle).toHaveBeenCalled();
    });

    it('should be keyboard accessible with Space key', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<TranslationToggle {...defaultProps} onToggle={onToggle} />);
      
      const chip = screen.getByRole('button');
      chip.focus();
      
      await user.keyboard(' ');
      expect(onToggle).toHaveBeenCalled();
    });

    it('should handle rapid clicking', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<TranslationToggle {...defaultProps} onToggle={onToggle} />);
      
      const chip = screen.getByRole('button');
      
      // Click multiple times rapidly
      await user.click(chip);
      await user.click(chip);
      await user.click(chip);
      
      expect(onToggle).toHaveBeenCalledTimes(3);
    });
  });

  describe('Mobile-Friendly Design', () => {
    it('should have cursor pointer style', () => {
      render(<TranslationToggle {...defaultProps} />);
      
      const chip = screen.getByRole('button');
      const styles = window.getComputedStyle(chip);
      
      expect(styles.cursor).toBe('pointer');
    });

    it('should be small size for mobile', () => {
      const { container } = render(<TranslationToggle {...defaultProps} />);
      
      const chip = container.querySelector('.MuiChip-sizeSmall');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label when showing original', () => {
      render(<TranslationToggle {...defaultProps} showOriginal={true} />);
      
      const chip = screen.getByRole('button');
      expect(chip).toHaveAttribute('aria-label', 'Toggle to translated text');
    });

    it('should have proper aria-label when showing translation', () => {
      render(<TranslationToggle {...defaultProps} showOriginal={false} />);
      
      const chip = screen.getByRole('button');
      expect(chip).toHaveAttribute('aria-label', 'Toggle to original text');
    });

    it('should have role="button"', () => {
      render(<TranslationToggle {...defaultProps} />);
      
      const chip = screen.getByRole('button');
      expect(chip).toHaveAttribute('role', 'button');
    });

    it('should have tabIndex for keyboard navigation', () => {
      render(<TranslationToggle {...defaultProps} />);
      
      const chip = screen.getByRole('button');
      expect(chip).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Language Pair Combinations', () => {
    it('should handle English to Chinese Simplified', () => {
      render(
        <TranslationToggle 
          showOriginal={false}
          onToggle={vi.fn()}
          sourceLanguage="en"
          targetLanguage="zh-CN"
        />
      );
      
      expect(screen.getByText(/Translated \(中文\)/i)).toBeInTheDocument();
    });

    it('should handle English to Chinese Traditional', () => {
      render(
        <TranslationToggle 
          showOriginal={false}
          onToggle={vi.fn()}
          sourceLanguage="en"
          targetLanguage="zh-TW"
        />
      );
      
      expect(screen.getByText(/Translated \(繁體\)/i)).toBeInTheDocument();
    });

    it('should handle Chinese Simplified to English', () => {
      render(
        <TranslationToggle 
          showOriginal={false}
          onToggle={vi.fn()}
          sourceLanguage="zh-CN"
          targetLanguage="en"
        />
      );
      
      expect(screen.getByText(/Translated \(EN\)/i)).toBeInTheDocument();
    });

    it('should handle Chinese Traditional to English', () => {
      render(
        <TranslationToggle 
          showOriginal={false}
          onToggle={vi.fn()}
          sourceLanguage="zh-TW"
          targetLanguage="en"
        />
      );
      
      expect(screen.getByText(/Translated \(EN\)/i)).toBeInTheDocument();
    });
  });

  describe('Toggle State Changes', () => {
    it('should update label when showOriginal changes', () => {
      const { rerender } = render(<TranslationToggle {...defaultProps} showOriginal={true} />);
      
      expect(screen.getByText(/Original \(EN\)/i)).toBeInTheDocument();
      
      rerender(<TranslationToggle {...defaultProps} showOriginal={false} />);
      
      expect(screen.getByText(/Translated \(中文\)/i)).toBeInTheDocument();
    });

    it('should update visual style when showOriginal changes', () => {
      const { container, rerender } = render(<TranslationToggle {...defaultProps} showOriginal={true} />);
      
      let chip = container.querySelector('.MuiChip-outlined');
      expect(chip).toBeInTheDocument();
      
      rerender(<TranslationToggle {...defaultProps} showOriginal={false} />);
      
      chip = container.querySelector('.MuiChip-filled');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing language codes', () => {
      render(
        <TranslationToggle 
          showOriginal={true}
          onToggle={vi.fn()}
          sourceLanguage=""
          targetLanguage=""
        />
      );
      
      const chip = screen.getByRole('button');
      expect(chip).toBeInTheDocument();
    });

    it('should handle null onToggle gracefully', () => {
      // Should not crash even if onToggle is null
      expect(() => {
        render(<TranslationToggle {...defaultProps} onToggle={null} />);
      }).not.toThrow();
    });

    it('should handle undefined language codes', () => {
      render(
        <TranslationToggle 
          showOriginal={true}
          onToggle={vi.fn()}
          sourceLanguage={undefined}
          targetLanguage={undefined}
        />
      );
      
      const chip = screen.getByRole('button');
      expect(chip).toBeInTheDocument();
    });
  });
});
