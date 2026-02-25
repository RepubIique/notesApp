import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { uploadVoiceMessage, createVoiceMessage, getVoiceMessageUrl, deleteVoiceMessageFile } from '../services/storage.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * Error logger for backend voice message operations
 * In production, this would integrate with monitoring services
 */
const logError = (error, context) => {
  console.error('[Voice Messages Error]', {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context
  });
  
  // In production, send to monitoring service (e.g., Sentry, DataDog)
  // Example: Sentry.captureException(error, { tags: context });
};

// Configure multer for voice message uploads
// 10MB limit, audio/* only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB in bytes
  },
  fileFilter: (req, file, cb) => {
    // Accept audio/* MIME types (including AAC/M4A for Safari/iOS)
    const validAudioTypes = [
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/aac',
      'audio/x-m4a',
      'audio/m4a'
    ];
    if (validAudioTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only audio files are allowed. Received: ${file.mimetype}`), false);
    }
  }
});

// POST /api/voice-messages - Upload voice message and create message
router.post('/', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    // Validate audio exists
    if (!req.file) {
      logError(new Error('No audio file provided'), {
        endpoint: 'POST /api/voice-messages',
        user: req.user?.role
      });
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Validate audio duration is provided
    const duration = parseInt(req.body.duration, 10);
    if (!duration || isNaN(duration) || duration <= 0) {
      logError(new Error('Invalid audio duration'), {
        endpoint: 'POST /api/voice-messages',
        duration: req.body.duration,
        user: req.user?.role
      });
      return res.status(400).json({ error: 'Valid audio duration is required' });
    }

    // Validate audio is valid type (already checked by multer, but double-check)
    const validAudioTypes = [
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/aac',
      'audio/x-m4a',
      'audio/m4a'
    ];
    if (!validAudioTypes.includes(req.file.mimetype)) {
      logError(new Error('Invalid audio type'), {
        endpoint: 'POST /api/voice-messages',
        mimetype: req.file.mimetype,
        user: req.user?.role
      });
      return res.status(400).json({ 
        error: `Only audio files are allowed. Received: ${req.file.mimetype}` 
      });
    }

    // Get sender from req.user and validate (Requirement 5.1)
    const sender = req.user.role;
    
    // Validate sender is A or B
    if (!sender || (sender !== 'A' && sender !== 'B')) {
      logError(new Error('Invalid sender'), {
        endpoint: 'POST /api/voice-messages',
        sender,
        user: req.user?.role
      });
      return res.status(400).json({ error: 'Invalid sender' });
    }

    // Call uploadVoiceMessage function
    const audioPath = await uploadVoiceMessage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Call createVoiceMessage function
    const message = await createVoiceMessage(
      sender,
      audioPath,
      duration
    );

    // Return created message with all standard metadata (Requirement 5.1)
    return res.status(201).json({ 
      success: true,
      message: {
        id: message.id,
        sender: message.sender,              // Standard metadata: sender
        type: message.type,                  // Standard metadata: message type
        audio_path: message.audio_path,      // Voice-specific: audio file path
        audio_duration: message.audio_duration, // Voice-specific: duration
        created_at: message.created_at,      // Standard metadata: timestamp
        deleted: message.deleted || false    // Standard metadata: deletion flag
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'POST /api/voice-messages',
      user: req.user?.role,
      fileSize: req.file?.size,
      mimetype: req.file?.mimetype
    });
    
    // Handle specific error cases
    if (error.message.includes('Only audio files')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message.includes('Voice message upload failed')) {
      return res.status(500).json({ error: 'Voice message upload failed. Please try again.' });
    }
    
    if (error.message.includes('storage')) {
      return res.status(507).json({ error: 'Storage limit reached. Please delete old messages.' });
    }
    
    return res.status(500).json({ error: 'Failed to upload voice message. Please try again.' });
  }
});

// Handle multer errors (like file size exceeded)
router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Audio file size exceeds 10MB limit' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message.includes('Only audio files')) {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
});

// GET /api/voice-messages/:messageId - Get signed URL for voice message
router.get('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Query message by ID
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('id, type, audio_path, audio_duration')
      .eq('id', messageId)
      .single();

    // Verify message exists
    if (fetchError || !message) {
      logError(fetchError || new Error('Message not found'), {
        endpoint: 'GET /api/voice-messages/:messageId',
        messageId,
        user: req.user?.role
      });
      return res.status(404).json({ error: 'Voice message not found' });
    }

    // Verify message type is 'voice'
    if (message.type !== 'voice') {
      logError(new Error('Invalid message type'), {
        endpoint: 'GET /api/voice-messages/:messageId',
        messageId,
        messageType: message.type,
        user: req.user?.role
      });
      return res.status(404).json({ error: 'Voice message not found' });
    }

    // Get audio_path from message
    const audioPath = message.audio_path;

    // Call getVoiceMessageUrl function
    const url = await getVoiceMessageUrl(audioPath);

    // Return signed URL
    return res.status(200).json({ 
      url,
      duration: message.audio_duration
    });
  } catch (error) {
    logError(error, {
      endpoint: 'GET /api/voice-messages/:messageId',
      messageId: req.params.messageId,
      user: req.user?.role
    });
    
    if (error.message.includes('Failed to generate voice message URL')) {
      return res.status(500).json({ error: 'Failed to generate voice message URL. Please try again.' });
    }
    
    return res.status(500).json({ error: 'Failed to retrieve voice message. Please try again.' });
  }
});

// DELETE /api/voice-messages/:messageId - Delete voice message
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Query message by ID
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('id, type, audio_path, sender')
      .eq('id', messageId)
      .single();

    // Verify message exists
    if (fetchError || !message) {
      logError(fetchError || new Error('Message not found'), {
        endpoint: 'DELETE /api/voice-messages/:messageId',
        messageId,
        user: req.user?.role
      });
      return res.status(404).json({ error: 'Voice message not found' });
    }

    // Verify message type is 'voice'
    if (message.type !== 'voice') {
      logError(new Error('Invalid message type'), {
        endpoint: 'DELETE /api/voice-messages/:messageId',
        messageId,
        messageType: message.type,
        user: req.user?.role
      });
      return res.status(404).json({ error: 'Voice message not found' });
    }

    // Verify user is the sender
    if (message.sender !== req.user.role) {
      logError(new Error('Unauthorized deletion attempt'), {
        endpoint: 'DELETE /api/voice-messages/:messageId',
        messageId,
        messageSender: message.sender,
        user: req.user?.role
      });
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // Delete from storage
    try {
      await deleteVoiceMessageFile(message.audio_path);
    } catch (storageError) {
      // Log but don't fail - we'll still mark as deleted in DB
      logError(storageError, {
        endpoint: 'DELETE /api/voice-messages/:messageId',
        messageId,
        audioPath: message.audio_path,
        action: 'deleteFromStorage'
      });
    }

    // Delete from database (soft delete by setting deleted flag)
    const { error: deleteError } = await supabase
      .from('messages')
      .update({ deleted: true })
      .eq('id', messageId);

    if (deleteError) {
      logError(deleteError, {
        endpoint: 'DELETE /api/voice-messages/:messageId',
        messageId,
        action: 'softDelete'
      });
      throw new Error(`Failed to delete voice message: ${deleteError.message}`);
    }

    return res.status(200).json({ 
      success: true,
      message: 'Voice message deleted successfully'
    });
  } catch (error) {
    logError(error, {
      endpoint: 'DELETE /api/voice-messages/:messageId',
      messageId: req.params.messageId,
      user: req.user?.role
    });
    return res.status(500).json({ error: 'Failed to delete voice message. Please try again.' });
  }
});

export default router;
