import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ReplyPreview from '../ReplyPreview';

describe('Keyboard Navigation - ReplyPreview', () => {
  const mockOriginalMessage = {
    id: 'test-123',
    sender: 'A',
    type: 'text',
    text: 'Original message text',
    deleted: false
  };

  it('should navigate on Enter key press', () => {
    const mockOnClick = vi.fn();
    const { container } = render(
      <ReplyPreview
        originalMessage={mockOriginalMessage}
        onClick={mockOnClick}
        currentUserRole="B"
      />
    );

    const replyPreview = container.querySelector('[role="button"]');
    fireEvent.keyDown(replyPreview, { key: 'Enter' });

    expect(mockOnClick).toHaveBeenCalledWith('test-123');
  });

  it('should navigate on Space key press', () => {
    const mockOnClick = vi.fn();
    const { container } = render(
      <ReplyPreview
        originalMessage={mockOriginalMessage}
        onClick={mockOnClick}
        currentUserRole="B"
      />
    );

    const replyPreview = container.querySelector('[role="button"]');
    fireEvent.keyDown(replyPreview, { key: ' ' });

    expect(mockOnClick).toHaveBeenCalledWith('test-123');
  });

  it('should be keyboard focusable with tabIndex', () => {
    const { container } = render(
      <ReplyPreview
        originalMessage={mockOriginalMessage}
        onClick={vi.fn()}
        currentUserRole="B"
      />
    );

    const replyPreview = container.querySelector('[role="button"]');
    expect(replyPreview).toHaveAttribute('tabIndex', '0');
  });

  it('should have proper ARIA label for accessibility', () => {
    const { container } = render(
      <ReplyPreview
        originalMessage={mockOriginalMessage}
        onClick={vi.fn()}
        currentUserRole="B"
      />
    );

    const replyPreview = container.querySelector('[role="button"]');
    expect(replyPreview).toHaveAttribute('aria-label');
    expect(replyPreview.getAttribute('aria-label')).toContain('Reply to');
  });
});
