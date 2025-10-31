// controllers/adminController.js
const adminStudent = require("../../services/admins/student.service.js");
const { responseData } = require("../../helpers/responseData.js");
const { result } = require("lodash");
const { deleteFileIfExists } = require('../../helpers/helper.js')
const path = require('path')
const mongoose = require('mongoose')

const baseUploadDir = path.join(__dirname, '../../uploads');
const normalizeUploadPath = (filePath) => {
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(baseUploadDir)) {
    return { success: false, message: 'INVALID_PATH' }
  }
  return normalizedPath.replace(baseUploadDir, '').replace(/\\/g, '/');
};

const getRelativePath = (filePath) =>
  filePath.replace(baseUploadDir, "").replace(/\\/g, "/");

module.exports = {
  // Add Student
  regStudent: async (req, res) => {
    try {
      const data = req.body;
      const files = req.files;

      console.log('Register Student Payload:', { data, files });
      if (data.parents && typeof data.parents === 'string') data.parents = JSON.parse(data.parents);
      if (data.siblings && typeof data.siblings === 'string') data.siblings = JSON.parse(data.siblings);
      if (data.achievements && typeof data.achievements === 'string') data.achievements = JSON.parse(data.achievements);
      if (data.extraCurricular && typeof data.extraCurricular === 'string') data.extraCurricular = JSON.parse(data.extraCurricular);

      if (files) {
        if (files.profilePic?.[0])
          data.profilePic = normalizeUploadPath(files.profilePic[0].path);

        if (files.aadharFront?.[0])
          data.aadharFront = normalizeUploadPath(files.aadharFront[0].path);

        if (files.aadharBack?.[0])
          data.aadharBack = normalizeUploadPath(files.aadharBack[0].path);

        if (files.marksheets?.length) {
          data.marksheets = files.marksheets.map(f => ({
            exam: f.originalname,
            fileUrl: normalizeUploadPath(f.path),
          }));
        }

        if (files.certificates?.length) {
          data.certificates = files.certificates.map(f => ({
            name: f.originalname,
            issuedBy: req.body.certificatesIssuedBy || null,
            issueDate: req.body.certificatesIssueDate ? new Date(req.body.certificatesIssueDate) : null,
            fileUrl: normalizeUploadPath(f.path),
          }));
        }

        if (files.medicalRecords?.length) {
          data.medicalRecords = files.medicalRecords.map(f => ({
            condition: req.body.medicalCondition || '',
            doctorNote: req.body.doctorNote || '',
            date: req.body.medicalDate ? new Date(req.body.medicalDate) : new Date(),
            fileUrl: normalizeUploadPath(f.path),
          }));
        }

        if (files.transferCertificate?.[0])
          data.transferCertificate = normalizeUploadPath(files.transferCertificate[0].path);
      }

      const result = await adminStudent.addStudent(data);

      if (!result.success) {
        return res.status(400).json(responseData(result.message, {}, req, false));
      }
      return res.status(201).json(responseData(result.message, result.data, req, true));
    } catch (error) {
      console.error('Student register error:', error);
      return res.status(500).json(responseData('REGISTRATION_FAILED', { error: error.message }, req, false));
    }
  },

 updateStudent: async (req, res) => {
  try {
    const { studentId } = req.params;
    const files = req.files || {};
    const bodyData = { ...req.body };
 
    console.log("🟡 Starting update for student:", studentId);
 
    // Validate studentId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json(responseData("INVALID_STUDENT_ID", {}, req, false));
    }
 
    // Parse JSON strings safely
    const jsonFields = ["address", "parents", "guardian", "emergencyContact"];
    jsonFields.forEach(key => {
      if (bodyData[key] && bodyData[key] !== "null" && typeof bodyData[key] === "string") {
        try {
          bodyData[key] = JSON.parse(bodyData[key]);
        } catch (error) {
          console.warn(`JSON parse failed for ${key}:`, error);
          bodyData[key] = key === "parents" ? [] : {};
        }
      } else if (!bodyData[key] || bodyData[key] === "null") {
        bodyData[key] = key === "parents" ? [] : {};
      }
    });
 
    // File handling - DIRECT DATABASE APPROACH (safer)
    const filePayload = {};
    
    try {
      console.log("🟡 Fetching student data...");
      
      // APPROACH 1: Direct database call (recommended)
      const currentStudent = await mongoose.model('Student').findById(studentId).lean();
      
      if (!currentStudent) {
        console.log("🔴 Student not found in database");
        return res.status(404).json(responseData("STUDENT_NOT_FOUND", {}, req, false));
      }
      
      console.log("🟢 Student found:", currentStudent._id);
 
      // Single file fields
      const singleFileFields = ["profilePic", "aadharFront", "aadharBack", "transferCertificate"];
      
      for (const field of singleFileFields) {
        if (files[field]?.[0]) {
          console.log(`🟡 Processing ${field} file`);
          // Delete old file if exists
          if (currentStudent[field]) {
            try {
              await deleteFileIfExists(currentStudent[field]);
            } catch (error) {
              console.warn(`Failed to delete old ${field}:`, error);
            }
          }
          // Set new file path
          filePayload[field] = getRelativePath(files[field][0].path);
        } else if (bodyData[field] === null || bodyData[field] === "null") {
          console.log(`🟡 Removing ${field} file`);
          // If explicitly null, remove the file
          if (currentStudent[field]) {
            try {
              await deleteFileIfExists(currentStudent[field]);
            } catch (error) {
              console.warn(`Failed to delete old ${field}:`, error);
            }
          }
          filePayload[field] = null;
        }
      }
 
      // Multiple files
      if (files.marksheets?.length) {
        console.log("🟡 Processing marksheets");
        filePayload.marksheets = files.marksheets.map(f => ({
          exam: f.originalname,
          fileUrl: getRelativePath(f.path)
        }));
      }
 
      if (files.certificates?.length) {
        console.log("🟡 Processing certificates");
        filePayload.certificates = files.certificates.map(f => ({
          name: f.originalname,
          issuedBy: bodyData.certificatesIssuedBy || null,
          issueDate: bodyData.certificatesIssueDate ? new Date(bodyData.certificatesIssueDate) : null,
          fileUrl: getRelativePath(f.path)
        }));
      }
 
      if (files.medicalRecords?.length) {
        console.log("🟡 Processing medical records");
        filePayload.medicalRecords = files.medicalRecords.map(f => ({
          condition: bodyData.medicalCondition || "",
          doctorNote: bodyData.doctorNote || "",
          date: bodyData.medicalDate ? new Date(bodyData.medicalDate) : new Date(),
          fileUrl: getRelativePath(f.path)
        }));
      }
 
    } catch (fileError) {
      console.error("❌ File handling error:", fileError);
      return res.status(500).json(responseData("FILE_PROCESSING_ERROR", {}, req, false));
    }
 
    // Clean nulls from bodyData
    Object.keys(bodyData).forEach(key => {
      if (bodyData[key] === "null" || bodyData[key] === null || bodyData[key] === undefined || bodyData[key] === "") {
        delete bodyData[key];
      }
    });
 
    console.log("🟡 Calling update service...");
    
    // Call Service
    const result = await adminStudent.updateStudent(studentId, bodyData, filePayload);
 
    if (!result || !result.success) {
      const status = result?.status || 400;
      const message = result?.message || "UPDATE_FAILED";
      return res.status(status).json(responseData(message, {}, req, false));
    }
 
    console.log("🟢 Student updated successfully");
    return res.status(200).json(responseData(result.message, result.student, req, true));
 
  } catch (error) {
    console.error("❌ UpdateStudent controller error:", error);
    return res.status(500).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
  }
},

  // updateStudentClass: async (req, res) => {
  //   try {
  //     const { studentId, classId } = req.params;

  //     const result = await adminStudent.updateStudentClass(studentId, classId);

  //     if (!result.success) {
  //       return res
  //         .status(400)
  //         .json(responseData(result.message, {}, req, false));
  //     }

  //     return res
  //       .status(200)
  //       .json(responseData("STUDENT_CLASS_UPDATED_SUCCESSFULLY", result, req, true));
  //   } catch (error) {
  //     console.error("student class update error:", error.message);
  //     return res
  //       .status(500)
  //       .json(responseData("SERVER_ERROR", {}, req, false));
  //   }
  // },

  // udpateStudentSection: async (req, res) => {
  //   try {
  //     console.log('req body : ', req.body)
  //     const { classId, studentId, section } = req.params;

  //     const result = await adminStudent.updateStudentSection(classId, studentId, section);

  //     if (!result.success) {
  //       return res
  //         .status(400)
  //         .json(responseData(result.message, {}, req, false));
  //     }

  //     return res
  //       .status(200)
  //       .json(responseData("STUDENT_SECTION_UPDATED_SUCCESSFULLY", result, req, true));
  //   } catch (error) {
  //     console.error("student section update error:", error.message);
  //     return res
  //       .status(500)
  //       .json(responseData("SERVER_ERROR", error.message, req, false));
  //   }
  // },

  // Controller: student.controller.js
  updateStudentClassAndSection: async (req, res) => {
    try {
      const { studentId, classId } = req.params;
      const { section: newSection } = req.body;

      const result = await adminStudent.updateStudentClassAndSection(studentId, classId, newSection);

      if (!result.success) {
        return res.status(400).json(responseData(result.message, result.error || {}, req, false));
      }

      return res.status(200).json(
        responseData(result.message, { student: result.student, enrollment: result.enrollment }, req, true)
      );

    } catch (error) {
      console.error("updateStudentClassAndSection controller error:", error);
      return res.status(500).json(responseData("SERVER_ERROR", { error: error.message }, req, false));
    }
  },

  deleteStudent: async (req, res) => {
    try {
      const { studentId } = req.params;
      const adminId = req.user._id;
      const { reason } = req.body;

      const result = await adminStudent.deleteStudent(studentId, adminId, reason);

      if (!result.success) {
        return res
          .status(400)
          .json(responseData(result.message, null, req, result.success));
      }

      return res
        .status(200)
        .json(responseData(result.message, result.student, req, result.success));
    } catch (error) {
      console.error("deleteStudent Controller error:", error);
      return res
        .status(500)
        .json(responseData("SERVER_ERROR", { error: error.message }, req, false));
    }
  },

  getStudentAccordingClass: async (req, res) => {
    try {
      const { page = 1, limit = 10, classId, ...filters } = req.query;

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      const queryResult = await adminStudent.getStudentAccordingClass(
        classId || null,
        filters,
        pageNumber,
        limitNumber
      );

      if (!queryResult.success) {
        return res
          .status(400)
          .json(responseData(queryResult.message, {}, req, false));
      }

      return res.json(responseData("GET_LIST", queryResult, req, true));
    } catch (error) {
      console.error("getStudentAccordingClass controller error:", error);
      return res
        .status(500)
        .json(responseData("ERROR_WHILE_GETTING_STUDENTS", { error: error.message }, req, false));
    }
  },

  getStudentById: async (req, res) => {
    try {
      const { studentId } = req.params;

      let student = await adminStudent.getStudentById(studentId);

      if (!student.success) {
        return res.status(400).json(
          responseData(student.message, null, req, student.success)
        );
      }

      student.profilePic = process.env.STATIC_URL + student.profilePic


      return res.status(200).json(
        responseData(student.message, student.result, req, student.success)
      );
    } catch (error) {
      console.error("getStudentById controller error:", error);
      return res.status(500).json(
        responseData("SERVER_ERROR", { error: error.message }, req, false)
      );
    }
  }
};    