const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

module.exports = {
  PORT: process.env.PORT || 4000,
  DATA_FILE: path.join(__dirname, 'data', 'posts.json'),
  UPLOAD_DIR: path.join(__dirname, 'uploads'),
  // Frontend origins allowed to call this API
  ALLOWED_ORIGINS: [
    'http://localhost:8000', // local static server
  ],
  ROOT_DIR,
};

