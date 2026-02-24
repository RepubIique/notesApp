import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageLightbox from './ImageLightbox';

describe('ImageLightbox', () => {
  const mockImages = [
    { id: '1', url: 'https://example.com/image1.jpg' },
    { id: '2', url: 'https://example.com/image2.jpg' },
    { id: '3', url: 'https://example.com/image3.jpg' }
  ];

  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe('Basic rendering', () => {
    it('should not render when open is false', () => {
      const { container } = render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={false}
          onClose={mockOnClose}
        />
      );
      
      // Dialog should not be visible
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeNull();
    });

    it('should render when open is true', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      // Dialog should be visible
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should display the current image', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={1}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      const image = screen.getByAltText('Image 2');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockImages[1].url);
    });

    it('should display image counter', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={1}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('should not render with empty images array', () => {
      const { container } = render(
        <ImageLightbox
          images={[]}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Navigation controls', () => {
    it('should disable Previous button at first image', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      const prevButton = screen.getByLabelText('Previous image');
      expect(prevButton).toBeDisabled();
    });

    it('should disable Next button at last image', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={2}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      const nextButton = screen.getByLabelText('Next image');
      expect(nextButton).toBeDisabled();
    });

    it('should enable both buttons in the middle', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={1}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      const prevButton = screen.getByLabelText('Previous image');
      const nextButton = screen.getByLabelText('Next image');
      
      expect(prevButton).not.toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });

    it('should navigate to next image when Next button clicked', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      const nextButton = screen.getByLabelText('Next image');
      fireEvent.click(nextButton);
      
      // Counter should update
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
      
      // Image should update
      const image = screen.getByAltText('Image 2');
      expect(image).toHaveAttribute('src', mockImages[1].url);
    });

    it('should navigate to previous image when Previous button clicked', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={2}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      const prevButton = screen.getByLabelText('Previous image');
      fireEvent.click(prevButton);
      
      // Counter should update
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
      
      // Image should update
      const image = screen.getByAltText('Image 2');
      expect(image).toHaveAttribute('src', mockImages[1].url);
    });

    it('should not show navigation buttons for single image', () => {
      render(
        <ImageLightbox
          images={[mockImages[0]]}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
    });
  });

  describe('Close functionality', () => {
    it('should call onClose when close button clicked', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard navigation', () => {
    it('should close on Escape key', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should navigate to next image on ArrowRight key', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      
      // Counter should update
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('should navigate to previous image on ArrowLeft key', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={2}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      
      // Counter should update
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('should not navigate past boundaries with arrow keys', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      // Try to go before first image
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      
      // Should still be at first image
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('should not respond to keyboard when closed', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={false}
          onClose={mockOnClose}
        />
      );
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      // onClose should not be called when lightbox is closed
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Zoom functionality', () => {
    it('should display initial zoom level of 100%', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should zoom in when zoom in button clicked', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);
      
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('should zoom out when zoom out button clicked', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      // First zoom in
      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);
      
      // Then zoom out
      const zoomOutButton = screen.getByLabelText('Zoom out');
      fireEvent.click(zoomOutButton);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should disable zoom out at minimum zoom level', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      const zoomOutButton = screen.getByLabelText('Zoom out');
      expect(zoomOutButton).toBeDisabled();
    });

    it('should disable zoom in at maximum zoom level', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      const zoomInButton = screen.getByLabelText('Zoom in');
      
      // Zoom in to maximum (1.0 -> 1.5 -> 2.0 -> 3.0)
      fireEvent.click(zoomInButton);
      fireEvent.click(zoomInButton);
      fireEvent.click(zoomInButton);
      
      expect(screen.getByText('300%')).toBeInTheDocument();
      expect(zoomInButton).toBeDisabled();
    });

    it('should reset zoom when changing images', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      // Zoom in
      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);
      expect(screen.getByText('150%')).toBeInTheDocument();
      
      // Navigate to next image
      const nextButton = screen.getByLabelText('Next image');
      fireEvent.click(nextButton);
      
      // Zoom should reset to 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should cycle through all zoom levels', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      const zoomInButton = screen.getByLabelText('Zoom in');
      
      // 1.0 -> 1.5
      fireEvent.click(zoomInButton);
      expect(screen.getByText('150%')).toBeInTheDocument();
      
      // 1.5 -> 2.0
      fireEvent.click(zoomInButton);
      expect(screen.getByText('200%')).toBeInTheDocument();
      
      // 2.0 -> 3.0
      fireEvent.click(zoomInButton);
      expect(screen.getByText('300%')).toBeInTheDocument();
    });
  });

  describe('State management', () => {
    it('should reset to initialIndex when reopened', () => {
      const { rerender } = render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      // Navigate to second image
      const nextButton = screen.getByLabelText('Next image');
      fireEvent.click(nextButton);
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
      
      // Close
      rerender(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={false}
          onClose={mockOnClose}
        />
      );
      
      // Reopen with different initialIndex
      rerender(
        <ImageLightbox
          images={mockImages}
          initialIndex={2}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      // Should show the new initialIndex
      expect(screen.getByText('3 / 3')).toBeInTheDocument();
    });

    it('should reset zoom when reopened', () => {
      const { rerender } = render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      // Zoom in
      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);
      expect(screen.getByText('150%')).toBeInTheDocument();
      
      // Close
      rerender(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={false}
          onClose={mockOnClose}
        />
      );
      
      // Reopen
      rerender(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          open={true}
          onClose={mockOnClose}
        />
      );
      
      // Zoom should be reset
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });
});
