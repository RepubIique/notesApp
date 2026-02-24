/**
 * Translation Cache Service
 * 
 * Manages caching of translations in the database to optimize performance
 * and reduce external API calls. Implements cache lookup and storage with
 * unique constraint enforcement on (message_id, source_language, target_language).
 */

import { supabase } from '../config/supabase.js';

/**
 * Custom error class for cache operations
 */
export class CacheError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'CacheError';
    this.code = code;
  }
}

/**
 * Looks up a cached translation for a message
 * 
 * @param {string} messageId - UUID of the message
 * @param {string} sourceLanguage - Source language code (en, zh-CN, zh-TW)
 * @param {string} targetLanguage - Target language code (en, zh-CN, zh-TW)
 * @returns {Promise<Object|null>} Cached translation object or null if not found
 * 
 * Returns object with:
 * - id: Translation record ID
 * - message_id: Message UUID
 * - source_language: Source language code
 * - target_language: Target language code
 * - translated_text: The translated text
 * - created_at: Timestamp of translation
 * 
 * @throws {CacheError} If database query fails
 */
export const lookupCachedTranslation = async (messageId, sourceLanguage, targetLanguage) => {
  // Validate input parameters
  if (!messageId || typeof messageId !== 'string' || messageId.trim().length === 0) {
    throw new CacheError('Message ID is required', 'INVALID_INPUT');
  }

  const validLanguages = ['en', 'zh-CN', 'zh-TW'];
  if (!sourceLanguage || !validLanguages.includes(sourceLanguage)) {
    throw new CacheError('Invalid source language', 'INVALID_INPUT');
  }

  if (!targetLanguage || !validLanguages.includes(targetLanguage)) {
    throw new CacheError('Invalid target language', 'INVALID_INPUT');
  }

  try {
    // Query translations table for matching record
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('message_id', messageId)
      .eq('source_language', sourceLanguage)
      .eq('target_language', targetLanguage)
      .maybeSingle(); // Returns null if not found, throws if multiple found

    if (error) {
      throw new CacheError(
        `Failed to lookup cached translation: ${error.message}`,
        'DATABASE_ERROR'
      );
    }

    // Return cached translation or null if not found
    return data;
  } catch (error) {
    if (error instanceof CacheError) {
      throw error;
    }
    throw new CacheError(
      `Cache lookup failed: ${error.message}`,
      'DATABASE_ERROR'
    );
  }
};

/**
 * Stores a translation in the cache
 * 
 * @param {string} messageId - UUID of the message
 * @param {string} sourceLanguage - Source language code (en, zh-CN, zh-TW)
 * @param {string} targetLanguage - Target language code (en, zh-CN, zh-TW)
 * @param {string} translatedText - The translated text to cache
 * @returns {Promise<Object>} The stored translation record
 * 
 * Returns object with:
 * - id: Translation record ID
 * - message_id: Message UUID
 * - source_language: Source language code
 * - target_language: Target language code
 * - translated_text: The translated text
 * - created_at: Timestamp of translation
 * 
 * @throws {CacheError} If storage fails or unique constraint is violated
 * 
 * Note: The unique constraint on (message_id, source_language, target_language)
 * is enforced at the database level. If a duplicate is attempted, this function
 * will throw a CacheError with code 'DUPLICATE_TRANSLATION'.
 */
export const storeCachedTranslation = async (messageId, sourceLanguage, targetLanguage, translatedText) => {
  // Validate input parameters
  if (!messageId || typeof messageId !== 'string' || messageId.trim().length === 0) {
    throw new CacheError('Message ID is required', 'INVALID_INPUT');
  }

  const validLanguages = ['en', 'zh-CN', 'zh-TW'];
  if (!sourceLanguage || !validLanguages.includes(sourceLanguage)) {
    throw new CacheError('Invalid source language', 'INVALID_INPUT');
  }

  if (!targetLanguage || !validLanguages.includes(targetLanguage)) {
    throw new CacheError('Invalid target language', 'INVALID_INPUT');
  }

  if (!translatedText || typeof translatedText !== 'string' || translatedText.trim().length === 0) {
    throw new CacheError('Translated text is required', 'INVALID_INPUT');
  }

  try {
    // Insert translation into cache
    // The unique constraint on (message_id, source_language, target_language)
    // will prevent duplicate entries at the database level
    const { data, error } = await supabase
      .from('translations')
      .insert({
        message_id: messageId,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        translated_text: translatedText
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      // PostgreSQL error code 23505 = unique_violation
      if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
        throw new CacheError(
          'Translation already exists in cache',
          'DUPLICATE_TRANSLATION'
        );
      }

      throw new CacheError(
        `Failed to store translation in cache: ${error.message}`,
        'DATABASE_ERROR'
      );
    }

    if (!data) {
      throw new CacheError(
        'Failed to store translation: No data returned',
        'DATABASE_ERROR'
      );
    }

    return data;
  } catch (error) {
    if (error instanceof CacheError) {
      throw error;
    }
    throw new CacheError(
      `Cache storage failed: ${error.message}`,
      'DATABASE_ERROR'
    );
  }
};
