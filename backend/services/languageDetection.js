/**
 * Language Detection Utility
 * 
 * Detects whether text is in English or Chinese based on character analysis.
 * Used for automatic source language detection in translation requests.
 */

/**
 * Detects the language of the provided text
 * 
 * @param {string} text - The text to analyze
 * @returns {string} Language code: 'zh-CN' for Chinese, 'en' for English
 * 
 * Detection logic:
 * - If text contains Chinese characters (Unicode range U+4E00 to U+9FFF), returns 'zh-CN'
 * - Otherwise, returns 'en' (default to English)
 * 
 * Limitations:
 * - Cannot distinguish between simplified and traditional Chinese
 * - Defaults to simplified Chinese ('zh-CN') when Chinese characters are detected
 * - Mixed language text is classified based on presence of Chinese characters
 * - Empty or whitespace-only text defaults to English
 * 
 * Edge cases handled:
 * - Empty string: returns 'en'
 * - Whitespace-only: returns 'en'
 * - Mixed language: returns 'zh-CN' if any Chinese characters present
 * - Special characters/numbers: returns 'en' unless Chinese characters present
 */
export const detectLanguage = (text) => {
  // Handle edge cases: null, undefined, empty string, or whitespace-only
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return 'en';
  }

  // Chinese character Unicode range: U+4E00 to U+9FFF (CJK Unified Ideographs)
  // This covers most common Chinese characters (both simplified and traditional)
  const chineseRegex = /[\u4e00-\u9fff]/;

  // Check if text contains any Chinese characters
  if (chineseRegex.test(text)) {
    // Contains Chinese characters - default to simplified Chinese
    return 'zh-CN';
  }

  // No Chinese characters detected - default to English
  return 'en';
};
