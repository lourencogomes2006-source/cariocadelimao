const fs = require('fs');
const path = require('path');
const { DATA_FILE } = require('../config');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function readPosts() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    return [];
  } catch (e) {
    console.error('Failed to parse posts.json, resetting to empty array:', e);
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    return [];
  }
}

function writePosts(posts) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf8');
}

function getAllPosts() {
  return readPosts();
}

function getPostById(id) {
  const posts = readPosts();
  return posts.find(p => p.id === id) || null;
}

function addPost(post) {
  const posts = readPosts();
  posts.push(post);
  writePosts(posts);
  return post;
}

module.exports = {
  getAllPosts,
  getPostById,
  addPost,
};

