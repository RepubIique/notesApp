import { Box, Skeleton } from '@mui/material';

/**
 * VoiceMessageSkeleton component
 * Loading skeleton for voice messages
 * 
 * Requirements: 8.4 (Processing shows loading state)
 * 
 * @param {Object} props
 * @param {boolean} [props.isOwn=false] - Whether this is own message (affects alignment)
 */
function VoiceMessageSkeleton({ isOwn = false }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignSelf: isOwn ? 'flex-end' : 'flex-start',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: '0.75rem',
        maxWidth: '100%'
      }}
    >
      {/* Sender name skeleton (for other messages) */}
      {!isOwn && (
        <Skeleton
          variant="text"
          width={80}
          height={16}
          sx={{ marginBottom: '0.25rem' }}
        />
      )}

      {/* Message content skeleton */}
      <Box
        sx={{
          padding: '0.5rem 0.75rem',
          borderRadius: '12px',
          backgroundColor: isOwn ? 'rgba(0, 123, 255, 0.1)' : 'rgba(0, 0, 0, 0.02)',
          minWidth: '250px',
          maxWidth: '400px',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        {/* Play button skeleton */}
        <Skeleton
          variant="circular"
          width={32}
          height={32}
          animation="wave"
        />

        {/* Progress bar and time skeleton */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Skeleton
            variant="rectangular"
            height={4}
            sx={{ borderRadius: 1 }}
            animation="wave"
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton variant="text" width={40} height={12} />
            <Skeleton variant="text" width={40} height={12} />
          </Box>
        </Box>
      </Box>

      {/* Timestamp skeleton */}
      <Skeleton
        variant="text"
        width={60}
        height={12}
        sx={{ marginTop: '0.25rem' }}
      />
    </Box>
  );
}

export default VoiceMessageSkeleton;
