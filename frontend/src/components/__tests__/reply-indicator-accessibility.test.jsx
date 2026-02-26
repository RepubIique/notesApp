import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ReplyIndicator from '../ReplyIndicator';

describe('ReplyIndicator Accessibility', () => {
  const mockOriginalMessage = {
    id: 'test-123',
    sender: 'A',
    type: 'text',
    text: 'Original message text',
    deleted: false
  };

  it('should have a keyboard focusable close button', () => {
    const mockOnCancel = vi.fn();
    const { container } = render(
      <ReplyIndicator
        originalMessage={mockOriginalMessage}
        onCancel={mockOnCancel}
        currentUserRole="B"
      />
    );

    const closeButton = container.querySelector('button');
    expect(closeButton).toBeTruthy();
    
    // Native button elements are focusable by default (no need for explicit tabIndex)
    // They should not have tabIndex="-1" which would make them unfocusable
    const tabIndex = closeButton.getAttribute('tabIndex');
    expect(tabIndex).not.toBe('-1');
  });

  it('should have proper ARIA label on close button', () => {
    const mockOnCancel = vi.fn();
    const { container } = render(
      <ReplyIndicator
        originalMessage={mockOriginalMessage}
        onCancel={mockOnCancel}
        currentUserRole="B"
      />
    );

    const closeButton = container.querySelector('button');
    expect(closeButton).toHaveAttribute('aria-label', 'Cancel reply');
  });

  it('should call onCancel when close button is clicked', () => {
    const mockOnCancel = vi.fn();
    const { container } = render(
      <ReplyIndicator
        originalMessage={mockOriginalMessage}
        onCancel={mockOnCancel}
        currentUserRole="B"
      />
    );

    const closeButton = container.querySelector('button');
    fireEvent.click(closeButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should be keyboard accessible (native button behavior)', () => {
    const mockOnCancel = vi.fn();
    const { container } = render(
      <ReplyIndicator
        originalMessage={mockOriginalMessage}
        onCancel={mockOnCancel}
        currentUserRole="B"
      />
    );

    const closeButton = container.querySelector('button');
    
    // Native buttons are keyboard accessible by default
    // They can be focused and activated with Enter/Space keys
    // This is handled by the browser, not our code
    expect(closeButton.tagName).toBe('BUTTON');
  });

  it('should meet minimum touch target size (44x44px)', () => {
    const mockOnCancel = vi.fn();
    const { container } = render(
      <ReplyIndicator
        originalMessage={mockOriginalMessage}
        onCancel={mockOnCancel}
        currentUserRole="B"
      />
    );

    const closeButton = container.querySelector('button');
    const styles = window.getComputedStyle(closeButton);
    
    // Check that minWidth and minHeight are set to at least 44px
    // Note: In the actual component, these are set via inline styles
    expect(closeButton.style.minWidth).toBe('44px');
    expect(closeButton.style.minHeight).toBe('44px');
  });

  it('should have aria-describedby linking to content preview', () => {
    const mockOnCancel = vi.fn();
    const { container } = render(
      <ReplyIndicator
        originalMessage={mockOriginalMessage}
        onCancel={mockOnCancel}
        currentUserRole="B"
      />
    );

    const replyIndicator = container.firstChild;
    expect(replyIndicator).toHaveAttribute('aria-describedby');
    
    const describedById = replyIndicator.getAttribute('aria-describedby');
    const describedElement = container.querySelector(`#${describedById}`);
    expect(describedElement).toBeTruthy();
  });
});
