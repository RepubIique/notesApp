import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useIdleTimer from './useIdleTimer';

describe('useIdleTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should call onIdle callback after timeout period', () => {
    const onIdle = vi.fn();
    const timeout = 90000; // 90 seconds

    renderHook(() => useIdleTimer(onIdle, timeout));

    // Fast-forward time by 90 seconds
    act(() => {
      vi.advanceTimersByTime(timeout);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on mousemove event', () => {
    const onIdle = vi.fn();
    const timeout = 90000;

    renderHook(() => useIdleTimer(onIdle, timeout));

    // Fast-forward time by 80 seconds
    act(() => {
      vi.advanceTimersByTime(80000);
    });

    // Trigger mousemove event
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });

    // Fast-forward time by another 80 seconds (total 160s, but timer was reset)
    act(() => {
      vi.advanceTimersByTime(80000);
    });

    // Should not have been called yet since timer was reset
    expect(onIdle).not.toHaveBeenCalled();

    // Fast-forward remaining 10 seconds to complete the 90s timeout
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on keydown event', () => {
    const onIdle = vi.fn();
    const timeout = 90000;

    renderHook(() => useIdleTimer(onIdle, timeout));

    // Fast-forward time by 80 seconds
    act(() => {
      vi.advanceTimersByTime(80000);
    });

    // Trigger keydown event
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown'));
    });

    // Fast-forward time by another 80 seconds
    act(() => {
      vi.advanceTimersByTime(80000);
    });

    // Should not have been called yet
    expect(onIdle).not.toHaveBeenCalled();

    // Complete the timeout
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on touchstart event', () => {
    const onIdle = vi.fn();
    const timeout = 90000;

    renderHook(() => useIdleTimer(onIdle, timeout));

    // Fast-forward time by 80 seconds
    act(() => {
      vi.advanceTimersByTime(80000);
    });

    // Trigger touchstart event
    act(() => {
      window.dispatchEvent(new Event('touchstart'));
    });

    // Fast-forward time by another 80 seconds
    act(() => {
      vi.advanceTimersByTime(80000);
    });

    // Should not have been called yet
    expect(onIdle).not.toHaveBeenCalled();

    // Complete the timeout
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('should use default timeout of 90 seconds when not specified', () => {
    const onIdle = vi.fn();

    renderHook(() => useIdleTimer(onIdle));

    // Fast-forward by default timeout (90 seconds)
    act(() => {
      vi.advanceTimersByTime(90000);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('should cleanup event listeners on unmount', () => {
    const onIdle = vi.fn();
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useIdleTimer(onIdle, 90000));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
  });

  it('should clear timeout on unmount', () => {
    const onIdle = vi.fn();

    const { unmount } = renderHook(() => useIdleTimer(onIdle, 90000));

    // Fast-forward time by 80 seconds
    act(() => {
      vi.advanceTimersByTime(80000);
    });

    // Unmount before timeout completes
    unmount();

    // Fast-forward remaining time
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Should not have been called since component was unmounted
    expect(onIdle).not.toHaveBeenCalled();
  });
});
