// const multer = require('multer')
// const path = require('path')
// const fs = require('fs')

// const baseDir = path.join(__dirname, '../uploads/assignments')

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const role = req.user?.role || 'other'
//     const uploadPath = path.join(baseDir, role)

//     fs.mkdirSync(uploadPath, { recursive: true })

//     cb(null, uploadPath)
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname)
//     console.log('extension : ', ext)
//     const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
//     console.log('unique name ; ', uniqueName)
//     cb(null, uniqueName)
//   }
// })

// const fileFilter = (req, file, cb) => {
//   // Allowed mime types for documents
//   const allowedMimeTypes = [
//     'application/pdf', // PDF
//     'application/msword', // DOC
//     'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
//     'application/vnd.ms-excel', // XLS
//     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
//     'text/plain' // TXT
//   ]

//   if (allowedMimeTypes.includes(file.mimetype)) {
//     cb(null, true) // accept file
//   } else {
//     cb(
//       new Error(
//         'Only document files (PDF, DOC, DOCX, XLS, XLSX, TXT) are allowed!'
//       ),
//       false
//     )
//   }
// }

// const uploadAssignment = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
// })

// module.exports = { uploadAssignment }





const multer = require("multer")
const constant = require("../helpers/constant")
const path = require('path');
// ensureFolderExists(uploadPath);
const fs = require('fs');


 
const ensureFolderExists = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`✅ '${folderPath}' folder created`);
    }
};

const uploadPath = path.join(__dirname, '..', 'uploads', 'assignments');
ensureFolderExists(uploadPath);
 
 
// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
    );
  }
});
 
const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx)$/i)) {
    return cb(new Error('Only image or document files are allowed!'), false);
  }
  cb(null, true);
};
 
const uploadAssignmanet = multer({
  storage,
  fileFilter,
  limits: { fileSize: constant.maxFileSizeLimit }
})

module.exports = {
  uploadAssignmanet
}
 
 