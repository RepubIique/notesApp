/**
 * Haptic Feedback Utility
 * Provides haptic feedback for mobile devices
 * Uses Vibration API with fallback for unsupported devices
 */

/**
 * Check if haptic feedback is supported
 * @returns {boolean}
 */
export const isHapticsSupported = () => {
  return 'vibrate' in navigator;
};

/**
 * Trigger light haptic feedback
 * Used for: button taps, UI interactions
 */
export const lightHaptic = () => {
  if (isHapticsSupported()) {
    navigator.vibrate(10);
  }
};

/**
 * Trigger medium haptic feedback
 * Used for: recording start/stop, important actions
 */
export const mediumHaptic = () => {
  if (isHapticsSupported()) {
    navigator.vibrate(20);
  }
};

/**
 * Trigger heavy haptic feedback
 * Used for: errors, warnings, critical actions
 */
export const heavyHaptic = () => {
  if (isHapticsSupported()) {
    navigator.vibrate(30);
  }
};

/**
 * Trigger success haptic feedback
 * Pattern: short-pause-short
 */
export const successHaptic = () => {
  if (isHapticsSupported()) {
    navigator.vibrate([10, 50, 10]);
  }
};

/**
 * Trigger error haptic feedback
 * Pattern: long-pause-long
 */
export const errorHaptic = () => {
  if (isHapticsSupported()) {
    navigator.vibrate([30, 50, 30]);
  }
};

/**
 * Trigger selection haptic feedback
 * Used for: selecting items, toggling options
 */
export const selectionHaptic = () => {
  if (isHapticsSupported()) {
    navigator.vibrate(5);
  }
};

/**
 * Cancel any ongoing vibration
 */
export const cancelHaptic = () => {
  if (isHapticsSupported()) {
    navigator.vibrate(0);
  }
};

export default {
  isHapticsSupported,
  lightHaptic,
  mediumHaptic,
  heavyHaptic,
  successHaptic,
  errorHaptic,
  selectionHaptic,
  cancelHaptic
};
