import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver for tests
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
};

// Mock Worker for tests (jsdom doesn't support Web Workers)
global.Worker = class Worker {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
  }
  
  postMessage(message) {
    // Mock worker - do nothing in tests
  }
  
  terminate() {
    // Mock terminate
  }
};
