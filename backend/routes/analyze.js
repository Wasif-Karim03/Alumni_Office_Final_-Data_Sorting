/**
 * POST /api/analyze - Accept 1 (AlumniEvent only) or 2 (AlumniEvent + Raiser's Edge) files
 */
import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { parseAndDetectFiles, parseSingleFile } from '../services/parser.js';
import { analyzeCRM } from '../services/analyzeCRM.js';
import { analyzeRegistration } from '../services/analyzeRegistration.js';
import { crossAnalyze } from '../services/crossAnalysis.js';
import { generateInsights } from '../services/insights.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.csv';
      cb(null, `${Date.now()}-${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

/**
 * Strip internal-only fields (e.g. Set) that are not JSON-serializable
 */
function sanitizeForResponse(obj) {
  if (!obj) return obj;
  const { names, emails, constituentIds, emailAffiliationPairs, registrantMatchKeys, ...rest } = obj;
  return {
    ...rest,
    namesCount: obj.names ? obj.names.size : 0,
  };
}

router.post('/analyze', upload.fields([{ name: 'file1', maxCount: 1 }, { name: 'file2', maxCount: 1 }]), (req, res) => {
  try {
    const files = req.files;
    if (!files || !files.file1) {
      return res.status(400).json({
        error: 'At least one file (AlumniEvent registration) is required. Add Raiser\'s Edge for giving/demographics.',
      });
    }

    const file1 = Array.isArray(files.file1) ? files.file1[0] : files.file1;
    const file2 = files.file2 ? (Array.isArray(files.file2) ? files.file2[0] : files.file2) : null;

    const buffer1 = fs.readFileSync(file1.path);
    const buffer2 = file2 ? fs.readFileSync(file2.path) : null;

    const eventType = (req.body?.eventType || 'homecoming').toString().toLowerCase();

    let crmRows, regRows;
    if (buffer2) {
      const parsed = parseAndDetectFiles(buffer1, buffer2);
      crmRows = parsed.crmRows;
      regRows = parsed.regRows;
    } else {
      const parsed = parseSingleFile(buffer1);
      crmRows = parsed.crmRows;
      regRows = parsed.regRows;
    }

    const stats2024 = analyzeCRM(crmRows);
    const stats2025 = analyzeRegistration(regRows);
    const cross = crossAnalyze(stats2024, stats2025);
    const insights = generateInsights(stats2024, stats2025, cross);

    const response = {
      eventType: ['homecoming', 'reunion', 'owu_near_you'].includes(eventType) ? eventType : 'homecoming',
      hasRE: crmRows.length > 0,
      stats2024: sanitizeForResponse(stats2024),
      stats2025: sanitizeForResponse(stats2025),
      cross,
      insights,
    };

    res.json(response);
  } catch (err) {
    if (err.message?.includes('empty') || err.message?.includes('format')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message || 'An unexpected error occurred during analysis.' });
  }
});

export default router;
