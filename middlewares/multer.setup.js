const { createUploader } = require('./multerUpload')

const imageMime = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/jpg'
]
const docMime = ['application/pdf']

const uploadStudentDocs = createUploader({
  folderName: 'studentDocs',
  allowedMime: [...imageMime, ...docMime],
  maxSize: 5 * 1024 * 1024
})

const uploadTeacherDocs = createUploader({
  folderName: 'teacherDocs',
  allowedMime: [...imageMime, ...docMime],
  maxSize: 5 * 1024 * 1024 // 5MB
})

const uploadSchoolLogo = createUploader({
  folderName: 'logo',
  allowedMime: [...imageMime],
  maxSize: 2 * 1024 * 1024
})

const uploadProfilePics = createUploader({
  folderName: 'profilePics',
  subFolder: (req) => req.user?._id.toString() || 'others',
  allowedMime: ['image/jpeg', 'image/png', 'image/gif'],
  maxSize: 3 * 1024 * 1024
});

const studentDocFields = uploadStudentDocs.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 },
  { name: 'marksheets', maxCount: 10 },
  { name: 'certificates', maxCount: 10 },
  { name: 'medicalRecords', maxCount: 10 },
  { name: 'transferCertificate', maxCount: 1 }
])

const teacherDocFields = uploadTeacherDocs.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 },
  // { name: 'certificates', maxCount: 10 },
  // { name: 'resume', maxCount: 1 },
  // { name: 'joiningLetter', maxCount: 1 }
  // { name: 'profilePic', maxCount: 1 }
])

const schoolDoc = uploadSchoolLogo.fields([
  { name: 'schoolLogo', maxCount: 1 }
])

const adminDoc = uploadProfilePics.fields([
  { name: 'profilePic', maxCount: 1 }
])

module.exports = { studentDocFields, teacherDocFields, schoolDoc, adminDoc }
