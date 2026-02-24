import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageUploadButton from './ImageUploadButton';
import { UploadProvider } from '../context/UploadContext';

// Mock window.alert
const mockAlert = vi.fn();
global.alert = mockAlert;

/**
 * Helper to create a mock File object
 */
function createMockFile(name, size, type) {
  const file = new File(['x'.repeat(size)], name, { type });
  return file;
}

/**
 * Helper to render component with UploadProvider
 */
function renderWithProvider(ui) {
  return render(
    <UploadProvider>
      {ui}
    </UploadProvider>
  );
}

describe('ImageUploadButton', () => {
  let onFilesSelected;

  beforeEach(() => {
    onFilesSelected = vi.fn();
    mockAlert.mockClear();
  });

  it('renders upload button', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const button = screen.getByTitle('Upload images');
    expect(button).toBeInTheDocument();
  });

  it('opens file input when button is clicked', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const button = screen.getByTitle('Upload images');
    const fileInput = document.querySelector('input[type="file"]');
    
    const clickSpy = vi.spyOn(fileInput, 'click');
    fireEvent.click(button);
    
    expect(clickSpy).toHaveBeenCalled();
  });

  it('accepts valid JPEG file', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('accepts valid PNG file', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const file = createMockFile('test.png', 1024 * 1024, 'image/png');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('accepts valid WebP file', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const file = createMockFile('test.webp', 1024 * 1024, 'image/webp');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('accepts valid GIF file', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const file = createMockFile('test.gif', 1024 * 1024, 'image/gif');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('rejects invalid file type', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith('Only image files are allowed (JPEG, PNG, GIF, WebP)');
  });

  it('rejects file exceeding 10MB size limit', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const file = createMockFile('large.jpg', 11 * 1024 * 1024, 'image/jpeg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith(
      expect.stringContaining('exceed the maximum size of 10.0 MB')
    );
  });

  it('accepts file at exactly 10MB size limit', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const file = createMockFile('exact.jpg', 10 * 1024 * 1024, 'image/jpeg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('accepts multiple valid files', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const files = [
      createMockFile('test1.jpg', 1024 * 1024, 'image/jpeg'),
      createMockFile('test2.png', 2 * 1024 * 1024, 'image/png'),
      createMockFile('test3.webp', 3 * 1024 * 1024, 'image/webp')
    ];
    
    fireEvent.change(fileInput, { target: { files } });
    
    expect(onFilesSelected).toHaveBeenCalledWith(files);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('accepts exactly 10 files (boundary)', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const files = Array.from({ length: 10 }, (_, i) => 
      createMockFile(`test${i}.jpg`, 1024 * 1024, 'image/jpeg')
    );
    
    fireEvent.change(fileInput, { target: { files } });
    
    expect(onFilesSelected).toHaveBeenCalledWith(files);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('rejects more than 10 files', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const files = Array.from({ length: 11 }, (_, i) => 
      createMockFile(`test${i}.jpg`, 1024 * 1024, 'image/jpeg')
    );
    
    fireEvent.change(fileInput, { target: { files } });
    
    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith('Maximum 10 images can be uploaded at once');
  });

  it('handles empty file selection', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    
    fireEvent.change(fileInput, { target: { files: [] } });
    
    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('handles single file selection', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const file = createMockFile('single.jpg', 1024 * 1024, 'image/jpeg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('respects custom maxFiles prop', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} maxFiles={5} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const files = Array.from({ length: 6 }, (_, i) => 
      createMockFile(`test${i}.jpg`, 1024 * 1024, 'image/jpeg')
    );
    
    fireEvent.change(fileInput, { target: { files } });
    
    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith('Maximum 5 images can be uploaded at once');
  });

  it('disables button when disabled prop is true', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} disabled={true} />
    );
    
    const button = screen.getByTitle('Upload images');
    expect(button).toBeDisabled();
  });

  it('clears file input after selection', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // File input should be cleared to allow selecting the same file again
    expect(fileInput.value).toBe('');
  });

  it('shows multiple oversized files in error message', () => {
    renderWithProvider(
      <ImageUploadButton onFilesSelected={onFilesSelected} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    const files = [
      createMockFile('large1.jpg', 11 * 1024 * 1024, 'image/jpeg'),
      createMockFile('large2.jpg', 12 * 1024 * 1024, 'image/jpeg')
    ];
    
    fireEvent.change(fileInput, { target: { files } });
    
    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith(
      expect.stringContaining('large1.jpg')
    );
    expect(mockAlert).toHaveBeenCalledWith(
      expect.stringContaining('large2.jpg')
    );
  });
});
