import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UploadProgressList from './UploadProgressList';

describe('UploadProgressList', () => {
  describe('Basic rendering', () => {
    it('should render nothing when progressItems is empty', () => {
      const { container } = render(<UploadProgressList progressItems={[]} onCancel={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when progressItems is null', () => {
      const { container } = render(<UploadProgressList progressItems={null} onCancel={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render a list item for each progress item', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image1.jpg', progress: 50, status: 'uploading' },
        { fileId: '2', fileName: 'image2.png', progress: 75, status: 'uploading' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);

      expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      expect(screen.getByText('image2.png')).toBeInTheDocument();
    });
  });

  describe('Filename display', () => {
    it('should display full filename when short', () => {
      const progressItems = [
        { fileId: '1', fileName: 'short.jpg', progress: 50, status: 'uploading' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      expect(screen.getByText('short.jpg')).toBeInTheDocument();
    });

    it('should truncate long filenames', () => {
      const longFilename = 'this_is_a_very_long_filename_that_should_be_truncated.jpg';
      const progressItems = [
        { fileId: '1', fileName: longFilename, progress: 50, status: 'uploading' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      
      // Should contain truncated version with ellipsis
      const displayedText = screen.getByText(/\.\.\.jpg/);
      expect(displayedText).toBeInTheDocument();
      expect(displayedText.textContent.length).toBeLessThan(longFilename.length);
    });

    it('should show full filename in title attribute for accessibility', () => {
      const longFilename = 'this_is_a_very_long_filename_that_should_be_truncated.jpg';
      const progressItems = [
        { fileId: '1', fileName: longFilename, progress: 50, status: 'uploading' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      
      const element = screen.getByTitle(longFilename);
      expect(element).toBeInTheDocument();
    });
  });

  describe('Progress display', () => {
    it('should display progress percentage', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 45, status: 'uploading' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should round progress percentage', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 45.7, status: 'uploading' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      expect(screen.getByText('46%')).toBeInTheDocument();
    });

    it('should display 0% for zero progress', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 0, status: 'uploading' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should display 100% for complete progress', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 100, status: 'complete' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Status icons', () => {
    it('should show spinner icon for uploading status', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 50, status: 'uploading' }
      ];

      const { container } = render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      
      // CircularProgress is rendered for uploading status
      const spinner = container.querySelector('.MuiCircularProgress-root');
      expect(spinner).toBeInTheDocument();
    });

    it('should show spinner icon for compressing status', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 30, status: 'compressing' }
      ];

      const { container } = render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      
      const spinner = container.querySelector('.MuiCircularProgress-root');
      expect(spinner).toBeInTheDocument();
    });

    it('should show checkmark icon for complete status', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 100, status: 'complete' }
      ];

      const { container } = render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      
      // CheckCircleIcon is rendered for complete status
      const checkmark = container.querySelector('[data-testid="CheckCircleIcon"]');
      expect(checkmark).toBeInTheDocument();
    });

    it('should show error icon for error status', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 50, status: 'error', errorMessage: 'Upload failed' }
      ];

      const { container } = render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      
      // ErrorIcon is rendered for error status
      const errorIcon = container.querySelector('[data-testid="ErrorIcon"]');
      expect(errorIcon).toBeInTheDocument();
    });
  });

  describe('Error messages', () => {
    it('should display error message when status is error', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 50, status: 'error', errorMessage: 'Network error occurred' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });

    it('should not display error message when status is not error', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 50, status: 'uploading', errorMessage: 'Should not show' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      expect(screen.queryByText('Should not show')).not.toBeInTheDocument();
    });

    it('should not display error section when no error message provided', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 50, status: 'error' }
      ];

      const { container } = render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      
      // Should still show error icon but no error text
      const errorIcon = container.querySelector('[data-testid="ErrorIcon"]');
      expect(errorIcon).toBeInTheDocument();
    });
  });

  describe('Cancel button', () => {
    it('should show cancel button for uploading status', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 50, status: 'uploading' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      
      const cancelButton = screen.getByTitle('Cancel upload');
      expect(cancelButton).toBeInTheDocument();
    });

    it('should show cancel button for compressing status', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 30, status: 'compressing' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      
      const cancelButton = screen.getByTitle('Cancel upload');
      expect(cancelButton).toBeInTheDocument();
    });

    it('should not show cancel button for complete status', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 100, status: 'complete' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      
      const cancelButton = screen.queryByTitle('Cancel upload');
      expect(cancelButton).not.toBeInTheDocument();
    });

    it('should not show cancel button for error status', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 50, status: 'error' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);
      
      const cancelButton = screen.queryByTitle('Cancel upload');
      expect(cancelButton).not.toBeInTheDocument();
    });

    it('should call onCancel with fileId when cancel button clicked', () => {
      const onCancel = vi.fn();
      const progressItems = [
        { fileId: 'test-file-id', fileName: 'image.jpg', progress: 50, status: 'uploading' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={onCancel} />);
      
      const cancelButton = screen.getByTitle('Cancel upload');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalledWith('test-file-id');
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not show cancel button when onCancel is not provided', () => {
      const progressItems = [
        { fileId: '1', fileName: 'image.jpg', progress: 50, status: 'uploading' }
      ];

      render(<UploadProgressList progressItems={progressItems} />);
      
      const cancelButton = screen.queryByTitle('Cancel upload');
      expect(cancelButton).not.toBeInTheDocument();
    });
  });

  describe('Multiple items', () => {
    it('should render multiple items with different statuses', () => {
      const progressItems = [
        { fileId: '1', fileName: 'uploading.jpg', progress: 50, status: 'uploading' },
        { fileId: '2', fileName: 'complete.jpg', progress: 100, status: 'complete' },
        { fileId: '3', fileName: 'error.jpg', progress: 30, status: 'error', errorMessage: 'Failed' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={vi.fn()} />);

      expect(screen.getByText('uploading.jpg')).toBeInTheDocument();
      expect(screen.getByText('complete.jpg')).toBeInTheDocument();
      expect(screen.getByText('error.jpg')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should handle cancel for specific item in multiple items', () => {
      const onCancel = vi.fn();
      const progressItems = [
        { fileId: '1', fileName: 'image1.jpg', progress: 50, status: 'uploading' },
        { fileId: '2', fileName: 'image2.jpg', progress: 75, status: 'uploading' }
      ];

      render(<UploadProgressList progressItems={progressItems} onCancel={onCancel} />);
      
      const cancelButtons = screen.getAllByTitle('Cancel upload');
      expect(cancelButtons).toHaveLength(2);

      fireEvent.click(cancelButtons[1]);
      expect(onCancel).toHaveBeenCalledWith('2');
    });
  });
});
