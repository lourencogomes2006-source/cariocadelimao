const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const rawMaxUploadSize = Number.parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || '', 10);

module.exports = {
  PORT: process.env.PORT || 4000,
  DATA_FILE: path.join(__dirname, 'data', 'posts.json'),
  UPLOAD_DIR: path.join(__dirname, 'uploads'),
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || '',
  MAX_UPLOAD_SIZE_BYTES:
    Number.isFinite(rawMaxUploadSize) && rawMaxUploadSize > 0
      ? rawMaxUploadSize
      : 5 * 1024 * 1024,
  // Frontend origins allowed to call this API
  ALLOWED_ORIGINS: [
    'http://localhost:8000', // local static server
  ],
  ROOT_DIR,
};
