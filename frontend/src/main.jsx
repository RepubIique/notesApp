import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { UploadProvider } from './context/UploadContext';
import { VoiceRecordingProvider } from './context/VoiceRecordingContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <UploadProvider>
        <VoiceRecordingProvider>
          <App />
        </VoiceRecordingProvider>
      </UploadProvider>
    </AuthProvider>
  </React.StrictMode>
);
