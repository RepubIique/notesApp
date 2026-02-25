import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import axios from 'axios';

// Get API URL from environment or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * NotificationIndicator component
 * Shows two separate indicators for Identity A and Identity B
 * Left indicator (A) and Right indicator (B)
 */
function NotificationIndicator() {
  const [hasUnreadA, setHasUnreadA] = useState(false);
  const [hasUnreadB, setHasUnreadB] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkUnreadStatus = async () => {
      try {
        // Check for both identities in parallel
        const [responseA, responseB] = await Promise.all([
          axios.get(`${API_URL}/api/notifications/unread-status/A`),
          axios.get(`${API_URL}/api/notifications/unread-status/B`)
        ]);

        if (mounted) {
          setHasUnreadA(responseA.data.hasUnread);
          setHasUnreadB(responseB.data.hasUnread);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[NotificationIndicator] Failed to check unread status:', err);
        if (mounted) {
          setHasUnreadA(false);
          setHasUnreadB(false);
          setIsLoading(false);
        }
      }
    };

    // Initial check
    checkUnreadStatus();

    // Poll every 30 seconds
    const interval = setInterval(checkUnreadStatus, 30000);

    // Cleanup on unmount
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Don't render if loading
  if (isLoading) {
    return null;
  }

  return (
    <>
      {/* Indicator for Identity A - Left side */}
      {hasUnreadA && (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'error.main',
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      )}

      {/* Indicator for Identity B - Right side */}
      {hasUnreadB && (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'error.main',
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      )}
    </>
  );
}

export default NotificationIndicator;
