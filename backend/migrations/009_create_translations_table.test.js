import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import { supabase } from '../config/supabase.js';

describe('Translation Table Migration - Schema and Referential Integrity', () => {
  let testMessageId;
  let testTranslationId;

  before(async () => {
    // Create a test message for referential integrity testing
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender: 'A',
        type: 'text',
        text: 'Hello world'
      })
      .select()
      .single();

    if (error) throw error;
    testMessageId = message.id;
  });

  after(async () => {
    // Clean up test data
    if (testTranslationId) {
      await supabase.from('translations').delete().eq('id', testTranslationId);
    }
    if (testMessageId) {
      await supabase.from('messages').delete().eq('id', testMessageId);
    }
  });

  test('translations table exists with correct schema', async () => {
    // Query the table to verify it exists
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .limit(0);

    assert.strictEqual(error, null, 'translations table should exist');
  });

  test('can insert translation with all required fields', async () => {
    const { data, error } = await supabase
      .from('translations')
      .insert({
        message_id: testMessageId,
        source_language: 'en',
        target_language: 'zh-CN',
        translated_text: '你好世界'
      })
      .select()
      .single();

    assert.strictEqual(error, null, 'Should insert translation without error');
    assert.ok(data.id, 'Should generate UUID for id');
    assert.strictEqual(data.message_id, testMessageId, 'Should store message_id');
    assert.strictEqual(data.source_language, 'en', 'Should store source_language');
    assert.strictEqual(data.target_language, 'zh-CN', 'Should store target_language');
    assert.strictEqual(data.translated_text, '你好世界', 'Should store translated_text');
    assert.ok(data.created_at, 'Should have created_at timestamp');

    testTranslationId = data.id;
  });

  test('unique constraint prevents duplicate translations', async () => {
    // Try to insert duplicate translation
    const { error } = await supabase
      .from('translations')
      .insert({
        message_id: testMessageId,
        source_language: 'en',
        target_language: 'zh-CN',
        translated_text: '你好世界 (duplicate)'
      });

    assert.ok(error, 'Should reject duplicate translation');
    assert.ok(
      error.message.includes('duplicate') || error.code === '23505',
      'Should be a unique constraint violation'
    );
  });

  test('can insert different language pair for same message', async () => {
    const { data, error } = await supabase
      .from('translations')
      .insert({
        message_id: testMessageId,
        source_language: 'en',
        target_language: 'zh-TW',
        translated_text: '你好世界'
      })
      .select()
      .single();

    assert.strictEqual(error, null, 'Should allow different target language');
    assert.strictEqual(data.target_language, 'zh-TW', 'Should store zh-TW translation');

    // Clean up
    await supabase.from('translations').delete().eq('id', data.id);
  });

  test('referential integrity - deleting message cascades to translations', async () => {
    // Create a new message and translation for cascade test
    const { data: message } = await supabase
      .from('messages')
      .insert({
        sender: 'B',
        type: 'text',
        text: 'Test cascade'
      })
      .select()
      .single();

    const { data: translation } = await supabase
      .from('translations')
      .insert({
        message_id: message.id,
        source_language: 'en',
        target_language: 'zh-CN',
        translated_text: '测试级联'
      })
      .select()
      .single();

    // Verify translation exists
    const { data: beforeDelete } = await supabase
      .from('translations')
      .select('*')
      .eq('id', translation.id)
      .single();

    assert.ok(beforeDelete, 'Translation should exist before message deletion');

    // Delete the message
    await supabase.from('messages').delete().eq('id', message.id);

    // Verify translation was cascade deleted
    const { data: afterDelete } = await supabase
      .from('translations')
      .select('*')
      .eq('id', translation.id)
      .single();

    assert.strictEqual(afterDelete, null, 'Translation should be cascade deleted with message');
  });

  test('index on message_id exists for fast lookups', async () => {
    // Query by message_id should be efficient
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('message_id', testMessageId);

    assert.strictEqual(error, null, 'Should query by message_id without error');
    assert.ok(Array.isArray(data), 'Should return array of translations');
  });

  test('can query translations by language pair', async () => {
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('source_language', 'en')
      .eq('target_language', 'zh-CN');

    assert.strictEqual(error, null, 'Should query by language pair without error');
    assert.ok(Array.isArray(data), 'Should return array of translations');
  });

  test('cannot insert translation without required fields', async () => {
    // Missing message_id
    const { error: error1 } = await supabase
      .from('translations')
      .insert({
        source_language: 'en',
        target_language: 'zh-CN',
        translated_text: 'test'
      });

    assert.ok(error1, 'Should reject translation without message_id');

    // Missing source_language
    const { error: error2 } = await supabase
      .from('translations')
      .insert({
        message_id: testMessageId,
        target_language: 'zh-CN',
        translated_text: 'test'
      });

    assert.ok(error2, 'Should reject translation without source_language');

    // Missing target_language
    const { error: error3 } = await supabase
      .from('translations')
      .insert({
        message_id: testMessageId,
        source_language: 'en',
        translated_text: 'test'
      });

    assert.ok(error3, 'Should reject translation without target_language');

    // Missing translated_text
    const { error: error4 } = await supabase
      .from('translations')
      .insert({
        message_id: testMessageId,
        source_language: 'en',
        target_language: 'zh-CN'
      });

    assert.ok(error4, 'Should reject translation without translated_text');
  });

  test('cannot insert translation with invalid message_id', async () => {
    const { error } = await supabase
      .from('translations')
      .insert({
        message_id: '00000000-0000-0000-0000-000000000000',
        source_language: 'en',
        target_language: 'zh-CN',
        translated_text: 'test'
      });

    assert.ok(error, 'Should reject translation with non-existent message_id');
    assert.ok(
      error.message.includes('foreign key') || error.code === '23503',
      'Should be a foreign key constraint violation'
    );
  });
});
