/**
 * Format a timestamp into a human-readable "last seen" string
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted string like "last seen 2 minutes ago"
 */
export const formatLastSeen = (timestamp) => {
  if (!timestamp) return 'offline';

  const now = new Date();
  const lastSeen = new Date(timestamp);
  const diffMs = now - lastSeen;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // If last seen within 30 seconds, show as "online"
  if (diffSeconds < 30) {
    return 'online';
  }

  // Less than 1 minute
  if (diffSeconds < 60) {
    return 'last seen just now';
  }

  // Less than 1 hour
  if (diffMinutes < 60) {
    return `last seen ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  // Less than 24 hours
  if (diffHours < 24) {
    return `last seen ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Less than 7 days
  if (diffDays < 7) {
    return `last seen ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }

  // More than 7 days - show date
  // Use user's locale for date formatting (e.g., 'en-AU' for Perth)
  const options = { month: 'short', day: 'numeric' };
  if (lastSeen.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return `last seen ${lastSeen.toLocaleDateString(undefined, options)}`;
};
