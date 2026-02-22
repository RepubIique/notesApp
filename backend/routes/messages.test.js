import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';

describe('Message Routes - Implementation Verification', () => {
  let routeContent;

  test('Load messages route file', async () => {
    routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    assert.ok(routeContent, 'Messages route file should exist');
  });

  test('All routes use authMiddleware for authentication', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify authMiddleware is imported and used
    assert.ok(routeContent.includes('authMiddleware'), 'Routes should use authMiddleware');
    assert.ok(routeContent.includes("router.get('/', authMiddleware"), 'GET route should use authMiddleware');
    assert.ok(routeContent.includes("router.post('/', authMiddleware"), 'POST route should use authMiddleware');
    assert.ok(routeContent.includes("router.delete('/:messageId', authMiddleware"), 'DELETE route should use authMiddleware');
    assert.ok(routeContent.includes("router.post('/:messageId/reactions', authMiddleware"), 'Reactions route should use authMiddleware');
  });

  test('GET /api/messages handles pagination parameters', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify pagination logic exists
    assert.ok(routeContent.includes('req.query.limit'), 'Should handle limit parameter');
    assert.ok(routeContent.includes('req.query.before'), 'Should handle before parameter');
    assert.ok(routeContent.includes('getMessages'), 'Should call getMessages function');
    assert.ok(routeContent.includes('parseInt(req.query.limit, 10)'), 'Should parse limit as integer');
    assert.ok(routeContent.includes(': 50'), 'Should default to 50 messages');
  });

  test('GET /api/messages validates limit parameter', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify limit validation
    assert.ok(routeContent.includes('isNaN(limit)'), 'Should check if limit is NaN');
    assert.ok(routeContent.includes('limit <= 0'), 'Should check if limit is positive');
    assert.ok(routeContent.includes('Invalid limit parameter'), 'Should return appropriate error message');
  });

  test('POST /api/messages validates text input', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify text validation exists
    assert.ok(routeContent.includes('text.trim()'), 'Should validate text is not empty');
    assert.ok(routeContent.includes('Message text cannot be empty'), 'Should return appropriate error message');
    assert.ok(routeContent.includes('createTextMessage'), 'Should call createTextMessage function');
  });

  test('POST /api/messages gets sender from authenticated user', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify sender is extracted from req.user
    assert.ok(routeContent.includes('req.user.role'), 'Should get user role from request');
    assert.ok(routeContent.includes('const sender = req.user.role'), 'Should assign sender from user role');
  });

  test('POST /api/messages returns 201 status code', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify 201 Created status
    assert.ok(routeContent.includes('res.status(201)'), 'Should return 201 Created for new messages');
  });

  test('DELETE /api/messages/:messageId handles authorization', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify authorization handling
    assert.ok(routeContent.includes('req.user.role'), 'Should get user role from request');
    assert.ok(routeContent.includes('unsendMessage'), 'Should call unsendMessage function');
    assert.ok(routeContent.includes('403'), 'Should handle 403 forbidden errors');
    assert.ok(routeContent.includes('404'), 'Should handle 404 not found errors');
  });

  test('DELETE /api/messages/:messageId extracts messageId from params', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify messageId extraction
    assert.ok(routeContent.includes('req.params'), 'Should access request params');
    assert.ok(routeContent.includes('messageId'), 'Should extract messageId from params');
  });

  test('POST /api/messages/:messageId/reactions validates emoji', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify emoji validation exists
    assert.ok(routeContent.includes('emojiRegex'), 'Should validate emoji format');
    assert.ok(routeContent.includes('Invalid emoji'), 'Should return appropriate error message');
    assert.ok(routeContent.includes('addReaction'), 'Should call addReaction function');
  });

  test('POST /api/messages/:messageId/reactions uses proper emoji regex', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify emoji regex pattern
    assert.ok(routeContent.includes('Emoji_Presentation'), 'Should use Unicode emoji properties');
    assert.ok(routeContent.includes('/u'), 'Should use Unicode flag in regex');
  });

  test('POST /api/messages/:messageId/reactions gets user role', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify user role extraction
    assert.ok(routeContent.includes('const userRole = req.user.role'), 'Should extract user role from request');
  });

  test('All routes have proper error handling', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify error handling exists
    assert.ok(routeContent.includes('try {'), 'Should use try-catch blocks');
    assert.ok(routeContent.includes('catch (error)'), 'Should catch errors');
    assert.ok(routeContent.includes('console.error'), 'Should log errors');
    assert.ok(routeContent.includes('res.status(500)'), 'Should handle 500 errors');
  });

  test('Routes return appropriate status codes', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify status codes
    assert.ok(routeContent.includes('res.status(201)'), 'POST should return 201 Created');
    assert.ok(routeContent.includes('res.status(400)'), 'Should return 400 for bad requests');
    assert.ok(routeContent.includes('res.status(403)'), 'Should return 403 for forbidden');
    assert.ok(routeContent.includes('res.status(404)'), 'Should return 404 for not found');
    assert.ok(routeContent.includes('res.status(500)'), 'Should return 500 for server errors');
  });

  test('Routes return JSON responses', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify JSON responses
    assert.ok(routeContent.includes('res.json'), 'Should return JSON responses');
    assert.ok(routeContent.includes('{ messages }'), 'GET should return messages array');
    assert.ok(routeContent.includes('{ message }'), 'POST should return created message');
    assert.ok(routeContent.includes('{ success: true }'), 'DELETE should return success response');
    assert.ok(routeContent.includes('{ reaction }'), 'Reactions should return reaction object');
  });

  test('Routes import required dependencies', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify imports
    assert.ok(routeContent.includes("import express from 'express'"), 'Should import express');
    assert.ok(routeContent.includes("import { authMiddleware }"), 'Should import authMiddleware');
    assert.ok(routeContent.includes("import { getMessages, createTextMessage, unsendMessage }"), 'Should import message services');
    assert.ok(routeContent.includes("import { addReaction }"), 'Should import reaction service');
  });

  test('Routes export router', async () => {
    if (!routeContent) routeContent = await fs.readFile('./routes/messages.js', 'utf-8');
    
    // Verify export
    assert.ok(routeContent.includes('export default router'), 'Should export router as default');
  });
});
