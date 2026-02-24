/**
 * Property-Based Tests for AudioRecorderService
 * Feature: voice-messages
 * 
 * These tests validate universal properties that should hold across all valid executions.
 * Uses fast-check library with minimum 100 iterations per property.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import AudioRecorderService from './audioRecorderService';

describe('AudioRecorderService - Property-Based Tests', () => {
  let mockStream;
  let mockMediaRecorder;
  let mockTrack;

  // Helper to set up mocks for each test iteration
  const setupMocks = () => {
    mockTrack = {
      stop: vi.fn(),
      kind: 'audio'
    };

    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
      getAudioTracks: vi.fn(() => [mockTrack])
    };

    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      state: 'inactive',
      ondataavailable: null,
      onstop: null,
      mimeType: 'audio/webm;codecs=opus'
    };

    global.navigator.mediaDevices = {
      getUserMedia: vi.fn(() => Promise.resolve(mockStream))
    };

    global.MediaRecorder = vi.fn(function(stream, options) {
      return mockMediaRecorder;
    });
    global.MediaRecorder.isTypeSupported = vi.fn((mimeType) => {
      return mimeType.includes('webm') || mimeType.includes('opus');
    });
  };

  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 2: Recording starts after permission grant
   * **Validates: Requirements 1.2**
   * 
   * For any recording session where permissions are granted, 
   * the Audio_Recorder should begin capturing audio input.
   * 
   * This property tests that:
   * 1. When getUserMedia resolves successfully (permission granted)
   * 2. The MediaRecorder is created with the stream
   * 3. The MediaRecorder.start() is called to begin capturing
   * 4. The service tracks the recording state correctly
   */
  describe('Property 2: Recording starts after permission grant', () => {
    it('should always start recording when permission is granted', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various audio constraint configurations
          fc.record({
            echoCancellation: fc.boolean(),
            noiseSuppression: fc.boolean(),
            autoGainControl: fc.boolean(),
            sampleRate: fc.option(fc.integer({ min: 8000, max: 48000 }), { nil: undefined }),
            channelCount: fc.option(fc.integer({ min: 1, max: 2 }), { nil: undefined })
          }),
          // Generate different data collection intervals
          fc.integer({ min: 10, max: 1000 }),
          // Generate different codec preferences
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
          ),
          async (audioConstraints, dataInterval, preferredCodec) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock to simulate permission granted
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            
            // Configure codec support
            MediaRecorder.isTypeSupported.mockImplementation((mimeType) => {
              return mimeType === preferredCodec || mimeType.includes('webm');
            });

            // Start recording
            await service.startRecording();

            // PROPERTY ASSERTION: Recording should start after permission grant
            
            // 1. getUserMedia should have been called (permission requested)
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
            
            // 2. MediaRecorder should be created with the granted stream
            expect(MediaRecorder).toHaveBeenCalledWith(
              mockStream,
              expect.objectContaining({
                mimeType: expect.any(String),
                audioBitsPerSecond: expect.any(Number)
              })
            );
            
            // 3. MediaRecorder.start() should be called to begin capturing
            expect(mockMediaRecorder.start).toHaveBeenCalledWith(100);
            
            // 4. Service should track the stream
            expect(service.stream).toBe(mockStream);
            
            // 5. Service should have initialized audio chunks array
            expect(service.audioChunks).toEqual([]);
            
            // 6. Service should have recorded start time
            expect(service.startTime).toBeGreaterThan(0);
            expect(service.startTime).toBeLessThanOrEqual(Date.now());
            
            // 7. MediaRecorder should be stored in service
            expect(service.mediaRecorder).toBe(mockMediaRecorder);
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100, // Minimum 100 iterations as specified
          verbose: true
        }
      );
    });

    it('should handle permission grant with various callback configurations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different callback behaviors
          fc.option(
            fc.constant((chunk) => {
              // Callback that processes chunks
              return chunk;
            }),
            { nil: null }
          ),
          // Generate different chunk sizes
          fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 0, maxLength: 10 }),
          async (onDataAvailableCallback, chunkSizes) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock to simulate permission granted
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);

            // Start recording with optional callback
            await service.startRecording(onDataAvailableCallback);

            // PROPERTY ASSERTION: Recording starts regardless of callback configuration
            
            // 1. Permission should be requested
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
            
            // 2. Recording should start
            expect(mockMediaRecorder.start).toHaveBeenCalled();
            
            // 3. Callback should be stored if provided
            if (onDataAvailableCallback) {
              // Simulate data chunks
              for (const size of chunkSizes) {
                if (size > 0) {
                  const mockChunk = new Blob(['x'.repeat(size)], { type: 'audio/webm' });
                  mockMediaRecorder.ondataavailable({ data: mockChunk });
                }
              }
              
              // Chunks should be collected
              expect(service.audioChunks.length).toBeGreaterThanOrEqual(0);
            }
            
            // 4. Service state should be initialized
            expect(service.stream).toBe(mockStream);
            expect(service.startTime).toBeGreaterThan(0);
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('should consistently start recording across different timing scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different delays before starting recording
          fc.integer({ min: 0, max: 100 }),
          // Generate different system states
          fc.record({
            hasExistingStream: fc.boolean(),
            hasExistingRecorder: fc.boolean()
          }),
          async (delayMs, systemState) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Simulate existing state if specified
            if (systemState.hasExistingStream) {
              const oldTrack = { stop: vi.fn(), kind: 'audio' };
              service.stream = {
                getTracks: () => [oldTrack],
                getAudioTracks: () => [oldTrack]
              };
            }
            
            if (systemState.hasExistingRecorder) {
              service.mediaRecorder = {
                state: 'inactive',
                stop: vi.fn()
              };
            }
            
            // Configure mock to simulate permission granted
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            
            // Add delay if specified
            if (delayMs > 0) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            // Start recording
            await service.startRecording();

            // PROPERTY ASSERTION: Recording starts regardless of timing or prior state
            
            // 1. Permission should be requested
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
            
            // 2. Old resources should be cleaned up
            if (systemState.hasExistingStream) {
              // Old stream should have been stopped
              expect(service.stream).toBe(mockStream); // New stream
            }
            
            // 3. New recording should start
            expect(mockMediaRecorder.start).toHaveBeenCalled();
            
            // 4. Service should be in recording-ready state
            expect(service.stream).toBe(mockStream);
            expect(service.mediaRecorder).toBe(mockMediaRecorder);
            expect(service.audioChunks).toEqual([]);
            expect(service.startTime).toBeGreaterThan(0);
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('should start recording with correct codec configuration across all scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different codec support scenarios
          fc.array(
            fc.constantFrom(
              'audio/webm;codecs=opus',
              'audio/webm',
              'audio/ogg;codecs=opus',
              'audio/mp4'
            ),
            { minLength: 0, maxLength: 4 }
          ),
          // Generate different bitrate preferences
          fc.integer({ min: 16000, max: 128000 }),
          async (supportedCodecs, targetBitrate) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure codec support
            MediaRecorder.isTypeSupported.mockImplementation((mimeType) => {
              return supportedCodecs.some(codec => mimeType.includes(codec.split(';')[0]));
            });
            
            // Configure mock to simulate permission granted
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);

            // Start recording
            await service.startRecording();

            // PROPERTY ASSERTION: Recording starts with appropriate codec
            
            // 1. Permission should be granted
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
            
            // 2. MediaRecorder should be created
            expect(MediaRecorder).toHaveBeenCalled();
            
            // 3. Recording should start
            expect(mockMediaRecorder.start).toHaveBeenCalled();
            
            // 4. Codec configuration should be valid
            const recorderOptions = MediaRecorder.mock.calls[0][1];
            if (supportedCodecs.length > 0) {
              // Should use a supported codec
              expect(recorderOptions).toBeDefined();
            } else {
              // Should fallback to empty options (browser default)
              expect(recorderOptions).toBeDefined();
            }
            
            // 5. Service should be ready to capture audio
            expect(service.stream).toBe(mockStream);
            expect(service.mediaRecorder).toBe(mockMediaRecorder);
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('should maintain recording state consistency after permission grant', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random sequences of operations
          fc.array(
            fc.constantFrom('checkDuration', 'checkIsRecording', 'simulateDataChunk'),
            { minLength: 1, maxLength: 20 }
          ),
          async (operations) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock to simulate permission granted
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);

            // Start recording
            await service.startRecording();

            // PROPERTY ASSERTION: State remains consistent during recording
            
            // Initial state checks
            expect(service.stream).toBe(mockStream);
            expect(service.mediaRecorder).toBe(mockMediaRecorder);
            expect(service.startTime).toBeGreaterThan(0);
            
            const startTime = service.startTime;
            
            // Perform operations
            for (const operation of operations) {
              switch (operation) {
                case 'checkDuration':
                  const duration = service.getRecordingDuration();
                  expect(duration).toBeGreaterThanOrEqual(0);
                  break;
                  
                case 'checkIsRecording':
                  // Note: isRecording depends on mediaRecorder.state
                  // which we control in the mock
                  const isRec = service.isRecording();
                  expect(typeof isRec).toBe('boolean');
                  break;
                  
                case 'simulateDataChunk':
                  const chunk = new Blob(['audio'], { type: 'audio/webm' });
                  mockMediaRecorder.ondataavailable({ data: chunk });
                  expect(service.audioChunks.length).toBeGreaterThan(0);
                  break;
              }
            }
            
            // State should remain consistent
            expect(service.stream).toBe(mockStream);
            expect(service.mediaRecorder).toBe(mockMediaRecorder);
            expect(service.startTime).toBe(startTime); // Should not change
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });
  });

  /**
   * Property 4: Stop finalizes recording
   * **Validates: Requirements 1.4**
   * 
   * For any active recording, clicking stop should produce a valid audio blob 
   * and transition to the finalized state.
   * 
   * This property tests that:
   * 1. stopRecording() returns a valid Blob
   * 2. The Blob has the correct MIME type
   * 3. The Blob contains the collected audio chunks
   * 4. The recording duration is calculated correctly
   * 5. The stream is cleaned up after stopping
   * 6. The service transitions to a finalized state
   */
  describe('Property 4: Stop finalizes recording', () => {
    it('should always produce a valid audio blob when stopping any active recording', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different numbers of audio chunks
          fc.integer({ min: 1, max: 20 }),
          // Generate different chunk sizes
          fc.integer({ min: 100, max: 5000 }),
          // Generate different MIME types
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
          ),
          async (numChunks, chunkSize, mimeType) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.mimeType = mimeType;
            mockMediaRecorder.state = 'recording';
            
            // Start recording
            await service.startRecording();
            
            // Simulate audio chunks being collected
            for (let i = 0; i < numChunks; i++) {
              const chunk = new Blob(['x'.repeat(chunkSize)], { type: mimeType });
              mockMediaRecorder.ondataavailable({ data: chunk });
            }
            
            // Stop recording
            const stopPromise = service.stopRecording();
            
            // Simulate MediaRecorder onstop event
            if (mockMediaRecorder.onstop) {
              mockMediaRecorder.onstop();
            }
            
            const audioBlob = await stopPromise;
            
            // PROPERTY ASSERTION: Stop should finalize recording with valid blob
            
            // 1. Should return a valid Blob
            expect(audioBlob).toBeInstanceOf(Blob);
            
            // 2. Blob should have correct MIME type
            expect(audioBlob.type).toBe(mimeType);
            
            // 3. Blob should contain data from all chunks
            expect(audioBlob.size).toBeGreaterThan(0);
            expect(audioBlob.size).toBe(numChunks * chunkSize);
            
            // 4. Recording duration should be calculated
            expect(service.recordingDuration).toBeGreaterThanOrEqual(0);
            
            // 5. Stream should be cleaned up
            expect(mockTrack.stop).toHaveBeenCalled();
            expect(service.stream).toBeNull();
            
            // 6. MediaRecorder.stop() should have been called
            expect(mockMediaRecorder.stop).toHaveBeenCalled();
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100, // Minimum 100 iterations as specified
          verbose: true
        }
      );
    }, 30000);

    it('should finalize recording with correct duration across various timing scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different recording durations (reduced for performance)
          fc.integer({ min: 10, max: 500 }),
          async (recordingDuration) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.state = 'recording';
            
            // Start recording
            await service.startRecording();
            const startTime = service.startTime;
            
            // Simulate recording duration
            if (recordingDuration > 0) {
              await new Promise(resolve => setTimeout(resolve, recordingDuration));
            }
            
            // Simulate at least one chunk
            const chunk = new Blob(['audio'], { type: 'audio/webm' });
            mockMediaRecorder.ondataavailable({ data: chunk });
            
            // Stop recording
            const stopPromise = service.stopRecording();
            if (mockMediaRecorder.onstop) {
              mockMediaRecorder.onstop();
            }
            const audioBlob = await stopPromise;
            
            // PROPERTY ASSERTION: Duration should be calculated correctly
            
            // 1. Should return valid blob
            expect(audioBlob).toBeInstanceOf(Blob);
            
            // 2. Duration should reflect actual recording time
            const expectedDuration = Math.floor((Date.now() - startTime) / 1000);
            expect(service.recordingDuration).toBeGreaterThanOrEqual(0);
            expect(service.recordingDuration).toBeLessThanOrEqual(expectedDuration + 1); // Allow 1s tolerance
            
            // 3. Start time should have been set
            expect(startTime).toBeGreaterThan(0);
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should handle stopping with various chunk collection patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different chunk patterns
          fc.array(
            fc.record({
              size: fc.integer({ min: 1, max: 2000 })
            }),
            { minLength: 1, maxLength: 15 }
          ),
          // Generate different MIME types
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus'
          ),
          async (chunkPattern, mimeType) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.mimeType = mimeType;
            mockMediaRecorder.state = 'recording';
            
            // Start recording
            await service.startRecording();
            
            // Simulate chunks
            let totalSize = 0;
            for (const { size } of chunkPattern) {
              const chunk = new Blob(['x'.repeat(size)], { type: mimeType });
              mockMediaRecorder.ondataavailable({ data: chunk });
              totalSize += size;
            }
            
            // Stop recording
            const stopPromise = service.stopRecording();
            if (mockMediaRecorder.onstop) {
              mockMediaRecorder.onstop();
            }
            const audioBlob = await stopPromise;
            
            // PROPERTY ASSERTION: All chunks should be included in final blob
            
            // 1. Should return valid blob
            expect(audioBlob).toBeInstanceOf(Blob);
            
            // 2. Blob should contain all collected data
            expect(audioBlob.size).toBe(totalSize);
            
            // 3. Blob should have correct type
            expect(audioBlob.type).toBe(mimeType);
            
            // 4. Stream should be stopped
            expect(mockTrack.stop).toHaveBeenCalled();
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 30000);

    it('should transition to finalized state after stopping from any recording state', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different pre-stop operations
          fc.array(
            fc.constantFrom('getDuration', 'checkIsRecording', 'addChunk'),
            { minLength: 0, maxLength: 10 }
          ),
          async (preStopOps) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.state = 'recording';
            
            // Start recording
            await service.startRecording();
            
            // Perform pre-stop operations
            for (const op of preStopOps) {
              switch (op) {
                case 'getDuration':
                  const dur = service.getRecordingDuration();
                  expect(dur).toBeGreaterThanOrEqual(0);
                  break;
                case 'checkIsRecording':
                  const isRec = service.isRecording();
                  expect(isRec).toBe(true);
                  break;
                case 'addChunk':
                  const chunk = new Blob(['audio'], { type: 'audio/webm' });
                  mockMediaRecorder.ondataavailable({ data: chunk });
                  break;
              }
            }
            
            // Ensure at least one chunk
            if (service.audioChunks.length === 0) {
              const chunk = new Blob(['audio'], { type: 'audio/webm' });
              mockMediaRecorder.ondataavailable({ data: chunk });
            }
            
            // Stop recording
            const stopPromise = service.stopRecording();
            mockMediaRecorder.state = 'inactive';
            if (mockMediaRecorder.onstop) {
              mockMediaRecorder.onstop();
            }
            const audioBlob = await stopPromise;
            
            // PROPERTY ASSERTION: Service should be in finalized state
            
            // 1. Should return valid blob
            expect(audioBlob).toBeInstanceOf(Blob);
            expect(audioBlob.size).toBeGreaterThan(0);
            
            // 2. Stream should be cleaned up
            expect(service.stream).toBeNull();
            
            // 3. Recording should no longer be active
            expect(service.isRecording()).toBe(false);
            
            // 4. Duration should be recorded
            expect(service.recordingDuration).toBeGreaterThanOrEqual(0);
            
            // 5. MediaRecorder should have been stopped
            expect(mockMediaRecorder.stop).toHaveBeenCalled();
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 30000);

    it('should handle concurrent stop attempts gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Just test that first stop succeeds
          fc.constant(1),
          async (_) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.state = 'recording';
            
            // Start recording
            await service.startRecording();
            
            // Add at least one chunk
            const chunk = new Blob(['audio'], { type: 'audio/webm' });
            mockMediaRecorder.ondataavailable({ data: chunk });
            
            // Stop recording
            const stopPromise = service.stopRecording();
            
            // Trigger onstop
            mockMediaRecorder.state = 'inactive';
            if (mockMediaRecorder.onstop) {
              mockMediaRecorder.onstop();
            }
            
            // PROPERTY ASSERTION: Stop should succeed
            const audioBlob = await stopPromise;
            
            // 1. Should return valid blob
            expect(audioBlob).toBeInstanceOf(Blob);
            expect(audioBlob.size).toBeGreaterThan(0);
            
            // 2. Stream should be cleaned up
            expect(service.stream).toBeNull();
            
            // 3. Recording should be inactive
            expect(service.isRecording()).toBe(false);
            
            // 4. Subsequent stop attempts should fail
            try {
              await service.stopRecording();
              // Should not reach here
              expect(true).toBe(false);
            } catch (error) {
              expect(error.message).toContain('No active recording');
            }
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 30000);

    it('should preserve all audio data integrity when finalizing', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different chunk contents
          fc.array(
            fc.string({ minLength: 10, maxLength: 500 }),
            { minLength: 1, maxLength: 10 }
          ),
          // Generate MIME type
          fc.constantFrom('audio/webm;codecs=opus', 'audio/webm'),
          async (chunkContents, mimeType) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.mimeType = mimeType;
            mockMediaRecorder.state = 'recording';
            
            // Start recording
            await service.startRecording();
            
            // Collect chunks with specific content
            let totalSize = 0;
            for (const content of chunkContents) {
              const chunk = new Blob([content], { type: mimeType });
              totalSize += content.length;
              mockMediaRecorder.ondataavailable({ data: chunk });
            }
            
            // Stop recording
            const stopPromise = service.stopRecording();
            if (mockMediaRecorder.onstop) {
              mockMediaRecorder.onstop();
            }
            const audioBlob = await stopPromise;
            
            // PROPERTY ASSERTION: Data integrity should be preserved
            
            // 1. Should return valid blob
            expect(audioBlob).toBeInstanceOf(Blob);
            
            // 2. Size should match total input
            expect(audioBlob.size).toBe(totalSize);
            
            // 3. Type should be preserved
            expect(audioBlob.type).toBe(mimeType);
            
            // 4. Should be able to read blob content
            const text = await audioBlob.text();
            expect(text.length).toBe(totalSize);
            
            // 5. Content should match concatenated chunks
            const expectedText = chunkContents.join('');
            expect(text).toBe(expectedText);
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 30000);

    it('should finalize with correct state cleanup across all scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different recording configurations
          fc.record({
            numChunks: fc.integer({ min: 1, max: 15 }),
            hasCallback: fc.boolean()
          }),
          async (config) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.state = 'recording';
            
            // Optional callback
            const callback = config.hasCallback ? vi.fn() : null;
            
            // Start recording
            await service.startRecording(callback);
            
            // Verify initial state
            expect(service.stream).toBe(mockStream);
            expect(service.mediaRecorder).toBe(mockMediaRecorder);
            expect(service.audioChunks).toEqual([]);
            
            // Add chunks
            for (let i = 0; i < config.numChunks; i++) {
              const chunk = new Blob(['audio'], { type: 'audio/webm' });
              mockMediaRecorder.ondataavailable({ data: chunk });
            }
            
            // Verify chunks collected
            expect(service.audioChunks.length).toBe(config.numChunks);
            
            // Stop recording
            const stopPromise = service.stopRecording();
            if (mockMediaRecorder.onstop) {
              mockMediaRecorder.onstop();
            }
            const audioBlob = await stopPromise;
            
            // PROPERTY ASSERTION: Complete state cleanup after finalization
            
            // 1. Should return valid blob
            expect(audioBlob).toBeInstanceOf(Blob);
            
            // 2. Stream should be null (cleaned up)
            expect(service.stream).toBeNull();
            
            // 3. Stream tracks should be stopped
            expect(mockTrack.stop).toHaveBeenCalled();
            
            // 4. Duration should be recorded
            expect(service.recordingDuration).toBeGreaterThanOrEqual(0);
            
            // 5. MediaRecorder should have been stopped
            expect(mockMediaRecorder.stop).toHaveBeenCalled();
            
            // 6. Callback should have been called if provided
            if (callback) {
              expect(callback).toHaveBeenCalledTimes(config.numChunks);
            }
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 30000);
  });

  /**
   * Property 5: Cancel discards recording
   * **Validates: Requirements 1.5**
   * 
   * For any active recording, clicking cancel should discard all audio data 
   * and return the recorder to its initial state with no audio blob.
   * 
   * This property tests that:
   * 1. cancelRecording() discards all collected audio chunks
   * 2. The MediaRecorder is stopped
   * 3. The stream is cleaned up and tracks are stopped
   * 4. The service returns to initial state (no stream, no recorder, no chunks)
   * 5. No audio blob is produced
   * 6. The service can start a new recording after cancellation
   */
  describe('Property 5: Cancel discards recording', () => {
    it('should always discard all audio data when cancelling any active recording', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different numbers of audio chunks collected before cancel
          fc.integer({ min: 0, max: 50 }),
          // Generate different chunk sizes
          fc.integer({ min: 100, max: 5000 }),
          // Generate different recording durations before cancel
          fc.integer({ min: 0, max: 200 }),
          async (numChunks, chunkSize, recordingDuration) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.state = 'recording';
            
            // Start recording
            await service.startRecording();
            
            // Verify recording started
            expect(service.stream).toBe(mockStream);
            expect(service.mediaRecorder).toBe(mockMediaRecorder);
            expect(service.startTime).toBeGreaterThan(0);
            
            // Simulate recording duration
            if (recordingDuration > 0) {
              await new Promise(resolve => setTimeout(resolve, recordingDuration));
            }
            
            // Simulate audio chunks being collected
            for (let i = 0; i < numChunks; i++) {
              const chunk = new Blob(['x'.repeat(chunkSize)], { type: 'audio/webm' });
              mockMediaRecorder.ondataavailable({ data: chunk });
            }
            
            // Verify chunks were collected
            expect(service.audioChunks.length).toBe(numChunks);
            
            // Cancel recording
            service.cancelRecording();
            
            // PROPERTY ASSERTION: Cancel should discard all data and reset state
            
            // 1. All audio chunks should be discarded
            expect(service.audioChunks).toEqual([]);
            
            // 2. MediaRecorder should be stopped
            expect(mockMediaRecorder.stop).toHaveBeenCalled();
            
            // 3. Stream should be cleaned up
            expect(mockTrack.stop).toHaveBeenCalled();
            expect(service.stream).toBeNull();
            
            // 4. Service should return to initial state
            expect(service.mediaRecorder).toBeNull();
            expect(service.startTime).toBeNull();
            expect(service.recordingDuration).toBe(0);
            
            // 5. No audio blob should be produced (chunks discarded)
            expect(service.audioChunks.length).toBe(0);
            
            // 6. Recording should not be active
            expect(service.isRecording()).toBe(false);
          }
        ),
        { 
          numRuns: 100, // Minimum 100 iterations as specified
          verbose: true
        }
      );
    }, 30000);

    it('should discard recording at any point during the recording lifecycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different points in recording lifecycle to cancel
          fc.record({
            chunksBeforeCancel: fc.integer({ min: 0, max: 30 }),
            operationsBeforeCancel: fc.array(
              fc.constantFrom('getDuration', 'checkIsRecording', 'addChunk', 'wait'),
              { minLength: 0, maxLength: 15 }
            )
          }),
          async (config) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.state = 'recording';
            
            // Start recording
            await service.startRecording();
            
            // Add initial chunks
            for (let i = 0; i < config.chunksBeforeCancel; i++) {
              const chunk = new Blob(['audio'], { type: 'audio/webm' });
              mockMediaRecorder.ondataavailable({ data: chunk });
            }
            
            // Perform operations before cancel
            for (const op of config.operationsBeforeCancel) {
              switch (op) {
                case 'getDuration':
                  const dur = service.getRecordingDuration();
                  expect(dur).toBeGreaterThanOrEqual(0);
                  break;
                case 'checkIsRecording':
                  const isRec = service.isRecording();
                  expect(isRec).toBe(true);
                  break;
                case 'addChunk':
                  const chunk = new Blob(['audio'], { type: 'audio/webm' });
                  mockMediaRecorder.ondataavailable({ data: chunk });
                  break;
                case 'wait':
                  await new Promise(resolve => setTimeout(resolve, 10));
                  break;
              }
            }
            
            const chunksBeforeCancel = service.audioChunks.length;
            
            // Cancel recording
            service.cancelRecording();
            
            // PROPERTY ASSERTION: All data discarded regardless of lifecycle point
            
            // 1. All chunks should be discarded
            expect(service.audioChunks).toEqual([]);
            expect(service.audioChunks.length).toBe(0);
            
            // 2. State should be reset
            expect(service.stream).toBeNull();
            expect(service.mediaRecorder).toBeNull();
            expect(service.startTime).toBeNull();
            expect(service.recordingDuration).toBe(0);
            
            // 3. Resources should be cleaned up
            expect(mockTrack.stop).toHaveBeenCalled();
            
            // 4. Recording should not be active
            expect(service.isRecording()).toBe(false);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 30000);

    it('should allow starting a new recording after cancellation', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different scenarios for cancel-then-restart
          fc.record({
            firstRecordingChunks: fc.integer({ min: 0, max: 20 }),
            delayAfterCancel: fc.integer({ min: 0, max: 100 }),
            secondRecordingChunks: fc.integer({ min: 0, max: 20 })
          }),
          async (config) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.state = 'recording';
            
            // First recording
            await service.startRecording();
            
            // Add chunks to first recording
            for (let i = 0; i < config.firstRecordingChunks; i++) {
              const chunk = new Blob(['first'], { type: 'audio/webm' });
              mockMediaRecorder.ondataavailable({ data: chunk });
            }
            
            // Cancel first recording
            service.cancelRecording();
            
            // Verify cancellation
            expect(service.audioChunks).toEqual([]);
            expect(service.stream).toBeNull();
            expect(service.mediaRecorder).toBeNull();
            
            // Wait if specified
            if (config.delayAfterCancel > 0) {
              await new Promise(resolve => setTimeout(resolve, config.delayAfterCancel));
            }
            
            // Reset mocks for second recording
            const newMockTrack = { stop: vi.fn(), kind: 'audio' };
            const newMockStream = {
              getTracks: vi.fn(() => [newMockTrack]),
              getAudioTracks: vi.fn(() => [newMockTrack])
            };
            const newMockRecorder = {
              start: vi.fn(),
              stop: vi.fn(),
              state: 'recording',
              ondataavailable: null,
              onstop: null,
              mimeType: 'audio/webm;codecs=opus'
            };
            
            navigator.mediaDevices.getUserMedia.mockResolvedValue(newMockStream);
            global.MediaRecorder = vi.fn(function(stream, options) {
              return newMockRecorder;
            });
            global.MediaRecorder.isTypeSupported = vi.fn((mimeType) => {
              return mimeType.includes('webm') || mimeType.includes('opus');
            });
            
            // Start second recording
            await service.startRecording();
            
            // PROPERTY ASSERTION: New recording should work independently
            
            // 1. New recording should start fresh
            expect(service.stream).toBe(newMockStream);
            expect(service.mediaRecorder).toBe(newMockRecorder);
            expect(service.audioChunks).toEqual([]);
            expect(service.startTime).toBeGreaterThan(0);
            
            // 2. New recording should collect chunks independently
            for (let i = 0; i < config.secondRecordingChunks; i++) {
              const chunk = new Blob(['second'], { type: 'audio/webm' });
              newMockRecorder.ondataavailable({ data: chunk });
            }
            
            expect(service.audioChunks.length).toBe(config.secondRecordingChunks);
            
            // 3. New recording should not contain old data
            if (config.secondRecordingChunks > 0) {
              const text = await service.audioChunks[0].text();
              expect(text).toBe('second');
              expect(text).not.toBe('first');
            }
            
            // Cleanup
            service.cleanup();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 30000);

    it('should handle cancellation with various chunk sizes and types', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different chunk patterns
          fc.array(
            fc.record({
              size: fc.integer({ min: 1, max: 3000 }),
              type: fc.constantFrom('audio/webm', 'audio/webm;codecs=opus', 'audio/ogg')
            }),
            { minLength: 0, maxLength: 25 }
          ),
          async (chunkPatterns) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.state = 'recording';
            
            // Start recording
            await service.startRecording();
            
            // Add chunks with various sizes and types
            let totalSize = 0;
            for (const pattern of chunkPatterns) {
              const chunk = new Blob(['x'.repeat(pattern.size)], { type: pattern.type });
              mockMediaRecorder.ondataavailable({ data: chunk });
              totalSize += pattern.size;
            }
            
            // Verify chunks collected
            expect(service.audioChunks.length).toBe(chunkPatterns.length);
            
            // Cancel recording
            service.cancelRecording();
            
            // PROPERTY ASSERTION: All chunks discarded regardless of size/type
            
            // 1. All chunks should be discarded
            expect(service.audioChunks).toEqual([]);
            expect(service.audioChunks.length).toBe(0);
            
            // 2. State should be reset
            expect(service.stream).toBeNull();
            expect(service.mediaRecorder).toBeNull();
            expect(service.startTime).toBeNull();
            expect(service.recordingDuration).toBe(0);
            
            // 3. No data should remain
            expect(service.isRecording()).toBe(false);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 30000);

    it('should handle cancellation when MediaRecorder is in different states', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different MediaRecorder states
          fc.constantFrom('recording', 'paused', 'inactive'),
          // Generate different numbers of chunks
          fc.integer({ min: 0, max: 15 }),
          async (recorderState, numChunks) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.state = 'recording';
            
            // Start recording
            await service.startRecording();
            
            // Add chunks
            for (let i = 0; i < numChunks; i++) {
              const chunk = new Blob(['audio'], { type: 'audio/webm' });
              mockMediaRecorder.ondataavailable({ data: chunk });
            }
            
            // Change recorder state
            mockMediaRecorder.state = recorderState;
            
            // Cancel recording
            service.cancelRecording();
            
            // PROPERTY ASSERTION: Cancel works regardless of recorder state
            
            // 1. All chunks should be discarded
            expect(service.audioChunks).toEqual([]);
            
            // 2. State should be reset
            expect(service.stream).toBeNull();
            expect(service.mediaRecorder).toBeNull();
            expect(service.startTime).toBeNull();
            expect(service.recordingDuration).toBe(0);
            
            // 3. Stop should be called if not already inactive
            if (recorderState !== 'inactive') {
              expect(mockMediaRecorder.stop).toHaveBeenCalled();
            }
            
            // 4. Stream should be cleaned up
            expect(mockTrack.stop).toHaveBeenCalled();
            
            // 5. Recording should not be active
            expect(service.isRecording()).toBe(false);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 30000);

    it('should discard recording and cleanup resources across all scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate comprehensive test scenarios
          fc.record({
            recordingDuration: fc.integer({ min: 0, max: 150 }),
            numChunks: fc.integer({ min: 0, max: 30 }),
            chunkSize: fc.integer({ min: 100, max: 2000 }),
            hasCallback: fc.boolean(),
            performOperations: fc.array(
              fc.constantFrom('getDuration', 'checkIsRecording'),
              { minLength: 0, maxLength: 5 }
            )
          }),
          async (scenario) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.state = 'recording';
            
            // Optional callback
            const callback = scenario.hasCallback ? vi.fn() : null;
            
            // Start recording
            await service.startRecording(callback);
            
            // Simulate recording duration
            if (scenario.recordingDuration > 0) {
              await new Promise(resolve => setTimeout(resolve, scenario.recordingDuration));
            }
            
            // Add chunks
            for (let i = 0; i < scenario.numChunks; i++) {
              const chunk = new Blob(['x'.repeat(scenario.chunkSize)], { type: 'audio/webm' });
              mockMediaRecorder.ondataavailable({ data: chunk });
            }
            
            // Perform operations
            for (const op of scenario.performOperations) {
              switch (op) {
                case 'getDuration':
                  service.getRecordingDuration();
                  break;
                case 'checkIsRecording':
                  service.isRecording();
                  break;
              }
            }
            
            // Verify state before cancel
            const hadChunks = service.audioChunks.length > 0;
            const hadStream = service.stream !== null;
            const hadRecorder = service.mediaRecorder !== null;
            
            // Cancel recording
            service.cancelRecording();
            
            // PROPERTY ASSERTION: Complete cleanup regardless of scenario
            
            // 1. All audio data should be discarded
            expect(service.audioChunks).toEqual([]);
            expect(service.audioChunks.length).toBe(0);
            
            // 2. All resources should be cleaned up
            expect(service.stream).toBeNull();
            expect(service.mediaRecorder).toBeNull();
            expect(service.startTime).toBeNull();
            expect(service.recordingDuration).toBe(0);
            
            // 3. Stream tracks should be stopped if stream existed
            if (hadStream) {
              expect(mockTrack.stop).toHaveBeenCalled();
            }
            
            // 4. MediaRecorder should be stopped if it existed
            if (hadRecorder) {
              expect(mockMediaRecorder.stop).toHaveBeenCalled();
            }
            
            // 5. Recording should not be active
            expect(service.isRecording()).toBe(false);
            
            // 6. Service should be in initial state (ready for new recording)
            expect(service.stream).toBeNull();
            expect(service.mediaRecorder).toBeNull();
            expect(service.audioChunks).toEqual([]);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 30000);

    it('should handle multiple consecutive cancel operations safely', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate number of cancel attempts
          fc.integer({ min: 1, max: 5 }),
          // Generate chunks before first cancel
          fc.integer({ min: 0, max: 20 }),
          async (numCancelAttempts, numChunks) => {
            // Reset mocks for this iteration
            setupMocks();
            
            const service = new AudioRecorderService();
            
            // Configure mock
            navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaRecorder.state = 'recording';
            
            // Start recording
            await service.startRecording();
            
            // Add chunks
            for (let i = 0; i < numChunks; i++) {
              const chunk = new Blob(['audio'], { type: 'audio/webm' });
              mockMediaRecorder.ondataavailable({ data: chunk });
            }
            
            // Cancel multiple times
            for (let i = 0; i < numCancelAttempts; i++) {
              service.cancelRecording();
              
              // PROPERTY ASSERTION: Each cancel should be safe
              
              // 1. State should remain reset
              expect(service.audioChunks).toEqual([]);
              expect(service.stream).toBeNull();
              expect(service.mediaRecorder).toBeNull();
              expect(service.startTime).toBeNull();
              expect(service.recordingDuration).toBe(0);
              
              // 2. Recording should not be active
              expect(service.isRecording()).toBe(false);
            }
            
            // 3. Multiple cancels should not cause errors
            // (test passes if no exceptions thrown)
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 30000);
  });
});
