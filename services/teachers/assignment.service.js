const Assignment = require('../../models/assignment/assignment.schema')
const mongoose = require('mongoose')
const Attendance = require('../../models/students/attendance.schema')
const Submission = require('../../models/assignment/submission.schema')
const Subject = require('../../models/class/subjects.schema.js')
const Grade = require('../../models/assignment/grades.schema')
const {
  getAssignmentLookup,
  getGradeLookupPipeline
} = require('../../helpers/commonAggregationPipeline')
const Teacher = require('../../models/teacher/teacher.schema')
const {
  getPaginationArrayJs,
  filterByKeyword
} = require('../../helpers/helper')
const Class = require('../../models/class/class.schema')
module.exports = {


  
  uploadAssignment: async (
    teacherId,
    classId,
    subject,
    title,
    description,
    dueDate,
    file
  ) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return { success: false, message: 'INVALID_TEACHER_ID' };
      }
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        return { success: false, message: 'TEACHER_NOT_FOUND' };
      }

      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return { success: false, message: 'INVALID_CLASS_ID' };
      }
      const classExists = await Class.findById(classId);
      if (!classExists) {
        return { success: false, message: 'CLASS_NOT_FOUND' };
      }
      if (!subject || typeof subject !== 'string') {
        return { success: false, message: 'INVALID_SUBJECT' };
      }
      const subjectExists = await Subject.findOne({ name: subject });
      if (!subjectExists) {
        return { success: false, message: 'SUBJECT_NOT_FOUND' };
      }
      const isSpecialized =
        Array.isArray(teacher.subjectsHandled) &&
        teacher.subjectsHandled.some((subj) => subj.subjectName === subject);

      if (!isSpecialized) {
        return { success: false, message: 'SUBJECT_NOT_ASSIGNED_TO_TEACHER' };
      }
      const filePath = file ? `/uploads/assignments/${file}` : null;

      const assignment = new Assignment({
        title,
        description,
        dueDate,
        fileUrl: filePath,
        class: classId,
        uploadedBy: teacherId,
        subject: subject
      });

      await assignment.save();

      return {
        success: true,
        message: 'ASSIGNMENT_UPLOADED_SUCCESSFULLY',
        results: assignment
      };
    } catch (err) {
      return {
        success: false,
        message: 'SERVER_ERROR',
        results: { error: err.message }
      };
    }
  },


  updateAssignment: async (id, title, description, file = null) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return {
          success: false,
          message: { en: 'ASSIGNMENT_ID_NOT_VALID' },
          results: {}
        }
      }
      const exist = await Assignment.findOne({_id : id})
      if (!exist) {
        return { success : false, messag : 'CLASS_NOT_FOUND'}
      }

    
      const updateData = {}
      if (title) updateData.title = title
      if (description) updateData.description = description
      if (file) updateData.fileUrl = `/uploads/assignments/${file}`

      const updatedAssignment = await Assignment.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean()

      if (!updatedAssignment) {
        return {
          success: false,
          message: { en: 'ASSIGNMENT_NOT_FOUND' },
          results: {}
        }
      }

      return {
        success: true,
        message: { en: 'ASSIGNMENT_UPDATED_SUCCESSFULLY' },
        results: updatedAssignment
      }
    } catch (err) {
      return {
        success: false,
        message: { en: 'SERVER_ERROR' },
        results: err.message
      }
    }
  },


  getAssignments: async (classId, subject, uploadedBy, page = 1, limit = 10) => {
    try {
      if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
        return {
          success: false,
          message: { en: 'CLASS_ID_NOT_VALID' },
          results: {}
        };
      }

      if (uploadedBy && !mongoose.Types.ObjectId.isValid(uploadedBy)) {
        return {
          success: false,
          message: { en: 'TEACHER_ID_NOT_VALID' },
          results: {}
        };
      }
      const matchQuery = {};
      if (classId) matchQuery.class = new mongoose.Types.ObjectId(classId);
      if (uploadedBy) matchQuery.uploadedBy = new mongoose.Types.ObjectId(uploadedBy);
      if (subject) matchQuery.subject = subject;


      const pipeline = [
        { $match: matchQuery },
        ...getPaginationArrayJs(page, limit)
      ];


      const result = await Assignment.aggregate(pipeline);
      const data = result[0] || {
        docs: [],
        totalDocs: 0,
        limit,
        page,
        totalPages: 0
      };

      return {
        success: true,
        message: { en: 'ASSIGNMENTS_FETCHED_SUCCESSFULLY' },
        results: data
      };
    } catch (err) {
      return {
        success: false,
        message: { en: 'SERVER_ERROR' },
        results: { error: { en: err.message } }
      };
    }
  },


  deleteAssignment: async (assignmentId) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        return {
          success: false,
          message: { en: 'INVALID_ASSIGNMENT_ID' },
          results: []
        }
      }

      const assignment = await Assignment.findByIdAndDelete(assignmentId)

      if (!assignment) {
        return {
          success: false,
          message: { en: 'ASSIGNMENT_NOT_FOUND' },
          results: []
        }
      }

      return {
        success: true,
        message: { en: 'ASSIGNMENT_DELETED_SUCCESSFULLY' },
        results: assignment
      }
    } catch (err) {
      return {
        success: false,
        message: { en: 'SERVER_ERROR' },
        results: []
      }
    }
  },

// 🧾 services/assignmentService.js
  assignGradesToClassPerStudent: async ({ classId, gradesData }) => {
  try {
    // 🔹 Validate classId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return {
        success: false,
        message: { en: 'INVALID_CLASS_ID' },
        results: []
      };
    }

    // 🔹 Fetch all submissions of this class (with status field)
    const submissions = await Submission.find({ classId }).select(
      'student assignment status isLate' // 🟢 Added status and isLate
    );

    if (!submissions.length) {
      return {
        success: false,
        message: { en: 'NO_SUBMISSIONS_FOUND_FOR_THIS_CLASS' },
        results: []
      };
    }

    const gradeEntries = [];

    // 🔹 Loop through gradesData from frontend
    for (const item of gradesData) {
      const { studentId, marks, grade, remark } = item;

      if (!mongoose.Types.ObjectId.isValid(studentId)) continue;

      // 🔹 Get all submissions for this student in this class
      const studentSubmissions = submissions.filter(
        (sub) => sub.student.toString() === studentId
      );

      for (const sub of studentSubmissions) {
        const gradeValue =
          grade && ['A', 'B', 'C', 'D', 'F'].includes(grade) ? grade : null;

        // 🔹 Build grade entry including submission status
        gradeEntries.push({
          student: sub.student,
          assignment: sub.assignment,
          marks: marks ?? null,
          grade: gradeValue,
          remark: remark || '',
          status: sub.status || 'Pending', // 🟢 Include submission status
          isLate: sub.isLate || false, // 🟢 Include isLate info for clarity
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    // 🔹 Check if a Grade document already exists for this class
    const existingGrades = await Grade.findOne({ classId });

    if (!existingGrades) {
      // 🆕 CREATE new document for this class
      const newGradeDoc = await Grade.create({
        classId,
        grades: gradeEntries
      });

      return {
        success: true,
        message: { en: 'GRADES_ASSIGNED_SUCCESSFULLY' },
        results: newGradeDoc
      };
    } else {
      // 🔄 UPDATE existing document
      for (const entry of gradeEntries) {
        const index = existingGrades.grades.findIndex(
          (g) =>
            g.student.toString() === entry.student.toString() &&
            g.assignment.toString() === entry.assignment.toString()
        );

        if (index >= 0) {
          // 🟡 Update existing student-assignment grade
          existingGrades.grades[index] = {
            ...existingGrades.grades[index]._doc,
            ...entry
          };
        } else {
          // 🟢 Push new student grade entry
          existingGrades.grades.push(entry);
        }
      }

      existingGrades.updatedAt = new Date();
      await existingGrades.save();

      return {
        success: true,
        message: { en: 'GRADES_UPDATED_SUCCESSFULLY' },
        results: existingGrades
      };
    }
  } catch (err) {
    // ❌ Handle server errors gracefully
    return {
      success: false,
      message: { en: 'SERVER_ERROR' },
      results: err.message
    };
  }
},

 // services/assignmentService.js
  updateGradeById: async ({ gradeId, marks, grade, remark }) => {
  try {
    // Find parent document that contains this grade subdocument
    const parent = await Grade.findOne({ "grades._id": gradeId });
    if (!parent) {
      return { success: false, message: { en: "GRADE_NOT_FOUND" }, results: {} };
    }

    // Find the specific subdocument
    const target = parent.grades.id(gradeId);
    if (!target) {
      return { success: false, message: { en: "GRADE_NOT_FOUND" }, results: {} };
    }

    // Update fields if provided
    if (marks !== undefined) target.marks = marks;
    if (grade && ["A", "B", "C", "D", "F"].includes(grade)) target.grade = grade;
    if (remark !== undefined) target.remark = remark;

    target.updatedAt = new Date();
    parent.updatedAt = new Date();

    await parent.save();

    return { success: true, message: { en: "Grade updated successfully" }, results: target };
  } catch (err) {
    return { success: false, message: { en: "SERVER_ERROR" }, results: err.message };
  }
},


  deleteGrade: async (gradeId) => {
  try {
    // Find parent document containing this grade
    const parent = await Grade.findOne({ "grades._id": gradeId });
    if (!parent) {
      return { success: false, message: { en: 'GRADE_NOT_FOUND' }, results: {} };
    }

    // Remove the subdocument
    const target = parent.grades.id(gradeId);
    if (!target) {
      return { success: false, message: { en: 'GRADE_NOT_FOUND' }, results: {} };
    }

    target.remove(); // remove subdocument
    parent.updatedAt = new Date();

    await parent.save();

    return {
      success: true,
      message: { en: 'GRADE_DELETED_SUCCESSFULLY' },
      results: target // return deleted subdocument
    };
  } catch (err) {
    return {
      success: false,
      message: { en: 'SERVER_ERROR' },
      results: err.message
    };
  }
},


  getGrades: async ({ classId, keyword, status, page = 1, limit = 10 }) => {
  try {
    // ✅ Always convert classId to ObjectId
    let whereStatement = { classId: new mongoose.Types.ObjectId(classId) };

    // 🔍 Apply keyword filter if provided
    if (keyword) {
      keyword = keyword.trim();
      whereStatement.$or = [
        { 'studentData.firstName': { $regex: keyword, $options: 'i' } },
        { 'studentData.lastName': { $regex: keyword, $options: 'i' } },
        { 'studentData.name': { $regex: keyword, $options: 'i' } }
      ];
    }

    // ✅ Apply status filter (Pending / Submitted / Graded)
    if (status && typeof status === 'string') {
      whereStatement['grades.status'] = new RegExp(`^${status}$`, 'i');
    }

    const pipeline = getGradeLookupPipeline({ whereStatement, page, limit });
    const result = await Grade.aggregate(pipeline);

    const totalDocs = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalDocs / limit);

    return {
      success: true,
      message: { en: 'GRADES_FETCHED_SUCCESSFULLY' },
      results: {
        docs: result[0]?.docs || [],
        totalDocs,
        limit,
        page,
        totalPages
      }
    };
  } catch (err) {
    return {
      success: false,
      message: { en: 'SERVER_ERROR' },
      results: err.message
    };
  }
},



}
