/**
 * Clean up temporary upload files older than MAX_AGE_MS
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const MAX_AGE_MS = 20 * 60 * 1000; // 20 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Delete files in uploads dir that are older than MAX_AGE_MS
 */
export function cleanupOldUploads() {
  ensureUploadsDir();
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    const now = Date.now();
    let deleted = 0;
    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile() && now - stat.mtimeMs > MAX_AGE_MS) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      } catch {
        // Ignore errors for individual files
      }
    }
    if (deleted > 0) {
      console.log(`[Upload cleanup] Removed ${deleted} file(s) older than 20 minutes`);
    }
  } catch (err) {
    console.error('[Upload cleanup] Error:', err.message);
  }
}

/**
 * Start periodic cleanup. Call once when server starts.
 */
export function startUploadCleanup() {
  ensureUploadsDir();
  cleanupOldUploads(); // Run immediately on startup
  setInterval(cleanupOldUploads, CLEANUP_INTERVAL_MS);
}
