/**
 * MyMemory Translation API Integration
 * 
 * Provides translation services using the MyMemory Translation API.
 * Handles API communication, response parsing, and error handling.
 * 
 * API Documentation: https://mymemory.translated.net/doc/spec.php
 */

/**
 * MyMemory API configuration
 */
const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Custom error class for translation API errors
 */
export class TranslationAPIError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'TranslationAPIError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Translates text using the MyMemory Translation API
 * 
 * @param {string} text - The text to translate
 * @param {string} sourceLanguage - Source language code (en, zh-CN, zh-TW)
 * @param {string} targetLanguage - Target language code (en, zh-CN, zh-TW)
 * @returns {Promise<string>} The translated text
 * @throws {TranslationAPIError} If translation fails
 * 
 * Error codes:
 * - INVALID_INPUT: Missing or invalid parameters
 * - RATE_LIMIT: API rate limit exceeded
 * - SERVICE_UNAVAILABLE: API service is unavailable
 * - NETWORK_ERROR: Network connection failed
 * - INVALID_RESPONSE: API returned invalid response format
 */
export const translateText = async (text, sourceLanguage, targetLanguage) => {
  // Validate input parameters
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new TranslationAPIError(
      'Text to translate is required',
      'INVALID_INPUT',
      400
    );
  }

  const validLanguages = ['en', 'zh-CN', 'zh-TW'];
  if (!sourceLanguage || !validLanguages.includes(sourceLanguage)) {
    throw new TranslationAPIError(
      'Invalid source language. Must be one of: en, zh-CN, zh-TW',
      'INVALID_INPUT',
      400
    );
  }

  if (!targetLanguage || !validLanguages.includes(targetLanguage)) {
    throw new TranslationAPIError(
      'Invalid target language. Must be one of: en, zh-CN, zh-TW',
      'INVALID_INPUT',
      400
    );
  }

  // Build API request URL
  const langPair = `${sourceLanguage}|${targetLanguage}`;
  const encodedText = encodeURIComponent(text);
  const url = `${MYMEMORY_API_URL}?q=${encodedText}&langpair=${langPair}`;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // Make API request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle HTTP error responses
    if (!response.ok) {
      // Rate limit exceeded (403 or 429)
      if (response.status === 403 || response.status === 429) {
        throw new TranslationAPIError(
          'Translation rate limit exceeded. Please try again later.',
          'RATE_LIMIT',
          429
        );
      }

      // Bad request (400)
      if (response.status === 400) {
        throw new TranslationAPIError(
          'Invalid translation request. Please check language codes.',
          'INVALID_INPUT',
          400
        );
      }

      // Service unavailable (500, 502, 503, 504)
      if (response.status >= 500) {
        throw new TranslationAPIError(
          'Translation service is temporarily unavailable.',
          'SERVICE_UNAVAILABLE',
          503
        );
      }

      // Other HTTP errors
      throw new TranslationAPIError(
        `Translation API returned error: ${response.status}`,
        'SERVICE_UNAVAILABLE',
        503
      );
    }

    // Parse JSON response
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new TranslationAPIError(
        'Failed to parse translation API response',
        'INVALID_RESPONSE',
        500
      );
    }

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new TranslationAPIError(
        'Invalid response format from translation API',
        'INVALID_RESPONSE',
        500
      );
    }

    // Check for quota exceeded
    if (data.quotaFinished === true) {
      throw new TranslationAPIError(
        'Translation rate limit exceeded. Please try again later.',
        'RATE_LIMIT',
        429
      );
    }

    // Extract translated text
    if (!data.responseData || typeof data.responseData.translatedText !== 'string') {
      throw new TranslationAPIError(
        'Translation API did not return translated text',
        'INVALID_RESPONSE',
        500
      );
    }

    const translatedText = data.responseData.translatedText.trim();

    // Validate translated text is not empty
    if (translatedText.length === 0) {
      throw new TranslationAPIError(
        'Translation API returned empty text',
        'INVALID_RESPONSE',
        500
      );
    }

    return translatedText;

  } catch (error) {
    // Re-throw TranslationAPIError as-is
    if (error instanceof TranslationAPIError) {
      throw error;
    }

    // Handle abort/timeout errors
    if (error.name === 'AbortError') {
      throw new TranslationAPIError(
        'Translation request timed out. Please try again.',
        'NETWORK_ERROR',
        503
      );
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new TranslationAPIError(
        'Network error. Please check your connection.',
        'NETWORK_ERROR',
        503
      );
    }

    // Handle other unexpected errors
    throw new TranslationAPIError(
      `Translation failed: ${error.message}`,
      'SERVICE_UNAVAILABLE',
      500
    );
  }
};
