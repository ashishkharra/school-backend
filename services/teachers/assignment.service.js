// services/teachers/assignment.service.js
const Assignment = require('../../models/assignment/assignment.schema');

module.exports = {

  createAssignment: async (teacherId, classId, assignmentData, file) => {
    const {
      title,
      description,
      instructions,
      dueDate,
      maxMarks,
      passingMarks,
      resources,
      subject
    } = assignmentData;

    // Validation
    if (!title || !dueDate || !classId || !teacherId) {
      throw new Error("Title, DueDate, ClassId and TeacherId are required");
    }

    // File URL if uploaded
    let fileUrl = file ? file.path : null;

    // Create Assignment
    const assignment = new Assignment({
      title,
      description,
      instructions,
      dueDate,
      maxMarks,
      passingMarks,
      resources,
      subject,
      fileUrl,
      class: classId,
      uploadedBy: teacherId
    });

    await assignment.save();
    return assignment;
  }

};
