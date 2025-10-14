// services/teachers/assignment.service.js
const Assignment = require('../../models/assignment/assignment.schema')
const mongoose = require('mongoose')
const Attendance = require('../../models/students/attendance.schema')
const Submission = require('../../models/assignment/submission.schema');
const Grade = require('../../models/assignment/grades.schema');
const {
  getAssignmentLookup,
  getGradeLookupPipeline
} = require('../../helpers/commonAggregationPipeline')
const Teacher = require('../../models/teacher/teacher.schema')
const { getPaginationArrayJs, filterByKeyword } = require('../../helpers/helper')
const Class = require('../../models/class/class.schema');
module.exports = {

  uploadAssignment: async (
    teacherId,
    classId,
    subjectId,
    title,
    description,
    dueDate,
    file
  ) => {
    try {
      // ✅ Validate teacher
      const teacher = await Teacher.findById(teacherId)
      if (!teacher) {
        return { success: false, message: { en: 'TEACHER_NOT_FOUND' } }
      }

      const classExists = await Class.findById(classId)
      if (!classExists) {
        return { success: false, message: { en: 'CLASS_NOT_FOUND' } }
      }

      const subjectObjectId = mongoose.Types.ObjectId(subjectId)
      const isSpecialized =
        Array.isArray(teacher.specialization) &&
        teacher.specialization.some((subjId) => subjId.equals(subjectObjectId))

      if (!isSpecialized) {
        return {
          success: false,
          message: { en: 'SUBJECT_NOT_ASSIGNED_TO_TEACHER' }
        }
      }

      console.log('SUb---', subjectObjectId)
      console.log('File--', file)

      const filePath = file ? `/uploads/assignments/${file}` : null
      console.log('file paht : ', filePath)

      const assignment = new Assignment({
        title,
        description,
        dueDate,
        fileUrl: filePath,
        class: classId,
        uploadedBy: teacherId,
        subjectId: subjectObjectId
      })
      console.log('assignment---------', assignment)
      await assignment.save()

      return {
        success: true,
        message: { en: 'ASSIGNMENT_UPLOADED_SUCCESSFULLY' },
        results: assignment
      }
    } catch (err) {
      console.log('assing : ', err)
      return {
        success: false,
        message: { en: 'SERVER_ERROR' },
        results: err.message
      }
    }
  },

  updateAssignment: async (id, title, description, file = null) => {
    try {
      // ✅ Validate Assignment ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return {
          success: false,
          message: { en: 'ASSIGNMENT_ID_NOT_VALID' },
          results: {}
        }
      }

      // ✅ Prepare update object
      const updateData = {}
      if (title) updateData.title = title
      if (description) updateData.description = description
      if (file) updateData.fileUrl = `/uploads/assignments/${file}`

      // ✅ Perform update
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

      console.log('--Updated Assignment:', updatedAssignment)
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

  getAssignments: async (
    classId,
    subjectId,
    uploadedBy,
    page = 1,
    limit = 10
  ) => {
    try {
      // ✅ Validate ObjectIds
      if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
        return {
          success: false,
          message: { en: 'CLASS_ID_NOT_VALID' },
          results: {}
        }
      }
      if (subjectId && !mongoose.Types.ObjectId.isValid(subjectId)) {
        return {
          success: false,
          message: { en: 'SUBJECT_ID_NOT_VALID' },
          results: {}
        }
      }
      if (uploadedBy && !mongoose.Types.ObjectId.isValid(uploadedBy)) {
        return {
          success: false,
          message: { en: 'TEACHER_ID_NOT_VALID' },
          results: {}
        }
      }

      // ✅ Build aggregation pipeline
      const pipeline = getAssignmentLookup(classId, subjectId, uploadedBy)
      console.log('--Pipline', pipeline)

      pipeline.push(...getPaginationArrayJs(page, limit))

      // ✅ Run aggregation
      const result = await Assignment.aggregate(pipeline)
      console.log('result--', result)

      // ✅ $facet returns an array with a single object
      if (result.length === 0) {
        return {
          success: true,
          message: { en: 'ASSIGNMENTS_FETCHED_SUCCESSFULLY' },
          results: { docs: [], totalDocs: 0, limit, page, totalPages: 0 }
        }
      }
      6

      return {
        success: true,
        message: { en: 'ASSIGNMENTS_FETCHED_SUCCESSFULLY' },
        results: result[0] || {
          docs: [],
          totalDocs: 0,
          limit,
          page,
          totalPages: 0
        }
      }
    } catch (err) {
      console.error('getAssignments Service Error:', err.message)
      return {
        success: false,
        message: { en: 'SERVER_ERROR' },
        results: { error: { en: err.message } }
      }
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

  assignGradesToClassPerStudent: async ({ classId, gradesData }) => {
    const result = [];

    // 1️⃣ Fetch all submissions of this class
    const submissions = await Submission.find({ classId });
    if (!submissions.length) return [];
console.log("=====",submissions)
    // 2️⃣ Loop through each student grade
    for (const item of gradesData) {
      const { studentId, marks, grade, remark } = item;

      if (!mongoose.Types.ObjectId.isValid(studentId)) continue;

      // 3️⃣ Find submissions of this student
      const studentSubmissions = submissions.filter(sub => sub.student.toString() === studentId);

      for (const sub of studentSubmissions) {
        // Validate grade
        const gradeValue = grade && ['A','B','C','D','F'].includes(grade) ? grade : null;

        // 4️⃣ Upsert grade
        const gradeRecord = await Grade.findOneAndUpdate(
          {
            classId: sub.classId,
            student: sub.student,
            assignment: sub.assignment
          },
          {
            $set: {
              marks: marks !== undefined ? marks : null,
              grade: gradeValue,
              remark: remark || '',
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true, new: true }
        );

        result.push(gradeRecord);
      }
    }

    return result;
  },
   updateGradeById: async ({ gradeId, marks, grade, remark }) => {
    const gradeRecord = await Grade.findById(gradeId);

    if (!gradeRecord) return null;

    if (marks !== undefined) gradeRecord.marks = marks;
    if (grade && ['A','B','C','D','F'].includes(grade)) gradeRecord.grade = grade;
    if (remark !== undefined) gradeRecord.remark = remark;

    gradeRecord.updatedAt = new Date();

    await gradeRecord.save();

    return gradeRecord;
  },

   // Delete grade by gradeId
  deleteGrade: async (gradeId) => {
    const deletedGrade = await Grade.findByIdAndDelete(gradeId);
    return deletedGrade; // returns null if not found
  },

  
 getGrades: async ({ classId, keyword, page = 1, limit = 10 }) => {
  try {
    let whereStatement = {};

    // If classId is provided, filter by it
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return {
          success: false,
          message: { en: 'CLASS_ID_NOT_VALID' },
          results: {}
        };
      }
      whereStatement.classId = new mongoose.Types.ObjectId(classId);
    }

    // Apply keyword filter on student name
    if (keyword) {
      keyword = keyword.trim();
      whereStatement.$or = [
        { 'studentData.firstName': { $regex: keyword, $options: 'i' } },
        { 'studentData.lastName': { $regex: keyword, $options: 'i' } },
        { 'studentData.name': { $regex: keyword, $options: 'i' } }
      ];
    }

    // Build aggregation pipeline
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
    console.error('getGrades Service Error:', err.message);
    return {
      success: false,
      message: { en: 'SERVER_ERROR' },
      results: { error: { en: err.message } }
    };
  }
}
};


