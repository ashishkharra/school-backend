const multer = require('multer')
const path = require('path')
const fs = require('fs')

const baseDir = path.join(__dirname, '../uploads/assignments')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const role = req.user?.role || 'other'
    const uploadPath = path.join(baseDir, role)

    fs.mkdirSync(uploadPath, { recursive: true })

    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    console.log('extension : ', ext)
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    console.log('unique name ; ', uniqueName)
    cb(null, uniqueName)
  }
})

const fileFilter = (req, file, cb) => {
  // Allowed mime types for documents
  const allowedMimeTypes = [
    'application/pdf', // PDF
    'application/msword', // DOC
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.ms-excel', // XLS
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'text/plain' // TXT
  ]

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true) // accept file
  } else {
    cb(
      new Error(
        'Only document files (PDF, DOC, DOCX, XLS, XLSX, TXT) are allowed!'
      ),
      false
    )
  }
}

const uploadAssignment = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
})

module.exports = { uploadAssignment }
