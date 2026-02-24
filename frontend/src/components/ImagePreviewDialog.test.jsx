import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImagePreviewDialog from './ImagePreviewDialog';

describe('ImagePreviewDialog', () => {
  const createMockFile = (name, size) => {
    return new File(['content'], name, { type: 'image/jpeg' });
  };

  const createMockFileData = (id, fileName, size) => ({
    id,
    file: createMockFile(fileName, size),
    previewUrl: `blob:http://localhost/${id}`
  });

  it('renders dialog with file count', () => {
    const files = [
      createMockFileData('1', 'image1.jpg', 1024),
      createMockFileData('2', 'image2.jpg', 2048)
    ];

    render(
      <ImagePreviewDialog
        files={files}
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRemoveFile={vi.fn()}
      />
    );

    expect(screen.getByText('Preview Images')).toBeInTheDocument();
    expect(screen.getByText('2 images selected')).toBeInTheDocument();
  });

  it('renders single image count correctly', () => {
    const files = [createMockFileData('1', 'image1.jpg', 1024)];

    render(
      <ImagePreviewDialog
        files={files}
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRemoveFile={vi.fn()}
      />
    );

    expect(screen.getByText('1 image selected')).toBeInTheDocument();
  });

  it('displays file names and sizes', () => {
    const files = [
      createMockFileData('1', 'vacation.jpg', 1024),
      createMockFileData('2', 'family.png', 2048 * 1024)
    ];

    render(
      <ImagePreviewDialog
        files={files}
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRemoveFile={vi.fn()}
      />
    );

    expect(screen.getByText('vacation.jpg')).toBeInTheDocument();
    expect(screen.getByText('family.png')).toBeInTheDocument();
    // File sizes are displayed (actual values depend on File object creation)
    const sizeElements = screen.getAllByText(/B/);
    expect(sizeElements.length).toBeGreaterThan(0);
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const files = [createMockFileData('1', 'image1.jpg', 1024)];

    render(
      <ImagePreviewDialog
        files={files}
        open={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        onRemoveFile={vi.fn()}
      />
    );

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Send button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const files = [createMockFileData('1', 'image1.jpg', 1024)];

    render(
      <ImagePreviewDialog
        files={files}
        open={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onRemoveFile={vi.fn()}
      />
    );

    await user.click(screen.getByText('Send 1 Image'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onRemoveFile when remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemoveFile = vi.fn();
    const files = [createMockFileData('1', 'image1.jpg', 1024)];

    render(
      <ImagePreviewDialog
        files={files}
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRemoveFile={onRemoveFile}
      />
    );

    const removeButtons = screen.getAllByTitle('Remove image');
    await user.click(removeButtons[0]);
    expect(onRemoveFile).toHaveBeenCalledWith('1');
  });

  it('disables Send button when no files', () => {
    render(
      <ImagePreviewDialog
        files={[]}
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRemoveFile={vi.fn()}
      />
    );

    const sendButton = screen.getByText('Send 0 Images');
    expect(sendButton).toBeDisabled();
  });

  it('displays correct button text for multiple images', () => {
    const files = [
      createMockFileData('1', 'image1.jpg', 1024),
      createMockFileData('2', 'image2.jpg', 2048),
      createMockFileData('3', 'image3.jpg', 3072)
    ];

    render(
      <ImagePreviewDialog
        files={files}
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRemoveFile={vi.fn()}
      />
    );

    expect(screen.getByText('Send 3 Images')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    const files = [createMockFileData('1', 'image1.jpg', 1024)];

    const { container } = render(
      <ImagePreviewDialog
        files={files}
        open={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRemoveFile={vi.fn()}
      />
    );

    // Dialog should not be visible when open=false
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
