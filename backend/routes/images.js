import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { uploadImage, createImageMessage, getImageUrl } from '../services/storage.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Configure multer for image uploads
// 25MB limit, image/* only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB in bytes
  },
  fileFilter: (req, file, cb) => {
    // Only accept image/* MIME types
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, png, gif, webp)'), false);
    }
  }
});

// POST /api/images - Upload image and create message
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    // Validate image exists
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Validate image is valid type (already checked by multer, but double-check)
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed (jpeg, png, gif, webp)' });
    }

    // Get sender from req.user
    const sender = req.user.role;

    // Call uploadImage function
    const imagePath = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Call createImageMessage function
    const message = await createImageMessage(
      sender,
      imagePath,
      req.file.originalname,
      req.file.mimetype
    );

    // Return created message
    return res.status(201).json({ message });
  } catch (error) {
    console.error('Image upload error:', error);
    
    // Handle specific error cases
    if (error.message.includes('Only image files')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message.includes('Image upload failed')) {
      return res.status(500).json({ error: 'Image upload failed' });
    }
    
    return res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Handle multer errors (like file size exceeded)
router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Image size exceeds 25MB limit' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message.includes('Only image files')) {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
});

// GET /api/images/:messageId - Get signed URL for image
router.get('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Query message by ID
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('id, type, image_path')
      .eq('id', messageId)
      .single();

    // Verify message exists
    if (fetchError || !message) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Verify message type is 'image'
    if (message.type !== 'image') {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Get image_path from message
    const imagePath = message.image_path;

    // Call getImageUrl function
    const url = await getImageUrl(imagePath);

    // Return signed URL
    return res.status(200).json({ url });
  } catch (error) {
    console.error('Get image URL error:', error);
    
    if (error.message.includes('Failed to generate image URL')) {
      return res.status(500).json({ error: 'Failed to generate image URL' });
    }
    
    return res.status(500).json({ error: 'Failed to retrieve image' });
  }
});

export default router;
