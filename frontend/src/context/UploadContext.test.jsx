import { describe, it, expect, beforeEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { UploadProvider, useUpload } from './UploadContext';

describe('UploadContext', () => {
  describe('useUpload hook', () => {
    it('should throw error when used outside UploadProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};
      
      expect(() => {
        renderHook(() => useUpload());
      }).toThrow('useUpload must be used within an UploadProvider');
      
      console.error = originalError;
    });

    it('should provide upload context when used within UploadProvider', () => {
      const wrapper = ({ children }) => (
        <UploadProvider>{children}</UploadProvider>
      );
      
      const { result } = renderHook(() => useUpload(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(result.current.selectedFiles).toEqual([]);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.sessionId).toBe(null);
    });
  });

  describe('addFiles', () => {
    it('should add files to selectedFiles array', () => {
      const wrapper = ({ children }) => (
        <UploadProvider>{children}</UploadProvider>
      );
      
      const { result } = renderHook(() => useUpload(), { wrapper });
      
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      act(() => {
        result.current.addFiles([mockFile]);
      });
      
      expect(result.current.selectedFiles).toHaveLength(1);
      expect(result.current.selectedFiles[0].file).toBe(mockFile);
      expect(result.current.selectedFiles[0].status).toBe('selected');
      expect(result.current.selectedFiles[0].originalSize).toBe(mockFile.size);
      expect(result.current.sessionId).toBeTruthy();
    });

    it('should create preview URLs for added files', () => {
      const wrapper = ({ children }) => (
        <UploadProvider>{children}</UploadProvider>
      );
      
      const { result } = renderHook(() => useUpload(), { wrapper });
      
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      act(() => {
        result.current.addFiles([mockFile]);
      });
      
      const fileId = result.current.selectedFiles[0].id;
      expect(result.current.previewUrls.get(fileId)).toBeTruthy();
      expect(result.current.previewUrls.get(fileId)).toMatch(/^blob:/);
    });

    it('should maintain file order when adding multiple files', () => {
      const wrapper = ({ children }) => (
        <UploadProvider>{children}</UploadProvider>
      );
      
      const { result } = renderHook(() => useUpload(), { wrapper });
      
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
      const file3 = new File(['test3'], 'test3.jpg', { type: 'image/jpeg' });
      
      act(() => {
        result.current.addFiles([file1, file2, file3]);
      });
      
      expect(result.current.selectedFiles).toHaveLength(3);
      expect(result.current.selectedFiles[0].file).toBe(file1);
      expect(result.current.selectedFiles[1].file).toBe(file2);
      expect(result.current.selectedFiles[2].file).toBe(file3);
    });
  });

  describe('removeFile', () => {
    it('should remove file from selectedFiles', () => {
      const wrapper = ({ children }) => (
        <UploadProvider>{children}</UploadProvider>
      );
      
      const { result } = renderHook(() => useUpload(), { wrapper });
      
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      act(() => {
        result.current.addFiles([mockFile]);
      });
      
      const fileId = result.current.selectedFiles[0].id;
      
      act(() => {
        result.current.removeFile(fileId);
      });
      
      expect(result.current.selectedFiles).toHaveLength(0);
      expect(result.current.previewUrls.get(fileId)).toBeUndefined();
    });

    it('should remove only the specified file', () => {
      const wrapper = ({ children }) => (
        <UploadProvider>{children}</UploadProvider>
      );
      
      const { result } = renderHook(() => useUpload(), { wrapper });
      
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
      
      act(() => {
        result.current.addFiles([file1, file2]);
      });
      
      const fileIdToRemove = result.current.selectedFiles[0].id;
      const fileIdToKeep = result.current.selectedFiles[1].id;
      
      act(() => {
        result.current.removeFile(fileIdToRemove);
      });
      
      expect(result.current.selectedFiles).toHaveLength(1);
      expect(result.current.selectedFiles[0].id).toBe(fileIdToKeep);
    });
  });

  describe('clearFiles', () => {
    it('should clear all files and reset state', () => {
      const wrapper = ({ children }) => (
        <UploadProvider>{children}</UploadProvider>
      );
      
      const { result } = renderHook(() => useUpload(), { wrapper });
      
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      act(() => {
        result.current.addFiles([mockFile]);
        result.current.setError('Test error');
      });
      
      act(() => {
        result.current.clearFiles();
      });
      
      expect(result.current.selectedFiles).toHaveLength(0);
      expect(result.current.previewUrls.size).toBe(0);
      expect(result.current.uploadProgress.size).toBe(0);
      expect(result.current.error).toBe(null);
      expect(result.current.sessionId).toBe(null);
    });
  });

  describe('updateProgress', () => {
    it('should update progress for a specific file', () => {
      const wrapper = ({ children }) => (
        <UploadProvider>{children}</UploadProvider>
      );
      
      const { result } = renderHook(() => useUpload(), { wrapper });
      
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      act(() => {
        result.current.addFiles([mockFile]);
      });
      
      const fileId = result.current.selectedFiles[0].id;
      
      act(() => {
        result.current.updateProgress(fileId, {
          fileId,
          fileName: 'test.jpg',
          progress: 50,
          status: 'uploading'
        });
      });
      
      expect(result.current.uploadProgress.get(fileId)).toEqual({
        fileId,
        fileName: 'test.jpg',
        progress: 50,
        status: 'uploading'
      });
      expect(result.current.selectedFiles[0].uploadProgress).toBe(50);
      expect(result.current.selectedFiles[0].status).toBe('uploading');
    });
  });

  describe('updateCompressedFile', () => {
    it('should update file with compression metadata', () => {
      const wrapper = ({ children }) => (
        <UploadProvider>{children}</UploadProvider>
      );
      
      const { result } = renderHook(() => useUpload(), { wrapper });
      
      const mockFile = new File(['test content here'], 'test.jpg', { type: 'image/jpeg' });
      
      act(() => {
        result.current.addFiles([mockFile]);
      });
      
      const fileId = result.current.selectedFiles[0].id;
      const compressedBlob = new Blob(['compressed'], { type: 'image/jpeg' });
      
      act(() => {
        result.current.updateCompressedFile(fileId, 10, compressedBlob);
      });
      
      const updatedFile = result.current.selectedFiles[0];
      expect(updatedFile.compressedSize).toBe(10);
      expect(updatedFile.compressionRatio).toBeCloseTo(10 / mockFile.size);
      expect(updatedFile.status).toBe('compressed');
      expect(updatedFile.compressedBlob).toBe(compressedBlob);
    });
  });

  describe('updateImagePath', () => {
    it('should update file with image path after upload', () => {
      const wrapper = ({ children }) => (
        <UploadProvider>{children}</UploadProvider>
      );
      
      const { result } = renderHook(() => useUpload(), { wrapper });
      
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      act(() => {
        result.current.addFiles([mockFile]);
      });
      
      const fileId = result.current.selectedFiles[0].id;
      const imagePath = 'uploads/test-123.jpg';
      
      act(() => {
        result.current.updateImagePath(fileId, imagePath);
      });
      
      expect(result.current.selectedFiles[0].imagePath).toBe(imagePath);
      expect(result.current.selectedFiles[0].status).toBe('uploaded');
    });
  });
});
