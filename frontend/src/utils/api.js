import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API functions
export const authAPI = {
  /**
   * Login with password
   * @param {string} password - The password to authenticate with
   * @returns {Promise<{role: 'A' | 'B', token: string}>} The authenticated user's role and token
   */
  login: async (password) => {
    const response = await apiClient.post('/api/auth/login', { password });
    // Store token in localStorage for cross-origin requests
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  },

  /**
   * Logout the current user
   * @returns {Promise<{success: boolean}>} Success status
   */
  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    // Clear token from localStorage
    localStorage.removeItem('auth_token');
    return response.data;
  },

  /**
   * Get current user session info
   * @returns {Promise<{role: 'A' | 'B'}>} The current user's role
   */
  me: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  }
};

export default apiClient;

// Message API functions
export const messageAPI = {
  /**
   * Get messages with optional pagination
   * @param {number} [limit=50] - Maximum number of messages to retrieve
   * @param {string} [before] - ISO timestamp to get messages before
   * @returns {Promise<{messages: Array}>} Array of messages
   */
  getMessages: async (limit = 50, before = null) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) {
      params.append('before', before);
    }
    const response = await apiClient.get(`/api/messages?${params.toString()}`);
    return response.data;
  },

  /**
   * Send a text message
   * @param {string} text - The message text
   * @param {string|null} reply_to_id - Optional ID of the message being replied to
   * @returns {Promise<{message: Object}>} The created message
   */
  sendText: async (text, reply_to_id = null) => {
    const response = await apiClient.post('/api/messages', { text, reply_to_id });
    return response.data;
  },

  /**
   * Unsend a message
   * @param {string} messageId - The ID of the message to unsend
   * @returns {Promise<{success: boolean}>} Success status
   */
  unsend: async (messageId) => {
    const response = await apiClient.delete(`/api/messages/${messageId}`);
    return response.data;
  },

  /**
   * Add or remove a reaction to a message
   * @param {string} messageId - The ID of the message
   * @param {string} emoji - The emoji to react with
   * @returns {Promise<{reaction: Object | null}>} The reaction or null if toggled off
   */
  addReaction: async (messageId, emoji) => {
    const response = await apiClient.post(`/api/messages/${messageId}/reactions`, { emoji });
    return response.data;
  },

  /**
   * Mark messages as read
   * @param {string[]} messageIds - Array of message IDs to mark as read
   * @returns {Promise<{success: boolean}>} Success status
   */
  markAsRead: async (messageIds) => {
    const response = await apiClient.post('/api/messages/read', { messageIds });
    return response.data;
  },

  /**
   * Update typing status
   * @param {boolean} isTyping - Whether the user is currently typing
   * @returns {Promise<{success: boolean}>} Success status
   */
  updateTyping: async (isTyping) => {
    const response = await apiClient.post('/api/messages/typing', { isTyping });
    return response.data;
  },

  /**
   * Get other user's activity status
   * @returns {Promise<{activity: Object}>} Activity status including last_seen and is_typing
   */
  getActivity: async () => {
    const response = await apiClient.get('/api/messages/activity');
    return response.data;
  }
};

// Image API functions
export const imageAPI = {
  /**
   * Upload an image
   * @param {File} imageFile - The image file to upload
   * @returns {Promise<{message: Object}>} The created image message
   */
  upload: async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await apiClient.post('/api/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Get signed URL for an image
   * @param {string} messageId - The ID of the image message
   * @returns {Promise<{url: string}>} The signed URL
   */
  getUrl: async (messageId) => {
    const response = await apiClient.get(`/api/images/${messageId}`);
    return response.data;
  }
};

// Voice Message API functions
export const voiceMessageAPI = {
  /**
   * Delete a voice message
   * @param {string} messageId - The ID of the voice message to delete
   * @returns {Promise<{success: boolean, message: string}>} Success status
   */
  deleteVoiceMessage: async (messageId) => {
    const response = await apiClient.delete(`/api/voice-messages/${messageId}`);
    return response.data;
  },

  /**
   * Get signed URL for a voice message
   * @param {string} messageId - The ID of the voice message
   * @returns {Promise<{url: string, duration: number}>} The signed URL and duration
   */
  getUrl: async (messageId) => {
    const response = await apiClient.get(`/api/voice-messages/${messageId}`);
    return response.data;
  }
};
