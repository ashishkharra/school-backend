
// const teacherService = require('../../models/admin/teacher.schema');
// const adminTeacherService = require("../../services/admins/teacher.service");
const adminTeacherService = require("../../services/admins/teacher.service")
const {responseData} = require('../../helpers/responseData');



module.exports = {
registerTeacher: async (req, res) => {
  try {
    const result = await adminTeacherService.registerTeacher(req.body);

    if (!result.success) {
      return res
        .status(400)
        .json(responseData(result.message, {}, req, false));
    }

    return res
      .status(201)
      .json(responseData(result.message, result.data, req, true));
  } catch (error) {
    console.error("Error registering teacher:", error.message);
    return res
      .status(500)
      .json(responseData(error.message, {}, req, false));
  }
}

,
    getAllTeachers: async (req, res) => {
    try {
      const teachers = await adminTeacherService.getAllTeachers();
      return res.status(200).json(responseData("TEACHERS_FETCHED", teachers, req, true));
    } catch (error) {
      console.error("Error fetching teachers:", error.message);
      return res.status(500).json(responseData("FAILED_TO_FETCH_TEACHERS", { error: error.message }, req, false));
    }
  },
 updateTeacher: async (req, res) => {
    try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedTeacher = await adminTeacherService.updateTeacher(id, updateData);

    return res
      .status(200)
      .json(responseData("TEACHER_UPDATED", updatedTeacher, req, true));
  } catch (error) {
    console.error("Error updating teacher:", error.message);
    return res
      .status(400)
      .json(responseData("UPDATE_FAILED", { error: error.message }, req, false));
  }
  },

//    softDeleteTeacher : async (req, res) => {
//   try {
//   const { id } = req.params;
//   const teacher = await adminTeacherService.softDeleteTeacher(id);
//   return res.status(200).json(responseData("TEACHER_SOFT_DELETED", teacher, req, true));
// } catch (error) {
//   return res.status(400).json(responseData("SOFT_DELETE_FAILED", { error: error.message }, req, false));
// }
// }
softDeleteTeacher: async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await adminTeacherService.softDeleteTeacher(id);
    return res
      .status(200)
      .json(responseData("TEACHER_SOFT_DELETED", teacher, req, true));
  } catch (error) {
    return res
      .status(400)
      .json(responseData("SOFT_DELETE_FAILED", { error: error.message }, req, false));
  }
},


  // Get history (teachers with isRemoved = 1)
   getDeletedTeachersHistory: async (req, res) => {
    try {
      const { keyword } = req.query; // Get keyword from query string
      const history = await adminTeacherService.getDeletedTeachersHistory(keyword);
      return res.status(200).json(responseData("TEACHER_HISTORY_FETCHED", history, req, true));
    } catch (error) {
      return res.status(400).json(responseData("FETCH_HISTORY_FAILED", { error: error.message }, req, false));
    }
  }

//----------------- ASSIGN TEACHER BY ADMIN
,

assignTeacherToClassController: async (req, res) => {
  try {
    const { classId, teacherId, section, subject, startTime, endTime } = req.body;

    console.log("REQ BODY:", req.body);

    const savedAssignment = await adminTeacherService.assignTeacherToClass({
      classId,
      teacherId,
      section,
      subject,
      startTime,
      endTime
    });

    // Use responseData format
    return res.status(200).json(
      responseData("TEACHER_ASSIGNED_SUCCESSFULLY", savedAssignment, req, true)
    );

  } catch (error) {
    console.error("ERROR:", error.message);
    return res.status(400).json(
      responseData("TEACHER_ASSIGNMENT_FAILED", { error: error.message }, req, false)
    );
  }
}
}