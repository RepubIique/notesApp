import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';

describe('Translation Preferences Routes - Implementation Verification', () => {
  let routeContent;

  test('Load translations route file', async () => {
    routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    assert.ok(routeContent, 'Translations route file should exist');
  });

  test('POST /api/translations/preferences endpoint exists', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    assert.ok(
      routeContent.includes("router.post('/preferences'"),
      'Should have POST /preferences endpoint'
    );
    assert.ok(
      routeContent.includes('authMiddleware'),
      'Should use authMiddleware for authentication'
    );
  });

  test('POST /api/translations/preferences validates messageId', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    assert.ok(
      routeContent.includes('messageId'),
      'Should extract messageId from request body'
    );
    assert.ok(
      routeContent.includes("typeof messageId !== 'string'"),
      'Should validate messageId is a string'
    );
    assert.ok(
      routeContent.includes('Message ID is required'),
      'Should return appropriate error message'
    );
  });

  test('POST /api/translations/preferences validates showOriginal', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    assert.ok(
      routeContent.includes('showOriginal'),
      'Should extract showOriginal from request body'
    );
    assert.ok(
      routeContent.includes("typeof showOriginal !== 'boolean'"),
      'Should validate showOriginal is a boolean'
    );
    assert.ok(
      routeContent.includes('showOriginal must be a boolean'),
      'Should return appropriate error message'
    );
  });

  test('POST /api/translations/preferences validates targetLanguage', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    assert.ok(
      routeContent.includes('targetLanguage'),
      'Should extract targetLanguage from request body'
    );
    assert.ok(
      routeContent.includes("['en', 'zh-CN', 'zh-TW']"),
      'Should validate against valid language codes'
    );
  });

  test('POST /api/translations/preferences uses upsert operation', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    assert.ok(
      routeContent.includes('.upsert('),
      'Should use upsert to insert or update preference'
    );
    assert.ok(
      routeContent.includes('translation_preferences'),
      'Should target translation_preferences table'
    );
    assert.ok(
      routeContent.includes('onConflict'),
      'Should specify conflict resolution strategy'
    );
    assert.ok(
      routeContent.includes('user_role,message_id'),
      'Should use user_role and message_id as conflict keys'
    );
  });

  test('POST /api/translations/preferences gets user role from auth', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    assert.ok(
      routeContent.includes('req.user.role'),
      'Should get user role from authenticated request'
    );
    assert.ok(
      routeContent.includes('user_role: userRole'),
      'Should include user_role in database operation'
    );
  });

  test('POST /api/translations/preferences updates timestamp', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    assert.ok(
      routeContent.includes('updated_at'),
      'Should update the updated_at timestamp'
    );
    assert.ok(
      routeContent.includes('new Date().toISOString()'),
      'Should use current timestamp'
    );
  });

  test('POST /api/translations/preferences returns success response', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    assert.ok(
      routeContent.includes('success: true'),
      'Should return success flag'
    );
    assert.ok(
      routeContent.includes('preference:'),
      'Should return preference data'
    );
  });

  test('POST /api/translations/preferences handles errors', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/translations.js', 'utf-8');
    
    assert.ok(
      routeContent.includes('logError'),
      'Should log errors for debugging'
    );
    assert.ok(
      routeContent.includes('Failed to save translation preference'),
      'Should return appropriate error message'
    );
    assert.ok(
      routeContent.includes('PREFERENCE_SAVE_FAILED'),
      'Should return appropriate error code'
    );
  });
});

describe('Messages Service - Translation Preferences Integration', () => {
  let serviceContent;

  test('Load messages service file', async () => {
    serviceContent = await fs.readFile('./services/messages.js', 'utf-8');
    assert.ok(serviceContent, 'Messages service file should exist');
  });

  test('getMessages includes translations in query', async () => {
    if (!serviceContent) serviceContent = await fs.readFile('./services/messages.js', 'utf-8');
    
    assert.ok(
      serviceContent.includes('translations ('),
      'Should include translations in select query'
    );
    assert.ok(
      serviceContent.includes('source_language'),
      'Should select source_language from translations'
    );
    assert.ok(
      serviceContent.includes('target_language'),
      'Should select target_language from translations'
    );
    assert.ok(
      serviceContent.includes('translated_text'),
      'Should select translated_text from translations'
    );
  });

  test('getMessages accepts userRole parameter', async () => {
    if (!serviceContent) serviceContent = await fs.readFile('./services/messages.js', 'utf-8');
    
    assert.ok(
      serviceContent.includes('userRole'),
      'Should accept userRole parameter'
    );
    assert.ok(
      serviceContent.includes('userRole = null'),
      'Should have default value for userRole'
    );
  });

  test('getMessages fetches translation preferences when userRole provided', async () => {
    if (!serviceContent) serviceContent = await fs.readFile('./services/messages.js', 'utf-8');
    
    assert.ok(
      serviceContent.includes('if (userRole'),
      'Should check if userRole is provided'
    );
    assert.ok(
      serviceContent.includes('translation_preferences'),
      'Should query translation_preferences table'
    );
    assert.ok(
      serviceContent.includes('.eq(\'user_role\', userRole)'),
      'Should filter by user_role'
    );
    assert.ok(
      serviceContent.includes('.in(\'message_id\', messageIds)'),
      'Should filter by message IDs'
    );
  });

  test('getMessages attaches preferences to messages', async () => {
    if (!serviceContent) serviceContent = await fs.readFile('./services/messages.js', 'utf-8');
    
    assert.ok(
      serviceContent.includes('translation_preference'),
      'Should attach translation_preference to messages'
    );
    assert.ok(
      serviceContent.includes('show_original'),
      'Should include show_original in preference'
    );
    assert.ok(
      serviceContent.includes('target_language'),
      'Should include target_language in preference'
    );
  });
});
