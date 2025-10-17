const multer = require("multer")
const constant = require("../helpers/constant")
const { responseData } = require('../helpers/responseData.js')
const path = require('path');
const fs = require('fs');

const assignmentUploadPath = path.join(__dirname, '..', 'uploads', 'assignments');
const submissionUploadPath = path.join(__dirname, '..', 'uploads', 'submissions');

ensureFolderExists(assignmentUploadPath);
ensureFolderExists(submissionUploadPath);

function ensureFolderExists(folderPath) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};

const assignmentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, assignmentUploadPath),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, submissionUploadPath),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx)$/i)) {
    return cb(responseData("INVALID_FILE_TYPE", {}, req, false));
  }
  cb(null, true);
};


const uploadAssignmanet = multer({
  storage: assignmentStorage,
  fileFilter,
  limits: { fileSize: constant.maxFileSizeLimit }
});

const uploadSubmission = multer({
  storage: submissionStorage,
  fileFilter,
  limits: { fileSize: constant.maxFileSizeLimit }
});

module.exports = {
  uploadAssignmanet,
  uploadSubmission
};