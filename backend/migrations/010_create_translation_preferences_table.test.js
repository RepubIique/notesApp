import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';

describe('Migration 010: Create translation_preferences table', () => {
  let migrationContent;

  test('Load migration file', async () => {
    migrationContent = await fs.readFile('./migrations/010_create_translation_preferences_table.sql', 'utf-8');
    assert.ok(migrationContent, 'Migration file should exist');
  });

  test('Creates translation_preferences table', async () => {
    if (!migrationContent) {
      migrationContent = await fs.readFile('./migrations/010_create_translation_preferences_table.sql', 'utf-8');
    }

    assert.ok(
      migrationContent.includes('CREATE TABLE IF NOT EXISTS translation_preferences'),
      'Should create translation_preferences table'
    );
  });

  test('Table has required columns', async () => {
    if (!migrationContent) {
      migrationContent = await fs.readFile('./migrations/010_create_translation_preferences_table.sql', 'utf-8');
    }

    // Check for all required columns
    assert.ok(migrationContent.includes('id UUID PRIMARY KEY'), 'Should have id column as primary key');
    assert.ok(migrationContent.includes('user_role TEXT NOT NULL'), 'Should have user_role column');
    assert.ok(migrationContent.includes('message_id UUID NOT NULL'), 'Should have message_id column');
    assert.ok(migrationContent.includes('show_original BOOLEAN NOT NULL'), 'Should have show_original column');
    assert.ok(migrationContent.includes('target_language TEXT'), 'Should have target_language column');
    assert.ok(migrationContent.includes('created_at TIMESTAMPTZ NOT NULL'), 'Should have created_at column');
    assert.ok(migrationContent.includes('updated_at TIMESTAMPTZ NOT NULL'), 'Should have updated_at column');
  });

  test('Table has user_role constraint', async () => {
    if (!migrationContent) {
      migrationContent = await fs.readFile('./migrations/010_create_translation_preferences_table.sql', 'utf-8');
    }

    assert.ok(
      migrationContent.includes("CHECK (user_role IN ('A', 'B'))"),
      'Should constrain user_role to A or B'
    );
  });

  test('Table has foreign key to messages', async () => {
    if (!migrationContent) {
      migrationContent = await fs.readFile('./migrations/010_create_translation_preferences_table.sql', 'utf-8');
    }

    assert.ok(
      migrationContent.includes('REFERENCES messages(id)'),
      'Should reference messages table'
    );
    assert.ok(
      migrationContent.includes('ON DELETE CASCADE'),
      'Should cascade delete when message is deleted'
    );
  });

  test('Table has unique constraint on user_role and message_id', async () => {
    if (!migrationContent) {
      migrationContent = await fs.readFile('./migrations/010_create_translation_preferences_table.sql', 'utf-8');
    }

    assert.ok(
      migrationContent.includes('UNIQUE(user_role, message_id)'),
      'Should have unique constraint on user_role and message_id'
    );
  });

  test('Table has indexes for performance', async () => {
    if (!migrationContent) {
      migrationContent = await fs.readFile('./migrations/010_create_translation_preferences_table.sql', 'utf-8');
    }

    assert.ok(
      migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_translation_preferences_user_message'),
      'Should create index on user_role and message_id'
    );
    assert.ok(
      migrationContent.includes('ON translation_preferences(user_role, message_id)'),
      'Index should be on user_role and message_id columns'
    );
    assert.ok(
      migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_translation_preferences_message'),
      'Should create index on message_id'
    );
    assert.ok(
      migrationContent.includes('ON translation_preferences(message_id)'),
      'Index should be on message_id column'
    );
  });

  test('Migration has proper documentation', async () => {
    if (!migrationContent) {
      migrationContent = await fs.readFile('./migrations/010_create_translation_preferences_table.sql', 'utf-8');
    }

    assert.ok(
      migrationContent.includes('-- Migration:'),
      'Should have migration description'
    );
    assert.ok(
      migrationContent.includes('-- Requirements:'),
      'Should reference requirements'
    );
    assert.ok(
      migrationContent.includes('8.2') || migrationContent.includes('8.4'),
      'Should reference requirement 8.2 or 8.4'
    );
  });

  test('Table has default values', async () => {
    if (!migrationContent) {
      migrationContent = await fs.readFile('./migrations/010_create_translation_preferences_table.sql', 'utf-8');
    }

    assert.ok(
      migrationContent.includes('DEFAULT gen_random_uuid()'),
      'Should have default UUID generation for id'
    );
    assert.ok(
      migrationContent.includes('DEFAULT true'),
      'Should have default value for show_original'
    );
    assert.ok(
      migrationContent.includes('DEFAULT NOW()'),
      'Should have default timestamp for created_at and updated_at'
    );
  });
});
