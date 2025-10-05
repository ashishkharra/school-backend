// services/teachers/assignment.service.js
const Assignment = require('../../models/assignment/assignment.schema')
const mongoose = require('mongoose')
const Attendance = require('../../models/students/attendance.schema')
const {
  classinstudentPipeline
} = require('../../helpers/commonAggregationPipeline')
const Teacher = require('../../models/teacher/teacher.schema')
const Class = require('../../models/class/class.schema')
// const Student= require('../../models/students/student.schema')

// services/teachers/assignment.service.js
// const Assignment = require('../../models/assignment/assignment.schema');
// const Teacher = require('../../models/teacher/teacher.schema');
// const Class = require('../../models/class/class.schema');

module.exports = {
  uploadAssignment: async (
    teacherId,
    classId,
    subjectId,
    title,
    description,
    file
  ) => {
    try {
      // ✅ Validate teacher
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        return { success: false, message: { en: 'Teacher not found' } };
      }

      // Ensure teacher.subjects is always an array
      const subjectsArray = Array.isArray(teacher.subjects) ? teacher.subjects : [];

      // ✅ Validate class
      const classExists = await Class.findById(classId);
      if (!classExists) {
        return { success: false, message: { en: 'Class not found' } };
      }

      // ✅ Check subject belongs to teacher
      const subjectExists = subjectsArray.some(
        (subj) => subj.subjectId.toString() === subjectId
      );
      if (!subjectExists) {
        return {
          success: false,
          message: { en: 'Subject not assigned to this teacher' }
        };
      }

      // ✅ Prepare file path if uploaded
      const filePath = file ? `/uploads/assignments/${file}` : null;

      // Create assignment
      const assignment = new Assignment({
        title,
        description,
        file: filePath,
        class: classId,
        uploadedBy: teacherId,
        subjectId
      });

      await assignment.save();

      return {
        success: true,
        message: "ASSIGNMENT_CREATED_SUCCESSFULLY",
        results: assignment
      };
    } catch (err) {
      // ✅ Detailed error logging
      console.error('Assignment upload error:', err);

      return {
        success: false,
        message: 'SERVER_ERROR',
      };
    }
  }
};
