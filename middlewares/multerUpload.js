const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const baseDir = path.join(__dirname, '../uploads/profilePics');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const role = req.user?.role || 'other';
    console.log('role : ', role)
    const uploadPath = path.join(baseDir, role);

    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    console.log('extension : ', ext)
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    console.log('unique name ; ', uniqueName)
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const uploadProfilePic = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 } // 3 MB
});

module.exports = { uploadProfilePic };