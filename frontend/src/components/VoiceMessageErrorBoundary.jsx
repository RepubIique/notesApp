import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

/**
 * Error Boundary for Voice Message Components
 * Catches and handles errors in voice message recording, playback, and upload
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
class VoiceMessageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });
  }

  /**
   * Log error to monitoring service
   * In production, this would send to a service like Sentry, LogRocket, etc.
   * 
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - React error info with component stack
   */
  logErrorToService(error, errorInfo) {
    // Log to console in development
    console.error('Voice Message Error Boundary caught an error:', error, errorInfo);
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service
      // Sentry.captureException(error, { contexts: { react: errorInfo } });
      
      // For now, just log structured error data
      const errorData = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      console.error('Error logged:', JSON.stringify(errorData, null, 2));
    }
  }

  /**
   * Reset error boundary state and retry
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Call optional onReset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(244, 67, 54, 0.05)',
            border: '1px solid rgba(244, 67, 54, 0.2)'
          }}
        >
          <Alert 
            severity="error"
            sx={{ mb: 2 }}
          >
            <Typography variant="body2" gutterBottom>
              {this.props.errorMessage || 'Something went wrong with the voice message'}
            </Typography>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {this.state.error.toString()}
              </Typography>
            )}
          </Alert>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={this.handleReset}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default VoiceMessageErrorBoundary;
