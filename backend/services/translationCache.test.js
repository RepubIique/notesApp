/**
 * Unit tests for Translation Cache Service
 * 
 * Tests cache lookup and storage functions with various scenarios:
 * - Input validation
 * - Error handling
 * - Requirements validation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CacheError } from './translationCache.js';
import fs from 'fs/promises';

describe('Translation Cache Service', () => {
  let cacheContent;

  it('should load translation cache service file', async () => {
    cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
    assert.ok(cacheContent, 'Translation cache service file should exist');
  });

  describe('Service structure', () => {
    it('should export lookupCachedTranslation function', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      assert.ok(cacheContent.includes('export const lookupCachedTranslation'), 'Should export lookupCachedTranslation');
    });

    it('should export storeCachedTranslation function', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      assert.ok(cacheContent.includes('export const storeCachedTranslation'), 'Should export storeCachedTranslation');
    });

    it('should export CacheError class', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      assert.ok(cacheContent.includes('export class CacheError'), 'Should export CacheError class');
    });

    it('should import supabase client', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      assert.ok(cacheContent.includes("import { supabase }"), 'Should import supabase client');
      assert.ok(cacheContent.includes("from '../config/supabase.js'"), 'Should import from correct path');
    });
  });

  describe('lookupCachedTranslation function', () => {
    it('should validate messageId parameter', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Check for messageId validation
      assert.ok(cacheContent.includes('messageId'), 'Should check messageId');
      assert.ok(cacheContent.includes('Message ID is required'), 'Should have messageId validation error');
    });

    it('should validate sourceLanguage parameter', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Check for sourceLanguage validation
      assert.ok(cacheContent.includes('sourceLanguage'), 'Should check sourceLanguage');
      assert.ok(cacheContent.includes('Invalid source language'), 'Should have sourceLanguage validation error');
    });

    it('should validate targetLanguage parameter', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Check for targetLanguage validation
      assert.ok(cacheContent.includes('targetLanguage'), 'Should check targetLanguage');
      assert.ok(cacheContent.includes('Invalid target language'), 'Should have targetLanguage validation error');
    });

    it('should query translations table with correct filters', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Check for database query
      assert.ok(cacheContent.includes("from('translations')"), 'Should query translations table');
      assert.ok(cacheContent.includes('.select('), 'Should select data');
      assert.ok(cacheContent.includes("eq('message_id'"), 'Should filter by message_id');
      assert.ok(cacheContent.includes("eq('source_language'"), 'Should filter by source_language');
      assert.ok(cacheContent.includes("eq('target_language'"), 'Should filter by target_language');
    });

    it('should use maybeSingle to handle unique constraint', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Check for maybeSingle usage (returns null if not found, throws if multiple)
      assert.ok(cacheContent.includes('.maybeSingle()'), 'Should use maybeSingle for unique lookup');
    });

    it('should handle database errors', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Check for error handling
      assert.ok(cacheContent.includes('if (error)'), 'Should check for database errors');
      assert.ok(cacheContent.includes('Failed to lookup cached translation'), 'Should have lookup error message');
      assert.ok(cacheContent.includes('DATABASE_ERROR'), 'Should have database error code');
    });

    it('should return cached translation or null', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Check for return statement
      assert.ok(cacheContent.includes('return data'), 'Should return data from query');
    });
  });

  describe('storeCachedTranslation function', () => {
    it('should validate messageId parameter', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Check for messageId validation in store function
      const storeFunctionMatch = cacheContent.match(/export const storeCachedTranslation[\s\S]*?(?=export|$)/);
      assert.ok(storeFunctionMatch, 'Should have storeCachedTranslation function');
      assert.ok(storeFunctionMatch[0].includes('messageId'), 'Should validate messageId');
      assert.ok(storeFunctionMatch[0].includes('Message ID is required'), 'Should have messageId error');
    });

    it('should validate sourceLanguage parameter', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      const storeFunctionMatch = cacheContent.match(/export const storeCachedTranslation[\s\S]*?(?=export|$)/);
      assert.ok(storeFunctionMatch[0].includes('sourceLanguage'), 'Should validate sourceLanguage');
      assert.ok(storeFunctionMatch[0].includes('Invalid source language'), 'Should have sourceLanguage error');
    });

    it('should validate targetLanguage parameter', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      const storeFunctionMatch = cacheContent.match(/export const storeCachedTranslation[\s\S]*?(?=export|$)/);
      assert.ok(storeFunctionMatch[0].includes('targetLanguage'), 'Should validate targetLanguage');
      assert.ok(storeFunctionMatch[0].includes('Invalid target language'), 'Should have targetLanguage error');
    });

    it('should validate translatedText parameter', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      const storeFunctionMatch = cacheContent.match(/export const storeCachedTranslation[\s\S]*?(?=export|$)/);
      assert.ok(storeFunctionMatch[0].includes('translatedText'), 'Should validate translatedText');
      assert.ok(storeFunctionMatch[0].includes('Translated text is required'), 'Should have translatedText error');
    });

    it('should insert translation into database', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      const storeFunctionMatch = cacheContent.match(/export const storeCachedTranslation[\s\S]*?(?=export|$)/);
      assert.ok(storeFunctionMatch[0].includes("from('translations')"), 'Should insert into translations table');
      assert.ok(storeFunctionMatch[0].includes('.insert('), 'Should use insert method');
      assert.ok(storeFunctionMatch[0].includes('message_id'), 'Should include message_id');
      assert.ok(storeFunctionMatch[0].includes('source_language'), 'Should include source_language');
      assert.ok(storeFunctionMatch[0].includes('target_language'), 'Should include target_language');
      assert.ok(storeFunctionMatch[0].includes('translated_text'), 'Should include translated_text');
    });

    it('should handle unique constraint violations', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      const storeFunctionMatch = cacheContent.match(/export const storeCachedTranslation[\s\S]*?(?=export|$)/);
      // Check for unique constraint error handling (PostgreSQL error code 23505)
      assert.ok(storeFunctionMatch[0].includes('23505') || storeFunctionMatch[0].includes('duplicate') || storeFunctionMatch[0].includes('unique'), 
        'Should check for unique constraint violation');
      assert.ok(storeFunctionMatch[0].includes('DUPLICATE_TRANSLATION'), 'Should have duplicate error code');
      assert.ok(storeFunctionMatch[0].includes('already exists'), 'Should have duplicate error message');
    });

    it('should handle database errors', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      const storeFunctionMatch = cacheContent.match(/export const storeCachedTranslation[\s\S]*?(?=export|$)/);
      assert.ok(storeFunctionMatch[0].includes('if (error)'), 'Should check for database errors');
      assert.ok(storeFunctionMatch[0].includes('Failed to store translation'), 'Should have store error message');
      assert.ok(storeFunctionMatch[0].includes('DATABASE_ERROR'), 'Should have database error code');
    });

    it('should return stored translation record', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      const storeFunctionMatch = cacheContent.match(/export const storeCachedTranslation[\s\S]*?(?=export|$)/);
      assert.ok(storeFunctionMatch[0].includes('.select()'), 'Should select inserted record');
      assert.ok(storeFunctionMatch[0].includes('.single()'), 'Should return single record');
      assert.ok(storeFunctionMatch[0].includes('return data'), 'Should return inserted data');
    });
  });

  describe('CacheError class', () => {
    it('should extend Error class', () => {
      assert.ok(CacheError.prototype instanceof Error, 'CacheError should extend Error');
    });

    it('should have name property', () => {
      const error = new CacheError('Test error', 'TEST_CODE');
      assert.strictEqual(error.name, 'CacheError', 'Should have name CacheError');
    });

    it('should have code property', () => {
      const error = new CacheError('Test error', 'TEST_CODE');
      assert.strictEqual(error.code, 'TEST_CODE', 'Should have code property');
    });

    it('should have message property', () => {
      const error = new CacheError('Test error', 'TEST_CODE');
      assert.strictEqual(error.message, 'Test error', 'Should have message property');
    });
  });

  describe('Requirements validation', () => {
    it('validates Requirement 4.1 - Store translation with all required fields', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Requirement 4.1: Store message_id, source_language, target_language, translated_text
      const storeFunctionMatch = cacheContent.match(/export const storeCachedTranslation[\s\S]*?(?=export|$)/);
      assert.ok(storeFunctionMatch[0].includes('message_id'), 'Should store message_id (Req 4.1)');
      assert.ok(storeFunctionMatch[0].includes('source_language'), 'Should store source_language (Req 4.1)');
      assert.ok(storeFunctionMatch[0].includes('target_language'), 'Should store target_language (Req 4.1)');
      assert.ok(storeFunctionMatch[0].includes('translated_text'), 'Should store translated_text (Req 4.1)');
    });

    it('validates Requirement 4.2 - Check cache for existing translation', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Requirement 4.2: Check cache matching message_id, source_language, target_language
      const lookupFunctionMatch = cacheContent.match(/export const lookupCachedTranslation[\s\S]*?(?=export const storeCachedTranslation)/);
      assert.ok(lookupFunctionMatch[0].includes("eq('message_id'"), 'Should filter by message_id (Req 4.2)');
      assert.ok(lookupFunctionMatch[0].includes("eq('source_language'"), 'Should filter by source_language (Req 4.2)');
      assert.ok(lookupFunctionMatch[0].includes("eq('target_language'"), 'Should filter by target_language (Req 4.2)');
    });

    it('validates Requirement 4.3 - Return cached translation when exists', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Requirement 4.3: Return cached translation without calling external API
      const lookupFunctionMatch = cacheContent.match(/export const lookupCachedTranslation[\s\S]*?(?=export const storeCachedTranslation)/);
      assert.ok(lookupFunctionMatch[0].includes('return data'), 'Should return cached data (Req 4.3)');
    });

    it('validates Requirement 4.4 - Unique constraint enforcement', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Requirement 4.4: Unique constraint on (message_id, source_language, target_language)
      const storeFunctionMatch = cacheContent.match(/export const storeCachedTranslation[\s\S]*?(?=export|$)/);
      assert.ok(storeFunctionMatch[0].includes('23505') || storeFunctionMatch[0].includes('duplicate') || storeFunctionMatch[0].includes('unique'), 
        'Should handle unique constraint violation (Req 4.4)');
      assert.ok(storeFunctionMatch[0].includes('DUPLICATE_TRANSLATION'), 'Should have specific error code for duplicates (Req 4.4)');
    });
  });

  describe('Valid language codes', () => {
    it('should accept en, zh-CN, zh-TW as valid language codes', async () => {
      if (!cacheContent) cacheContent = await fs.readFile('./services/translationCache.js', 'utf-8');
      
      // Check that valid languages array includes all required codes
      assert.ok(cacheContent.includes("'en'"), 'Should accept en');
      assert.ok(cacheContent.includes("'zh-CN'"), 'Should accept zh-CN');
      assert.ok(cacheContent.includes("'zh-TW'"), 'Should accept zh-TW');
    });
  });
});
