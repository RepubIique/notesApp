import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { detectLanguage } from '../services/languageDetection.js';
import { translateText, TranslationAPIError } from '../services/myMemoryTranslation.js';
import { lookupCachedTranslation, storeCachedTranslation, CacheError } from '../services/translationCache.js';

const router = express.Router();

/**
 * Error logger for translation operations
 * In production, this would integrate with monitoring services
 */
const logError = (error, context) => {
  console.error('[Translation Error]', {
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

/**
 * Validation middleware for translation requests
 * Validates required fields: messageId and targetLanguage
 */
const validateTranslationRequest = (req, res, next) => {
  const { messageId, targetLanguage } = req.body;
  const errors = {};

  // Validate messageId (required, non-empty string)
  if (!messageId || typeof messageId !== 'string' || messageId.trim().length === 0) {
    errors.messageId = 'Message ID is required';
  }

  // Validate targetLanguage (required, must be valid language code)
  const validLanguages = ['en', 'zh-CN', 'zh-TW'];
  if (!targetLanguage || !validLanguages.includes(targetLanguage)) {
    errors.targetLanguage = 'Target language must be one of: en, zh-CN, zh-TW';
  }

  // Validate sourceLanguage if provided (optional, but must be valid if present)
  const { sourceLanguage } = req.body;
  if (sourceLanguage && sourceLanguage !== 'auto' && !validLanguages.includes(sourceLanguage)) {
    errors.sourceLanguage = 'Source language must be one of: en, zh-CN, zh-TW, auto';
  }

  // If there are validation errors, return 400 with error details
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'INVALID_REQUEST',
      details: errors
    });
  }

  next();
};

// POST /api/translations - Translate a message
router.post('/', authMiddleware, validateTranslationRequest, async (req, res) => {
  try {
    const { messageId, targetLanguage, sourceLanguage = 'auto' } = req.body;

    // Step 1: Fetch message from database
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('text')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return res.status(404).json({
        error: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    // Validate message has text content
    if (!message.text || message.text.trim().length === 0) {
      return res.status(400).json({
        error: 'Message has no text to translate',
        code: 'INVALID_REQUEST'
      });
    }

    const originalText = message.text;

    // Step 2: Detect source language if set to 'auto'
    let detectedSourceLanguage = sourceLanguage;
    if (sourceLanguage === 'auto') {
      detectedSourceLanguage = detectLanguage(originalText);
    }

    // Step 3: Check if source and target languages are the same
    if (detectedSourceLanguage === targetLanguage) {
      return res.status(400).json({
        error: 'Source and target languages cannot be the same',
        code: 'INVALID_REQUEST'
      });
    }

    // Step 4: Check cache first
    let cachedTranslation = null;
    try {
      cachedTranslation = await lookupCachedTranslation(
        messageId,
        detectedSourceLanguage,
        targetLanguage
      );
    } catch (cacheError) {
      // Log cache lookup error but continue with translation
      logError(cacheError, {
        endpoint: 'POST /api/translations',
        messageId,
        operation: 'cache_lookup'
      });
    }

    // If cached translation exists, return it immediately
    if (cachedTranslation) {
      return res.status(200).json({
        success: true,
        translation: {
          messageId,
          sourceLanguage: cachedTranslation.source_language,
          targetLanguage: cachedTranslation.target_language,
          translatedText: cachedTranslation.translated_text,
          originalText,
          cached: true
        }
      });
    }

    // Step 5: Call MyMemory API for translation
    let translatedText;
    try {
      translatedText = await translateText(
        originalText,
        detectedSourceLanguage,
        targetLanguage
      );
    } catch (apiError) {
      // Handle specific API errors
      if (apiError instanceof TranslationAPIError) {
        logError(apiError, {
          endpoint: 'POST /api/translations',
          messageId,
          operation: 'api_call'
        });

        return res.status(apiError.statusCode).json({
          error: apiError.message,
          code: apiError.code
        });
      }
      throw apiError; // Re-throw unexpected errors
    }

    // Step 6: Store translation in cache
    try {
      await storeCachedTranslation(
        messageId,
        detectedSourceLanguage,
        targetLanguage,
        translatedText
      );
    } catch (cacheError) {
      // Log cache storage error but still return the translation
      // The translation succeeded, we just couldn't cache it
      logError(cacheError, {
        endpoint: 'POST /api/translations',
        messageId,
        operation: 'cache_storage'
      });
    }

    // Step 7: Return translation response
    return res.status(200).json({
      success: true,
      translation: {
        messageId,
        sourceLanguage: detectedSourceLanguage,
        targetLanguage,
        translatedText,
        originalText,
        cached: false
      }
    });

  } catch (error) {
    logError(error, {
      endpoint: 'POST /api/translations',
      messageId: req.body.messageId,
      user: req.user?.role
    });

    return res.status(500).json({
      error: 'Translation failed. Please try again.',
      code: 'TRANSLATION_FAILED'
    });
  }
});

// GET /api/translations/:messageId - Retrieve cached translations for a message
router.get('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { targetLanguage } = req.query;

    // Validate messageId
    if (!messageId || messageId.trim().length === 0) {
      return res.status(400).json({
        error: 'Message ID is required',
        code: 'INVALID_REQUEST'
      });
    }

    // Build query
    let query = supabase
      .from('translations')
      .select('*')
      .eq('message_id', messageId);

    // Filter by target language if provided
    if (targetLanguage) {
      const validLanguages = ['en', 'zh-CN', 'zh-TW'];
      if (!validLanguages.includes(targetLanguage)) {
        return res.status(400).json({
          error: 'Target language must be one of: en, zh-CN, zh-TW',
          code: 'INVALID_REQUEST'
        });
      }
      query = query.eq('target_language', targetLanguage);
    }

    // Execute query
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logError(error, {
        endpoint: 'GET /api/translations/:messageId',
        messageId,
        user: req.user?.role
      });
      return res.status(500).json({
        error: 'Failed to retrieve translations',
        code: 'DATABASE_ERROR'
      });
    }

    // Return translations
    return res.status(200).json({
      translations: data || []
    });
  } catch (error) {
    logError(error, {
      endpoint: 'GET /api/translations/:messageId',
      messageId: req.params.messageId,
      user: req.user?.role
    });

    return res.status(500).json({
      error: 'Failed to retrieve translations. Please try again.',
      code: 'TRANSLATION_FAILED'
    });
  }
});

// POST /api/translations/preferences - Save or update translation preference
router.post('/preferences', authMiddleware, async (req, res) => {
  try {
    const { messageId, showOriginal, targetLanguage } = req.body;
    const userRole = req.user.role;

    // Validate request
    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({
        error: 'Message ID is required',
        code: 'INVALID_REQUEST'
      });
    }

    if (typeof showOriginal !== 'boolean') {
      return res.status(400).json({
        error: 'showOriginal must be a boolean',
        code: 'INVALID_REQUEST'
      });
    }

    // Validate targetLanguage if provided
    if (targetLanguage) {
      const validLanguages = ['en', 'zh-CN', 'zh-TW'];
      if (!validLanguages.includes(targetLanguage)) {
        return res.status(400).json({
          error: 'Target language must be one of: en, zh-CN, zh-TW',
          code: 'INVALID_REQUEST'
        });
      }
    }

    // Upsert preference (insert or update if exists)
    const { data, error } = await supabase
      .from('translation_preferences')
      .upsert({
        user_role: userRole,
        message_id: messageId,
        show_original: showOriginal,
        target_language: targetLanguage,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_role,message_id'
      })
      .select()
      .single();

    if (error) {
      logError(error, {
        endpoint: 'POST /api/translations/preferences',
        messageId,
        user: userRole
      });
      return res.status(500).json({
        error: 'Failed to save translation preference',
        code: 'DATABASE_ERROR'
      });
    }

    return res.status(200).json({
      success: true,
      preference: {
        messageId: data.message_id,
        showOriginal: data.show_original,
        targetLanguage: data.target_language
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'POST /api/translations/preferences',
      messageId: req.body.messageId,
      user: req.user?.role
    });

    return res.status(500).json({
      error: 'Failed to save translation preference. Please try again.',
      code: 'PREFERENCE_SAVE_FAILED'
    });
  }
});

export default router;
