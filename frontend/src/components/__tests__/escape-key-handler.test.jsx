import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Escape Key Handler for Reply Cancellation', () => {
  let handleCancelReply;
  let replyingTo;
  let cleanup;

  beforeEach(() => {
    // Simulate the reply state and handler
    replyingTo = { id: 'test-123', sender: 'A', type: 'text', text: 'Test message' };
    handleCancelReply = vi.fn();

    // Simulate the useEffect hook behavior
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && replyingTo) {
        handleCancelReply();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    cleanup = () => document.removeEventListener('keydown', handleKeyDown);
  });

  afterEach(() => {
    cleanup();
  });

  it('should call handleCancelReply when Escape key is pressed with active reply', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);

    expect(handleCancelReply).toHaveBeenCalledTimes(1);
  });

  it('should not call handleCancelReply when other keys are pressed', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(event);

    expect(handleCancelReply).not.toHaveBeenCalled();
  });

  it('should handle multiple Escape key presses', () => {
    const event1 = new KeyboardEvent('keydown', { key: 'Escape' });
    const event2 = new KeyboardEvent('keydown', { key: 'Escape' });
    
    document.dispatchEvent(event1);
    document.dispatchEvent(event2);

    expect(handleCancelReply).toHaveBeenCalledTimes(2);
  });
});

describe('Escape Key Handler - No Active Reply', () => {
  let handleCancelReply;
  let replyingTo;
  let cleanup;

  beforeEach(() => {
    // Simulate no active reply
    replyingTo = null;
    handleCancelReply = vi.fn();

    // Simulate the useEffect hook behavior
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && replyingTo) {
        handleCancelReply();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    cleanup = () => document.removeEventListener('keydown', handleKeyDown);
  });

  afterEach(() => {
    cleanup();
  });

  it('should not call handleCancelReply when Escape is pressed without active reply', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);

    expect(handleCancelReply).not.toHaveBeenCalled();
  });
});
