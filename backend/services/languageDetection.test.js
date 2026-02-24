import { describe, it } from 'node:test';
import assert from 'node:assert';
import { detectLanguage } from './languageDetection.js';

describe('Language Detection', () => {
  describe('English text detection', () => {
    it('detects simple English text', () => {
      assert.strictEqual(detectLanguage('Hello world'), 'en');
    });

    it('detects English sentence with punctuation', () => {
      assert.strictEqual(detectLanguage('Hello, how are you?'), 'en');
    });

    it('detects English text with numbers', () => {
      assert.strictEqual(detectLanguage('I have 3 apples'), 'en');
    });

    it('detects English text with special characters', () => {
      assert.strictEqual(detectLanguage('Email: test@example.com'), 'en');
    });

    it('detects uppercase English text', () => {
      assert.strictEqual(detectLanguage('HELLO WORLD'), 'en');
    });

    it('detects mixed case English text', () => {
      assert.strictEqual(detectLanguage('HeLLo WoRLd'), 'en');
    });
  });

  describe('Chinese text detection', () => {
    it('detects simplified Chinese text', () => {
      assert.strictEqual(detectLanguage('你好世界'), 'zh-CN');
    });

    it('detects traditional Chinese text', () => {
      assert.strictEqual(detectLanguage('你好世界'), 'zh-CN');
    });

    it('detects Chinese sentence with punctuation', () => {
      assert.strictEqual(detectLanguage('你好，你好吗？'), 'zh-CN');
    });

    it('detects Chinese text with numbers', () => {
      assert.strictEqual(detectLanguage('我有3个苹果'), 'zh-CN');
    });

    it('detects single Chinese character', () => {
      assert.strictEqual(detectLanguage('好'), 'zh-CN');
    });

    it('detects Chinese text with English punctuation', () => {
      assert.strictEqual(detectLanguage('你好, 世界!'), 'zh-CN');
    });
  });

  describe('Mixed language text', () => {
    it('detects mixed Chinese and English (Chinese first)', () => {
      assert.strictEqual(detectLanguage('你好 Hello'), 'zh-CN');
    });

    it('detects mixed Chinese and English (English first)', () => {
      assert.strictEqual(detectLanguage('Hello 你好'), 'zh-CN');
    });

    it('detects Chinese with English words', () => {
      assert.strictEqual(detectLanguage('我喜欢 JavaScript'), 'zh-CN');
    });

    it('detects Chinese with numbers and English', () => {
      assert.strictEqual(detectLanguage('我有3个apples'), 'zh-CN');
    });
  });

  describe('Edge cases - empty and whitespace', () => {
    it('handles empty string', () => {
      assert.strictEqual(detectLanguage(''), 'en');
    });

    it('handles whitespace-only string', () => {
      assert.strictEqual(detectLanguage('   '), 'en');
    });

    it('handles string with only tabs and newlines', () => {
      assert.strictEqual(detectLanguage('\t\n\r'), 'en');
    });

    it('handles null input', () => {
      assert.strictEqual(detectLanguage(null), 'en');
    });

    it('handles undefined input', () => {
      assert.strictEqual(detectLanguage(undefined), 'en');
    });
  });

  describe('Edge cases - special characters and symbols', () => {
    it('handles only numbers', () => {
      assert.strictEqual(detectLanguage('12345'), 'en');
    });

    it('handles only punctuation', () => {
      assert.strictEqual(detectLanguage('!@#$%^&*()'), 'en');
    });

    it('handles emoji only', () => {
      assert.strictEqual(detectLanguage('😀😃😄'), 'en');
    });

    it('handles Chinese with emoji', () => {
      assert.strictEqual(detectLanguage('你好 😀'), 'zh-CN');
    });

    it('handles special Unicode characters', () => {
      assert.strictEqual(detectLanguage('©®™'), 'en');
    });
  });

  describe('Edge cases - invalid input types', () => {
    it('handles non-string input (number)', () => {
      assert.strictEqual(detectLanguage(123), 'en');
    });

    it('handles non-string input (boolean)', () => {
      assert.strictEqual(detectLanguage(true), 'en');
    });

    it('handles non-string input (object)', () => {
      assert.strictEqual(detectLanguage({}), 'en');
    });

    it('handles non-string input (array)', () => {
      assert.strictEqual(detectLanguage([]), 'en');
    });
  });

  describe('Real-world message examples', () => {
    it('detects typical English greeting', () => {
      assert.strictEqual(detectLanguage('Hi! How are you doing today?'), 'en');
    });

    it('detects typical Chinese greeting', () => {
      assert.strictEqual(detectLanguage('嗨！你今天怎么样？'), 'zh-CN');
    });

    it('detects English question', () => {
      assert.strictEqual(detectLanguage('What time is the meeting?'), 'en');
    });

    it('detects Chinese question', () => {
      assert.strictEqual(detectLanguage('会议是什么时候？'), 'zh-CN');
    });

    it('detects English with URL', () => {
      assert.strictEqual(detectLanguage('Check out https://example.com'), 'en');
    });

    it('detects Chinese with URL', () => {
      assert.strictEqual(detectLanguage('看看这个 https://example.com'), 'zh-CN');
    });
  });

  describe('Requirements validation', () => {
    // Requirement 3.6: Detect source language automatically
    it('automatically detects source language without explicit specification', () => {
      assert.strictEqual(detectLanguage('Hello'), 'en');
      assert.strictEqual(detectLanguage('你好'), 'zh-CN');
    });

    // Requirement 5.5: Correctly identify source language before translation
    it('correctly identifies English before translation', () => {
      const englishText = 'Translate this to Chinese';
      assert.strictEqual(detectLanguage(englishText), 'en');
    });

    it('correctly identifies Chinese before translation', () => {
      const chineseText = '把这个翻译成英文';
      assert.strictEqual(detectLanguage(chineseText), 'zh-CN');
    });

    // Requirement 5.6: Handle automatic language detection
    it('handles automatic detection for various text types', () => {
      // English variations
      assert.strictEqual(detectLanguage('hello'), 'en');
      assert.strictEqual(detectLanguage('HELLO'), 'en');
      assert.strictEqual(detectLanguage('Hello123'), 'en');
      
      // Chinese variations
      assert.strictEqual(detectLanguage('你好'), 'zh-CN');
      assert.strictEqual(detectLanguage('你好123'), 'zh-CN');
      assert.strictEqual(detectLanguage('你好hello'), 'zh-CN');
    });
  });
});
