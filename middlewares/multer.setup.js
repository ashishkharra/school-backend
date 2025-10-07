const { createUploader } = require('./multerUpload');

const imageMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
const docMime = ['application/pdf'];

const uploadStudentDocs = createUploader({
  folderName: 'studentDocs',
  allowedMime: [...imageMime, ...docMime],
  maxSize: 5 * 1024 * 1024
});

const studentDocFields = uploadStudentDocs.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 },
  { name: 'marksheets', maxCount: 10 },
  { name: 'certificates', maxCount: 10 },
  { name: 'medicalRecords', maxCount: 10 },
  { name: 'transferCertificate', maxCount: 1 }
]);

module.exports = { studentDocFields };