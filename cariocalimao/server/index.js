const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  PORT,
  UPLOAD_DIR,
  ALLOWED_ORIGINS,
  ADMIN_API_KEY,
  MAX_UPLOAD_SIZE_BYTES,
} = require('./config');
const { getAllPosts, getPostById, addPost } = require('./data/store');

const app = express();
const CATEGORY_UPLOAD_DIRS = Object.freeze({
  'crónicas': 'cronicas',
  rascunhos: 'rascunhos',
  rabiscos: 'rabiscos',
  fotografias: 'fotografias',
});

const ALLOWED_IMAGE_MIME_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
]);

// Ensure uploads directory exists
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

ensureUploadDir();

if (!ADMIN_API_KEY) {
  console.warn(
    'ADMIN_API_KEY is not set. POST /api/posts is disabled until it is configured.'
  );
}

// CORS
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  })
);

// For JSON payloads (not used for file uploads but useful later)
app.use(express.json());

// Serve uploaded images
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    dotfiles: 'deny',
    index: false,
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter(req, file, cb) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Only JPG, PNG, WEBP, GIF, and AVIF images are allowed.'));
      return;
    }
    cb(null, true);
  },
});

function runImageUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

// Helper to generate a simple unique id
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function requireAdminApiKey(req, res, next) {
  if (!ADMIN_API_KEY) {
    return res
      .status(503)
      .json({ error: 'Server missing ADMIN_API_KEY configuration.' });
  }

  const authHeader = req.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const providedKey = req.get('x-admin-key') || bearerToken;

  if (!providedKey || providedKey !== ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

function ensureCategoryUploadDir(category) {
  const folder = CATEGORY_UPLOAD_DIRS[category];
  const categoryDir = path.join(UPLOAD_DIR, folder);
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }
  return { folder, categoryDir };
}

function saveUploadedImage(file, category) {
  const ext = ALLOWED_IMAGE_MIME_TYPES.get(file.mimetype);
  const { folder, categoryDir } = ensureCategoryUploadDir(category);
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const outputPath = path.join(categoryDir, filename);
  fs.writeFileSync(outputPath, file.buffer);
  return `/uploads/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
}

function isSafeImageUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;
  const value = rawUrl.trim();
  if (!value) return false;
  if (value.startsWith('//')) return false;
  if (/[\u0000-\u001F\u007F<>"'`]/.test(value)) return false;

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  return true;
}

function handleUploadError(err, res) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `Image too large. Maximum allowed size is ${MAX_UPLOAD_SIZE_BYTES} bytes.`,
      });
    }
    return res.status(400).json({ error: err.message });
  }
  return res.status(400).json({ error: err.message || 'Invalid upload request.' });
}

// --- Routes ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get posts list (optionally by category)
app.get('/api/posts', (req, res) => {
  const { category } = req.query;
  let posts = getAllPosts();

  if (category) {
    posts = posts.filter(
      p => (p.category || '').toLowerCase() === String(category).toLowerCase()
    );
  }

  // Sort newest first by date or createdAt
  posts.sort((a, b) => {
    const da = a.date || a.createdAt || '';
    const db = b.date || b.createdAt || '';
    return db.localeCompare(da);
  });

  res.json(posts);
});

// Get a single post by id
app.get('/api/posts/:id', (req, res) => {
  const post = getPostById(req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  res.json(post);
});

// Create a new post (with optional image upload)
app.post('/api/posts', requireAdminApiKey, async (req, res) => {
  try {
    await runImageUpload(req, res);
  } catch (err) {
    return handleUploadError(err, res);
  }

  try {
    const { category, title, date, excerpt, content } = req.body;

    if (!category || !title || !date || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Object.prototype.hasOwnProperty.call(CATEGORY_UPLOAD_DIRS, category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = saveUploadedImage(req.file, category);
    } else if (req.body.imageUrl) {
      if (!isSafeImageUrl(req.body.imageUrl)) {
        return res.status(400).json({ error: 'Invalid image URL.' });
      }
      imageUrl = req.body.imageUrl.trim();
    }

    const id = generateId();
    const createdAt = new Date().toISOString();

    // Basic excerpt fallback
    let finalExcerpt = excerpt;
    if (!finalExcerpt) {
      const plain = String(content).replace(/[#*_`\[\]()!]/g, '').trim();
      finalExcerpt = plain.length > 150 ? `${plain.slice(0, 150)}...` : plain;
    }

    const newPost = {
      id,
      category,
      title,
      date,
      excerpt: finalExcerpt,
      content,
      imageUrl,
      createdAt,
    };

    addPost(newPost);

    res.status(201).json(newPost);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`carioca backend listening on http://localhost:${PORT}`);
});
