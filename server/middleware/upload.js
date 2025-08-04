import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
};

// Base upload directory
const baseUploadDir = path.join(__dirname, '../uploads');
const articleUploadDir = path.join(baseUploadDir, 'articles');
const profileUploadDir = path.join(baseUploadDir, 'profiles');

// Ensure directories exist
ensureDirectoryExists(baseUploadDir);
ensureDirectoryExists(articleUploadDir);
ensureDirectoryExists(profileUploadDir);

// Multer configuration for articles
const articleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, articleUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50); // Limit filename length
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  }
};

// Create multer instance for articles
export const upload = multer({ 
  storage: articleStorage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFilter
});

// Profile picture upload configuration
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.userId || req.user?.id || 'unknown';
    const ext = path.extname(file.originalname);
    cb(null, `profile-${userId}-${Date.now()}${ext}`);
  }
});

// Create multer instance for profiles
export const uploadProfile = multer({
  storage: profileStorage,
  limits: { 
    fileSize: 2 * 1024 * 1024 // 2MB limit for profile pictures
  },
  fileFilter: imageFilter
});

// Helper function to delete file
export const deleteFile = async (filePath) => {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`🗑️ Deleted file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
};

// Export paths for use in other modules
export const paths = {
  baseUploadDir,
  articleUploadDir,
  profileUploadDir
};