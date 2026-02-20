const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const { PORT, UPLOAD_DIR, ALLOWED_ORIGINS } = require('./config');
const { getAllPosts, getPostById, addPost } = require('./data/store');

const app = express();

// Ensure uploads directory exists
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

ensureUploadDir();

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
app.use('/uploads', express.static(UPLOAD_DIR));

// Multer storage configuration
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const category = req.body.category || 'misc';
    const safeCategory = String(category).toLowerCase();
    const dir = path.join(UPLOAD_DIR, safeCategory);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename(req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${timestamp}${ext}`);
  },
});

const upload = multer({ storage });

// Helper to generate a simple unique id
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
app.post('/api/posts', upload.single('image'), (req, res) => {
  try {
    const { category, title, date, excerpt, content } = req.body;

    if (!category || !title || !date || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const allowedCategories = ['crónicas', 'rascunhos', 'rabiscos', 'fotografias'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    let imageUrl = null;
    if (req.file) {
      // Public URL relative to this server
      const relPath = path
        .relative(path.join(__dirname), req.file.path)
        .replace(/\\/g, '/');
      imageUrl = `/${relPath}`;
    } else if (req.body.imageUrl) {
      // Optional direct URL from the admin form
      imageUrl = req.body.imageUrl;
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

