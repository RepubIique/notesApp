import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';

describe('Translation Routes - Implementation Verification', () => {
  let routeContent;

  test('Load translations route file', async () => {
    routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    assert.ok(routeContent, 'Translations route file should exist');
  });

  test('Routes use authMiddleware for authentication', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify authMiddleware is imported and used
    assert.ok(routeContent.includes('authMiddleware'), 'Routes should use authMiddleware');
    assert.ok(routeContent.includes("import { authMiddleware }"), 'Should import authMiddleware');
  });

  test('Has error logging function', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify error logger exists
    assert.ok(routeContent.includes('const logError'), 'Should have logError function');
    assert.ok(routeContent.includes('console.error'), 'Should log errors to console');
    assert.ok(routeContent.includes('timestamp'), 'Should include timestamp in logs');
  });

  test('POST /api/translations has validation middleware', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify validation middleware exists
    assert.ok(routeContent.includes('validateTranslationRequest'), 'Should have validateTranslationRequest middleware');
    assert.ok(routeContent.includes("router.post('/', authMiddleware, validateTranslationRequest"), 'POST route should use validation middleware');
  });

  test('Validation checks messageId is required and non-empty', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify messageId validation
    assert.ok(routeContent.includes('messageId'), 'Should validate messageId');
    assert.ok(routeContent.includes('Message ID is required'), 'Should have appropriate error message');
  });

  test('Validation checks targetLanguage is valid', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify targetLanguage validation
    assert.ok(routeContent.includes('targetLanguage'), 'Should validate targetLanguage');
    assert.ok(routeContent.includes("'en', 'zh-CN', 'zh-TW'"), 'Should check for valid language codes');
    assert.ok(routeContent.includes('Target language must be one of'), 'Should have appropriate error message');
  });

  test('Validation checks sourceLanguage if provided', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify sourceLanguage validation
    assert.ok(routeContent.includes('sourceLanguage'), 'Should validate sourceLanguage');
    assert.ok(routeContent.includes("'auto'"), 'Should allow auto detection');
  });

  test('Validation returns 400 with error details on failure', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify error response format
    assert.ok(routeContent.includes('res.status(400)'), 'Should return 400 for validation errors');
    assert.ok(routeContent.includes('Validation failed'), 'Should include validation failed message');
    assert.ok(routeContent.includes('INVALID_REQUEST'), 'Should include error code');
    assert.ok(routeContent.includes('details'), 'Should include error details');
  });

  test('POST /api/translations endpoint exists', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify POST endpoint
    assert.ok(routeContent.includes("router.post('/'"), 'Should have POST route');
    assert.ok(routeContent.includes('authMiddleware'), 'Should use authentication');
  });

  test('POST /api/translations fetches message from database', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify message fetching
    assert.ok(routeContent.includes("from('messages')"), 'Should query messages table');
    assert.ok(routeContent.includes('.select('), 'Should select message data');
    assert.ok(routeContent.includes('.eq('), 'Should filter by message ID');
  });

  test('POST /api/translations returns 404 for non-existent message', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify 404 handling
    assert.ok(routeContent.includes('res.status(404)'), 'Should return 404 for missing message');
    assert.ok(routeContent.includes('Message not found'), 'Should have appropriate error message');
    assert.ok(routeContent.includes('MESSAGE_NOT_FOUND'), 'Should have error code');
  });

  test('POST /api/translations validates message has text', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify text validation
    assert.ok(routeContent.includes('message.text'), 'Should check message text');
    assert.ok(routeContent.includes('Message has no text to translate'), 'Should have appropriate error message');
  });

  test('POST /api/translations detects source language when auto', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify language detection
    assert.ok(routeContent.includes('detectLanguage'), 'Should use detectLanguage function');
    assert.ok(routeContent.includes("sourceLanguage === 'auto'"), 'Should check for auto detection');
  });

  test('POST /api/translations checks cache before API call', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify cache lookup
    assert.ok(routeContent.includes('lookupCachedTranslation'), 'Should lookup cached translation');
    assert.ok(routeContent.includes('cachedTranslation'), 'Should store cache result');
  });

  test('POST /api/translations returns cached translation if available', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify cache hit response
    assert.ok(routeContent.includes('if (cachedTranslation)'), 'Should check if cached translation exists');
    assert.ok(routeContent.includes('cached: true'), 'Should indicate translation was cached');
  });

  test('POST /api/translations calls MyMemory API for uncached translations', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify API call
    assert.ok(routeContent.includes('translateText'), 'Should call translateText function');
    assert.ok(routeContent.includes('TranslationAPIError'), 'Should handle API errors');
  });

  test('POST /api/translations stores translation in cache after API call', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify cache storage
    assert.ok(routeContent.includes('storeCachedTranslation'), 'Should store translation in cache');
  });

  test('POST /api/translations returns translation response with correct format', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify response format
    assert.ok(routeContent.includes('success: true'), 'Should include success flag');
    assert.ok(routeContent.includes('translation:'), 'Should include translation object');
    assert.ok(routeContent.includes('messageId'), 'Should include messageId');
    assert.ok(routeContent.includes('sourceLanguage'), 'Should include sourceLanguage');
    assert.ok(routeContent.includes('targetLanguage'), 'Should include targetLanguage');
    assert.ok(routeContent.includes('translatedText'), 'Should include translatedText');
    assert.ok(routeContent.includes('originalText'), 'Should include originalText');
    assert.ok(routeContent.includes('cached:'), 'Should include cached flag');
  });

  test('POST /api/translations handles API errors appropriately', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify API error handling
    assert.ok(routeContent.includes('TranslationAPIError'), 'Should check for TranslationAPIError');
    assert.ok(routeContent.includes('apiError.statusCode'), 'Should use API error status code');
    assert.ok(routeContent.includes('apiError.code'), 'Should use API error code');
  });

  test('POST /api/translations prevents same source and target language', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify language check
    assert.ok(routeContent.includes('detectedSourceLanguage === targetLanguage'), 'Should check if languages are the same');
    assert.ok(routeContent.includes('Source and target languages cannot be the same'), 'Should have appropriate error message');
  });

  test('POST /api/translations has error handling', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify error handling
    assert.ok(routeContent.includes('try'), 'Should use try-catch');
    assert.ok(routeContent.includes('catch'), 'Should catch errors');
    assert.ok(routeContent.includes('logError'), 'Should log errors');
    assert.ok(routeContent.includes('TRANSLATION_FAILED'), 'Should have error code');
  });

  test('GET /api/translations/:messageId endpoint exists', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify GET endpoint
    assert.ok(routeContent.includes("router.get('/:messageId'"), 'Should have GET route with messageId param');
    assert.ok(routeContent.includes('authMiddleware'), 'Should use authentication');
  });

  test('GET /api/translations/:messageId validates messageId', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify messageId validation
    assert.ok(routeContent.includes('req.params.messageId') || routeContent.includes('const { messageId } = req.params'), 'Should extract messageId from params');
    assert.ok(routeContent.includes('Message ID is required'), 'Should validate messageId');
  });

  test('GET /api/translations/:messageId queries translations table', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify database query
    assert.ok(routeContent.includes('supabase'), 'Should use supabase client');
    assert.ok(routeContent.includes("from('translations')"), 'Should query translations table');
    assert.ok(routeContent.includes('.select('), 'Should select translation data');
    assert.ok(routeContent.includes('message_id'), 'Should filter by message_id');
  });

  test('GET /api/translations/:messageId supports targetLanguage filter', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify optional filtering
    assert.ok(routeContent.includes('targetLanguage') || routeContent.includes('target_language'), 'Should support targetLanguage filter');
    assert.ok(routeContent.includes('req.query'), 'Should read query parameters');
  });

  test('GET /api/translations/:messageId returns translations array', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify response format
    assert.ok(routeContent.includes('res.status(200)'), 'Should return 200 for success');
    assert.ok(routeContent.includes('translations'), 'Should include translations in response');
  });

  test('GET /api/translations/:messageId has error handling', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify error handling
    assert.ok(routeContent.includes('try'), 'Should use try-catch');
    assert.ok(routeContent.includes('catch'), 'Should catch errors');
    assert.ok(routeContent.includes('res.status(500)'), 'Should return 500 for errors');
  });

  test('Routes export default router', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    // Verify export
    assert.ok(routeContent.includes('export default router'), 'Should export router as default');
  });
});
