// services/teachers/assignment.service.js
const Assignment = require('../../models/assignment/assignment.schema')
const mongoose = require('mongoose')
const Attendance = require('../../models/students/attendance.schema')
const { getAssignmentLookup} = require('../../helpers/commonAggregationPipeline')
const Teacher = require('../../models/teacher/teacher.schema')

const { getPaginationArrayJs } = require('../../helpers/helper')

const Class = require('../../models/class/class.schema')
// const Student= require('../../models/students/student.schema')

// services/teachers/assignment.service.js
// const Assignment = require('../../models/assignment/assignment.schema');
// const Teacher = require('../../models/teacher/teacher.schema');
// const Class = require('../../models/class/class.schema');

module.exports = {
  // uploadAssignment: async (
  //   teacherId,
  //   classId,
  //   subjectId,
  //   title,
  //   description,
  //   file
  // ) => {
  //   try {
  //     // ✅ Validate teacher
  //     const teacher = await Teacher.findById(teacherId);
  //     if (!teacher) {
  //       return { success: false, message: { en: 'Teacher not found' } };
  //     }

  //     // Ensure teacher.subjects is always an array
  //     const subjectsArray = Array.isArray(teacher.subjects) ? teacher.subjects : [];

  //     // ✅ Validate class
  //     const classExists = await Class.findById(classId);
  //     if (!classExists) {
  //       return { success: false, message: { en: 'Class not found' } };
  //     }

  //     // ✅ Check subject belongs to teacher
  //     const subjectExists = subjectsArray.some(
  //       (subj) => subj.subjectId.toString() === subjectId
  //     );
  //     if (!subjectExists) {
  //       return {
  //         success: false,
  //         message: { en: 'Subject not assigned to this teacher' }
  //       };
  //     }

  //     // ✅ Prepare file path if uploaded
  //     const filePath = file ? `/uploads/assignments/${file}` : null;

  //     // Create assignment
  //     const assignment = new Assignment({
  //       title,
  //       description,
  //       file: filePath,
  //       class: classId,
  //       uploadedBy: teacherId,
  //       subjectId
  //     });

  //     await assignment.save();

  //     return {
  //       success: true,
  //       message: "ASSIGNMENT_CREATED_SUCCESSFULLY",
  //       results: assignment
  //     };
  //   } catch (err) {
  //     // ✅ Detailed error logging
  //     console.error('Assignment upload error:', err);

  //     return {
  //       success: false,
  //       message: 'SERVER_ERROR',
  //     };
  //   }
  // }


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
      console.log('file paht : ', filePath);
      

      const assignment = new Assignment({
        title,
        description,
        dueDate,
        fileUrl: filePath,
        class: classId,   
        uploadedBy: teacherId,
        subjectId: subjectObjectId
      })

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
      return { success: false, message: { en: 'ASSIGNMENT_ID_NOT_VALID' }, results: {} };
    }

    // ✅ Prepare update object
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (file) updateData.fileUrl = `/uploads/assignments/${file}`;

    // ✅ Perform update
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedAssignment) {
      return { success: false, message: { en: 'ASSIGNMENT_NOT_FOUND' }, results: {} };
    }

    console.log('--Updated Assignment:', updatedAssignment);
    return {
      success: true,
      message: { en: 'ASSIGNMENT_UPDATED_SUCCESSFULLY' },
      results: updatedAssignment
    };
  } catch (err) {
    return { success: false, message: { en: 'SERVER_ERROR' }, results: err.message };
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
  }
};
