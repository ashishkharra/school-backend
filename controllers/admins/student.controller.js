// controllers/adminController.js
const adminStudent = require("../../services/admins/student.service.js");
const { responseData } = require("../../helpers/responseData.js");
const { result } = require("lodash");
const { deleteFileIfExists } = require('../../helpers/helper.js')
const path = require('path')

const baseUploadDir = path.join(__dirname, '../../uploads');
const normalizeUploadPath = (filePath) => {
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(baseUploadDir)) {
    return { success: false, message: 'INVALID_PATH' }
  }
  return normalizedPath.replace(baseUploadDir, '').replace(/\\/g, '/');
};

module.exports = {
  // Add Student
  regStudent: async (req, res) => {
    try {
      const data = req.body;
      const files = req.files;
      console.log("DATA------", data)
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
    } catch (err) {
      console.error('Student register error:', err);
      return res.status(500).json(responseData('REGISTRATION_FAILED', {}, req, false));
    }
  },

  updateStudent: async (req, res) => {
    try {
      const data = { ...req.body }; // clone body
      const files = req.files;

      console.log('files--------- ', files)
      const { studentId } = req.params;
      // console.log("DATA----", data)
      const getRelativePath = (filePath) => filePath.replace(baseUploadDir, '').replace(/\\/g, '/');

      // Only update images/docs if they exist
      if (files) {
        ['profilePic', 'aadharFront', 'aadharBack', 'transferCertificate'].forEach(field => {
          if (files[field]?.[0]) {
            data[field] = getRelativePath(files[field][0].path);
            console.log('path field : ::::: : ', data[field])
          } else {
            delete data[field];
          }
        });


        if (files.marksheets?.length) {
          data.marksheets = files.marksheets.map(f => ({
            exam: f.originalname,
            fileUrl: getRelativePath(f.path)
          }));
        }

        if (files.certificates?.length) {
          data.certificates = files.certificates.map(f => ({
            name: f.originalname,
            issuedBy: req.body.certificatesIssuedBy || null,
            issueDate: req.body.certificatesIssueDate ? new Date(req.body.certificatesIssueDate) : null,
            fileUrl: getRelativePath(f.path)
          }));
        }

        if (files.medicalRecords?.length) {
          data.medicalRecords = files.medicalRecords.map(f => ({
            condition: req.body.medicalCondition || "",
            doctorNote: req.body.doctorNote || "",
            date: req.body.medicalDate ? new Date(req.body.medicalDate) : new Date(),
            fileUrl: getRelativePath(f.path)
          }));
        }
      }

      // Remove null or undefined fields
      Object.keys(data).forEach(key => {
        if (data[key] === 'null' || data[key] === undefined) delete data[key];
      });

      console.log('updatable data ::::::::::: -------- ', data);
      const result = await adminStudent.updateStudent(data, studentId);

      if (!result.success) {
        return res.status(result.status || 400).json(responseData(result.message, {}, req, false));
      }

      return res.status(200).json(responseData(result.message, result.student, req, true));
    } catch (error) {
      console.error("Error in updateStudent:", error);
      return res.status(500).json(responseData("SERVER_ERROR", {}, req, false));
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
      return res.status(500).json(responseData("SERVER_ERROR", {}, req, false));
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
        .json(responseData("SERVER_ERROR", error.message, req, false));
    }
  },

  getStudentAccordingClass: async (req, res) => {
    try {
      const { page = 1, limit = 10, classId, ...filters } = req.query; // extract classId separately

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      // Call service correctly
      const queryResult = await adminStudent.getStudentAccordingClass(
        classId || null, // ✅ pass classId
        filters,
        pageNumber,
        limitNumber
      );

      if (!queryResult.success) {
        return res
          .status(400)
          .json(responseData(queryResult.message, {}, req, false));
      }

      // Return full object (with students + pagination)
      return res.json(responseData("GET_LIST", queryResult, req, true));
    } catch (error) {
      console.error("getStudentAccordingClass controller error:", error);
      return res
        .status(500)
        .json(responseData("ERROR_WHILE_GETTING_STUDENTS", {}, req, false));
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
        responseData("SERVER_ERROR", null, req, false)
      );
    }
  }


};    